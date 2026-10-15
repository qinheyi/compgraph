/**
 * Intent router: map natural language / structured requests → Cypher tools → polish.
 */
import {
  listGaps,
  recommendNext,
  explainPath,
  listDecisions,
  rememberDecision,
  listCompetitions,
} from './tools.js';
import { polishAnswer } from './llm.js';

const COMPETITION_ALIASES = [
  [/graph\s*hacks|falkor/i, 'c-graph-hacks'],
  [/open\s*agent/i, 'c-open-agent'],
  [/kaggle/i, 'c-kaggle-id'],
  [/qloo|taste/i, 'c-qloo-like'],
  [/shanghai/i, 'c-shanghai'],
  [/amazon|build.?ship/i, 'c-amazon-bss'],
  [/paypal/i, 'c-paypal-ai'],
  [/airwallex|ledger/i, 'c-airwallex'],
  [/kane/i, 'c-kane-cli'],
  [/meta|vr|pocket/i, 'c-meta-vr'],
  [/billion|cfi|india/i, 'c-cfi-billion'],
];

export function resolveCompetitionId(text, explicit) {
  if (explicit) return explicit;
  if (!text) return null;
  for (const [re, id] of COMPETITION_ALIASES) {
    if (re.test(text)) return id;
  }
  const m = text.match(/\b(c-[\w-]+)\b/);
  return m ? m[1] : null;
}

export async function runAgent({ question, tool, competitionId, status, note, limit }) {
  const q = (question || '').trim();
  let chosen = tool || detectTool(q);
  let cid = resolveCompetitionId(q, competitionId);

  if (['list_gaps', 'explain_path', 'remember_decision'].includes(chosen) && !cid) {
    // default to graph-hacks twin for demos
    cid = 'c-graph-hacks';
  }

  let toolResult;
  switch (chosen) {
    case 'list_gaps':
      toolResult = await listGaps(cid);
      break;
    case 'recommend_next':
      toolResult = await recommendNext(limit || 5);
      break;
    case 'explain_path':
      toolResult = await explainPath(cid);
      break;
    case 'list_decisions':
      toolResult = await listDecisions();
      break;
    case 'remember_decision':
      toolResult = await rememberDecision({
        competitionId: cid,
        status: status || detectStatus(q) || 'candidate',
        note: note || q || 'from UI',
      });
      break;
    case 'list_competitions':
      toolResult = await listCompetitions();
      break;
    default:
      chosen = 'recommend_next';
      toolResult = await recommendNext(limit || 5);
  }

  const polished = await polishAnswer({
    question: q || chosen,
    toolName: chosen,
    toolResult,
  });

  return {
    question: q,
    tool: chosen,
    competitionId: cid,
    answer: polished.text,
    answerSource: polished.source,
    llmError: polished.llmError || null,
    result: toolResult,
    graphPath:
      chosen === 'explain_path'
        ? buildPathViz(toolResult)
        : chosen === 'recommend_next'
          ? buildRecommendViz(toolResult)
          : chosen === 'list_gaps'
            ? buildGapsViz(toolResult)
            : null,
  };
}

function detectTool(q) {
  if (!q) return 'recommend_next';
  if (/remember|decid|join|abandon|submit|mark as/i.test(q)) return 'remember_decision';
  if (/gap|missing|eligib|what.*(need|lack|block)/i.test(q)) return 'list_gaps';
  if (/explain|why|path|how.*(connect|relate)|evidence/i.test(q)) return 'explain_path';
  if (/decision|history|precedent|past/i.test(q)) return 'list_decisions';
  if (/list.*contest|all competition|show competition/i.test(q)) return 'list_competitions';
  if (/recommend|what.*(next|enter|join)|suggest|should i/i.test(q)) return 'recommend_next';
  return 'recommend_next';
}

function detectStatus(q) {
  if (/abandon/i.test(q)) return 'abandoned';
  if (/submit/i.test(q)) return 'submitted';
  if (/join/i.test(q)) return 'joined';
  if (/candidate/i.test(q)) return 'candidate';
  return null;
}

function buildPathViz(result) {
  const nodes = [
    { id: 'person', label: 'Person\nself', type: 'Person' },
    { id: 'comp', label: `Competition\n${result.competition || result.competitionId}`, type: 'Competition' },
  ];
  const edges = [];
  const evidence = result.evidence || [];
  evidence.forEach((e, i) => {
    const rid = `res-${i}`;
    const qid = `req-${i}`;
    nodes.push({
      id: rid,
      label: `Resource\n${e.resource}\n(${e.resource_status})`,
      type: 'Resource',
      status: e.resource_status,
    });
    nodes.push({
      id: qid,
      label: `Requirement\n${e.satisfies}`,
      type: 'Requirement',
    });
    edges.push({ from: 'person', to: rid, label: 'HAS' });
    edges.push({ from: rid, to: qid, label: 'SATISFIES' });
    edges.push({ from: 'comp', to: qid, label: 'REQUIRES' });
  });
  (result.gaps || []).forEach((g, i) => {
    const qid = `gap-${i}`;
    nodes.push({ id: qid, label: `Gap\n${g.missing}`, type: 'Gap' });
    edges.push({ from: 'comp', to: qid, label: 'REQUIRES' });
  });
  return { nodes, edges, pattern: result.pathPattern };
}

function buildRecommendViz(result) {
  const nodes = [{ id: 'person', label: 'Person\nself', type: 'Person' }];
  const edges = [];
  (result.recommendations || []).slice(0, 5).forEach((r, i) => {
    const id = `c-${i}`;
    nodes.push({
      id,
      label: `${r.name}\nmiss:${r.missing_count}`,
      type: 'Competition',
    });
    edges.push({
      from: 'person',
      to: id,
      label: r.missing_count === 0 ? 'ready' : `gaps:${r.missing_count}`,
    });
  });
  return { nodes, edges, pattern: 'ranked by missing_count, deadline' };
}

function buildGapsViz(result) {
  const nodes = [
    {
      id: 'comp',
      label: result.gaps?.[0]?.competition || result.competitionId,
      type: 'Competition',
    },
  ];
  const edges = [];
  (result.gaps || []).forEach((g, i) => {
    const id = `g-${i}`;
    nodes.push({ id, label: g.missing, type: 'Gap' });
    edges.push({ from: 'comp', to: id, label: 'REQUIRES (unmet)' });
  });
  return { nodes, edges, pattern: 'unmet REQUIRES' };
}

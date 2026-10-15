/**
 * CompGraph HTTP API + static UI.
 * COMPGRAPH_DEMO=1 forces read-only demo (no FalkorDB).
 * Otherwise tries FalkorDB; on connect failure, serves demo with a banner.
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connect, close, HOST, PORT, GRAPH_NAME } from './falkordb.js';
import { runAgent } from './agent.js';
import {
  demoListGaps,
  demoRecommend,
  demoExplain,
  demoDecisions,
  DEMO_COMPETITIONS,
} from './demo-data.js';
import { polishAnswer } from './llm.js';
import { listCompetitions } from './tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FORCE_DEMO = process.env.COMPGRAPH_DEMO === '1';
const app = express();
const listenPort = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(ROOT, 'web')));

let mode = FORCE_DEMO ? 'demo' : 'live';
let bootError = null;

async function ensureGraph() {
  if (FORCE_DEMO) {
    mode = 'demo';
    return;
  }
  try {
    await connect();
    mode = 'live';
    bootError = null;
  } catch (err) {
    mode = 'demo';
    bootError = String(err.message || err);
    console.warn('[compgraph] FalkorDB unavailable, demo mode:', bootError);
  }
}

app.get('/api/health', async (_req, res) => {
  await ensureGraph();
  res.json({
    ok: true,
    mode,
    graph: GRAPH_NAME,
    falkordb: mode === 'live' ? `${HOST}:${PORT}` : null,
    bootError,
    tracks: ['Company Brain', 'Agents That Act on Connected Data'],
  });
});

app.get('/api/competitions', async (_req, res) => {
  try {
    await ensureGraph();
    if (mode === 'demo') {
      return res.json({ competitions: DEMO_COMPETITIONS, demo: true });
    }
    const data = await listCompetitions();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    await ensureGraph();
    const { question, tool, competitionId, status, note, limit } = req.body || {};

    if (mode === 'demo') {
      const out = await runDemoAgent({ question, tool, competitionId, status, note, limit });
      return res.json({ ...out, mode: 'demo' });
    }

    // remember_decision must be live
    const result = await runAgent({ question, tool, competitionId, status, note, limit });
    res.json({ ...result, mode: 'live' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

async function runDemoAgent({ question, tool, competitionId, status, note, limit }) {
  const q = (question || '').trim();
  let chosen = tool;
  if (!chosen) {
    if (/remember|decid|join|abandon|submit/i.test(q)) chosen = 'remember_decision';
    else if (/gap|missing|eligib/i.test(q)) chosen = 'list_gaps';
    else if (/explain|why|path/i.test(q)) chosen = 'explain_path';
    else if (/decision|history/i.test(q)) chosen = 'list_decisions';
    else chosen = 'recommend_next';
  }
  let cid = competitionId || 'c-graph-hacks';
  let toolResult;
  switch (chosen) {
    case 'list_gaps':
      toolResult = demoListGaps(cid);
      break;
    case 'explain_path':
      toolResult = demoExplain(cid);
      break;
    case 'list_decisions':
      toolResult = demoDecisions();
      break;
    case 'remember_decision':
      toolResult = {
        tool: 'remember_decision',
        demo: true,
        written: null,
        message:
          'Demo mode is read-only. Run locally with FalkorDB to persist session memory.',
      };
      break;
    case 'list_competitions':
      toolResult = { tool: 'list_competitions', competitions: DEMO_COMPETITIONS, demo: true };
      break;
    default:
      chosen = 'recommend_next';
      toolResult = demoRecommend();
  }
  const polished = await polishAnswer({ question: q || chosen, toolName: chosen, toolResult });
  // reuse path viz via a light import of structure
  const { runAgent: _ } = await import('./agent.js');
  // build viz inline for demo
  let graphPath = null;
  if (chosen === 'explain_path') {
    graphPath = {
      pattern: toolResult.pathPattern,
      nodes: [
        { id: 'person', label: 'Person\nself', type: 'Person' },
        { id: 'comp', label: toolResult.competition, type: 'Competition' },
      ],
      edges: [],
    };
    (toolResult.evidence || []).forEach((e, i) => {
      graphPath.nodes.push({
        id: `r${i}`,
        label: `${e.resource}\n(${e.resource_status})`,
        type: 'Resource',
        status: e.resource_status,
      });
      graphPath.nodes.push({ id: `q${i}`, label: e.satisfies, type: 'Requirement' });
      graphPath.edges.push({ from: 'person', to: `r${i}`, label: 'HAS' });
      graphPath.edges.push({ from: `r${i}`, to: `q${i}`, label: 'SATISFIES' });
      graphPath.edges.push({ from: 'comp', to: `q${i}`, label: 'REQUIRES' });
    });
  } else if (chosen === 'recommend_next') {
    graphPath = {
      pattern: 'ranked by missing_count, deadline',
      nodes: [{ id: 'person', label: 'Person\nself', type: 'Person' }],
      edges: [],
    };
    (toolResult.recommendations || []).slice(0, 5).forEach((r, i) => {
      graphPath.nodes.push({ id: `c${i}`, label: `${r.name}\nmiss:${r.missing_count}`, type: 'Competition' });
      graphPath.edges.push({ from: 'person', to: `c${i}`, label: `gaps:${r.missing_count}` });
    });
  }
  return {
    question: q,
    tool: chosen,
    competitionId: cid,
    answer: polished.text,
    answerSource: polished.source,
    result: toolResult,
    graphPath,
    mode: 'demo',
  };
}

app.get('*', (_req, res) => {
  res.sendFile(path.join(ROOT, 'web', 'index.html'));
});

const server = app.listen(listenPort, () => {
  console.log(`CompGraph listening on http://127.0.0.1:${listenPort} (mode start=${mode})`);
  ensureGraph().then(() => console.log(`Graph mode: ${mode}`));
});

async function shutdown() {
  server.close();
  await close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

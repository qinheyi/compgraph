/**
 * Vercel serverless entry — always demo mode (no private FalkorDB from edge).
 */
process.env.COMPGRAPH_DEMO = '1';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  demoListGaps,
  demoRecommend,
  demoExplain,
  demoDecisions,
  DEMO_COMPETITIONS,
} from './demo-data.js';
import { polishAnswer } from './llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, '..', 'web');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: 'demo',
    note: 'Vercel demo is read-only. Full FalkorDB flow: docker compose + npm start locally.',
    tracks: ['Company Brain', 'Agents That Act on Connected Data'],
  });
});

app.get('/api/competitions', (_req, res) => {
  res.json({ competitions: DEMO_COMPETITIONS, demo: true });
});

app.post('/api/ask', async (req, res) => {
  try {
    const { question, tool, competitionId } = req.body || {};
    const q = (question || '').trim();
    let chosen = tool;
    if (!chosen) {
      if (/remember|decid|join|abandon|submit/i.test(q)) chosen = 'remember_decision';
      else if (/gap|missing|eligib/i.test(q)) chosen = 'list_gaps';
      else if (/explain|why|path/i.test(q)) chosen = 'explain_path';
      else if (/decision|history/i.test(q)) chosen = 'list_decisions';
      else chosen = 'recommend_next';
    }
    const cid = competitionId || 'c-graph-hacks';
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
          message: 'Demo mode is read-only. Run locally with FalkorDB to persist session memory.',
        };
        break;
      case 'list_competitions':
        toolResult = { tool: 'list_competitions', competitions: DEMO_COMPETITIONS, demo: true };
        break;
      default:
        chosen = 'recommend_next';
        toolResult = demoRecommend();
    }
    const polished = await polishAnswer({
      question: q || chosen,
      toolName: chosen,
      toolResult,
    });
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
        graphPath.nodes.push({
          id: `c${i}`,
          label: `${r.name}\nmiss:${r.missing_count}`,
          type: 'Competition',
        });
        graphPath.edges.push({ from: 'person', to: `c${i}`, label: `gaps:${r.missing_count}` });
      });
    }
    res.json({
      question: q,
      tool: chosen,
      competitionId: cid,
      answer: polished.text,
      answerSource: polished.source,
      result: toolResult,
      graphPath,
      mode: 'demo',
    });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.use(express.static(webRoot));
app.get('*', (_req, res) => {
  res.sendFile(path.join(webRoot, 'index.html'));
});

export default app;

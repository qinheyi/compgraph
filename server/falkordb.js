/**
 * FalkorDB client wrapper for CompGraph.
 */
import { FalkorDB } from 'falkordb';

const GRAPH_NAME = process.env.GRAPH_NAME || 'CompGraph';
const HOST = process.env.FALKORDB_HOST || '127.0.0.1';
const PORT = Number(process.env.FALKORDB_PORT || 6379);

let db = null;
let graph = null;

export async function connect() {
  if (graph) return graph;
  db = await FalkorDB.connect({ socket: { host: HOST, port: PORT } });
  graph = db.selectGraph(GRAPH_NAME);
  await graph.query('RETURN 1');
  return graph;
}

export async function query(cypher, params = {}) {
  const g = await connect();
  const result = await g.query(cypher, { params });
  const data = (result?.data || []).map((row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      const obj = {};
      for (const [k, v] of Object.entries(row)) obj[k] = unwrap(v);
      return obj;
    }
    return row;
  });
  return { headers: Object.keys(data[0] || {}), data };
}

export async function close() {
  if (!db) return;
  const handle = db;
  db = null;
  graph = null;
  try {
    await Promise.race([
      handle.close(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('close timeout')), 1500)),
    ]);
  } catch (_) {
    /* ignore hang on quit */
  }
}

function unwrap(v) {
  if (v == null) return v;
  if (typeof v === 'object' && v !== null && 'properties' in v) return v.properties;
  if (Array.isArray(v)) return v.map(unwrap);
  return v;
}

export { GRAPH_NAME, HOST, PORT };

#!/usr/bin/env node
import { FalkorDB } from 'falkordb';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const GRAPH = process.env.GRAPH_NAME || 'CompGraph';
const HOST = process.env.FALKORDB_HOST || '127.0.0.1';
const PORT = Number(process.env.FALKORDB_PORT || 6379);
const CONTAINER = process.env.FALKORDB_CONTAINER || 'compgraph-falkordb';
const file = process.argv[2] || path.join(ROOT, 'cypher', 'seed-synthetic.cypher');

function splitStatements(text) {
  const stmts = [];
  let buf = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!buf.length && (!trimmed || trimmed.startsWith('//'))) continue;
    buf.push(line);
    if (trimmed.endsWith(';')) {
      let stmt = buf.join('\n').replace(/;[\t ]*$/, '').trim();
      buf = [];
      if (stmt) stmts.push(stmt);
    }
  }
  return stmts;
}

function hardDelete() {
  const tryCmds = [
    `docker exec ${CONTAINER} redis-cli GRAPH.DELETE ${GRAPH}`,
    `sudo docker exec ${CONTAINER} redis-cli GRAPH.DELETE ${GRAPH}`,
  ];
  for (const cmd of tryCmds) {
    try {
      execSync(cmd, { stdio: 'pipe' });
      console.log('Deleted graph via:', cmd.split(' redis')[0]);
      return;
    } catch (_) {}
  }
  console.warn('Could not redis-cli GRAPH.DELETE (ok if empty)');
}

hardDelete();

const db = await FalkorDB.connect({ socket: { host: HOST, port: PORT } });
const g = db.selectGraph(GRAPH);

const text = fs.readFileSync(file, 'utf8');
const stmts = splitStatements(text);
console.log(`Loading ${stmts.length} statements into ${GRAPH}`);
let i = 0;
for (const stmt of stmts) {
  i += 1;
  try {
    await g.query(stmt);
  } catch (err) {
    console.error(`FAILED #${i}:`, stmt.slice(0, 240));
    console.error(String(err.message || err));
    await db.close();
    process.exit(1);
  }
}

const comps = await g.query('MATCH (c:Competition) RETURN count(c) AS n');
const decs = await g.query('MATCH (d:Decision) RETURN count(d) AS n');
const persons = await g.query('MATCH (p:Person) RETURN count(p) AS n');
console.log('persons:', persons.data?.[0]?.n);
console.log('competitions:', comps.data?.[0]?.n);
console.log('decisions:', decs.data?.[0]?.n);
await db.close();
console.log('Done.');

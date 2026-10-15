/**
 * CompGraph agent tools — all load-bearing Cypher against FalkorDB.
 * Without FalkorDB these return nothing useful (demo mode has a separate path).
 */
import { query } from './falkordb.js';

/** Missing requirements for a competition (no ready Resource that SATISFIES). */
export async function listGaps(competitionId) {
  const cypher = `
MATCH (c:Competition {id: $cid})-[:REQUIRES]->(req:Requirement)
OPTIONAL MATCH (:Person {id: 'self'})-[:HAS]->(r:Resource)-[:SATISFIES]->(req)
WHERE r.status = 'ready'
WITH c, req, collect(r) AS ready_resources
WHERE size(ready_resources) = 0
RETURN c.name AS competition, req.id AS req_id, req.kind AS missing, req.detail AS detail
ORDER BY missing
`;
  const { data } = await query(cypher, { cid: competitionId });
  return {
    tool: 'list_gaps',
    competitionId,
    gaps: data,
    count: data.length,
  };
}

/** Rank contests by fewest missing reqs, then soonest ISO deadline. */
export async function recommendNext(limit = 5) {
  // Two-pass: FalkorDB can drop follow-up OPTIONAL MATCHes after an aggregating WITH.
  const coverQ = `
MATCH (c:Competition)
WHERE c.mode IN ['online', 'shanghai_offline']
OPTIONAL MATCH (c)-[:REQUIRES]->(req:Requirement)
OPTIONAL MATCH (:Person {id: 'self'})-[:HAS]->(r:Resource {status: 'ready'})-[:SATISFIES]->(req)
WITH c,
     [k IN collect(DISTINCT req.kind) WHERE k IS NOT NULL] AS all_reqs,
     [k IN collect(DISTINCT CASE WHEN r IS NOT NULL THEN req.kind END) WHERE k IS NOT NULL] AS covered_kinds
RETURN c.id AS id, c.name AS name, c.deadline AS deadline, c.mode AS mode,
       c.host AS host, c.url AS url, all_reqs, covered_kinds
`;
  const statusQ = `
MATCH (c:Competition)
OPTIONAL MATCH (:Person {id: 'self'})-[:DECIDED]->(d:Decision)-[:ABOUT]->(c)
RETURN c.id AS id, collect(DISTINCT d.status) AS statuses
`;
  const [cover, status] = await Promise.all([query(coverQ), query(statusQ)]);
  const statusMap = Object.fromEntries((status.data || []).map((row) => [row.id, row.statuses || []]));
  let rows = (cover.data || []).map((row) => {
    const statuses = statusMap[row.id] || [];
    const all = row.all_reqs || [];
    const covered = row.covered_kinds || [];
    const missing = all.filter((k) => !covered.includes(k));
    return {
      id: row.id,
      name: row.name,
      deadline: row.deadline,
      mode: row.mode,
      host: row.host,
      url: row.url,
      req_count: all.length,
      missing_count: missing.length,
      missing,
      statuses,
    };
  });
  rows = rows.filter((r) => !r.statuses.includes('abandoned') && !r.statuses.includes('submitted'));
  rows.sort((a, b) => a.missing_count - b.missing_count || String(a.deadline).localeCompare(String(b.deadline)));
  rows = rows.slice(0, Number(limit) || 5);
  return { tool: 'recommend_next', recommendations: rows, count: rows.length };
}

/**
 * Multi-hop path evidence:
 * Person -HAS-> Resource -SATISFIES-> Requirement <-REQUIRES- Competition
 */
export async function explainPath(competitionId) {
  const cypher = `
MATCH (c:Competition {id: $cid})
OPTIONAL MATCH path = (:Person {id: 'self'})-[:HAS]->(r:Resource)-[:SATISFIES]->(req:Requirement)<-[:REQUIRES]-(c)
RETURN c.name AS competition, c.id AS competition_id,
       collect({
         resource: r.kind,
         resource_id: r.id,
         resource_status: r.status,
         satisfies: req.kind,
         req_id: req.id,
         hop: 'Person→HAS→Resource→SATISFIES→Requirement←REQUIRES←Competition'
       }) AS evidence
`;
  const { data } = await query(cypher, { cid: competitionId });
  const row = data[0] || { competition: competitionId, evidence: [] };
  const evidence = (row.evidence || []).filter((e) => e && e.resource);

  const gapsResult = await listGaps(competitionId);
  const covered = evidence.filter((e) => e.resource_status === 'ready');
  const blocked = evidence.filter((e) => e.resource_status !== 'ready');

  return {
    tool: 'explain_path',
    competitionId,
    competition: row.competition,
    pathPattern: 'Person → HAS → Resource → SATISFIES → Requirement ← REQUIRES ← Competition',
    evidence,
    covered,
    blocked,
    gaps: gapsResult.gaps,
    summary: {
      coveredCount: covered.length,
      blockedCount: blocked.length,
      gapCount: gapsResult.count,
    },
  };
}

/** Decision history (session + seed precedents). */
export async function listDecisions() {
  const cypher = `
MATCH (:Person {id: 'self'})-[:DECIDED]->(d:Decision)-[:ABOUT]->(c:Competition)
RETURN d.id AS id, d.status AS status, d.at AS at, d.note AS note,
       c.id AS competition_id, c.name AS competition
ORDER BY d.at DESC
`;
  const { data } = await query(cypher);
  return { tool: 'list_decisions', decisions: data, count: data.length };
}

/**
 * Session memory: write a new Decision into the graph so later sessions see it.
 */
export async function rememberDecision({ competitionId, status, note }) {
  const allowed = ['joined', 'abandoned', 'submitted', 'candidate'];
  if (!allowed.includes(status)) {
    throw new Error(`status must be one of ${allowed.join(', ')}`);
  }
  const id = `d-mem-${Date.now()}`;
  const at = new Date().toISOString();
  const safeNote = String(note || 'session memory').replace(/;/g, ',');

  const cypher = `
MATCH (p:Person {id: 'self'})
MATCH (c:Competition {id: $cid})
CREATE (d:Decision {id: $id, status: $status, at: $at, note: $note})
CREATE (p)-[:DECIDED]->(d)
CREATE (d)-[:ABOUT]->(c)
RETURN d.id AS id, d.status AS status, d.at AS at, d.note AS note, c.name AS competition
`;
  const { data } = await query(cypher, {
    cid: competitionId,
    id,
    status,
    at,
    note: safeNote,
  });
  return {
    tool: 'remember_decision',
    written: data[0] || null,
    message: 'Decision persisted in FalkorDB (session memory).',
  };
}

/** List competitions for UI. */
export async function listCompetitions() {
  const cypher = `
MATCH (c:Competition)
OPTIONAL MATCH (c)-[:REQUIRES]->(req:Requirement)
RETURN c.id AS id, c.name AS name, c.deadline AS deadline, c.mode AS mode,
       c.host AS host, c.fee AS fee, c.prize_note AS prize_note, c.url AS url,
       collect(req.kind) AS requirements
ORDER BY c.deadline ASC
`;
  const { data } = await query(cypher);
  return { tool: 'list_competitions', competitions: data };
}

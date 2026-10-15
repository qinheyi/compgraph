// CompGraph — core Cypher (product tools)
// FalkorDB notes:
//   - no datetime(); store ISO strings
//   - after an aggregating WITH, follow-up OPTIONAL MATCH on the
//     aggregated node can return empty — recommend_next therefore
//     runs coverage + decision status as two queries and merges in JS.

// --- 1) list_gaps ---
MATCH (c:Competition {id: $cid})-[:REQUIRES]->(req:Requirement)
OPTIONAL MATCH (:Person {id: 'self'})-[:HAS]->(r:Resource)-[:SATISFIES]->(req)
WHERE r.status = 'ready'
WITH c, req, collect(r) AS ready_resources
WHERE size(ready_resources) = 0
RETURN c.name AS competition, req.kind AS missing, req.detail AS detail
ORDER BY missing;

// --- 2a) recommend_next coverage pass ---
MATCH (c:Competition)
WHERE c.mode IN ['online', 'shanghai_offline']
OPTIONAL MATCH (c)-[:REQUIRES]->(req:Requirement)
OPTIONAL MATCH (:Person {id: 'self'})-[:HAS]->(r:Resource {status: 'ready'})-[:SATISFIES]->(req)
WITH c,
     [k IN collect(DISTINCT req.kind) WHERE k IS NOT NULL] AS all_reqs,
     [k IN collect(DISTINCT CASE WHEN r IS NOT NULL THEN req.kind END) WHERE k IS NOT NULL] AS covered_kinds
RETURN c.id AS id, c.name AS name, c.deadline AS deadline, all_reqs, covered_kinds;

// --- 2b) recommend_next status pass ---
MATCH (c:Competition)
OPTIONAL MATCH (:Person {id: 'self'})-[:DECIDED]->(d:Decision)-[:ABOUT]->(c)
RETURN c.id AS id, collect(DISTINCT d.status) AS statuses;

// --- 3) explain_path ---
MATCH (c:Competition {id: $cid})
OPTIONAL MATCH (:Person {id: 'self'})-[:HAS]->(r:Resource)-[:SATISFIES]->(req:Requirement)<-[:REQUIRES]-(c)
RETURN c.name AS competition,
       collect({resource: r.kind, resource_status: r.status, satisfies: req.kind}) AS evidence;

// --- 4) decision history ---
MATCH (:Person {id: 'self'})-[:DECIDED]->(d:Decision)-[:ABOUT]->(c:Competition)
RETURN d.status AS status, d.at AS at, d.note AS note, c.name AS competition
ORDER BY d.at DESC;

// --- 5) remember_decision ---
// MATCH (p:Person {id:'self'}) MATCH (c:Competition {id:$cid})
// CREATE (d:Decision {id:$id, status:$status, at:$at, note:$note})
// CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c)

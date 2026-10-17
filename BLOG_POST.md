# CompGraph: giving a hackathon-advisor agent a memory it can show you

*By Qin HEYI · Graph Hacks: Context for AI Agents (WeMakeDevs × FalkorDB), October 2026*

**Demo:** https://compgraph.vercel.app · **Code:** https://github.com/qinheyi/compgraph

## The problem I actually have

I enter a lot of online hackathons, and a surprising share of the effort is working out which ones I can realistically enter. One wants a LinkedIn profile, which I don't have. Another needs government ID verification, and I've dropped contests over that. Others need a public YouTube demo, a deployment, or a sponsor API key. On top of that is my own history: what I joined, submitted, or gave up on, and why.

A chat model will happily answer "what should I enter next?", but it doesn't know my constraints, doesn't remember last week's decision, and gives me nothing to check its answer against.

So for Graph Hacks I built CompGraph, a small advisor agent whose context (contests, requirements, my resources, my past decisions) lives in FalkorDB. Answers come back with the graph data behind them.

## Why a graph, and why FalkorDB

"Am I eligible for X?" is a join across three things: what the contest requires, what I have, and whether what I have is actually ready. "What should I enter next?" adds a fourth: what I decided before. In a document store or a prompt, that's stitching done by hand on every question. In a graph it's one pattern match.

FalkorDB fit for practical reasons: it runs locally with one `docker compose up`, speaks Cypher, and the Node client (`falkordb` on npm) was all I needed. The four agent tools are thin wrappers around Cypher, so without FalkorDB there are no gaps, no ranking, no path and no memory.

## The graph model

```
Person —HAS→ Resource —SATISFIES→ Requirement ←REQUIRES— Competition
Person —DECIDED→ Decision —ABOUT→ Competition
```

- `Resource` is something I have or lack (`github`, `devpost`, `llm`, `card`, `linkedin`, `youtube`, `government_id`…) with a `status` of `ready`, `missing` or `blocked`.
- `Requirement` is a kind of hurdle (`public_repo`, `demo_video`, `deploy`, `linkedin`, `government_id`, `api_key`, `payment`).
- `Decision` has a `status` (`joined`, `abandoned`, `submitted`, `candidate`), a timestamp and a short note.

An eligibility gap is a requirement with no `ready` resource pointing at it. The seed data is synthetic: 11 "twin" competitions built from public contest metadata, 8 requirements, 8 resources and 10 precedent decisions. They mirror the kinds of blockers I really run into, but there are no secrets or private notes in the graph.

## The four tools

**`list_gaps(competitionId)`** answers "what am I missing?" This is the query from `server/tools.js`:

```cypher
MATCH (c:Competition {id: $cid})-[:REQUIRES]->(req:Requirement)
OPTIONAL MATCH (:Person {id: 'self'})-[:HAS]->(r:Resource)-[:SATISFIES]->(req)
WHERE r.status = 'ready'
WITH c, req, collect(r) AS ready_resources
WHERE size(ready_resources) = 0
RETURN c.name AS competition, req.id AS req_id, req.kind AS missing, req.detail AS detail
ORDER BY missing
```

The `OPTIONAL MATCH` plus `size(...) = 0` is how you say "requirements with nothing ready behind them". For the Graph Hacks twin it returns one row, `demo_video`. My `youtube` resource exists, but it's `blocked`, so it doesn't count.

**`explain_path(competitionId)`** returns the evidence itself: every Person → Resource → Requirement ← Competition hop, including blocked ones:

```cypher
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
```

The tool splits that into covered and blocked hops and adds the `list_gaps` result. For Graph Hacks: 2 covered (`github → public_repo`, `devpost → deploy`), 1 blocked (`youtube → demo_video`), 1 gap. The web UI draws these rows as an SVG path, so the picture is the query result.

**`recommend_next()`** ranks open contests. One pass gathers each contest's requirement kinds and the ones I've covered. A second pass gathers my decision statuses. JavaScript then drops anything already `abandoned` or `submitted` and sorts by fewest missing requirements, then by soonest deadline.

**`remember_decision(...)`** is the memory part. When I say "mark Graph Hacks as joined", it writes a node back into the graph:

```cypher
MATCH (p:Person {id: 'self'})
MATCH (c:Competition {id: $cid})
CREATE (d:Decision {id: $id, status: $status, at: $at, note: $note})
CREATE (p)-[:DECIDED]->(d)
CREATE (d)-[:ABOUT]->(c)
RETURN d.id AS id, d.status AS status, d.at AS at, d.note AS note, c.name AS competition
```

The next `recommend_next` call sees that decision, even in a new session, because it's just more graph.

A regex-based intent router in `server/agent.js` picks the tool from the question. An LLM (MiniMax, optional) only rewrites the tool's JSON into a few sentences. Its system prompt tells it not to add facts that aren't in the JSON, and without an API key you get deterministic template answers. The graph is the source of truth either way.

## Things that bit me

**No `datetime()`.** In FalkorDB, `RETURN datetime()` fails with `Unknown function 'datetime'`, so deadlines and decision times are ISO strings. That sorts fine in practice, but comparing strings with different UTC offsets isn't the same as comparing instants, and I'd like to tighten that up.

**`OPTIONAL MATCH` after an aggregating `WITH`.** My first `recommend_next` was one query: aggregate requirement coverage per contest, then `OPTIONAL MATCH` the decisions on the same `c`. The decision lists came back empty for every contest, including ones with decisions attached. Rather than fight it, I split it into two queries (coverage and status) and merged them by competition id in JavaScript. There's a note about it in `cypher/queries.cypher`.

**My own loader.** `scripts/load.mjs` splits the seed file on lines ending in `;`, so a semicolon at the end of a string property would cut a statement in half. I keep semicolons out of seed strings, and `remember_decision` replaces them in notes as a precaution. Ordering mattered too: a `SATISFIES` edge written before its `Requirement` exists just matches nothing, silently. The seed has one such early line (left in, with a comment); the edges that count are wired with `MERGE` after both sides exist.

**Hosting.** I wanted a one-click demo without another paid cloud account, so the Vercel deployment is a read-only `DEMO` mode with embedded sample responses, and a banner says so. The full product (live FalkorDB, real `remember_decision` writes) runs locally with Docker Compose, as the README describes.

## What I learned

"Explainable" got much easier once the explanation was a query result instead of model narration. When CompGraph says Open Agent is blocked on `linkedin`, I can point at the missing edge. Keeping status on the `Resource` node, instead of deleting edges, also paid off: a blocked YouTube account is still information, and `explain_path` shows it as a near-miss.

## Try it

- Live demo (read-only): https://compgraph.vercel.app
- Repo (MIT), with setup steps and all the Cypher: https://github.com/qinheyi/compgraph

```bash
npm install && docker compose up -d && ./scripts/load.sh && npm start
```

## AI disclosure

I built CompGraph with AI coding assistants (Grok Bot / Cursor agents). They wrote much of the scaffolding, code and docs, and they helped draft this post. I chose the problem, defined the graph model and tool contracts, and checked the Cypher and the results against a local FalkorDB instance. The numbers in this post come from running those tools on the seed graph.

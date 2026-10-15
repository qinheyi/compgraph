// CompGraph — SYNTHETIC seed data (public/fake contest metadata only).
// No API keys, passwords, or private notes. Safe to keep pre-contest as a sketch.
// Load into FalkorDB graph "CompGraph" AFTER 2026-10-15 00:01 IST.

MERGE (:Person {id: 'self', name: 'Qin HEYI'});

// --- Resources the person has (synthetic status) ---
CREATE (:Resource {id: 'res-github', kind: 'github', status: 'ready', note: 'public repos ok'});
CREATE (:Resource {id: 'res-devpost', kind: 'devpost', status: 'ready', note: 'qinheyi267'});
CREATE (:Resource {id: 'res-email', kind: 'email', status: 'ready', note: 'agentmail'});
CREATE (:Resource {id: 'res-llm', kind: 'llm', status: 'ready', note: 'MiniMax available'});
CREATE (:Resource {id: 'res-linkedin', kind: 'linkedin', status: 'missing', note: 'no LinkedIn'});
CREATE (:Resource {id: 'res-youtube', kind: 'youtube', status: 'blocked', note: 'manual upload only'});
CREATE (:Resource {id: 'res-gov-id', kind: 'government_id', status: 'blocked', note: 'prefer skip'});
CREATE (:Resource {id: 'res-card', kind: 'card', status: 'ready', note: 'overseas Visa available'});

MATCH (p:Person {id: 'self'})
MATCH (r:Resource)
CREATE (p)-[:HAS]->(r);

// Satisfaction mapping
MATCH (r:Resource {id: 'res-github'}) MATCH (req:Requirement {id: 'req-public-repo'}) CREATE (r)-[:SATISFIES]->(req);
// Requirements created below — re-run satisfaction after requirements exist.

// --- Requirements catalog ---
CREATE (:Requirement {id: 'req-linkedin', kind: 'linkedin', detail: 'LinkedIn profile required for onboarding'});
CREATE (:Requirement {id: 'req-youtube', kind: 'youtube', detail: 'Public YouTube demo'});
CREATE (:Requirement {id: 'req-demo-video', kind: 'demo_video', detail: 'Demo video any host'});
CREATE (:Requirement {id: 'req-public-repo', kind: 'public_repo', detail: 'Public GitHub repository'});
CREATE (:Requirement {id: 'req-deploy', kind: 'deploy', detail: 'Live deploy or local setup docs'});
CREATE (:Requirement {id: 'req-gov-id', kind: 'government_id', detail: 'Government ID / Kaggle verify'});
CREATE (:Requirement {id: 'req-api-key', kind: 'api_key', detail: 'Sponsor API key'});
CREATE (:Requirement {id: 'req-payment', kind: 'payment', detail: 'Paid entry or payment method'});

// Wire SATISFIES after both sides exist
MATCH (r:Resource {id: 'res-github'}) MATCH (req:Requirement {id: 'req-public-repo'})
MERGE (r)-[:SATISFIES]->(req);
MATCH (r:Resource {id: 'res-devpost'}) MATCH (req:Requirement {id: 'req-deploy'})
MERGE (r)-[:SATISFIES]->(req);
MATCH (r:Resource {id: 'res-llm'}) MATCH (req:Requirement {id: 'req-api-key'})
MERGE (r)-[:SATISFIES]->(req);
MATCH (r:Resource {id: 'res-youtube'}) MATCH (req:Requirement {id: 'req-youtube'})
MERGE (r)-[:SATISFIES]->(req);
MATCH (r:Resource {id: 'res-youtube'}) MATCH (req:Requirement {id: 'req-demo-video'})
MERGE (r)-[:SATISFIES]->(req);
MATCH (r:Resource {id: 'res-linkedin'}) MATCH (req:Requirement {id: 'req-linkedin'})
MERGE (r)-[:SATISFIES]->(req);
MATCH (r:Resource {id: 'res-gov-id'}) MATCH (req:Requirement {id: 'req-gov-id'})
MERGE (r)-[:SATISFIES]->(req);
MATCH (r:Resource {id: 'res-card'}) MATCH (req:Requirement {id: 'req-payment'})
MERGE (r)-[:SATISFIES]->(req);

// --- Synthetic competitions (public metadata style) ---
CREATE (:Competition {
  id: 'c-graph-hacks', name: 'Graph Hacks (synthetic twin)',
  url: 'https://www.wemakedevs.org/hackathons/falkordb',
  deadline: '2026-10-18T23:59:00+05:30',
  mode: 'online', fee: 'free', prize_note: '$20k prizes', host: 'WeMakeDevs'
});
CREATE (:Competition {
  id: 'c-open-agent', name: 'Open Agent Hackathon (synthetic)',
  url: 'https://example.com/open-agent',
  deadline: '2026-10-28T23:59:00+08:00',
  mode: 'online', fee: 'free', prize_note: 'credits', host: 'GenAI.Works'
});
CREATE (:Competition {
  id: 'c-kaggle-id', name: 'Synthetic Kaggle Contest',
  url: 'https://example.com/kaggle-id',
  deadline: '2026-11-01T23:59:00+08:00',
  mode: 'online', fee: 'free', prize_note: '$5k', host: 'Kaggle'
});
CREATE (:Competition {
  id: 'c-qloo-like', name: 'Taste API Hack (synthetic)',
  url: 'https://example.com/taste-hack',
  deadline: '2026-10-20T23:59:00+08:00',
  mode: 'online', fee: 'free', prize_note: 'API credits', host: 'Devpost'
});
CREATE (:Competition {
  id: 'c-shanghai', name: 'Shanghai Offline Meetup Hack (synthetic)',
  url: 'https://example.com/shanghai',
  deadline: '2026-11-15T18:00:00+08:00',
  mode: 'shanghai_offline', fee: 'free', prize_note: 'swag', host: 'Local'
});

// Requirements per competition
MATCH (c:Competition {id: 'c-graph-hacks'})
MATCH (r1:Requirement {id: 'req-public-repo'})
MATCH (r2:Requirement {id: 'req-demo-video'})
MATCH (r3:Requirement {id: 'req-deploy'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2), (c)-[:REQUIRES]->(r3);

MATCH (c:Competition {id: 'c-open-agent'})
MATCH (r1:Requirement {id: 'req-linkedin'})
MATCH (r2:Requirement {id: 'req-public-repo'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2);

MATCH (c:Competition {id: 'c-kaggle-id'})
MATCH (r1:Requirement {id: 'req-gov-id'})
MATCH (r2:Requirement {id: 'req-public-repo'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2);

MATCH (c:Competition {id: 'c-qloo-like'})
MATCH (r1:Requirement {id: 'req-api-key'})
MATCH (r2:Requirement {id: 'req-public-repo'})
MATCH (r3:Requirement {id: 'req-deploy'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2), (c)-[:REQUIRES]->(r3);

MATCH (c:Competition {id: 'c-shanghai'})
MATCH (r1:Requirement {id: 'req-public-repo'})
CREATE (c)-[:REQUIRES]->(r1);

// Similarity
MATCH (a:Competition {id: 'c-graph-hacks'}) MATCH (b:Competition {id: 'c-qloo-like'})
CREATE (a)-[:SIMILAR_TO]->(b), (b)-[:SIMILAR_TO]->(a);
MATCH (a:Competition {id: 'c-qloo-like'}) MATCH (b:Competition {id: 'c-open-agent'})
CREATE (a)-[:SAME_HOST]->(b);

// Decisions (precedent)
MATCH (p:Person {id: 'self'})
CREATE (d1:Decision {id: 'd1', status: 'submitted', at: '2026-10-09T12:00:00+08:00', note: 'demo live'})
CREATE (d2:Decision {id: 'd2', status: 'abandoned', at: '2026-10-10T09:00:00+08:00', note: 'needs ID verify'})
CREATE (d3:Decision {id: 'd3', status: 'joined', at: '2026-10-10T08:37:00+08:00', note: 'solo team'})
CREATE (d4:Decision {id: 'd4', status: 'candidate', at: '2026-10-10T18:00:00+08:00', note: 'blocked on LinkedIn'});
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd1'}) MATCH (c:Competition {id: 'c-qloo-like'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd2'}) MATCH (c:Competition {id: 'c-kaggle-id'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd3'}) MATCH (c:Competition {id: 'c-graph-hacks'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd4'}) MATCH (c:Competition {id: 'c-open-agent'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);

// Optional project capability
CREATE (:Project {id: 'proj-encore', name: 'Encore', repo: 'qinheyi/encore', capability: 'taste-routing-web'});
MATCH (pr:Project {id: 'proj-encore'}) MATCH (c:Competition {id: 'c-qloo-like'})
CREATE (pr)-[:COULD_ENTER]->(c);

// --- Extra public-metadata twins (added 2026-10-13 prep) ---
CREATE (:Competition {
  id: 'c-amazon-bss', name: 'Amazon Build Ship Shape (synthetic twin)',
  url: 'https://amazonappdev2026.devpost.com/',
  deadline: '2026-10-24T03:00:00+08:00',
  mode: 'online', fee: 'free', prize_note: '~$138k cash', host: 'Amazon'
});
CREATE (:Competition {
  id: 'c-paypal-ai', name: 'PayPal AI Hackathon (synthetic twin)',
  url: 'https://paypalaihackathon.devpost.com/',
  deadline: '2026-11-13T04:00:00+08:00',
  mode: 'online', fee: 'free', prize_note: '~$67.5k', host: 'PayPal'
});
CREATE (:Competition {
  id: 'c-airwallex', name: 'Airwallex Agentic Banking (synthetic twin)',
  url: 'https://airwallex.hackerearth.com/',
  deadline: '2026-11-13T23:59:00+08:00',
  mode: 'online', fee: 'free', prize_note: '$30k top', host: 'Airwallex'
});
CREATE (:Competition {
  id: 'c-kane-cli', name: 'Kane CLI Online Hackathon (synthetic twin)',
  url: 'https://luma.com/kanecli-online-hackathon',
  deadline: '2026-11-03T02:29:00+08:00',
  mode: 'online', fee: 'free', prize_note: '$3k', host: 'TestMu'
});
CREATE (:Competition {
  id: 'c-meta-vr', name: 'Meta VR Start 2026 (synthetic twin)',
  url: 'https://start-developer-competition-26.devpost.com/',
  deadline: '2026-11-19T04:00:00+08:00',
  mode: 'online', fee: 'free', prize_note: 'up to $100k track', host: 'Meta'
});
CREATE (:Competition {
  id: 'c-cfi-billion', name: 'Code for a Billion (synthetic twin)',
  url: 'https://codeforindia.org/hackathon',
  deadline: '2026-11-15T23:59:00+08:00',
  mode: 'online', fee: 'free', prize_note: 'INR 18 lakh', host: 'Code for India'
});

MATCH (c:Competition {id: 'c-amazon-bss'})
MATCH (r1:Requirement {id: 'req-public-repo'})
MATCH (r2:Requirement {id: 'req-demo-video'})
MATCH (r3:Requirement {id: 'req-deploy'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2), (c)-[:REQUIRES]->(r3);

MATCH (c:Competition {id: 'c-paypal-ai'})
MATCH (r1:Requirement {id: 'req-public-repo'})
MATCH (r2:Requirement {id: 'req-youtube'})
MATCH (r3:Requirement {id: 'req-deploy'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2), (c)-[:REQUIRES]->(r3);

MATCH (c:Competition {id: 'c-airwallex'})
MATCH (r1:Requirement {id: 'req-public-repo'})
MATCH (r2:Requirement {id: 'req-demo-video'})
MATCH (r3:Requirement {id: 'req-api-key'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2), (c)-[:REQUIRES]->(r3);

MATCH (c:Competition {id: 'c-kane-cli'})
MATCH (r1:Requirement {id: 'req-public-repo'})
MATCH (r2:Requirement {id: 'req-demo-video'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2);

MATCH (c:Competition {id: 'c-meta-vr'})
MATCH (r1:Requirement {id: 'req-deploy'})
MATCH (r2:Requirement {id: 'req-youtube'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2);

MATCH (c:Competition {id: 'c-cfi-billion'})
MATCH (r1:Requirement {id: 'req-public-repo'})
MATCH (r2:Requirement {id: 'req-deploy'})
MATCH (r3:Requirement {id: 'req-demo-video'})
CREATE (c)-[:REQUIRES]->(r1), (c)-[:REQUIRES]->(r2), (c)-[:REQUIRES]->(r3);

MATCH (a:Competition {id: 'c-amazon-bss'}) MATCH (b:Competition {id: 'c-paypal-ai'})
CREATE (a)-[:SIMILAR_TO]->(b), (b)-[:SIMILAR_TO]->(a);
MATCH (a:Competition {id: 'c-graph-hacks'}) MATCH (b:Competition {id: 'c-kane-cli'})
CREATE (a)-[:SIMILAR_TO]->(b);

MATCH (p:Person {id: 'self'})
CREATE (d5:Decision {id: 'd5', status: 'joined', at: '2026-10-11T08:36:00+08:00', note: 'Entry Gate demo live'})
CREATE (d6:Decision {id: 'd6', status: 'joined', at: '2026-10-11T08:45:00+08:00', note: 'DisputeSteward scaffold'})
CREATE (d7:Decision {id: 'd7', status: 'joined', at: '2026-10-10T09:54:00+08:00', note: 'Ledger Pilot idea published'})
CREATE (d8:Decision {id: 'd8', status: 'joined', at: '2026-10-12T09:00:00+08:00', note: 'Luma registered - repo after 10-26'})
CREATE (d9:Decision {id: 'd9', status: 'joined', at: '2026-10-10T12:00:00+08:00', note: 'Pocket Weather live'})
CREATE (d10:Decision {id: 'd10', status: 'candidate', at: '2026-10-13T08:50:00+08:00', note: 'needs AgentFoundry IDE'});

MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd5'}) MATCH (c:Competition {id: 'c-amazon-bss'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd6'}) MATCH (c:Competition {id: 'c-paypal-ai'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd7'}) MATCH (c:Competition {id: 'c-airwallex'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd8'}) MATCH (c:Competition {id: 'c-kane-cli'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd9'}) MATCH (c:Competition {id: 'c-meta-vr'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);
MATCH (p:Person {id: 'self'}) MATCH (d:Decision {id: 'd10'}) MATCH (c:Competition {id: 'c-cfi-billion'})
CREATE (p)-[:DECIDED]->(d), (d)-[:ABOUT]->(c);

CREATE (:Project {id: 'proj-entry-gate', name: 'Entry Gate', repo: 'qinheyi/entry-gate', capability: 'submission-audit-agent'});
CREATE (:Project {id: 'proj-dispute', name: 'DisputeSteward', repo: 'qinheyi/dispute-steward', capability: 'paypal-dispute-agent'});
MATCH (pr:Project {id: 'proj-entry-gate'}) MATCH (c:Competition {id: 'c-amazon-bss'})
CREATE (pr)-[:COULD_ENTER]->(c);
MATCH (pr:Project {id: 'proj-dispute'}) MATCH (c:Competition {id: 'c-paypal-ai'})
CREATE (pr)-[:COULD_ENTER]->(c);

// CompGraph — schema conventions
// Graph name: CompGraph
// FalkorDB note: no datetime(); store ISO strings for deadline / at.

// Person (single self node)
// CREATE (:Person {id: 'self', name: 'Qin HEYI'});

// Competition: id, name, url, deadline (ISO string), mode, fee, prize_note, host
// mode: online | shanghai_offline | other

// Requirement kinds:
// linkedin, youtube, payment, government_id, legal_waiver,
// public_speaking, deploy, public_repo, demo_video, api_key,
// team_min, student_only, invite_only

// Resource kinds: github, devpost, api_key, email, llm, card, authenticator, linkedin, youtube, government_id
// Resource.status: ready | missing | blocked

// Decision.status: joined | abandoned | submitted | candidate

// Edges: HAS, SATISFIES, REQUIRES, DECIDED, ABOUT, COULD_ENTER, SAME_HOST, SIMILAR_TO
// Session memory: new Decision nodes + DECIDED/ABOUT edges written by remember_decision tool

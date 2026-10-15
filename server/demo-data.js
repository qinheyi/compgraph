/**
 * Read-only demo fallback when FalkorDB is unreachable (e.g. Vercel preview).
 * Mirrors synthetic seed structure — clearly labeled as demo mode.
 */
export const DEMO_COMPETITIONS = [
  {
    id: 'c-graph-hacks',
    name: 'Graph Hacks (synthetic twin)',
    deadline: '2026-10-18T23:59:00+05:30',
    mode: 'online',
    host: 'WeMakeDevs',
    fee: 'free',
    prize_note: '$20k prizes',
    url: 'https://www.wemakedevs.org/hackathons/falkordb',
    requirements: ['public_repo', 'demo_video', 'deploy'],
  },
  {
    id: 'c-kane-cli',
    name: 'Kane CLI Online Hackathon (synthetic twin)',
    deadline: '2026-11-03T02:29:00+08:00',
    mode: 'online',
    host: 'TestMu',
    requirements: ['public_repo', 'demo_video'],
  },
  {
    id: 'c-shanghai',
    name: 'Shanghai Offline Meetup Hack (synthetic)',
    deadline: '2026-11-15T18:00:00+08:00',
    mode: 'shanghai_offline',
    host: 'Local',
    requirements: ['public_repo'],
  },
  {
    id: 'c-open-agent',
    name: 'Open Agent Hackathon (synthetic)',
    deadline: '2026-10-28T23:59:00+08:00',
    mode: 'online',
    host: 'GenAI.Works',
    requirements: ['linkedin', 'public_repo'],
  },
  {
    id: 'c-kaggle-id',
    name: 'Synthetic Kaggle Contest',
    deadline: '2026-11-01T23:59:00+08:00',
    mode: 'online',
    host: 'Kaggle',
    requirements: ['government_id', 'public_repo'],
  },
];

const READY = new Set(['public_repo', 'deploy', 'api_key', 'demo_video', 'payment']);
// youtube/linkedin/gov_id not ready in seed

export function demoListGaps(cid) {
  const c = DEMO_COMPETITIONS.find((x) => x.id === cid) || DEMO_COMPETITIONS[0];
  const gaps = (c.requirements || [])
    .filter((k) => !READY.has(k) && k !== 'demo_video') // demo_video satisfied by youtube resource but status blocked — treat demo_video as gap if only youtube maps
    .map((k) => ({
      competition: c.name,
      req_id: `req-${k}`,
      missing: k,
      detail: `${k} not ready`,
    }));
  // Refine: demo_video is blocked (youtube blocked), linkedin missing, gov_id blocked
  const blockedKinds = new Set(['linkedin', 'youtube', 'government_id', 'demo_video']);
  // Actually seed: youtube SATISFIES demo_video but status=blocked, so demo_video is a gap
  // public_repo ready, deploy ready via... wait seed maps deploy to res-devpost (ready). api_key via llm ready.
  const realGaps = (c.requirements || [])
    .filter((k) => {
      if (k === 'public_repo' || k === 'deploy' || k === 'api_key' || k === 'payment') return false;
      return true; // linkedin, youtube, government_id, demo_video are gaps
    })
    .map((k) => ({
      competition: c.name,
      missing: k,
      detail: `No ready resource satisfies ${k}`,
    }));
  return { tool: 'list_gaps', competitionId: c.id, gaps: realGaps, count: realGaps.length, demo: true };
}

export function demoRecommend() {
  const recommendations = DEMO_COMPETITIONS.map((c) => {
    const missing = (c.requirements || []).filter(
      (k) => !['public_repo', 'deploy', 'api_key', 'payment'].includes(k)
    );
    return {
      id: c.id,
      name: c.name,
      deadline: c.deadline,
      mode: c.mode,
      host: c.host,
      url: c.url,
      req_count: (c.requirements || []).length,
      missing_count: missing.length,
      missing,
      statuses: c.id === 'c-graph-hacks' ? ['joined'] : c.id === 'c-open-agent' ? ['candidate'] : [],
    };
  }).sort((a, b) => a.missing_count - b.missing_count || a.deadline.localeCompare(b.deadline));
  return { tool: 'recommend_next', recommendations, count: recommendations.length, demo: true };
}

export function demoExplain(cid) {
  const c = DEMO_COMPETITIONS.find((x) => x.id === cid) || DEMO_COMPETITIONS[0];
  const evidence = (c.requirements || []).map((k) => {
    const ready = ['public_repo', 'deploy', 'api_key', 'payment'].includes(k);
    const map = {
      public_repo: 'github',
      deploy: 'devpost',
      api_key: 'llm',
      payment: 'card',
      demo_video: 'youtube',
      linkedin: 'linkedin',
      youtube: 'youtube',
      government_id: 'government_id',
    };
    return {
      resource: map[k] || k,
      resource_status: ready ? 'ready' : k === 'linkedin' ? 'missing' : 'blocked',
      satisfies: k,
      hop: 'Person→HAS→Resource→SATISFIES→Requirement←REQUIRES←Competition',
    };
  });
  const gaps = demoListGaps(c.id).gaps;
  const covered = evidence.filter((e) => e.resource_status === 'ready');
  const blocked = evidence.filter((e) => e.resource_status !== 'ready');
  return {
    tool: 'explain_path',
    competitionId: c.id,
    competition: c.name,
    pathPattern: 'Person → HAS → Resource → SATISFIES → Requirement ← REQUIRES ← Competition',
    evidence,
    covered,
    blocked,
    gaps,
    summary: { coveredCount: covered.length, blockedCount: blocked.length, gapCount: gaps.length },
    demo: true,
  };
}

export function demoDecisions() {
  return {
    tool: 'list_decisions',
    demo: true,
    decisions: [
      { id: 'd3', status: 'joined', at: '2026-10-10T08:37:00+08:00', note: 'solo team', competition_id: 'c-graph-hacks', competition: 'Graph Hacks (synthetic twin)' },
      { id: 'd4', status: 'candidate', at: '2026-10-10T18:00:00+08:00', note: 'blocked on LinkedIn', competition_id: 'c-open-agent', competition: 'Open Agent Hackathon (synthetic)' },
      { id: 'd2', status: 'abandoned', at: '2026-10-10T09:00:00+08:00', note: 'needs ID verify', competition_id: 'c-kaggle-id', competition: 'Synthetic Kaggle Contest' },
    ],
    count: 3,
  };
}

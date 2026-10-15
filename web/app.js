const $ = (s) => document.querySelector(s);
const questionEl = $('#question');
const toolEl = $('#tool');
const cidEl = $('#competitionId');
const answerEl = $('#answer');
const metaEl = $('#meta');
const rawEl = $('#raw');
const modeBadge = $('#modeBadge');
const pathHint = $('#pathHint');
const svg = $('#graphSvg');

async function boot() {
  try {
    const h = await fetch('/api/health').then((r) => r.json());
    modeBadge.textContent = h.mode === 'live' ? 'LIVE · FalkorDB' : 'DEMO · read-only';
    modeBadge.className = 'badge ' + (h.mode === 'live' ? 'live' : 'demo');
  } catch {
    modeBadge.textContent = 'OFFLINE';
    modeBadge.className = 'badge demo';
  }
  try {
    const c = await fetch('/api/competitions').then((r) => r.json());
    const list = c.competitions || [];
    list.forEach((x) => {
      const opt = document.createElement('option');
      opt.value = x.id;
      opt.textContent = x.name;
      cidEl.appendChild(opt);
    });
  } catch (_) {}
  drawEmpty();
}

document.querySelectorAll('.chips button').forEach((btn) => {
  btn.addEventListener('click', () => {
    questionEl.value = btn.dataset.q || '';
    if (btn.dataset.tool) toolEl.value = btn.dataset.tool;
    if (btn.dataset.cid) cidEl.value = btn.dataset.cid;
    ask();
  });
});

$('#askForm').addEventListener('submit', (e) => {
  e.preventDefault();
  ask();
});

async function ask() {
  const body = {
    question: questionEl.value.trim(),
    tool: toolEl.value || undefined,
    competitionId: cidEl.value || undefined,
  };
  if (toolEl.value === 'remember_decision') {
    body.status = 'candidate';
    body.note = body.question || 'from UI';
  }
  answerEl.classList.remove('empty');
  answerEl.textContent = 'Querying graph…';
  metaEl.textContent = '';
  rawEl.textContent = '';
  const btn = $('#askForm button.primary');
  btn.disabled = true;
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    answerEl.textContent = data.answer || JSON.stringify(data.result, null, 2);
    metaEl.textContent = [
      `tool: ${data.tool}`,
      data.competitionId ? `competition: ${data.competitionId}` : null,
      `answer: ${data.answerSource}`,
      `mode: ${data.mode}`,
    ]
      .filter(Boolean)
      .join(' · ');
    rawEl.textContent = JSON.stringify(data.result, null, 2);
    if (data.graphPath) {
      pathHint.textContent = data.graphPath.pattern || pathHint.textContent;
      drawGraph(data.graphPath);
    } else {
      drawEmpty();
    }
  } catch (err) {
    answerEl.textContent = 'Error: ' + err.message;
    drawEmpty();
  } finally {
    btn.disabled = false;
  }
}

function drawEmpty() {
  svg.innerHTML = '';
  const t = el('text', { x: 320, y: 200, 'text-anchor': 'middle', fill: '#8fa0c8', 'font-size': 14 });
  t.textContent = 'Run a query to visualize multi-hop paths';
  svg.appendChild(t);
}

function drawGraph(gp) {
  svg.innerHTML = '';
  const nodes = gp.nodes || [];
  const edges = gp.edges || [];
  if (!nodes.length) return drawEmpty();

  const W = 640, H = 420;
  const positions = layout(nodes, edges, W, H);

  // defs arrow
  const defs = el('defs');
  defs.innerHTML = `<marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#4a5f99"/></marker>`;
  svg.appendChild(defs);

  edges.forEach((e) => {
    const a = positions[e.from], b = positions[e.to];
    if (!a || !b) return;
    const path = el('path', {
      class: 'edge',
      d: curve(a, b),
      'marker-end': 'url(#arrow)',
    });
    svg.appendChild(path);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 };
    const lab = el('text', { class: 'edge-label', x: mid.x, y: mid.y });
    lab.textContent = e.label || '';
    svg.appendChild(lab);
  });

  nodes.forEach((n) => {
    const p = positions[n.id];
    if (!p) return;
    const g = el('g', { class: 'node' });
    const color = colorFor(n);
    const c = el('circle', { cx: p.x, cy: p.y, r: 28, fill: color.fill, stroke: color.stroke });
    g.appendChild(c);
    const lines = String(n.label || n.id).split('\n');
    lines.forEach((line, i) => {
      const t = el('text', {
        x: p.x,
        y: p.y - ((lines.length - 1) * 6) + i * 12,
        fill: '#e8eefc',
        'font-size': 10,
        'text-anchor': 'middle',
      });
      t.textContent = line.slice(0, 22);
      g.appendChild(t);
    });
    svg.appendChild(g);
  });
}

function colorFor(n) {
  const t = n.type || '';
  if (t === 'Person') return { fill: '#1b3a5f', stroke: '#5b8cff' };
  if (t === 'Competition') return { fill: '#163a3a', stroke: '#3dd6c6' };
  if (t === 'Resource') {
    if (n.status === 'ready') return { fill: '#143528', stroke: '#3ecf8e' };
    if (n.status === 'missing') return { fill: '#3a2a14', stroke: '#ffb020' };
    return { fill: '#3a1820', stroke: '#ff6b7a' };
  }
  if (t === 'Requirement') return { fill: '#2a2450', stroke: '#9b8cff' };
  if (t === 'Gap') return { fill: '#3a1820', stroke: '#ff6b7a' };
  return { fill: '#1a2240', stroke: '#4a5f99' };
}

function layout(nodes, edges, W, H) {
  const byType = {};
  nodes.forEach((n) => {
    const t = n.type || 'Other';
    (byType[t] = byType[t] || []).push(n);
  });
  const order = ['Person', 'Resource', 'Requirement', 'Gap', 'Competition', 'Other'];
  const cols = order.filter((t) => byType[t]?.length);
  const positions = {};
  cols.forEach((t, ci) => {
    const list = byType[t];
    const x = ((ci + 0.5) / cols.length) * (W - 80) + 40;
    list.forEach((n, ri) => {
      const y = ((ri + 0.5) / list.length) * (H - 80) + 40;
      positions[n.id] = { x, y };
    });
  });
  return positions;
}

function curve(a, b) {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} Q ${mx} ${a.y} ${b.x} ${b.y}`;
}

function el(name, attrs = {}) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
}

boot();

/**
 * Optional MiniMax polish. Falls back to deterministic templates (no key / errors).
 * Docs: https://platform.minimax.cn
 * Env: MINIMAX_API_KEY
 */
const API_URL =
  process.env.MINIMAX_API_URL ||
  'https://api.minimax.chat/v1/text/chatcompletion_v2';
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01';

export async function polishAnswer({ question, toolName, toolResult }) {
  const template = templateAnswer(question, toolName, toolResult);
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    return { text: template, source: 'template' };
  }
  try {
    const body = {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are CompGraph, a concise competition advisor. Rewrite the tool JSON into 2-4 short sentences in English. Mention concrete competition names and missing requirement kinds. Do not invent facts not in the JSON.',
        },
        {
          role: 'user',
          content: `Question: ${question}\nTool: ${toolName}\nResult JSON:\n${JSON.stringify(toolResult).slice(0, 3500)}`,
        },
      ],
      max_tokens: 280,
      temperature: 0.3,
    };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      return { text: template, source: 'template', llmError: `HTTP ${res.status}` };
    }
    const json = await res.json();
    const text =
      json?.choices?.[0]?.message?.content ||
      json?.reply ||
      json?.base_resp?.status_msg;
    if (!text || typeof text !== 'string') {
      return { text: template, source: 'template', llmError: 'empty' };
    }
    return { text: text.trim(), source: 'minimax' };
  } catch (err) {
    return { text: template, source: 'template', llmError: String(err.message || err) };
  }
}

function templateAnswer(question, toolName, result) {
  switch (toolName) {
    case 'recommend_next': {
      const recs = result.recommendations || [];
      if (!recs.length) return 'No open candidates matched your resources and preferences.';
      const lines = recs.slice(0, 3).map((r, i) => {
        const miss = (r.missing || []).join(', ') || 'none';
        return `${i + 1}. ${r.name} (deadline ${r.deadline}) — missing: ${miss}`;
      });
      return `Top recommendations by fewest eligibility gaps, then soonest deadline:\n${lines.join('\n')}`;
    }
    case 'list_gaps': {
      const gaps = result.gaps || [];
      if (!gaps.length) {
        return `No eligibility gaps for ${result.competitionId}. All required resources are ready.`;
      }
      return `Gaps for ${result.competitionId}: ${gaps.map((g) => g.missing).join(', ')}.`;
    }
    case 'explain_path': {
      const s = result.summary || {};
      const covered = (result.covered || [])
        .map((e) => `${e.resource}→${e.satisfies}`)
        .join(', ');
      const gapKinds = (result.gaps || []).map((g) => g.missing).join(', ') || 'none';
      return `Path for ${result.competition}: covered ${s.coveredCount || 0} (${covered || '—'}), blocked ${s.blockedCount || 0}, gaps ${s.gapCount || 0} (${gapKinds}). Pattern: ${result.pathPattern}`;
    }
    case 'list_decisions': {
      const n = result.count || 0;
      const top = (result.decisions || [])
        .slice(0, 3)
        .map((d) => `${d.status}@${d.competition}`)
        .join('; ');
      return `You have ${n} decisions on the graph. Recent: ${top || 'none'}.`;
    }
    case 'remember_decision': {
      const w = result.written;
      return w
        ? `Remembered: ${w.status} for ${w.competition} (${w.id}).`
        : 'Decision write attempted.';
    }
    case 'list_competitions': {
      return `Graph holds ${result.competitions?.length || 0} competitions.`;
    }
    default:
      return `Tool ${toolName} completed. Question was: ${question}`;
  }
}

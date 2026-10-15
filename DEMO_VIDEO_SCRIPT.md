# CompGraph demo video script (≤ 3 minutes)

Record locally (OBS / system screen recorder). Upload to YouTube (or any public host) yourself. Target **2:00–2:45**.

## Shot list

| Time | Visual | Narration (EN) |
|---|---|---|
| 0:00–0:15 | README / repo + WeMakeDevs page | “CompGraph is my Graph Hacks entry — a competition advisor whose context lives in FalkorDB.” |
| 0:15–0:35 | Terminal: `docker compose ps`, `./scripts/load.sh`, count query | “FalkorDB runs in Docker. I load synthetic contest metadata into the CompGraph graph — no secrets.” |
| 0:35–0:55 | UI opens, badge shows LIVE | “The web UI talks to agent tools that are pure Cypher.” |
| 0:55–1:25 | Click **Recommend next** — show answer + ranked list + SVG | “recommend_next ranks contests by fewest eligibility gaps, then deadline. The ranking is computed in the graph.” |
| 1:25–1:55 | Click **Explain path** for Graph Hacks / Open Agent | “explain_path returns the multi-hop evidence: Person → Resource → SATISFIES → Requirement ← Competition, plus gaps like LinkedIn.” |
| 1:55–2:20 | Click **Remember**, then **Decisions** | “remember_decision writes a Decision node back into FalkorDB — session memory the next query can see.” |
| 2:20–2:40 | Brief mermaid / ASCII model in README | “Company Brain track: people, resources, contests, and decisions on one graph. Secondary: agents that act on connected data.” |
| 2:40–2:50 | End card: repo URL + demo URL | “Repo qinheyi/compgraph — MIT. Thanks!” |

## Tips

- Use a large browser zoom (125%).  
- Hide personal bookmarks / unrelated tabs.  
- If MiniMax is unset, say “template answers — graph is still the source of truth.”  
- Do **not** show `.env` or API keys.

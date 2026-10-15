# Architecture

See root README for the primary diagram. This file expands runtime modes.

## Modes

| Mode | When | FalkorDB | Session memory |
|---|---|---|---|
| `live` | Local Compose + successful connect | Yes | Yes (`remember_decision`) |
| `demo` | `COMPGRAPH_DEMO=1` or connect failure (e.g. Vercel) | No | Read-only message |

## Request flow

1. UI `POST /api/ask` with question / optional tool + competition id  
2. Intent router selects a tool  
3. Tool runs Cypher (or demo twin)  
4. Optional MiniMax polish → template fallback  
5. Path viz payload returned for SVG rendering  

## Security / data

- Seed and demo data are synthetic public-metadata twins  
- Never store API keys or personal secrets as graph properties  

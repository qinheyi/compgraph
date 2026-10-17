# CompGraph — Graph Hacks submission draft (English)

**Project name:** CompGraph  
**Team:** Solo — Qin HEYI (team code AGPRKA)  
**Tracks:** Company Brain (primary); Agents That Act on Connected Data (secondary)  
**Repo:** https://github.com/qinheyi/compgraph  
**Demo:** https://compgraph.vercel.app  
**Video:** https://github.com/qinheyi/compgraph/releases/download/graph-hacks-demo/compgraph-demo.mp4

## One-liner

A personal competition-advisor agent that keeps contests, eligibility requirements, resources, and past decisions in **FalkorDB**, then answers “what should I enter next?” with **traceable multi-hop graph paths**.

## Problem

Hackathon hunters juggle deadlines, blockers (LinkedIn, ID verify, YouTube), and past join/abandon decisions. LLMs alone invent reasons. You need a **connected company/personal brain** that can show *why*.

## Solution

CompGraph models:

- Competitions and their `REQUIRES`  
- Personal `Resource` nodes (`HAS`) that `SATISFIES` requirements  
- `Decision` precedents (`DECIDED` / `ABOUT`) written back as **session memory**

Agent tools (`list_gaps`, `recommend_next`, `explain_path`, `remember_decision`) are thin wrappers over Cypher. MiniMax is optional polish; templates work offline.

## How FalkorDB is central

Remove FalkorDB and eligibility gaps, ranked recommendations, path explanations, and persistent decisions disappear. The UI visualizes the same paths the tools return.

## Graph model (short)

Person —HAS→ Resource —SATISFIES→ Requirement ←REQUIRES— Competition  
Person —DECIDED→ Decision —ABOUT→ Competition  

## Setup for judges

1. `docker compose up -d && ./scripts/load.sh && npm install && npm start`  
2. Open http://127.0.0.1:8787  
3. Click **Explain path** / **Recommend next** / **Remember**

Or open the Vercel demo (read-only) and watch the video for the live FalkorDB session.

## AI disclosure

AI coding assistants helped with scaffolding and docs. Qin HEYI owns the graph model, Cypher, architecture, and verification.

## Built with

FalkorDB, Node.js, Express, optional MiniMax, Docker Compose, Vercel (demo UI).

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="${FALKORDB_CONTAINER:-compgraph-falkordb}"

DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  if sudo docker info >/dev/null 2>&1; then
    DOCKER=(sudo docker)
  else
    echo "Docker is not available." >&2
    exit 1
  fi
fi

if ! "${DOCKER[@]}" ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Starting FalkorDB..."
  (cd "$ROOT" && "${DOCKER[@]}" compose up -d)
  sleep 2
fi

cd "$ROOT"
if [[ ! -d node_modules ]]; then
  npm install
fi
node scripts/load.mjs

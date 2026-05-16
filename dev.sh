#!/usr/bin/env bash
# Backend (--watch): http://localhost:3000 · Vite: http://localhost:5173
set -uo pipefail

cd "$(dirname "$0")"

if [[ ! -d node_modules ]]; then
  npm install
fi
if [[ ! -d client/node_modules ]]; then
  npm --prefix client install
fi

npm run dev & srv=$!
npm run client:dev & ui=$!

cleanup() {
  kill "$srv" "$ui" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

wait "$srv" "$ui"

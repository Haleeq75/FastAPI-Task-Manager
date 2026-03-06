#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
PORT="${PORT:-4173}"

sed "s|\${API_BASE_URL}|${API_BASE_URL}|g" config.template.js > config.js

echo "Serving frontend on http://localhost:${PORT} with API_BASE_URL=${API_BASE_URL}"
python3 -m http.server "${PORT}" --bind 0.0.0.0

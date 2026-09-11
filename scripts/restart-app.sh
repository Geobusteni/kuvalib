#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

# Restart the Kuvalib server.
#
# Prefers the systemd service (which also restarts the app automatically if it
# ever stops on its own — see scripts/install-service.sh). Falls back to a
# plain `node server.js` under nohup when there is no service.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

PORT="${PORT:-3000}"

if command -v systemctl >/dev/null 2>&1 \
   && [ "$(systemctl show -p LoadState --value kuvalib.service 2>/dev/null)" = "loaded" ]; then
  echo "🔄 Restarting kuvalib.service…"
  sudo systemctl restart kuvalib
  sleep 2
  systemctl --no-pager --lines=0 status kuvalib || true
  exit $?
fi

echo "ℹ️  No kuvalib systemd service found — restarting a plain node process."
echo "    Install the service for auto-restart:  ./scripts/install-service.sh"

echo "⏹️  Stopping current process…"
pkill -TERM -f "node server.js" 2>/dev/null || true
command -v lsof >/dev/null && lsof -ti:"$PORT" | xargs -r kill -TERM 2>/dev/null || true
sleep 2
pkill -KILL -f "node server.js" 2>/dev/null || true

if [ ! -f server.js ]; then
  echo "❌ server.js not found. This directory is not a deployed build."
  echo "   Deploy one with:  ./scripts/update-from-github.sh"
  exit 1
fi

echo "▶️  Starting…"
set -a
# shellcheck disable=SC1091
source .env
set +a
nohup node server.js > kuvalib.log 2>&1 &

sleep 3
if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/api/health"; then
  echo "✅ Started — http://127.0.0.1:${PORT}/api/health is responding."
  echo "📋 Logs: tail -f kuvalib.log"
else
  echo "❌ Not responding yet. Check: tail -50 kuvalib.log"
  exit 1
fi

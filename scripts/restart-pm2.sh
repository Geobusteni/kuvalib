#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

# Restart Kuvalib using PM2.
#
# systemd (scripts/install-service.sh) is the recommended process manager; use
# PM2 only on hosts without systemd.

echo "🔄 Restarting Kuvalib with PM2..."

cd "$(dirname "$0")/.." || exit 1

if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed"
    echo "📦 Install with: npm install -g pm2"
    exit 1
fi

if [ ! -f server.js ]; then
    echo "❌ server.js not found — this directory is not a deployed build."
    exit 1
fi

if pm2 describe kuvalib &> /dev/null; then
    echo "🔄 Restarting existing PM2 process..."
    pm2 restart kuvalib --update-env
else
    echo "▶️  Starting new PM2 process..."
    # Load .env into pm2's environment — server.js does not read it itself.
    set -a; . ./.env; set +a
    pm2 start server.js --name "kuvalib" --update-env
    pm2 save
fi

echo ""
echo "✅ Done!"
echo "📊 Status: pm2 status"
echo "📋 Logs:   pm2 logs kuvalib"

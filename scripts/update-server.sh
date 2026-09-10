#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

# ─────────────────────────────────────────────────────────────────────────────
# DEPRECATED. This script does a `git pull` and builds on the server, which the
# deployment model explicitly forbids (OOM risk, and production ships build
# artifacts only). Use the artifact flow instead:
#
#   ./scripts/update-from-github.sh      # pull + deploy the latest CI build
#
# See DEPLOYMENT.md. This script is kept only for old muscle memory and will be
# removed in a future release.
# ─────────────────────────────────────────────────────────────────────────────
echo "⚠️  update-server.sh is deprecated — use ./scripts/update-from-github.sh" >&2
read -r -p "Run it anyway? [y/N] " _ans
[ "$_ans" = "y" ] || [ "$_ans" = "Y" ] || exit 1

echo "🔄 Updating Kuvalib..."
echo ""

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Check for required files
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are you in the project root?"
  exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "⚠️  Warning: .env not found. You'll need to configure it after update."
fi

# Stash any local changes to .env (will be restored later)
if [ -f ".env" ]; then
  echo "💾 Backing up .env..."
  cp .env .env.backup
fi

# The GitHub repo was renamed from "photolib" to "kuvalib". Point this
# checkout's 'origin' at the current URL before pulling, so older clones keep
# working without relying on GitHub's redirect.
REPO_URL="https://github.com/Geobusteni/kuvalib.git"
CURRENT_URL="$(git remote get-url origin 2>/dev/null || true)"
if [ -n "$CURRENT_URL" ] && [ "$CURRENT_URL" != "$REPO_URL" ]; then
  echo "🔗 Updating 'origin' remote: $CURRENT_URL → $REPO_URL"
  git remote set-url origin "$REPO_URL"
fi

# Pull latest changes from git
echo "📥 Pulling latest changes from repository..."
git fetch --tags
git pull

# Restore .env
if [ -f ".env.backup" ]; then
  echo "📥 Restoring .env..."
  mv .env.backup .env
fi

# Check if there are new dependencies
echo "📦 Installing dependencies..."
npm ci --omit=dev

# Temporarily install dev dependencies for build
echo "📦 Installing build dependencies..."
npm install --save-dev

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check for pending migrations
echo "🔍 Checking for database migrations..."
if npx prisma migrate status | grep -q "Database schema is up to date"; then
  echo "✅ Database is up to date"
else
  echo "⚠️  Pending migrations found. Running migrations..."
  npx prisma migrate deploy
fi

# Rebuild the application
echo "🔨 Rebuilding application..."
NODE_ENV=production npm run build

# Remove dev dependencies after build
echo "🧹 Removing dev dependencies..."
rm -rf node_modules
npm ci --omit=dev

# Get current version
VERSION=$(node -p "require('./package.json').version")

echo ""
echo "✅ Update complete!"
echo "📌 Version: $VERSION"
echo ""
echo "🔄 Restart the application to apply changes:"
echo "   - If using PM2: pm2 restart kuvalib"
echo "   - If using systemd: sudo systemctl restart kuvalib"
echo "   - If running manually: stop and run 'npm start' again"
echo ""

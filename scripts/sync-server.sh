#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -euo pipefail

# Push a locally-held kuvalib-deploy.tar.gz to a server and deploy it there with
# the same safe stop/swap/rollback flow as update-from-github.sh. Use this when
# the server cannot reach GitHub, or to ship a build straight from a laptop.
#
# The tarball comes from the "Build and Package" workflow's artifact (download
# it from the Actions run) — never build it on the server.

REMOTE_USER="" # e.g. "ubuntu"
REMOTE_HOST="" # e.g. "kuvalib.example.com"
REMOTE_PATH="" # e.g. "/var/www/kuvalib"  (the deployed app directory)
PACKAGE_FILE="kuvalib-deploy.tar.gz"
EXTRA_ARGS="${*:-}"   # forwarded to update-from-github.sh (e.g. --force-schema)

echo "🔄 Kuvalib Sync"

[ -f "$PACKAGE_FILE" ] || {
  echo "❌ $PACKAGE_FILE not found in $(pwd)."
  echo "   Download it from the GitHub Actions 'Build and Package' run."
  exit 1
}

if [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_HOST" ] || [ -z "$REMOTE_PATH" ]; then
  read -r -p "Remote user (e.g. ubuntu): " REMOTE_USER
  read -r -p "Remote host (e.g. 1.2.3.4): " REMOTE_HOST
  read -r -p "Remote app path (e.g. /var/www/kuvalib): " REMOTE_PATH
fi

REMOTE="$REMOTE_USER@$REMOTE_HOST"
echo "📤 Uploading $PACKAGE_FILE to $REMOTE:$REMOTE_PATH/ …"
ssh "$REMOTE" "mkdir -p '$REMOTE_PATH'"
scp "$PACKAGE_FILE" "$REMOTE:$REMOTE_PATH/"

echo "🚀 Deploying on the server (safe stop → swap → migrate → start)…"
# On a brand-new server there is no scripts/ yet — unpack once to bootstrap it.
# shellcheck disable=SC2029
ssh "$REMOTE" "cd '$REMOTE_PATH' && { [ -x scripts/update-from-github.sh ] || tar -xzf '$PACKAGE_FILE' scripts; } && chmod +x scripts/*.sh && ./scripts/update-from-github.sh --local '$REMOTE_PATH/$PACKAGE_FILE' $EXTRA_ARGS && rm -f '$REMOTE_PATH/$PACKAGE_FILE'"

echo "✅ Sync complete."

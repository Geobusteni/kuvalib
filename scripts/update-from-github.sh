#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

# Pull the latest build artifact from GitHub Actions and deploy it.
#
# Flow (the running server keeps serving until step 4):
#   1. Download + extract the new build into .staging/
#   2. Validate it, warm the Prisma CLI cache, hardlink-snapshot the live build
#      into .rollback/
#   3. Stop the running server cleanly (SIGTERM, wait for the port to free)
#   4. Swap the build in with `rsync -a --delete` (removes files the new build
#      dropped — the reason a hand-picked copy list kept going stale)
#   5. Apply schema changes
#   6. Start the server and health-check it
#   7. If anything in 4-6 fails, restore .rollback/ and restart
#
# Nothing is built on the server. Requires: curl, rsync, node/npx, an
# authenticated `gh` (unless --local), and — for the data-safety check — the
# mysql client. For unattended runs the deploy user needs passwordless
# `systemctl {start,stop} kuvalib` (install-service.sh sets this up).

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPO="Geobusteni/kuvalib"
WORKFLOW="Build and Package"
ARTIFACT_NAME="kuvalib-deploy"
PACKAGE_FILE="kuvalib-deploy.tar.gz"

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAGING="$APP_DIR/.staging"
ROLLBACK="$APP_DIR/.rollback"
DEPLOYED_VERSION_FILE="$APP_DIR/.deployed-version"

# Files/dirs that belong to the server, not to the build — never overwritten,
# never deleted by the swap.
PRESERVE=(
  ".env"
  ".env.backup"
  "uploads"
  ".deployed-version"
  ".staging"
  ".rollback"
  "kuvalib.log"
)

FORCE_UPDATE=false
FORCE_SCHEMA=false
LOCAL_TARBALL=""

while [ $# -gt 0 ]; do
  case $1 in
    --force)        FORCE_UPDATE=true ;;
    --force-schema) FORCE_SCHEMA=true ;;
    --local)        LOCAL_TARBALL="${2:?--local needs a path to kuvalib-deploy.tar.gz}"; shift ;;
    --help)
      cat <<EOF
Usage: $0 [OPTIONS]

  --force              Re-deploy even if already on the latest build
  --force-schema       Allow destructive schema changes (DANGEROUS - prompts for YES)
  --local <tarball>    Deploy a local kuvalib-deploy.tar.gz instead of pulling
                       the latest artifact from GitHub Actions
  --help               Show this message
EOF
      exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1 ;;
  esac
  shift
done

cd "$APP_DIR"
echo "📥 Kuvalib Production Update  (dir: $APP_DIR)"

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------
command -v curl  >/dev/null || { echo "❌ curl not installed.";              exit 1; }
command -v rsync >/dev/null || { echo "❌ rsync not installed (apt install rsync)."; exit 1; }
command -v npx   >/dev/null || { echo "❌ npx not found (comes with Node).";  exit 1; }
if [ -z "$LOCAL_TARBALL" ]; then
  command -v gh >/dev/null || { echo "❌ GitHub CLI (gh) not installed."; exit 1; }
  gh auth status >/dev/null 2>&1 || { echo "❌ gh not authenticated. Run: gh auth login"; exit 1; }
elif [ ! -f "$LOCAL_TARBALL" ]; then
  echo "❌ --local file not found: $LOCAL_TARBALL"; exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "❌ $APP_DIR/.env is missing. Create it from .env.example and configure"
  echo "   DATABASE_URL, SESSION_SECRET and UPLOAD_DIR before deploying."
  [ -f "$APP_DIR/.env.example" ] && cp "$APP_DIR/.env.example" "$APP_DIR/.env" \
    && echo "   (copied .env.example → .env for you)"
  exit 1
fi

# Load env for the migration and health steps. server.js gets its own env from
# systemd/pm2 — this is only for the commands this script runs directly.
set -a
# shellcheck disable=SC1091
source "$APP_DIR/.env"
set +a

: "${DATABASE_URL:?DATABASE_URL not set in .env}"
PORT="${PORT:-3000}"
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"

# ---------------------------------------------------------------------------
# Find the build to deploy
# ---------------------------------------------------------------------------
if [ -n "$LOCAL_TARBALL" ]; then
  RUN_ID="local-$(date +%Y%m%d%H%M%S)"
  echo "📦 Deploying local tarball: $LOCAL_TARBALL  (version $RUN_ID)"
else
  echo "🔍 Finding the latest successful build…"
  RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" \
             --status success --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
  if [ -z "${RUN_ID:-}" ]; then
    RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --limit 20 \
               --json databaseId,status,conclusion \
               --jq '[.[] | select(.status=="completed" and .conclusion=="success")][0].databaseId')"
  fi
  [ -n "${RUN_ID:-}" ] || { echo "❌ No successful build runs found in $REPO"; exit 1; }

  if [ "$FORCE_UPDATE" = false ] && [ -f "$DEPLOYED_VERSION_FILE" ]; then
    if [ "$(cat "$DEPLOYED_VERSION_FILE")" = "$RUN_ID" ]; then
      echo "✅ Already running the latest build ($RUN_ID). Use --force to redeploy."
      exit 0
    fi
    echo "📌 Current: $(cat "$DEPLOYED_VERSION_FILE")  →  Latest: $RUN_ID"
  fi
fi

# ---------------------------------------------------------------------------
# 1. Stage the new build (server keeps running)
# ---------------------------------------------------------------------------
echo "📦 Staging build in $STAGING …"
rm -rf "$STAGING"
mkdir -p "$STAGING"

if [ -n "$LOCAL_TARBALL" ]; then
  cp "$LOCAL_TARBALL" "$STAGING/$PACKAGE_FILE"
else
  ( cd "$STAGING" && gh run download "$RUN_ID" --repo "$REPO" --name "$ARTIFACT_NAME" )
  if [ ! -f "$STAGING/$PACKAGE_FILE" ]; then
    FOUND="$(find "$STAGING" -name "$PACKAGE_FILE" -print -quit || true)"
    [ -n "$FOUND" ] && mv "$FOUND" "$STAGING/$PACKAGE_FILE"
  fi
fi
[ -f "$STAGING/$PACKAGE_FILE" ] || { echo "❌ $PACKAGE_FILE not found after download."; exit 1; }

tar -xzf "$STAGING/$PACKAGE_FILE" -C "$STAGING"
rm -f "$STAGING/$PACKAGE_FILE"

# ---------------------------------------------------------------------------
# 2. Validate the staged build + warm the Prisma CLI cache (still no downtime)
# ---------------------------------------------------------------------------
[ -f "$STAGING/server.js" ] || { echo "❌ Staged build has no server.js — aborting."; rm -rf "$STAGING"; exit 1; }
node --check "$STAGING/server.js" || { echo "❌ Staged server.js failed a syntax check — aborting."; rm -rf "$STAGING"; exit 1; }

STAGE_MIGRATE="$STAGING/.prisma-migrate"
[ -f "$STAGE_MIGRATE/prisma.config.ts" ] || { echo "❌ Staged build has no .prisma-migrate — aborting."; rm -rf "$STAGING"; exit 1; }
PRISMA_VERSION="$(cat "$STAGE_MIGRATE/PRISMA_VERSION" 2>/dev/null || echo latest)"

echo "📦 Warming the Prisma CLI ($PRISMA_VERSION) cache…"
if ! ( cd "$STAGE_MIGRATE" && npx --yes "prisma@${PRISMA_VERSION}" --version ) >/dev/null 2>&1; then
  echo "❌ Could not fetch the Prisma CLI. The running server was NOT touched."
  rm -rf "$STAGING"
  exit 1
fi
echo "✅ Staged build validated."

# ---------------------------------------------------------------------------
# Process-manager helpers
# ---------------------------------------------------------------------------
detect_runner() {
  # `systemctl show -p LoadState --value` asks about exactly this one unit and
  # doesn't depend on parsing `list-unit-files`'s table (which, depending on
  # the systemd version/policy, can come back empty or reformatted for a
  # non-root caller even though the unit is installed and running — which is
  # exactly what made this "manual" on a box where kuvalib.service was up).
  if command -v systemctl >/dev/null 2>&1 \
     && [ "$(systemctl show -p LoadState --value kuvalib.service 2>/dev/null)" = "loaded" ]; then
    echo systemd
  elif command -v pm2 >/dev/null 2>&1 && pm2 describe kuvalib >/dev/null 2>&1; then
    echo pm2
  else
    echo manual
  fi
}

port_free() { ! curl -fsS -o /dev/null --max-time 2 "$HEALTH_URL" 2>/dev/null; }

stop_app() {
  echo "⏹️  Stopping the running server ($RUNNER)…"
  case "$RUNNER" in
    systemd) sudo systemctl stop kuvalib || true ;;
    pm2)     pm2 stop kuvalib || true ;;
    manual)  pkill -TERM -f "node server.js" 2>/dev/null || true ;;
  esac
  for _ in $(seq 1 30); do port_free && return 0; sleep 1; done
  echo "⚠️  Server still answering on :$PORT after 30s — sending SIGKILL."
  pkill -KILL -f "node server.js" 2>/dev/null || true
  sleep 2
}

start_app() {
  echo "▶️  Starting the server ($RUNNER)…"
  case "$RUNNER" in
    systemd) sudo systemctl start kuvalib ;;
    pm2)     pm2 start "$APP_DIR/server.js" --name kuvalib --update-env && pm2 save ;;
    manual)  ( cd "$APP_DIR" && set -a && . ./.env && set +a \
                && nohup node server.js > "$APP_DIR/kuvalib.log" 2>&1 & ) ;;
  esac
}

health_ok() {
  for _ in $(seq 1 30); do
    curl -fsS -o /dev/null --max-time 3 "$HEALTH_URL" && return 0
    sleep 1
  done
  return 1
}

EXCLUDES=()
for p in "${PRESERVE[@]}"; do EXCLUDES+=( --exclude "/$p" ); done

restore_rollback() {
  if [ ! -f "$ROLLBACK/server.js" ]; then
    echo "❌ No rollback snapshot at $ROLLBACK — cannot auto-restore. Fix forward."
    return 1
  fi
  echo "↩️  Restoring the previous build from $ROLLBACK …"
  stop_app
  rsync -a --delete "${EXCLUDES[@]}" "$ROLLBACK"/ "$APP_DIR"/ || true
  start_app || true
  if health_ok; then echo "✅ Previous build is back up."
  else echo "❌ Rollback health check ALSO failed — manual intervention needed."; fi
}

RUNNER="$(detect_runner)"
echo "🧭 Process manager: $RUNNER"
if [ "$RUNNER" = "manual" ]; then
  echo "⚠️  No kuvalib systemd service found. Install one so the app restarts"
  echo "    automatically if it ever stops:  ./scripts/install-service.sh"
fi

# Snapshot the live build for rollback *before* stopping anything. --link-dest
# hardlinks every unchanged file back to the live tree, so the snapshot is
# near-free in both time and disk, and it costs no downtime.
echo "💾 Recording a rollback snapshot in $ROLLBACK …"
rm -rf "$ROLLBACK"
mkdir -p "$ROLLBACK"
rsync -a --delete --link-dest="$APP_DIR" "${EXCLUDES[@]}" "$APP_DIR"/ "$ROLLBACK"/

# ---------------------------------------------------------------------------
# 3-4. Stop the runner, swap the build in
# ---------------------------------------------------------------------------
stop_app

echo "🔀 Swapping in build $RUN_ID …"
# --delete drops files that no longer exist in the new build (stale chunks,
# removed components — the reason a hand-picked copy list kept going stale).
# rsync replaces files by writing a new inode and renaming, so this script
# (already executing from the old inode) keeps running safely through the swap.
if ! rsync -a --delete "${EXCLUDES[@]}" "$STAGING"/ "$APP_DIR"/; then
  echo "❌ Swap failed. The server is stopped; restoring the previous build."
  restore_rollback
  exit 1
fi

rm -rf "$STAGING"
find "$APP_DIR/scripts" -name '*.sh' -exec chmod +x {} + 2>/dev/null || true

# ---------------------------------------------------------------------------
# 5. Schema changes (server is stopped, new build is in place)
# ---------------------------------------------------------------------------
MIGRATE_DIR="$APP_DIR/.prisma-migrate"
run_prisma() { ( cd "$MIGRATE_DIR" && DATABASE_URL="$DATABASE_URL" npx --yes "prisma@${PRISMA_VERSION}" "$@" ); }

echo "📊 Checking database state…"
DB_HOST="$(echo "$DATABASE_URL" | sed -n 's#.*@\([^:/]*\).*#\1#p')"
DB_PORT="$(echo "$DATABASE_URL" | sed -n 's#.*@[^:]*:\([0-9]*\)/.*#\1#p')"
DB_NAME="$(echo "$DATABASE_URL" | sed -n 's#.*/\([^?]*\).*#\1#p')"
DB_USER="$(echo "$DATABASE_URL" | sed -n 's#.*://\([^:]*\):.*#\1#p')"
DB_PASS="$(echo "$DATABASE_URL" | sed -n 's#.*://[^:]*:\([^@]*\)@.*#\1#p')"
MYSQL="mysql -h${DB_HOST:-localhost} -P${DB_PORT:-3306} -u${DB_USER} -p${DB_PASS} ${DB_NAME} -N -s"

HAS_DATA=false
if command -v mysql >/dev/null; then
  USER_COUNT="$($MYSQL -e 'SELECT COUNT(*) FROM User;' 2>/dev/null | tr -dc '0-9')"
  PROJECT_COUNT="$($MYSQL -e 'SELECT COUNT(*) FROM Project;' 2>/dev/null | tr -dc '0-9')"
  if [ "${USER_COUNT:-0}" -gt 0 ] 2>/dev/null || [ "${PROJECT_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    HAS_DATA=true
  fi
else
  echo "ℹ️  mysql client not found — skipping the data-safety check."
fi

MIGRATE_OK=true
if [ "$HAS_DATA" = true ]; then
  echo "⚠️  Database has data (users: ${USER_COUNT:-?}, projects: ${PROJECT_COUNT:-?})."
  echo "    Backup:  mysqldump -u$DB_USER -p $DB_NAME > backup-\$(date +%Y%m%d-%H%M%S).sql"
  if [ "$FORCE_SCHEMA" = true ]; then
    read -r -p "Type 'YES' to allow destructive schema changes: " confirm
    [ "$confirm" = "YES" ] || { echo "❌ Aborted."; restore_rollback; exit 1; }
    run_prisma db push --accept-data-loss || MIGRATE_OK=false
  else
    run_prisma db push || MIGRATE_OK=false
    [ "$MIGRATE_OK" = true ] || echo "❌ Schema change needs data loss. Re-run with --force-schema after a backup."
  fi
else
  echo "ℹ️  Empty database — creating the schema."
  run_prisma db push --accept-data-loss || MIGRATE_OK=false
fi

if [ "$MIGRATE_OK" != true ]; then
  restore_rollback
  exit 1
fi

# ---------------------------------------------------------------------------
# 6. Start and verify
# ---------------------------------------------------------------------------
start_app || echo "⚠️  Start command returned non-zero — checking health anyway."

if health_ok; then
  echo "$RUN_ID" > "$DEPLOYED_VERSION_FILE"
  echo "✅ Update complete — build $RUN_ID is live and healthy."
  echo "   Previous build kept in $ROLLBACK (safe to delete once you're happy)."
else
  echo "❌ New build failed its health check ($HEALTH_URL)."
  restore_rollback
  exit 1
fi

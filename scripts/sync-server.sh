#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

# Configuration
REMOTE_USER="" # e.g. "ubuntu"
REMOTE_HOST="" # e.g. "kuvalib.example.com"
REMOTE_PATH="" # e.g. "/var/www/kuvalib"
PACKAGE_FILE="kuvalib-deploy.tar.gz"

echo "🔄 Kuvalib Sync Script"

# Check if we have the package
if [ ! -f "$PACKAGE_FILE" ]; then
  echo "❌ Error: $PACKAGE_FILE not found."
  echo "   Download it from GitHub Actions or run a local build first."
  exit 1
fi

# Ask for configuration if not set
if [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_HOST" ] || [ -z "$REMOTE_PATH" ]; then
  echo "⚠️  Remote configuration not set in script."
  read -p "Remote user (e.g. ubuntu): " REMOTE_USER
  read -p "Remote host (e.g. 1.2.3.4): " REMOTE_HOST
  read -p "Remote path (e.g. /var/www/kuvalib): " REMOTE_PATH
fi

echo "📤 Uploading package to $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH..."

# Create directory on server if it doesn't exist
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH"

# Upload package
scp "$PACKAGE_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

echo "📦 Extracting package on server..."
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && tar -xzf $PACKAGE_FILE && rm $PACKAGE_FILE"

echo "🔧 Checking for .env..."
if ssh "$REMOTE_USER@$REMOTE_HOST" "[ ! -f $REMOTE_PATH/.env ]"; then
  echo "⚠️  .env not found on server. Copying .env.example..."
  ssh "$REMOTE_USER@$REMOTE_HOST" "cp $REMOTE_PATH/.env.example $REMOTE_PATH/.env"
  echo "👉 Action required: SSH into the server and edit $REMOTE_PATH/.env"
fi

echo "📊 Running database migrations..."
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && npx prisma migrate deploy"

echo "🔄 Restarting service..."
echo "   (This assumes you have a systemd service named 'kuvalib')"
ssh "$REMOTE_USER@$REMOTE_HOST" "sudo systemctl restart kuvalib || echo '⚠️ Could not restart kuvalib service. Is it configured?'"

echo ""
echo "✅ Sync complete!"

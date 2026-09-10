#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

# Install (or refresh) the systemd unit that keeps Kuvalib running and restarts
# it automatically if it ever stops. Run this once on the server, and again if
# you move the app directory or change the Node binary.
#
#   ./scripts/install-service.sh
#
# It needs sudo to write /etc/systemd/system and reload systemd.

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$APP_DIR/scripts/kuvalib.service"
UNIT="/etc/systemd/system/kuvalib.service"

if [ ! -f "$TEMPLATE" ]; then
  echo "❌ $TEMPLATE not found. Run this from inside the deployed app directory."
  exit 1
fi

if ! command -v systemctl &> /dev/null; then
  echo "❌ systemd not found. This host needs a different process manager."
  echo "   See OPERATIONS.md for the PM2 and plain-nohup alternatives."
  exit 1
fi

APP_USER="${SUDO_USER:-$(id -un)}"
if [ "$APP_USER" = "root" ]; then
  echo "❌ Refusing to run the app as root. Re-run as the deploy user:"
  echo "   sudo ./scripts/install-service.sh   (keeps \$SUDO_USER)"
  exit 1
fi

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  echo "❌ node not found on PATH."
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚠️  $APP_DIR/.env does not exist yet."
  echo "   The service will fail to start until it does (EnvironmentFile)."
fi

echo "📝 Installing $UNIT"
echo "   User:      $APP_USER"
echo "   Directory: $APP_DIR"
echo "   Node:      $NODE_BIN"

TMP="$(mktemp)"
sed -e "s|__APP_USER__|$APP_USER|g" \
    -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__NODE_BIN__|$NODE_BIN|g" \
    "$TEMPLATE" > "$TMP"

sudo cp "$TMP" "$UNIT"
rm -f "$TMP"
sudo chmod 644 "$UNIT"

sudo systemctl daemon-reload
sudo systemctl enable kuvalib

# Let the deploy user stop/start the service without a password, so
# update-from-github.sh can swap builds unattended.
SUDOERS="/etc/sudoers.d/kuvalib"
echo "📝 Granting $APP_USER passwordless control of kuvalib.service ($SUDOERS)"
SUDO_LINE="$APP_USER ALL=(root) NOPASSWD: /bin/systemctl start kuvalib, /bin/systemctl stop kuvalib, /bin/systemctl restart kuvalib, /bin/systemctl status kuvalib, /usr/bin/systemctl start kuvalib, /usr/bin/systemctl stop kuvalib, /usr/bin/systemctl restart kuvalib, /usr/bin/systemctl status kuvalib"
echo "$SUDO_LINE" | sudo tee "$SUDOERS" >/dev/null
sudo chmod 440 "$SUDOERS"
sudo visudo -cf "$SUDOERS" >/dev/null || { echo "❌ sudoers snippet invalid — removing."; sudo rm -f "$SUDOERS"; }

if systemctl is-active --quiet kuvalib; then
  echo "🔄 Service already running — restarting to pick up the new unit."
  sudo systemctl restart kuvalib || true
else
  echo "▶️  Starting the service."
  sudo systemctl start kuvalib || true
fi

sleep 2
sudo systemctl --no-pager --full status kuvalib || true

if ! systemctl is-active --quiet kuvalib; then
  echo
  echo "⚠️  The service is not active yet. Check the logs:"
  echo "     sudo journalctl -u kuvalib -n 40 --no-pager"
  echo "   Most likely .env is missing or incomplete."
  exit 1
fi

echo
echo "✅ kuvalib.service installed and enabled (starts on boot, restarts on any stop)."
echo "   Logs:    sudo journalctl -u kuvalib -f"
echo "   Restart: sudo systemctl restart kuvalib"

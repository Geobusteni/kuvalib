# Kuvalib Operations Guide

Day-to-day operations for a running Kuvalib server.

> **See also:**
> - [DEPLOYMENT.md](./DEPLOYMENT.md) — first-time setup and updating
> - [README.md](./README.md) — development setup
> - [ARCHITECTURE.md](./ARCHITECTURE.md) — technical architecture

The app is deployed as the Next.js **standalone** bundle and started with
`node server.js`. `server.js` does not read `.env` — the process manager passes
the environment in.

Examples below assume the app directory is `/var/www/kuvalib` and port `3000`.

---

## 1. Start / stop / restart

### systemd (recommended — auto-restarts on any crash)

```bash
sudo systemctl start kuvalib
sudo systemctl stop kuvalib
sudo systemctl restart kuvalib
sudo systemctl status kuvalib
```

Installed by `./scripts/install-service.sh`. The unit uses `Restart=always` with
no start-limit, so the app is brought back after a crash, an OOM kill, or a
manual `systemctl kill`. It also starts on boot (`systemctl enable`, done by the
installer).

`./scripts/restart-app.sh` is a convenience wrapper that restarts the service
(or a plain `node` process if there's no service).

### PM2 (hosts without systemd)

```bash
cd /var/www/kuvalib
set -a && . ./.env && set +a
pm2 start server.js --name kuvalib --update-env
pm2 save && pm2 startup      # once, to start on boot

pm2 restart kuvalib --update-env
pm2 stop kuvalib
pm2 logs kuvalib
```

### Plain process (testing only — no auto-restart)

```bash
cd /var/www/kuvalib
set -a && . ./.env && set +a
nohup node server.js > kuvalib.log 2>&1 &
# stop:
pkill -TERM -f "node server.js"
```

---

## 2. Is it up?

```bash
curl http://127.0.0.1:3000/api/health      # -> {"status":"ok"}
sudo systemctl status kuvalib
ss -tlnp | grep :3000
```

---

## 3. Logs

```bash
# systemd
sudo journalctl -u kuvalib -f
sudo journalctl -u kuvalib --since "1 hour ago"
sudo journalctl -u kuvalib -p err

# PM2
pm2 logs kuvalib --lines 100

# plain process
tail -f /var/www/kuvalib/kuvalib.log
```

---

## 4. Updating

```bash
cd /var/www/kuvalib
./scripts/update-from-github.sh
```

Stages and validates the new build with no downtime, then does a clean
stop → swap → `prisma db push` → start, verifying `/api/health`. On failure it
restores the previous build from `.rollback/` automatically. Full details and
flags (`--force`, `--force-schema`, `--local`) are in
[DEPLOYMENT.md](./DEPLOYMENT.md#2-updating).

---

## 5. Environment variables

Live in `/var/www/kuvalib/.env`:

```env
DATABASE_URL='mysql://user:password@localhost:3306/kuvalib'
SESSION_SECRET='<64 hex chars>'
UPLOAD_DIR=/var/www/kuvalib/uploads
# PORT=3000
# COOKIE_SECURE=true    # for HTTPS
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

After editing `.env`, restart so the new values are picked up:

```bash
sudo systemctl restart kuvalib      # systemd reads EnvironmentFile on start
pm2 restart kuvalib --update-env    # PM2
```

`update-from-github.sh` never overwrites `.env`.

---

## 6. Database

```bash
# Backup
mysqldump -u kuvalib -p kuvalib > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
mysql -u kuvalib -p kuvalib < backup-20260101-120000.sql

# Inspect
mysql -u kuvalib -p kuvalib -e "SHOW TABLES;"
mysql -u kuvalib -p kuvalib -e "SELECT id, email, username, role FROM User;"
mysql -u kuvalib -p kuvalib -e "SELECT id, title, createdAt FROM Project;"
```

Schema changes are applied by `update-from-github.sh` (`prisma db push`, via
`npx prisma`). To push a change by hand from the app directory:

```bash
cd .prisma-migrate
DATABASE_URL="$(grep -E '^DATABASE_URL=' ../.env | cut -d= -f2- | tr -d "'\"")" \
  npx --yes "prisma@$(cat PRISMA_VERSION)" db push
```

---

## 7. Disk

```bash
df -h
du -sh /var/www/kuvalib/* /var/www/kuvalib/uploads

# The app bundle is ~185 MB; .rollback/ holds the previous build.
rm -rf /var/www/kuvalib/.rollback     # safe once the current deploy is confirmed good
rm -rf /var/www/kuvalib/.staging      # only present if an update was interrupted
```

---

## 8. Troubleshooting

### Won't start

```bash
sudo journalctl -u kuvalib -n 50 --no-pager
```

- **`.env` missing or incomplete** — the unit's `EnvironmentFile` fails.
- **DB unreachable** — `mysql -u kuvalib -p kuvalib -e "SELECT 1;"`
- **Port in use** — `ss -tlnp | grep :3000`, then `pkill -f "node server.js"`.

### `sudo` prompts during `update-from-github.sh`

The passwordless sudoers entry for `systemctl … kuvalib` is missing. Re-run
`./scripts/install-service.sh`.

### An update rolled itself back

The new build failed `/api/health`. The previous build is running again. Read
`journalctl -u kuvalib` for the cause, fix it, and redeploy.

### Login not working over HTTPS

Set `COOKIE_SECURE=true` in `.env` and confirm nginx sends
`X-Forwarded-Proto $scheme` and `Host $host`. Restart after changing `.env`.

### 502 Bad Gateway

```bash
curl http://127.0.0.1:3000/api/health
sudo systemctl status kuvalib
sudo tail -50 /var/log/nginx/error.log
```

### Crash loop

```bash
sudo journalctl -u kuvalib --since "15 min ago" | tail -100
```

Common causes: DB down, out of memory, a required env var missing. `Restart=always`
means systemd keeps trying — fix the root cause and it recovers on its own.

---

## 9. Security checklist

- Strong `SESSION_SECRET` (64 hex) and DB password
- HTTPS on, `COOKIE_SECURE=true`
- App runs as a non-root user, bound to `127.0.0.1`
- `uploads/` not executable, owned by the deploy user
- Nightly database + `uploads/` backups (see [DEPLOYMENT.md](./DEPLOYMENT.md#backups))
- Node.js and MySQL kept patched

---

## Quick reference

```bash
sudo systemctl restart kuvalib          # restart
sudo journalctl -u kuvalib -f           # logs
curl http://127.0.0.1:3000/api/health   # health
./scripts/update-from-github.sh         # deploy latest build
mysqldump -u kuvalib -p kuvalib > backup-$(date +%Y%m%d).sql
```

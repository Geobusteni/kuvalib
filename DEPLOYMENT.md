# Kuvalib Deployment Guide

How to run Kuvalib in production on an Ubuntu server with MySQL/MariaDB.

> **See also:**
> - [README.md](./README.md) — development setup
> - [OPERATIONS.md](./OPERATIONS.md) — day-to-day operations (start/stop/logs/backup)
> - [ARCHITECTURE.md](./ARCHITECTURE.md) — how the pieces fit together

---

## How deployment works

Production **never builds the app**. GitHub Actions builds it and publishes a
self-contained artifact; the server only ever downloads and runs it.

- `next.config.ts` sets `output: 'standalone'`, so `next build` produces
  `.next/standalone/` — a `server.js` plus just the dependencies it was traced
  to need.
- The **Build and Package** workflow assembles that into `kuvalib-deploy.tar.gz`
  (~185 MB) on every push to `main`, and boot-tests it before publishing.
- On the server, `scripts/update-from-github.sh` pulls the latest artifact and
  swaps it in with a clean stop → swap → migrate → start, keeping the previous
  build for automatic rollback.
- `scripts/kuvalib.service` (systemd) runs `node server.js` and **restarts it
  automatically if it ever stops** — crash, out-of-memory kill, or a manual
  kill.

The server is started with `node server.js`, not `next start`. `server.js` does
**not** read `.env` itself — the systemd unit supplies the environment.

---

## Prerequisites

- **Node.js 20.19+** (`node -v`)
- **MySQL 5.7+ / MariaDB 10.3+**
- **git, `gh` (GitHub CLI), rsync, curl** on the server
- **2 GB+ RAM**, **~2 GB disk** for the app (plus whatever the photos need)
- A domain pointing at the server; nginx in front for TLS

---

## 1. One-time server setup

```bash
# Node 20 + tools
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs gh git rsync curl mysql-client

# App directory, owned by a non-root deploy user
sudo mkdir -p /var/www/kuvalib
sudo chown "$USER":"$USER" /var/www/kuvalib
cd /var/www/kuvalib

# Authenticate so `gh` can download the (private) build artifact
gh auth login
```

### Database

```bash
mysql -u root -p <<'SQL'
CREATE DATABASE kuvalib CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kuvalib'@'localhost' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON kuvalib.* TO 'kuvalib'@'localhost';
FLUSH PRIVILEGES;
SQL
```

### First deploy

```bash
cd /var/www/kuvalib

# Bootstrap: grab just the update script from a build artifact once
gh run download --repo Geobusteni/kuvalib --name kuvalib-deploy
tar -xzf kuvalib-deploy.tar.gz scripts .env.example && rm kuvalib-deploy.tar.gz
chmod +x scripts/*.sh

# Configure
cp .env.example .env
nano .env      # DATABASE_URL, SESSION_SECRET, UPLOAD_DIR — see below

# Deploy the latest build (creates the schema on an empty database)
./scripts/update-from-github.sh

# Install the self-restarting service (start on boot, restart on any stop)
./scripts/install-service.sh
```

> The repository is `Geobusteni/kuvalib`. If you forked it, edit `REPO` at the
> top of `scripts/update-from-github.sh`.

### `.env`

```env
DATABASE_URL='mysql://kuvalib:a-strong-password@localhost:3306/kuvalib'
SESSION_SECRET='<64 hex chars>'   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
UPLOAD_DIR=/var/www/kuvalib/uploads
# PORT=3000            # optional, default 3000
# COOKIE_SECURE=true   # set when serving over HTTPS
```

> Values containing `$` **must** use single quotes, or the loader truncates them.

---

## 2. Updating

```bash
cd /var/www/kuvalib
./scripts/update-from-github.sh
```

What it does:

1. Downloads the latest successful build into `.staging/`.
2. Validates it and warms the Prisma CLI cache — **the running server is not
   touched yet**.
3. Snapshots the current build into `.rollback/` (hardlinks, near-instant).
4. Stops the service cleanly (SIGTERM, waits for the port to free).
5. `rsync -a --delete` swaps the new build in, preserving `.env` and `uploads/`
   and removing files the new build no longer ships.
6. Runs `prisma db push`.
7. Starts the service and checks `/api/health`.
8. **If step 6 or 7 fails, restores `.rollback/` and restarts automatically.**

Options:

| Flag | Effect |
|------|--------|
| `--force` | Redeploy even if already on the latest build |
| `--force-schema` | Allow destructive schema changes (prompts for `YES`) |
| `--local <tarball>` | Deploy a local `kuvalib-deploy.tar.gz` (offline / from a laptop) |

**Before a schema change that drops data**, back up first:

```bash
mysqldump -u kuvalib -p kuvalib > backup-$(date +%Y%m%d-%H%M%S).sql
./scripts/update-from-github.sh --force-schema
```

### Pushing a build from a laptop

When the server can't reach GitHub, download the artifact yourself and:

```bash
# edit REMOTE_USER / REMOTE_HOST / REMOTE_PATH at the top, then:
./scripts/sync-server.sh
```

It `scp`s the tarball and runs `update-from-github.sh --local` on the server.

---

## 3. The service

`scripts/install-service.sh` writes `/etc/systemd/system/kuvalib.service` from
the `scripts/kuvalib.service` template (filling in the deploy user, the app
directory and the Node path), enables start-on-boot, and grants the deploy user
passwordless `systemctl start/stop/restart kuvalib` so updates run unattended.

Key settings:

- `ExecStart=<node> server.js`
- `Restart=always`, `RestartSec=3`, `StartLimitIntervalSec=0` — comes back after
  **any** stop, and systemd never gives up.
- `EnvironmentFile=/var/www/kuvalib/.env` — because `server.js` doesn't read it.
- `Environment=HOSTNAME=127.0.0.1` — bind loopback only; nginx faces the world.

Re-run `./scripts/install-service.sh` after moving the app or upgrading Node.

```bash
sudo systemctl status kuvalib
sudo systemctl restart kuvalib
sudo journalctl -u kuvalib -f
```

### Without systemd

Use PM2 (`pm2 start .next/standalone/server.js --name kuvalib && pm2 save && pm2 startup`)
or `./scripts/restart-app.sh`. `update-from-github.sh` detects PM2 and a plain
`node server.js` too, but only systemd gives you automatic restart-on-crash.

---

## 4. nginx + TLS

```nginx
server {
    listen 80;
    server_name kuvalib.example.com;
    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kuvalib.example.com
```

Set `COOKIE_SECURE=true` in `.env` once HTTPS is live, then restart.

---

## 5. First run

Visit `https://kuvalib.example.com/setup` to create the first administrator.
`/api/setup` refuses to run once an admin exists.

---

## Backups

```bash
# Database — nightly
0 2 * * * mysqldump -u kuvalib -p'password' kuvalib | gzip > /var/backups/kuvalib-$(date +\%Y\%m\%d).sql.gz

# Config + photos — nightly
0 3 * * * tar -czf /var/backups/kuvalib-files-$(date +\%Y\%m\%d).tar.gz /var/www/kuvalib/.env /var/www/kuvalib/uploads/
```

`.env` and `uploads/` are the only irreplaceable state — everything else is
rebuilt from a deploy.

---

## Troubleshooting

**Service won't start**

```bash
sudo journalctl -u kuvalib -n 50 --no-pager
# Common: .env missing/incomplete, DB unreachable, port 3000 taken
mysql -u kuvalib -p kuvalib -e "SELECT 1;"
ss -tlnp | grep :3000
```

**`update-from-github.sh` rolled back**

The new build failed `/api/health` and the previous one was restored. Check
`journalctl -u kuvalib` for why, fix forward, and redeploy. The failed build is
gone; `.rollback/` holds the one that's running.

**`sudo` prompts during an update**

The passwordless sudoers rule is missing — re-run `./scripts/install-service.sh`.

**502 Bad Gateway**

```bash
curl http://127.0.0.1:3000/api/health   # is the app up?
sudo systemctl status kuvalib
sudo tail -50 /var/log/nginx/error.log
```

**Out of disk**

```bash
df -h
du -sh /var/www/kuvalib/* /var/www/kuvalib/uploads
rm -rf /var/www/kuvalib/.rollback   # safe once a deploy is confirmed good
```

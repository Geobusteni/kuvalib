# Changelog

All notable changes to Photolib are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is
`0`, breaking changes may land in any minor release.

---

## [Unreleased]

## [1.4.0] - 2026-08-09

### Added

- A tooltip on each Like/Dislike/Comment button (gallery and lightbox) naming what it does,
  after a brief hover pause
- A per-photo "undo your reaction" button, shown only once a visitor has liked, disliked, or
  commented on that photo — clears both their reaction and its record, letting them react again
- Admin: a chevron indicating which photos with comments can be expanded, and a click-to-enlarge
  preview of the photo from the Feedback panel

### Changed

- "Download All (Original ZIP)" moved from the gallery's top bar to below the photo grid, giving
  the title and Select button more room
- Mobile lightbox: swiping down now closes the swipe-up action sheet first (if it's open) instead
  of always closing the whole viewer

### Fixed

- A visitor's like/dislike/comment on a photo silently disappearing from the gallery grid after
  reloading the page, even though it was still recorded — a React hydration mismatch caused by
  reading `localStorage` during the very first client render, which disagreed with the
  server-rendered HTML and made React keep the stale "not reacted" markup instead of the correct
  one. The lightbox was unaffected since it never appears in that first server-rendered HTML.
- The two oldest Prisma migrations containing PostgreSQL syntax (`CREATE TYPE ... AS ENUM`)
  despite the project having moved to MySQL/MariaDB — `prisma migrate deploy` could never
  actually complete against a real, empty MySQL database, meaning any live deployment can only
  have been created by `prisma db push` (which reads `schema.prisma` directly and was never
  tracked in `_prisma_migrations`), not by applying these files. Rewritten in valid MySQL syntax
  producing the same schema. **Action required, and only if your database already has data in
  it** (a brand-new, empty database needs no special step — just run `npx prisma migrate deploy`
  as usual): back up first, then baseline the two pre-existing migrations as already applied so
  Prisma doesn't try to re-run `CREATE TABLE` statements against tables that already exist:
  `npx prisma migrate resolve --applied 20260730093327_init` and
  `npx prisma migrate resolve --applied 20260730100000_viewable_passwords_original_names_archive`.
  Then run `npx prisma migrate deploy` normally to apply the new feedback migration
- Creating a project with client feedback enabled from the start silently ignored that setting;
  it always started disabled and had to be turned on afterward from Settings
- Mobile lightbox: the like/dislike/comment buttons overlapping the swipe-up action sheet's
  Cancel/Download buttons

## [1.3.0] - 2026-08-09

### Added

- Like, Dislike, and Comment buttons below each photo in the gallery grid and in the lightbox,
  for clients to mark which photos they want kept, dropped, or want to leave a note on. Off by
  default per project — enable it in a project's Settings. Each anonymous browser can react once
  per photo (recognised via a random id kept in that browser's local storage, not a login); the
  chosen action locks the other two until the photographer resets feedback for the project. Liked
  photos get a green border, disliked a red border, commented a yellow border
- Admin: a "Feedback" section on each project showing aggregated likes/dislikes and comment text
  per photo, and a "Reset feedback" action that clears all of it and lets clients react again
- Admin: a toggle in project Settings to allow or block client feedback for that gallery

**Action required:** run `npx prisma migrate deploy` after upgrading to add the new
`feedbackEnabled`/`feedbackResetAt` project columns and the `PhotoFeedback` table. See
`DEPLOYMENT.md` for the production migration procedure.

## [1.2.2] - 2026-08-09

### Fixed

- Sharing more than one selected photo failing with "Could not share the photos," because those
  photos were fetched one after another after tapping Share instead of in parallel while the
  dialog was open, running out the window browsers allow after a tap before requiring a fresh one

## [1.2.1] - 2026-07-31

### Changed

- Renamed the "Save to Photos" download option to "Share photos" — it opens the OS share sheet,
  which offers saving among several other actions, rather than saving directly
- Lightbox photo download now offers the same "Download as ZIP" / "Share photos" choice as the
  gallery's selection download, instead of saving the single image directly with no options
- Individual photo download and sharing now send a compressed ~2048px version of the photo
  instead of the full-resolution original, so mobile sharing of multi-megabyte photos doesn't
  stall or fail. Downloading a project's ZIP archive or a selection as a ZIP still delivers
  full-resolution originals, unchanged. **Action required:** run
  `node scripts/backfill-share-thumbs.mjs` once after upgrading so already-uploaded photos get
  this new variant

### Fixed

- An extra native "save this file?" browser prompt appearing after choosing a download option or
  downloading a single photo from the lightbox, caused by a redundant direct download alongside
  the intended one
- Downloading a photo or ZIP on desktop sometimes doing nothing even though the file had already
  been fetched, because the browser download was never reliably triggered
- Sharing a single photo from the lightbox on mobile intermittently failing with "Could not share
  the photos," especially on slower connections, because fetching the photo before opening the
  share sheet could run out the window browsers allow after a tap before requiring a fresh one
- Sharing large (multi-megabyte) photos from the lightbox on mobile still failing even after the
  above fix, because the true original was still being fetched over the network before sharing
- The lightbox Fullscreen button doing nothing on browsers without a Fullscreen API (notably iOS
  Safari) — its "simulated fullscreen" fallback never actually changed anything visually. The
  button is now hidden entirely on those browsers instead of appearing broken

## [1.2.0] - 2026-07-31

### Fixed

- Compatibility with older GitHub CLI versions in `update-from-github.sh` (fixes `--status` flag error)
- Lightbox fullscreen button doing nothing on iOS Safari, which has no Fullscreen API for
  non-video elements — falls back to a CSS-only simulated fullscreen mode
- Mobile lightbox gestures (tap-to-toggle-controls, swipe up/down) breaking when a second
  finger touched the screen mid-gesture, since only one pointer's position was ever tracked

### Added

- Pinch-to-zoom and double-tap-to-zoom for photos in the lightbox on mobile; panning with one
  finger while zoomed in
- Choice of "Download as ZIP" or "Save to Photos" when downloading selected photos — the latter
  uses the Web Share API to save images directly into the phone's photo gallery, where supported
- Upload progress percentage in the admin photo uploader
- A "Preparing your download…" indicator while a selection ZIP is being built
- GitHub Actions workflow for automated production builds and packaging
- `scripts/sync-server.sh` for pushing builds from local to remote
- `scripts/update-from-github.sh` for pulling latest artifacts directly on production
- Production-only deployment model (no Git clone required on server)
- `curl` command for easy script retrieval in `DEPLOYMENT.md`
- systemd service configuration instructions in `DEPLOYMENT.md`

### Changed

- Gallery `D` keyboard shortcut now opens the download options dialog instead of immediately
  downloading a ZIP

---

## [1.1.1] — 2026-07-30

**Breaking Changes:** This release changes the database from PostgreSQL to MySQL and removes Docker deployment.

### Changed

**Database**
- Switched from PostgreSQL to MySQL/MariaDB for simpler deployment
- Removed `@prisma/adapter-pg` dependency
- Updated Prisma schema to use MySQL provider
- Simplified `lib/prisma.ts` to use standard Prisma client

**Deployment**
- Removed Docker and Docker Compose configurations
- Removed Docker deployment scripts (`docker-deploy.sh`, `docker-update.sh`)
- Created standard deployment scripts for production servers
- New WordPress-style configuration (create MySQL DB in hosting panel, configure `.env`, deploy)

**Documentation**
- Completely rewrote `DEPLOYMENT.md` for MySQL + standard deployment
- Updated `README.md` with MySQL installation and configuration
- Removed `README-DOCKER.md`
- Updated `.env.example` with MySQL connection format

### Added

**Deployment Scripts**
- `scripts/build-production.sh` - Build for production deployment
- `scripts/deploy-server.sh` - Deploy to server (like WordPress)
- `scripts/update-production.sh` - Update production server

### Removed

- All Docker-related files and configurations
- PostgreSQL-specific dependencies
- Docker deployment documentation

### Migration Guide

If you're upgrading from 0.1.1 (PostgreSQL + Docker):

1. Export your data: `docker compose exec db pg_dump -U photolib photolib > backup.sql`
2. Remove Docker: See "Removing Docker" section in `DEPLOYMENT.md`
3. Create MySQL database in your hosting panel
4. Pull latest code: `git pull`
5. Run `npm install` to update dependencies
6. Configure `.env` with MySQL connection
7. Import data manually or start fresh with `/setup`

---

## [0.1.1] — 2026-07-30

### Added

**Deployment**

- Docker support with multi-stage Dockerfile for optimized production builds
- Docker Compose configuration with PostgreSQL 16 and automatic health checks
- Automated deployment scripts: `docker-deploy.sh` for initial setup, `docker-update.sh` for updates
- Build scripts for traditional deployments: `build-for-deploy.sh` and `update-server.sh`
- Health check endpoint at `/api/health` for container monitoring
- Comprehensive deployment documentation covering Docker, standard VPS, and local build options
- RunCloud-specific integration guide with reverse proxy configuration
- Docker-specific quick reference guide (`README-DOCKER.md`)

**Configuration**

- `.env.docker` template for Docker deployments
- `.dockerignore` for optimized Docker image builds

### Changed

- Documentation now clarifies production access via domain (not port) for reverse proxy setups
- Updated all deployment docs to support multiple deployment strategies

---

## [0.1.0] — 2026-07-30

First beta. A complete, self-hosted photography delivery application.

### Added

**Galleries**

- Client galleries at `/g/[project-id]`, gated by a shared password or by email address
- Responsive masonry grid in a centred container, mobile first
- Full-screen lightbox with keyboard, pointer, and swipe navigation
- Selection mode: pick photos and download them as a ZIP generated on demand
- Per-project expiry date, after which the gallery closes itself
- Visit count, download count, and last-access tracking

**Admin**

- Project CRUD with title, event date, access type, expiry, and download toggles
- Drag-and-drop upload of JPEG photos, or a ZIP that is unpacked into photos
- Duplicate filenames prompt for **Keep both** or **Replace existing** rather than resolving
  silently
- Separate upload slot for the client-facing ZIP archive
- Gallery passwords are viewable and copyable from the project page
- Thumbnails generated once at upload, at 400px and 1200px

**Accounts**

- First-run setup at `/setup` creates the initial administrator
- Three roles: **Admin** (everything), **User** (assigned projects only), **Guest** (read-only,
  identified by email, no password)
- Per-project assignment of users and guests
- The last remaining administrator cannot be deleted or demoted

**Platform**

- Released under the GNU General Public License v3.0 or later
- Next.js 16 App Router on React 19, TypeScript, Tailwind CSS 4
- PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Iron Session cookie auth; bcrypt for account passwords
- Single `.env` configuration file, in the spirit of `wp-config.php`
- WCAG 2.1 AA target: full keyboard navigation, focus management, and
  `prefers-reduced-motion` support throughout

### Security

- Photos are stored on disk under generated UUIDs; no client-supplied name ever reaches the
  filesystem, and the uploaded name is reattached on download
- Gallery passwords are encrypted with AES-256-GCM keyed off `SESSION_SECRET`, so a database dump
  alone does not reveal them. Account passwords remain hashed and unreadable
- Uploads are validated by magic bytes rather than by declared MIME type
- Path traversal is rejected before any file read
- Rate limiting on gallery password attempts
- `/api/uploads` serves thumbnails only; originals and archives go through routes that verify
  access and record the download

### Notes

- The full gallery ZIP is uploaded by the photographer, never generated. Without an uploaded
  archive there is no **Download ZIP** button — only a client's own selection is zipped on demand.
- Changing `SESSION_SECRET` invalidates sessions and makes existing gallery passwords unreadable;
  they must be set again.

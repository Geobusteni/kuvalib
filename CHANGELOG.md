# Changelog

All notable changes to Kuvalib are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is
`0`, breaking changes may land in any minor release.

---

## [Unreleased]

## [1.7.1] - 2026-09-11

### Changed

- **The page-position dots moved from centre-left to top-left** of the
  showcase viewer.

### Added

- **A show/hide toggle for the page-position dots**, in Album settings'
  Page dots section — on by default (unchanged behaviour), so existing
  showcases keep their dots until you turn them off.

## [1.7.0] - 2026-09-11

### Added

- **A Blocks list in the showcase builder** — a flat, click-to-select list of
  the current page's blocks, ordered to match the stacking order (first row
  furthest back, last row frontmost), with a group's children indented
  beneath it.
- **A "Copy link" button in the builder's toolbar**, next to Album settings,
  to copy the showcase's public link without leaving the builder.
- **A Reset link on the Background and Text colour swatch pickers**, next to
  Album settings' existing Page dots reset, to clear a custom colour back to
  the default in one click.
- **A CSS class reference in Album settings' Custom CSS section**, behind an
  info-icon toggle — lists the stable class names the public viewer renders
  (`.sc-viewer`, `.sc-stage`, `.sc-page`, `.sc-block` and its per-type
  variants, `.sc-controls`, `.sc-dots`, `.sc-thumbnails`) so Custom CSS has
  something to target.

### Changed

- **Ken Burns is now an Image block setting, not a page setting.** Animating
  the whole page moved text and other blocks along with the background
  photo, which looked broken rather than cinematic. Set per image block;
  only the photo pans/zooms, its border and corners stay put.
- **Colour swatches now preview the colour they'd actually apply** — the
  "custom" and "gradient" options show the block's own configured colour
  instead of a generic placeholder.

### Fixed

- **The showcase viewer's page no longer stops short of the full browser
  width.** It previously kept a fixed 16:10 aspect ratio capped to the
  viewport height, which left empty space on the sides on most widescreen
  monitors — a full-bleed Image block now genuinely covers the whole window.
- **Colour swatches in the builder's settings panel could render invisible**
  for any colour derived from the album's theme (surface, deep, accent
  tint/solid, muted text) — the CSS variables they referenced weren't in
  scope outside the canvas. They're scoped correctly now.

## [1.6.0] - 2026-09-11

### Added

- **Showcase Group blocks can have a blur (glass effect) behind them**, and
  their background now supports a two-colour gradient in addition to solid
  colours, on top of the existing swatches.
- **Headline blocks (renamed from Title) support all six HTML heading
  levels (H1–H6)**, plus an optional custom pixel size that overrides the
  level's default. The default size for each level is set once in Album
  settings and applies across the whole showcase. Headline text is always a
  solid colour — no opacity control — since it's meant to stay legible over a
  photo.
- **Text blocks have size presets** — small, normal (default), medium, large,
  huge — with per-preset default sizes set in Album settings, and an optional
  custom pixel size per block that overrides the preset.
- **Image blocks have a border setting**: style (solid/dashed/dotted), width,
  and colour.
- **The showcase viewer is now full-width**, filling the browser window
  instead of sitting in a centred content column, so photos get the full
  available space. The controls moved into a single small floating pill in
  the top-right corner instead of a full-width bar.
- **The page counter is now a column of coloured dots on the left edge of the
  viewer** instead of a numeric "1 / N" — click a dot to jump to that page.
  Dot colours are configurable in Album settings.
- **Image blocks support a Ken Burns pan/zoom effect** while their page is on
  screen: zoom in, or slide left/right/up/down, each with its own speed
  (capped to the page's autoplay interval so it never gets cut off). Set per
  image block in the settings panel; only the photo pans/zooms, its border
  and corners stay put.
- **A page can now have its own background and border**, using the same
  colour/gradient and border controls as other blocks. A page's content
  always clips at its own edges.
- **Added a Rotate page transition**, alongside the existing Turn, Fade and
  Zoom.
- **Added a Custom CSS field in Album settings**, injected into the public
  viewer for styling tweaks the builder doesn't otherwise expose.

### Changed

- **Showcase "Title" blocks are now called "Headline"** throughout the
  builder and docs, to better reflect that they render as a real HTML
  heading.
- Dragging a block only re-parents it into a group that is at least half its
  own area, fixing a bug where a full-bleed background Image could get pulled
  behind a smaller caption Group and appear to vanish after arranging the
  group's children.

## [1.5.3] - 2026-09-11

### Fixed

- **`scripts/kuvalib.service`: `StartLimitIntervalSec` was in the wrong
  section.** It was under `[Service]`, where systemd silently ignores it
  (`Unknown key name 'StartLimitIntervalSec' in section 'Service'` in
  `journalctl`) — so the "never give up restarting" protection was never
  actually active. It's under `[Unit]` now, where it belongs. **Action:**
  re-run `./scripts/install-service.sh` to reinstall the corrected unit.
- **`update-from-github.sh` (and `restart-app.sh`) could fail to detect an
  installed, running systemd service** and fall back to treating the app as
  unmanaged ("manual"). On at least one box this made the update script
  `pkill` the systemd-managed process directly instead of using
  `systemctl stop` — systemd's `Restart=always` then raced the script's own
  manual restart to rebind the port, leaving two Node processes contending for
  it mid-deploy and serving from an inconsistent build. Detection now asks
  systemd about that one unit directly (`systemctl show -p LoadState --value
  kuvalib.service`) instead of grepping `list-unit-files`'s table, which is
  the more reliable check.

## [1.5.2] - 2026-09-10

### Fixed

- **Admin pages no longer crash on an expired or missing session.** Opening a
  project or the showcase builder without a valid session threw a Prisma error
  (`userId` missing) instead of redirecting to the login page. The admin pages
  now go through `requireAuth()` / `requireAdmin()`, which redirect to
  `/login`.
- **Showcase viewer: the thumbnail rail no longer blanks the page.** The new
  page previews render Button blocks as real `<button>`/`<a>`, and wrapping
  that in a `<button>` is invalid HTML — it threw a hydration error the moment
  the rail was opened. Each thumbnail is now a `<div role="button">`.

## [1.5.1] - 2026-09-10

### Added

- **The gallery links to its showcase.** When a project has a showcase, the
  gallery's top bar shows a **View showcase** button (no re-entering the
  password).
- **Admin: a "Copy client link" button** on the project's Showcase section,
  next to *View showcase*.
- **`scripts/kuvalib.service` + `scripts/install-service.sh`** — a systemd unit
  that keeps the server running and restarts it automatically after *any* stop
  (crash, OOM kill, unhandled rejection, manual kill), with no "start-limit"
  give-up state. The installer fills in the paths, enables start-on-boot, and
  grants the deploy user passwordless `systemctl start/stop/restart kuvalib`
  so updates can swap builds unattended.
- **`./scripts/update-from-github.sh` now deploys safely.** It stages the new
  build, validates it and warms the Prisma CLI cache while the old server keeps
  serving, then stops the server cleanly, swaps the build in with
  `rsync --delete` (removing files the new build dropped), applies schema
  changes, and starts the new server — verifying `/api/health` before
  declaring success. A hardlink snapshot of the previous build is kept in
  `.rollback/` and restored automatically if the new build fails its health
  check. New `--local <tarball>` flag deploys a build without going through
  GitHub.

### Changed

- **Production is now deployed as the Next.js standalone bundle.** The
  "Build and Package" workflow ships `.next/standalone` (a self-contained
  `server.js` with only its traced dependencies) instead of the full `.next`
  tree plus a hand-picked list of source folders and a complete
  `node_modules`. The deploy artifact drops from ~450 MB to ~185 MB, and the
  "missing folder" class of bug (e.g. `components/` absent from the package)
  is gone — Next decides what to include.
  - The server is started with `node server.js`, not `next start`.
  - `server.js` does not read `.env` — the process manager supplies the
    environment (the systemd unit does this via `EnvironmentFile`).
  - **Action on upgrade:** re-run `./scripts/install-service.sh` on the
    server to install the refreshed systemd unit, then deploy with
    `./scripts/update-from-github.sh` as usual.

### Fixed

- **Showcase builder: blocks can be resized again.** A mousedown on a resize
  handle was being taken over by the drag layer, and the canvas was deselecting
  the block mid-gesture — so the handles vanished and nothing happened. Handles
  now stay mounted while the block is selected, the drag layer ignores them, and
  the block stays selected through the resize.
- **Showcase builder: "Bring to front" / "Send to back" now work.** They were
  passing an out-of-range position to the editor and silently doing nothing.
- **Showcase builder: selecting a block no longer changes what's on top.**
  Selecting a background block used to lift it in front of everything else,
  hiding the blocks above it. Selection is shown by the outline only.
- **Showcase builder: the Save button is disabled once everything is saved** and
  reads *Save / Saving… / Saved*.
- **Showcase viewer: the slideshow arrows are no longer clipped.** They sat
  outside the frame, which has `overflow: hidden`; they now sit just inside it.
- **Showcase viewer: the play/pause control shows a play triangle**, not a
  reload icon.
- **Showcase viewer: the thumbnail strip shows real page previews**, not just
  page numbers, and its toolbar button uses a filmstrip icon.
- **Showcase viewer: the "link copied" message floats under the copy button**
  instead of appearing at the bottom of the screen.
- The deploy package no longer omits files the app needs, and no longer carries
  a second unused copy of the app inside `.next/standalone/`.
- A locally-run build can no longer leak a real `.env` into the artifact.

## [1.5.0] - 2026-09-10

### Added

- **Album Showcase.** Each project can now have one showcase — a designed, page-by-page
  slideshow built from the project's photos and shared on its own link, separate from the
  gallery.
  - Admin: a **Showcase** section on the project page creates it (seeded with a Cover page) and
    opens the builder. The builder is a canvas with a page rail, an "+ Add block" menu (Cover,
    Image, Title, Text, Button, Group), a per-block settings panel, and drag/resize with
    percentage-based positioning. Groups position their children, re-parent them automatically
    when a block is dragged in or out, and arrange them without ever overlapping. Album settings
    (title, date, event type, background, page transition, autoplay) and a background-music
    playlist (MP3/M4A/OGG/WAV upload, loop) live in a dialog. Changes autosave.
  - Client: the showcase viewer is a page-turning slideshow (turn / fade / zoom transitions,
    all disabled under reduced motion) with autoplay + loop, a thumbnail rail, fullscreen,
    background music, a copy-link control, and a "Download as ZIP" of the showcase's photos.
    Keyboard: ← / → pages, `Home` / `End`, `F` fullscreen, `Space` play/pause, `D` download.
  - A showcase inherits the project's access type, password and expiry. Passing either the
    showcase or the gallery gate admits the visitor to the other without re-entering the
    password.
  - New route `/s/<id>` (viewer) and `/projects/<id>/showcase` (builder). New upload folder
    `uploads/<project>/audio/`. No new `.env` keys. Requires the `add_showcase` migration
    (`npx prisma migrate deploy`).

### Changed

- The project is now named **Kuvalib** (formerly Photolib). The name in the admin header, the
  browser tab title, the login and setup screens, and all documentation changes accordingly.
- New dependencies: `@craftjs/core` (showcase builder canvas), `react-rnd` (block resize),
  `zustand` (builder state). All MIT-licensed.

### Security

- Session and gallery cookies were renamed (`photolib_session` → `kuvalib_session`,
  `photolib_gallery_*` → `kuvalib_gallery_*`). **After upgrading, every admin, user, and gallery
  visitor must sign in again** — existing sessions are not carried over. Clients' once-per-photo
  feedback records (kept in the browser under a renamed key) also reset, so a client may react to
  a photo again.

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

1. Export your data: `docker compose exec db pg_dump -U kuvalib kuvalib > backup.sql`
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

# Kuvalib – Architecture

> Read `AGENTS.md` first for project philosophy, roles, and feature scope.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Framework  | Next.js 16 (App Router)             |
| Language   | TypeScript 5                        |
| UI         | React 19                            |
| Styling    | Tailwind CSS 4                      |
| Database   | MySQL / MariaDB                     |
| ORM        | Prisma 7 (with `@prisma/adapter-mariadb`) |
| Auth       | Iron Session (signed cookies) + bcryptjs |
| Images     | Sharp (server-side thumbnails)      |
| Archives   | fflate (ZIP create and extract)     |
| Showcase builder | `@craftjs/core` + `react-rnd` + `zustand` (Stage 2, admin only) |

> Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.

Prisma 7 requires a **driver adapter**; there is no implicit connection. The client is
constructed once in `lib/prisma.ts` with `PrismaMariaDb`.

---

## Configuration

One file: `.env` (gitignored). `.env.example` documents it.

```
DATABASE_URL='mysql://user:password@localhost:3306/kuvalib'
SESSION_SECRET='32+ random characters'
UPLOAD_DIR=./uploads
```

Values containing `$` must be single-quoted or the loader will interpolate and truncate them.

---

## Repository Layout

```
kuvalib/
├── AGENTS.md                  # AI instructions (read first)
├── ARCHITECTURE.md            # This file
├── PLAN.md                    # Phased build plan
├── .env                       # Single config file (gitignored)
├── .env.example               # Config template (committed)
├── prisma/
│   └── schema.prisma          # Single source of truth for the data model
├── prisma.config.ts           # Prisma 7 config (schema path, datasource URL)
├── app/
│   ├── setup/                 # First-run admin creation
│   │   ├── page.tsx
│   │   └── _components/SetupForm.tsx
│   ├── login/                 # Outside (admin) — must not inherit the auth guard
│   │   ├── page.tsx
│   │   └── _components/LoginForm.tsx
│   ├── (admin)/               # Route group — authenticated area
│   │   ├── layout.tsx         # Auth guard + setup redirect + nav
│   │   ├── projects/
│   │   │   ├── page.tsx               # Admin: all projects. User: assigned only
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── _components/{UploadZone,AdminPhotoGrid,AssignmentManager,ShowcaseManager}.tsx
│   │   │       └── showcase/page.tsx    # The showcase builder (Stage 2)
│   │   └── users/
│   │       ├── page.tsx               # Admin only
│   │       └── _components/UserManager.tsx
│   ├── (gallery)/
│   │   ├── g/[slug]/page.tsx  # Client-facing gallery
│   │   └── s/[slug]/page.tsx  # Client-facing showcase viewer (Stage 2)
│   ├── api/
│   │   ├── setup/route.ts
│   │   ├── auth/route.ts
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── projects/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── auth/route.ts        # Gallery gate (password or email)
│   │   │       ├── assignments/route.ts
│   │   │       ├── upload/route.ts
│   │   │       ├── download/route.ts
│   │   │       ├── feedback/route.ts        # Admin reset (DELETE)
│   │   │       └── photos/
│   │   │           ├── route.ts
│   │   │           ├── [photoId]/
│   │   │           │   ├── route.ts
│   │   │           │   └── feedback/route.ts   # Client like/dislike/comment
│   │   │           └── showcase/          # Stage 2
│   │   │               ├── route.ts               # create / settings / delete
│   │   │               ├── pages/route.ts         # replace the deck
│   │   │               └── tracks/{route.ts,[trackId]/route.ts}
│   │   └── uploads/[...path]/route.ts   # File serving
│   ├── layout.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── gallery/{Gallery,ImageTile,Toolbar,AccessGate,DownloadOptionsDialog,PhotoFeedbackRow,FeedbackCommentDialog}.tsx
│   ├── lightbox/{PhotoViewer,ViewerControls,PhotoFeedbackBar}.tsx
│   ├── showcase/            # Stage 2 — builder (Craft.js) + viewer (Craft-free) + shared
│   │   ├── {store,craft-bridge,frame-size,photos-context,BlockContent}.*
│   │   ├── builder/{ShowcaseBuilder,Canvas,PageRail,SettingsPanel,AddBlockMenu,AlbumSettingsDialog,useBuilder}.tsx
│   │   ├── builder/blocks/{BlockShell,index}.tsx
│   │   └── viewer/{ShowcaseViewer,PageStage,BlockRenderer,ViewerControls,ThumbnailRail,MusicPlayer,ShowcaseDownloadDialog,useSlideshow}.*
│   └── ui/{ProjectForm,DeleteProjectButton,LogoutButton,ProgressBar}.tsx
├── hooks/{useKeyboard,useGestures,useImageZoom,useFocusTrap,useReducedMotion,usePhotoFeedback}.ts
├── lib/
│   ├── prisma.ts              # Client singleton with the MariaDB adapter
│   ├── auth.ts                # Session, role guards, password hashing
│   ├── users.ts                # User CRUD, setup detection
│   ├── projects.ts            # Project/photo/assignment data access
│   ├── showcase.ts            # Showcase/page/track data access (Stage 2)
│   ├── showcase-blocks.ts     # Block model + no-overlap geometry (no React)
│   ├── showcase-theme.ts      # Event-type accent vars + per-block appearance
│   ├── audio.ts               # Audio upload format sniffing
│   ├── gallery-auth.ts        # Gallery access: password, email, role
│   ├── photo-data.ts          # DB record → client-facing PhotoData / ShowcasePhoto
│   ├── photo-feedback.ts      # Like/dislike/comment CRUD, summaries, reset
│   ├── feedback-storage.ts    # Client-only: visitor id + localStorage cache
│   ├── images.ts              # Sharp thumbnails
│   ├── storage.ts             # Upload paths (photos, thumbs, archive, audio), traversal guard
│   ├── rate-limit.ts          # In-memory limiter
│   ├── fullscreen.ts          # Fullscreen API wrapper with legacy WebKit fallback
│   ├── xhr-upload.ts          # XHR wrapper for client-side upload progress
│   └── generated/prisma/      # Generated client (gitignored)
└── uploads/                   # Runtime file storage (gitignored)
    └── [project-id]/{photos,thumbs,archive}/
```

`/login` deliberately lives **outside** `(admin)`. Nesting it inside means the admin layout's
auth guard would redirect the login page to itself — an infinite redirect loop.

---

## Data Model

```mermaid
erDiagram
    User ||--o{ ProjectAssignment : has
    Project ||--o{ ProjectAssignment : has
    Project ||--o{ Photo : contains
    Photo ||--o{ PhotoFeedback : has
    Project ||--o| Showcase : "has (0..1)"
    Showcase ||--o{ ShowcasePage : contains
    Showcase ||--o{ ShowcaseTrack : contains

    User {
        string id PK
        string email UK
        string username UK "null for guests"
        string password "null for guests"
        string name
        Role role "ADMIN | USER | GUEST"
    }
    Project {
        string id PK "also the gallery URL slug"
        string title
        datetime eventDate
        AccessType accessType "PASSWORD | EMAIL"
        string password "AES-256-GCM, null when EMAIL"
        string archiveName "null until an archive is uploaded"
        int archiveSize
        datetime expiresAt
        boolean zipEnabled
        boolean dlEnabled
        boolean feedbackEnabled "client like/dislike/comment, off by default"
        datetime feedbackResetAt "bumped on admin reset"
        int dlCount
        int visitCount
        datetime lastAccess
    }
    ProjectAssignment {
        string id PK
        string projectId FK
        string userId FK
    }
    Photo {
        string id PK
        string projectId FK
        string filename "generated UUID, on disk"
        string originalName "as uploaded, used for downloads"
        int width
        int height
        int size
        int sortOrder
    }
    PhotoFeedback {
        string id PK
        string photoId FK
        string visitorId "client-generated, localStorage — not an account"
        FeedbackType type "LIKE | DISLIKE | COMMENT"
        string comment "only set when type is COMMENT"
    }
    Showcase {
        string id PK "also the /s/ URL slug"
        string projectId FK "UNIQUE — one showcase per project"
        string title
        datetime eventDate
        ShowcaseEventType eventType "accent hue"
        ShowcaseBg albumBg
        ShowcaseAnimation animationStyle "TURN | FADE | ZOOM | ROTATE"
        boolean autoplay
        int autoplaySeconds
        boolean playlistLoop
        json headingSizes "H1-H6 default px sizes"
        json textSizes "small..huge default px sizes"
        boolean dotsEnabled "default true"
        string dotColorActive "null = event accent"
        string dotColorInactive "null = translucent white"
        string customCss "admin-authored, injected verbatim in the viewer"
    }
    ShowcasePage {
        string id PK
        string showcaseId FK
        int sortOrder
        json blocksJson "the whole block tree, one blob"
        string bg "the page's own background, like a block's"
        string bgCustom
        int bgCustomAlpha
        string bgGradientFrom
        string bgGradientTo
        int bgGradientAngle
        string borderStyle
        int borderWidth
        string borderColor
    }
    ShowcaseTrack {
        string id PK
        string showcaseId FK
        string filename "generated UUID, on disk"
        string originalName "as uploaded"
        int size
        int sortOrder
    }
```

`Photo` has a composite unique constraint on `(projectId, originalName)`. That constraint is what
makes duplicate detection at upload time possible.

`ProjectAssignment` has a composite unique constraint on `(projectId, userId)`, which lets the
code use `upsert` for idempotent assignment.

`PhotoFeedback` has a composite unique constraint on `(photoId, visitorId)` — one row per
(photo, anonymous visitor) action, enforced at the database level so a second attempt from the
same browser (a second tab, a cleared local cache, a replayed request) is rejected with 409
regardless of what the client believes. It cascades on `Photo` delete, so removing a photo
removes its feedback with it. `visitorId` is a random id the browser keeps in `localStorage`,
never a real identity.

`Showcase` has a unique constraint on `projectId` — a project has at most one. It carries no
password or access fields: `verifyGalleryAccess(projectId)` gates the showcase exactly as it
gates the gallery. `ShowcasePage.blocksJson` stores the entire block tree (groups nested under
`children`) as one JSON document — a page is authored and saved as a unit and nothing queries an
individual block. The shape and geometry live in `lib/showcase-blocks.ts`; that JSON is
untrusted on the way in and passes through `sanitizeBlocks` before it is stored. A block's
`photoId` is a plain reference to an existing `Photo.id` — showcase photos are never duplicated.
An image block's Ken Burns effect (`kenBurns`/`kenBurnsSpeed`) lives in `blocksJson` like any
other block field, since it's a property of that image, not of the page.

A page's own appearance (background, border) is real `ShowcasePage` columns, not part of
`blocksJson` — see the decisions log. `sanitizePageSettings` guards those columns the same way
`sanitizeBlocks` guards the block tree. `Showcase.customCss` is admin-authored, capped at 20,000
characters, and injected into the public viewer via a `<style>` tag with no further
sanitisation — the same trust boundary as every other admin-entered field in the builder.

Only metadata lives in the database. Files live on disk.

---

## Authentication and Authorisation

```mermaid
flowchart TD
    request[Incoming request] --> setupCheck{Any admin<br/>in database?}
    setupCheck -->|No| setupPage["/setup — create first admin"]
    setupCheck -->|Yes| sessionCheck{Valid session<br/>cookie?}
    sessionCheck -->|No| loginPage["/login"]
    sessionCheck -->|Yes| roleCheck{Role?}
    roleCheck -->|ADMIN| full[Full access]
    roleCheck -->|USER| assigned[Assigned projects only]
    roleCheck -->|GUEST| galleryOnly[Gallery read only]
```

Two independent cookie sessions:

| Cookie                        | Purpose                                        |
|-------------------------------|------------------------------------------------|
| `kuvalib_session`            | Logged-in admin or user: `{ userId, role }`    |
| `kuvalib_gallery_[projectId]`| Per-project gallery grant, 7 days. Covers the showcase too. |

### Gallery access resolution

`verifyGalleryAccess(projectId)` in `lib/gallery-auth.ts` grants access when any of these hold:

1. The session belongs to an `ADMIN`.
2. The session belongs to a `USER` **and** a `ProjectAssignment` exists for that project.
3. A valid per-project gallery cookie exists (set by password or email at the gate).

The showcase viewer (`/s/[slug]`) calls the same `verifyGalleryAccess(project.id)` and renders
the same `components/gallery/AccessGate` against the same `POST /api/projects/[id]/auth` route on
failure. So the gallery and the showcase share one grant: passing either gate sets
`kuvalib_gallery_[projectId]` and admits the visitor to both. There is no showcase-specific
cookie or auth code.

### Guarding rules

- All admin routes are `force-dynamic` — they depend on session and live database state.
  Without this, Next.js attempts to prerender them at build time and the build fails on a
  database connection error.
- Admin pages call `requireAuth()` (or `requireAdmin()`), **not** raw `getSession()`. The
  helpers redirect to `/login` when there is no session and return a `SessionData` with a
  non-null `userId`. A page that reads `session.userId` from a bare `getSession()` and passes
  it to a query throws a Prisma validation error on an expired session instead of redirecting.
- Admin-only API routes call `requireAdmin()`, which redirects non-admins.
- The `users` page and the project settings/danger sections render only for admins.

---

## API Surface

### Setup and auth

```
POST   /api/setup                       Create the first admin (403 once one exists)
POST   /api/auth                        { identifier, password } → session
DELETE /api/auth                        Clear session
```

### Users (admin only)

```
GET    /api/users                       List users (passwords stripped)
POST   /api/users                       Create user; guests need email only
PUT    /api/users/[id]                  Update; blocks demoting the last admin
DELETE /api/users/[id]                  Blocks self-deletion and the last admin
```

### Projects

```
GET    /api/projects                    List (admin)
POST   /api/projects                    Create (admin)
GET    /api/projects/[id]               Read (admin)
PUT    /api/projects/[id]               Update (admin)
DELETE /api/projects/[id]               Delete project + files (admin)
GET    /api/projects/[id]/assignments   List assigned people (admin)
POST   /api/projects/[id]/assignments   Assign a user/guest (admin)
DELETE /api/projects/[id]/assignments   Unassign (admin)
POST   /api/projects/[id]/upload        JPEG or ZIP of photos (admin)
POST   /api/projects/[id]/archive       Upload the client-facing ZIP (admin)
DELETE /api/projects/[id]/archive       Remove it (admin)
DELETE /api/projects/[id]/photos/[pid]  Delete photo + files (admin)
DELETE /api/projects/[id]/feedback      Wipe all feedback for the project + bump
                                          feedbackResetAt (admin)
```

`POST /upload` accepts a `strategy` field alongside the file: `overwrite`, `rename`, or `skip`.
Without one it defaults to `ask` and answers **409** with a `conflicts` array of the original names
that already exist. A 409 here is a question, not a failure.

### Gallery (client)

```
POST   /api/projects/[id]/auth                    { password } or { email } → gallery cookie
GET    /api/projects/[id]/photos                  Photo list (requires access)
GET    /api/projects/[id]/download                The uploaded archive; 404 if none
POST   /api/projects/[id]/download                { photoIds } → ZIP of selection
GET    /api/projects/[id]/photos/[pid]/download   One original, under its original name
                                                    ?variant=share serves the compressed
                                                    ~2048px variant instead
GET    /api/uploads/[...path]                     Thumbnails only
POST   /api/projects/[id]/photos/[pid]/feedback   { visitorId, type, comment? } → record
                                                    like/dislike/comment. 403 if the project
                                                    has feedback off, 409 if this visitor
                                                    already reacted, 429 rate-limited
DELETE /api/projects/[id]/photos/[pid]/feedback   { visitorId } → undo that visitor's own
                                                    reaction on this one photo
```

### Showcase (Stage 2)

```
POST   /api/projects/[id]/showcase                 Create the project's showcase; 409 if one
                                                     exists. Seeds a Cover page (admin)
PUT    /api/projects/[id]/showcase                 Album settings (admin)
DELETE /api/projects/[id]/showcase                 Delete it + its audio files (admin)
PUT    /api/projects/[id]/showcase/pages           Replace the whole page list; blocks are
                                                     sanitised before storage (admin)
GET    /api/projects/[id]/showcase/tracks          List tracks (admin)
POST   /api/projects/[id]/showcase/tracks          Upload one audio file, format sniffed (admin)
DELETE /api/projects/[id]/showcase/tracks/[tid]    Remove a track + its file (admin)
GET    /api/projects/[id]/showcase/tracks/[tid]    Stream a track; requires gallery access;
                                                     supports HTTP Range
```

The showcase's "Download as ZIP" reuses `POST /api/projects/[id]/download` with the showcase's
own `photoIds`.

---

## File Storage

```
uploads/
  [project-id]/
    photos/    originals, named [uuid].jpg
    thumbs/    [uuid]-sm.jpg (400px), [uuid]-lg.jpg (1200px), [uuid]-share.jpg (2048px)
    archive/   archive.zip — the ZIP the photographer uploaded, if any
    audio/     [uuid].mp3|m4a|ogg|wav — the showcase's background-music tracks
```

Thumbnails are generated **once at upload**. Originals are never resized per request.

### Filenames

Disk names and display names are deliberately separate. On disk every photo is a generated UUID,
which keeps path traversal, encoding, and collision problems away from the filesystem.
`Photo.originalName` holds the uploaded name in the database.

Downloads bridge the two: `/api/projects/[id]/photos/[pid]/download` reads the UUID file and sets
`Content-Disposition` from `originalName`. Selection ZIPs name their entries the same way.

`safeResolvePath()` in `lib/storage.ts` rejects any resolved path escaping the project directory.
`/api/uploads/[...path]` serves **thumbnails only**; originals and archives go through routes that
check access and record the download.

---

## Component Architecture

### Gallery state machine

```mermaid
stateDiagram-v2
    [*] --> GalleryMode
    GalleryMode --> SelectionMode: Select / S
    SelectionMode --> GalleryMode: Cancel / Escape
    GalleryMode --> ViewerMode: tap or Enter on a tile
    ViewerMode --> GalleryMode: Escape / swipe down / Close
```

Modelled as a discriminated union in a `useReducer`, not as loose booleans:

```ts
type GalleryMode =
  | { mode: 'gallery' }
  | { mode: 'selection'; selected: Set<string> }
  | { mode: 'viewer'; currentIndex: number }
```

The lightbox cannot open while selecting, because `OPEN_VIEWER` is a no-op in selection mode.
That constraint lives in the reducer rather than in scattered conditionals.

### Lightbox fullscreen and zoom

Fullscreen and zoom are deliberately **not** branches of the Gallery reducer above — they're
orthogonal to gallery/selection/viewer and are owned locally by `PhotoViewer` and its hooks as a
plain `isFullscreen` boolean.

`isFullscreenSupported()` (`lib/fullscreen.ts`) gates whether `ViewerControls` renders the
Fullscreen button at all — platforms with no Fullscreen API for non-`<video>` elements (iOS
Safari — see Decisions Log) never see it. Escape exits fullscreen before closing the viewer, and
unmounting always exits fullscreen.

Zoom/pan state (`hooks/useImageZoom.ts`) is similarly decoupled from gesture *recognition*
(`hooks/useGestures.ts`), which tracks pointers by `pointerId` through an explicit
`idle → tracking → panning | pinching` phase machine rather than a single shared start
position. This is what lets a second finger touching down mid-gesture start a pinch instead of
corrupting the first finger's swipe/tap classification. Swipe-to-navigate only fires at 1×; a
single finger pans instead once zoomed in.

### Key components

| Component               | Responsibility                                      |
|--------------------------|-----------------------------------------------------|
| `Gallery`                | Grid layout, owns gallery/selection/viewer state     |
| `Toolbar`                | Context-sensitive top bar                            |
| `ImageTile`              | One photo cell; tap opens or toggles selection       |
| `AccessGate`             | Password or email gate, chosen by `accessType`       |
| `DownloadOptionsDialog`  | ZIP vs. Save-to-Photos choice for selected photos    |
| `PhotoFeedbackRow`       | Like/Dislike/Comment buttons below a gallery tile    |
| `FeedbackCommentDialog`  | Comment text entry, shared by gallery and lightbox   |
| `PhotoViewer`            | Lightbox shell, focus management, fullscreen, zoom   |
| `ViewerControls`         | Prev/Next/Download/Fullscreen/Close                  |
| `PhotoFeedbackBar`       | Like/Dislike/Comment buttons in the lightbox         |
| `ProgressBar`            | Determinate/indeterminate progress indicator         |
| `UserManager`            | Admin user CRUD                                      |
| `AssignmentManager`      | Assign users and guests to a project                 |
| `ArchiveManager`         | Upload/replace/remove the client-facing ZIP          |
| `PasswordReveal`         | Show and copy a project's gallery password           |
| `UploadZone`             | Photo upload, including duplicate resolution and progress |
| `FeedbackPanel`          | Admin view of per-photo likes/dislikes/comments + reset |
| `ShowcaseManager`        | Project-page section: create / open / view / delete the showcase |

### Showcase architecture (Stage 2)

`components/showcase/` splits into a Craft.js **builder** and a Craft-free **viewer** over a
shared, framework-free core.

| Piece | Responsibility |
|-------|----------------|
| `lib/showcase-blocks.ts` | Block types; the no-overlap stack/align geometry; `buildCoverComposite`; `flattenBlocks` / `nestFlatBlocks`; `sanitizeBlocks`; `collectPhotoIds`. No React. |
| `lib/showcase-theme.ts` | Event-type → accent CSS variables; per-block background/text/radius resolvers. |
| `lib/showcase.ts` | Data access (mirrors `lib/projects.ts`). `lib/audio.ts` sniffs upload formats. |
| `components/showcase/store.ts` | `zustand`: album settings, page list, current page, non-active page snapshots, autosave flags. |
| `components/showcase/craft-bridge.ts` | Nested `Block[]` ⇆ Craft `SerializedNodes`. Craft's tree is **flat** — a block's group membership is its `parentGroupId` prop, not DOM nesting. |
| `builder/BlockShell` + `builder/blocks/*` | Craft user components. `react-rnd` does drag/resize in pixels; positions are written back as percentages. Dragging re-parents a leaf by which group box holds its centre; dragging or resizing a group carries its children. |
| `builder/SettingsPanel`, `PageRail`, `BlockTree`, `AddBlockMenu`, `AlbumSettingsDialog`, `useBuilder` | The panel reads the selected Craft node; `useBuilder` couples Craft `query`/`actions` with the store (page switching, inserts, the Cover shortcut, arrange, debounced autosave to `PUT .../pages`). `BlockTree` lists `query.node('ROOT').get().data.nodes` in order (the same list `moveWithinBand` reorders) and calls `actions.selectNode(id)` — no state of its own. |
| `viewer/ShowcaseViewer` + `useSlideshow` | `idle → out → pre → in` page-turn machine (collapsed under `prefers-reduced-motion`); autoplay + loop; fullscreen as a local boolean (like the lightbox); keyboard. |
| `viewer/BlockRenderer`, `PageStage`, `ViewerControls`, `DotIndicator`, `ThumbnailRail`, `MusicPlayer`, `ShowcaseDownloadDialog` | Render the flattened block list; per-`animationStyle` page transform; a floating top-right controls pill; a left-side page-dot column; `<audio>` playlist; ZIP dialog reusing `POST /api/projects/[id]/download`. |
| `BlockContent` | The visual inside a block (image/headline/text/button) — shared by builder and viewer so they never drift. Resolves a Headline/Text block's font size from its own `fontSize` override, else the album's per-level/per-preset defaults. An Image block's Ken Burns keyframe animates the `<img>` itself inside a static, clipped border/radius wrapper. |

---

## Motion

1. `hooks/useReducedMotion.ts` reports the media query and updates on change.
2. `globals.css` also collapses all durations under `prefers-reduced-motion: reduce`, so the
   baseline holds even for components that forget to check.
3. Only `opacity` and `transform` are animated.

---

## Deployment

`next.config.ts` sets `output: 'standalone'`. `next build` therefore emits
`.next/standalone/` — a `server.js` plus only the `node_modules` files the app's routes were
traced to need (the `mariadb` driver is bundled in; nothing external is required at runtime).
The `postbuild` script copies `public/` and `.next/static/` into it, since standalone omits
those by design.

`.github/workflows/build.yml` ("Build and Package") builds on every push to `main`, assembles
`.next/standalone/` into a `deploy/` tree — adding `prisma/` (schema + migrations), `scripts/`,
`.env.example`, and a `.prisma-migrate/` folder holding an import-free `prisma.config.ts` — boot-checks
it against `/api/health`, and uploads it as the `kuvalib-deploy` artifact (~185 MB).

On the server:

- **`scripts/kuvalib.service`** (installed by `scripts/install-service.sh`) runs
  `node server.js` with `Restart=always` and `StartLimitIntervalSec=0`, so the process is
  brought back after any exit and systemd never gives up. `server.js` does not read `.env`;
  the unit supplies the environment via `EnvironmentFile`. It binds `127.0.0.1` — nginx
  terminates TLS in front.
- **`scripts/update-from-github.sh`** downloads the latest artifact into `.staging/`, validates
  it and warms the `npx prisma` cache while the current server keeps serving, then: stops the
  service, `rsync -a --delete`s the new build over the app directory (preserving `.env` and
  `uploads/`, and — crucially — deleting files the new build no longer contains), runs
  `prisma db push`, starts the service, and confirms `/api/health`. The pre-swap build is
  hardlink-snapshotted into `.rollback/` and restored automatically if the health check fails.
- Migrations run through `npx prisma@<pinned>` (Prisma's ~250 MB CLI tree is not shipped); the
  config in `.prisma-migrate/` is a plain object rather than `defineConfig(...)` because the
  `prisma/config` specifier is not resolvable from an `npx` cache.

---

## Decisions Log

| Decision                          | Reason                                                        |
|-----------------------------------|---------------------------------------------------------------|
| PostgreSQL over SQLite            | Real user/role relations; room to grow beyond one machine     |
| Prisma over raw SQL               | Typed schema and migrations; the app is expected to extend    |
| Driver adapter (`@prisma/adapter-pg`) | Required by Prisma 7 — no implicit connection             |
| Single `.env`                     | One place to look, like `wp-config.php`                       |
| Iron Session over NextAuth        | No OAuth needed; sessions are two small signed cookies        |
| Guests without passwords          | The photographer often has an email but no account to create  |
| UUID filenames on disk            | Avoids traversal, encoding, and collision issues entirely     |
| `originalName` stored separately  | Clients need the name they recognise; the disk does not       |
| Gallery passwords encrypted, not hashed | The photographer must read them back to send them on. Account passwords stay bcrypt-hashed |
| Archive uploaded, never generated | Zipping thousands of originals per request is slow and memory-hungry, and duplicates an export the photographer already has |
| Blob-download `revokeObjectURL` deferred via `setTimeout` | Revoking immediately after `a.click()` races the browser's (often async) download start and can silently no-op the download on some browsers |
| Lightbox photo prefetched on dialog mount, keyed by photo id | `navigator.share()` needs a fresh user gesture; fetching the photo inside the click handler risked losing that window on slow connections. Scoped to the single-photo case (the lightbox's only usage) so multi-select downloads don't eagerly fetch photos a user may not pick |
| `/api/uploads` serves thumbs only | Originals and archives have routes that check access and count downloads; a second unguarded path defeated both |
| Upload conflicts answer 409       | Silently overwriting a client's photo is worse than asking     |
| Individual download/share sends a compressed ~2048px variant, not the true original | Mobile `navigator.share()` fetching a multi-MB original stalls or fails; ZIP downloads (archive and selection) still fetch true originals server-side, unaffected |
| `sortOrder` counts up from max    | Prisma `Int` is a 32-bit PostgreSQL `INTEGER`; `Date.now()` overflows it |
| Upload deletes files on failure   | A failed insert used to leave orphaned files on disk          |
| Viewer focuses the dialog, not a button | The old focus holder used `focus:not-sr-only` and painted a stray label over the controls |
| Viewer exits fullscreen on unmount | Closing while fullscreen used to leave the browser fullscreen on an empty page |
| fflate over archiver              | Pure ESM, no CJS interop problems; handles both zip and unzip |
| `useReducer` over a state library | One screen of state; a library would be pure overhead         |
| Pointer Events for gestures       | Native browser API, no dependency                             |
| Fullscreen control hidden when unsupported, not simulated | An earlier CSS-only "simulated fullscreen" fallback for iOS Safari never actually changed anything visually (the lightbox is already full-viewport), so the button appeared broken. Hiding it via `isFullscreenSupported()` is simpler and matches reality — Android and desktop browsers that do support the API are unaffected |
| Gestures track pointers by `pointerId` | A single shared start position let a second finger touching down mid-swipe corrupt the gesture; per-pointer tracking is also required for pinch-to-zoom |
| Web Share API for save-to-Photos  | No browser API writes silently into the OS photo gallery; `navigator.share({files})` is the only standards-based way, at the cost of one native confirmation tap. Falls back to per-file Downloads on unsupported browsers |
| XMLHttpRequest for upload progress | `fetch` has no upload-progress event; XHR is the dependency-free way to report real byte-level progress on large uploads |
| Selection ZIP progress is indeterminate | The ZIP is built with one buffered, synchronous `zipSync` call server-side (see "Archive uploaded, never generated" above) — there is no incremental signal to report a real percentage from |
| Photo feedback is per-visitor, not one verdict per photo | Each anonymous browser can independently like/dislike/comment on the same photo; a photo accumulates many rows and the admin sees aggregated counts plus raw comment text, not a single global state. Confirmed with the photographer rather than assumed |
| First feedback action locks all three buttons for that visitor/photo | Once a visitor likes, dislikes, or comments on a photo, switching or a second comment is blocked until admin reset — enforced client-side (hide via localStorage) and, as defense in depth, server-side via a `(photoId, visitorId)` unique constraint, so a cleared cache, second tab, or replayed request can't bypass it |
| `localStorage` for visitor identity, not a cookie | Comments are explicitly anonymous with no accounts; a signed server session would imply more identity/trust than intended. This is the app's first use of client-side storage — everywhere else uses server-side `iron-session` cookies |
| Feedback border reflects only the current visitor's own reaction | The client never asks the server for a photo's aggregate reaction to color a border; it only reads its own local state. Keeps the payload sent to the gallery page unchanged and avoids an ambiguous color for a photo with mixed reactions from many visitors |
| Reset re-opens feedback via a bumped `feedbackResetAt` epoch, not by touching client storage | Deleting the database rows alone leaves every visitor's own `localStorage` still claiming "I already reacted." The client compares its cached epoch against the project's current one on each load and discards its cache on mismatch — nothing server-side can reach into another origin's storage directly |
| `feedbackEnabled` defaults to `false` | Mirrors `zipEnabled`/`dlEnabled`; an already-delivered gallery must not suddenly show new client-facing buttons after an upgrade without the photographer opting in |
| `usePhotoFeedback`'s local reaction state starts empty and is populated in a `useEffect`, not in the `useState` initializer | Reading `localStorage` synchronously on the client's first render made that render disagree with the server-rendered HTML (which has no `localStorage`), and React's hydration-mismatch recovery kept the server's stale "not reacted" DOM rather than patching it — silently hiding a visitor's own past reactions on every reload. Populating state after mount (client-only, post-hydration) keeps the first render identical on both sides |
| A visitor can undo their own reaction (`DELETE /api/projects/[id]/photos/[photoId]/feedback`), scoped to that visitor and that photo only | Distinguishes it from the admin's project-wide reset — a client changing their mind about one photo shouldn't require the photographer to wipe every visitor's feedback on the whole gallery |
| Mobile lightbox: swipe down closes the swipe-up action sheet first, then the viewer | The two gestures previously fought over the same bottom region — swiping up revealed Cancel/Download, and swiping down would then close the whole viewer regardless, so there was no way to dismiss just the action sheet. The feedback bar is also hidden while the action sheet is open, since both anchor to the bottom of the screen |
| `prisma/migrations/20260730093327_init` and `20260730100000_...` rewritten from PostgreSQL to MySQL syntax | The originals used `CREATE TYPE ... AS ENUM`, which is not valid MySQL — `prisma migrate deploy` could never have completed against a real, empty MySQL database despite `migration_lock.toml` declaring `mysql`. Any live deployment can only have been created via `prisma db push` reading `schema.prisma` directly, never by applying these files |
| `add_showcase` migration written with `prisma migrate diff` instead of `prisma migrate dev` | The dev database user cannot create the shadow database `migrate dev` needs. `diff --from-config-datasource --to-schema` produces the same SQL; `migrate deploy` applies it without a shadow DB |
| One `Showcase` per project, inheriting the project's access | The photographer shares "the gallery" and "the showcase" as two views of one delivery. A second password to manage, or many showcases per project, buys nothing the feature was asked for. `@unique` on `projectId` enforces it |
| Showcase reuses `verifyGalleryAccess` + the gallery cookie rather than its own gate | The requirement is that a client who opened one can walk into the other without re-typing the password. Sharing `kuvalib_gallery_[projectId]` makes that automatic and adds zero auth surface |
| A page's block tree is one `Json` blob (`ShowcasePage.blocksJson`), not a `ShowcaseBlock` table | A page is authored and saved as a whole; nothing queries a single block. A blob is the simplest thing that works and matches how the builder autosaves (the entire deck in one `PUT`). Normalise later only if per-block queries appear |
| Craft.js runs a **flat** node tree; group membership is a `parentGroupId` prop | The design handoff calls for "flatten to one positioned list per page; `parentGroupId` is metadata, not DOM nesting" — grouped blocks keep canvas-absolute coordinates. A flat tree honours that and sidesteps rebasing children's coordinates inside a nested DOM box. `craft-bridge.ts` nests/flattens at the DB boundary |
| `react-rnd` for drag/resize, not Craft's own drag-drop | Craft has no resize handles, and its drag-drop reorders within DOM parents — the showcase needs free percentage positioning and geometric re-parenting instead. Craft still owns the node registry, selection and serialization |
| `zustand` for album state, despite "useReducer over a state library" elsewhere | Album settings, the page list and non-active page snapshots live outside Craft's per-frame editor and are read across the whole builder tree. This was approved for the showcase specifically; the rest of the app is unchanged |
| The showcase **viewer** never loads Craft.js | It only needs geometry. It renders the flattened `Block[]` as positioned `div`s and shares `BlockContent` with the builder, keeping the client bundle for `/s/[slug]` small |
| Showcase tracks are served by a guarded route, not `/api/uploads` | `/api/uploads` is thumbnails-only by an earlier decision. `GET /api/projects/[id]/showcase/tracks/[tid]` checks `verifyGalleryAccess` and supports `Range` so a link that never passed the gate cannot pull the audio |
| `ShowcaseViewer` resolves `isFullscreenSupported()` in a `useEffect`, not during render | It reads `document`; evaluating it during render made the server omit the Fullscreen control and the client add it — a hydration mismatch that shuffled the whole control row. Same fix as `usePhotoFeedback` and the lightbox |
| Showcase builder seeds `zustand` in a `useEffect` and renders a placeholder until ready | The builder is an admin-only interactive island with nothing to server-render. Initialising after mount avoids a module-singleton store bleeding one request's deck into another's SSR |
| Production ships `.next/standalone` + `node server.js`, not full `.next` + `next start` | The old workflow hand-picked which folders to copy into the artifact and kept missing some (`components/`, `next.config.ts`); `next start` also warns and is unsupported under `output: 'standalone'`. Standalone lets Next's own tracer decide what to include — the artifact is smaller and complete by construction |
| `server.js` gets its env from systemd, not a `.env` file | The Next standalone server has no `.env` loader (unlike `next start`). The systemd unit's `EnvironmentFile=` supplies it; `update-from-github.sh` `source`s `.env` only for the commands it runs itself |
| systemd unit uses `Restart=always` (`[Service]`) + `StartLimitIntervalSec=0` (`[Unit]`) | The app must come back after *any* stop — crash, OOM kill, `systemctl kill`, a bad deploy. The default `Restart=on-failure` plus a start-limit would leave it dead after a burst of fast restarts. `StartLimitIntervalSec` belongs to `[Unit]`; systemd silently ignores it under `[Service]` (`journalctl` logs "Unknown key name", easy to miss) rather than erroring, so the placement is worth stating explicitly |
| `detect_runner()` in `update-from-github.sh`/`restart-app.sh` asks `systemctl show -p LoadState --value kuvalib.service`, not `systemctl list-unit-files \| grep` | The table-parsing form came back empty for a non-root caller on at least one host even with the unit installed and running, so the script treated a systemd-managed app as unmanaged ("manual") and `pkill`ed it directly — racing systemd's own `Restart=always` for the port during a deploy. Querying one unit's `LoadState` directly doesn't depend on listing/formatting all units |
| Deploy swaps the build with `rsync -a --delete` while the service is stopped, snapshotting the old build first | `--delete` removes files the new build dropped (the failure mode that plagued the hand-picked copy list). Stopping first avoids a running Node process reading half-swapped chunks. The `--link-dest` snapshot into `.rollback/` is near-free and enables automatic restore on a failed health check |
| Server-side migrations run via `npx prisma@<pinned>`, not a bundled CLI | Prisma's CLI pulls a ~250 MB dependency tree (`@prisma/dev`/pglite, studio) that cannot be safely hand-pruned and would dwarf the 185 MB app bundle. `npx` caches it after the first deploy. The deploy-only `prisma.config.ts` is a plain object because `import "prisma/config"` is unresolvable from an npx cache dir |
| Showcase builder: resize handles are always mounted (shown/hit-tested only when the block is selected) | Gating `enableResizing` on selection meant a mousedown on a handle → Craft's canvas `select` connector fires (a native listener, so react-rnd's synthetic `stopPropagation` can't stop it) → the block deselects → `enableResizing` flips to `false` → the handle unmounts *before* React runs its `onMouseDown`, so the resize never starts. Keeping the handles mounted and toggling only `opacity`/`pointerEvents` removes the race; `onResizeStop` re-selects the block, and `cancel: '.sc-resize-handle'` stops the drag layer from also claiming the gesture |
| Showcase z-order follows flat node order; no per-block z-index and no bump on selection | An `isActive ? zIndex:5` on the selected block's wrapper lifted background blocks in front of everything when selected. Paint order is the Craft ROOT node order (the viewer keeps a group's children right after the group), so "bring to front" is append and "send to back" is prepend — `actions.move(id, 'ROOT', count \| 0)` |
| Group re-parenting requires the candidate group to be at least half the dragged block's own area | A block's centre landing inside a smaller group's box was enough to re-parent it — including a full-bleed background Image whose centre could drift into a caption Group placed over it, visually "losing" the image behind the group on the next arrange. The size-ratio guard is applied both where re-parenting happens (`BlockShell.onDragStop`) and, defensively, at arrange time (`useBuilder.arrangeGroup`, which also self-heals any block already mis-parented this way) |
| A page's own appearance (background, border) is real `ShowcasePage` columns, not part of `blocksJson` | Unlike the block tree, a page has exactly one appearance — there's nothing to normalise into a list, and keeping it as columns lets `sanitizePageSettings` guard it the same explicit way as every other admin-entered field, rather than growing an ad-hoc key inside the JSON blob (principle 9: models over denormalised JSON) |
| Ken Burns implemented as plain CSS `@keyframes`, gated only by the existing global `prefers-reduced-motion` rule | `globals.css` already forces `animation-duration:0.01ms !important` on `*` under reduced motion — the Ken Burns keyframes need no JS condition or extra media query of their own to comply; they simply inherit the blanket rule |
| Ken Burns moved from a per-page setting to a per-Image-block setting, animating the `<img>` itself inside a static border/radius wrapper | Animating the whole page made text and other blocks pan/zoom along with the background photo, which read as broken rather than cinematic — Ken Burns is a photo-viewing convention, not a page-transition one. Scoping it to the image also means a page with a caption and an image can animate the photo without disturbing the caption's position. Moved out of `ShowcasePage` (dropped via a follow-up migration) into `Block.kenBurns`/`kenBurnsSpeed`, sanitized alongside the rest of an image block's fields |
| Showcase stage fills its container with `position:absolute; inset:0` (100% width and height), not a fixed-16:10 letterboxed box | The original `min(100%, calc(100vh * 1.6))` formula kept the page's own 16:10 ratio, but on a typical widescreen monitor (16:9, wider than 16:10) that meant `100vh * 1.6` was *always* the binding constraint, leaving empty space on the sides — the opposite of "fill the available space." Filling both axes unconditionally means a full-bleed Image block always covers the whole window; the trade-off is that a page's block proportions now stretch with whatever the browser window's aspect ratio is, rather than staying pixel-identical to the 16:10 builder canvas — acceptable since the builder canvas itself is unaffected (only the viewer's `PageStage` changed) |
| The theme CSS custom properties (`--sc-accent`, `--sc-surface`, …) are set on the whole builder grid row, not just on `Canvas` | `SettingsPanel`/`BlockTree` sit outside `Canvas`'s own DOM subtree, so a swatch there referencing `var(--sc-accent)` resolved to nothing (silently falling back to no background) — a latent bug that only became visible once swatches were changed to preview their own configured colour instead of a generic placeholder. Scoping the vars one level up, over the whole three-column grid, fixes it for every consumer at once |
| Headline blocks keep no Background/Corners sections and no text-colour opacity slider | The user asked for headline text to always be solid and for the block to own nothing but its text colour — Text/Button/Group keep their existing background, corners and (for text colour) opacity controls unchanged |
| Custom CSS textarea has no sanitisation beyond a 20,000-character cap | It is admin-only input rendered on the admin's own public showcase page — the same trust boundary as every other builder field (block text, colours, links). Not attacker-facing the way client-submitted content is |
| `BlockTree` reads the same Craft ROOT node order the canvas paints from, rather than keeping its own ordering | Guarantees the list can never disagree with actual stacking order — "first row is furthest back" falls out of the existing `moveWithinBand`/paint-order contract for free, instead of needing a second source of truth to keep in sync |
| The viewer's rendered DOM carries a small set of stable class names (`sc-viewer`, `sc-stage`, `sc-page`, `sc-block`(-type), `sc-controls`, `sc-dots`(-active), `sc-thumbnails`(-active)) | Custom CSS had nothing to select — every element was unstyled-by-class, inline-style-only. These are a deliberate, documented public contract (surfaced in Album settings' Custom CSS info panel) and must not be renamed or removed without updating that reference text alongside it |
| Page-dot indicator moved to top-left (was vertically centred left) and gained a `Showcase.dotsEnabled` toggle | Centred-left visually collided with mid-page content on shorter pages; top-left keeps it clear of everything and mirrors `ViewerControls`' top-right placement. Some albums don't want a page-position indicator at all (e.g. a single continuous story rather than discrete "pages"), hence the toggle — defaults to `true` so existing showcases are unaffected |

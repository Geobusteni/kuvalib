# Kuvalib – Build Plan

> Read `AGENTS.md` and `ARCHITECTURE.md` before starting any phase.
>
> This plan is the single source of truth for build order and progress.
> Mark phases **[DONE]** as they are completed. Never skip a phase without noting the reason.

---

## How to Use This Plan

1. Read the current phase. Complete every task in it before moving on.
2. Each task lists the files to create or modify and the acceptance criteria.
3. When a phase is complete, mark it `[DONE]` and commit.
4. The next AI agent picking up the project reads `AGENTS.md` first, then this file, and starts at the first incomplete phase.

---

## Phase 0 — Foundation `[ ]`

Establish the technical bedrock: dependencies, environment, database, file storage, and shared utilities. No UI yet.

### 0.1 Install dependencies

```bash
npm install better-sqlite3 iron-session bcryptjs nanoid archiver sharp
npm install --save-dev @types/better-sqlite3 @types/bcryptjs @types/archiver
```

**Justify each:**
| Package         | Reason                                      |
|-----------------|---------------------------------------------|
| `better-sqlite3`| Synchronous SQLite — simple, fast, no extra server |
| `iron-session`  | Signed/encrypted cookie sessions — minimal auth |
| `bcryptjs`      | Hash admin password and per-project passwords |
| `nanoid`        | URL-safe unique IDs for projects and photos |
| `archiver`      | Stream ZIP archives without loading into memory |
| `sharp`         | Server-side thumbnail generation at upload time |

### 0.2 Environment setup

Create `.env.local` (never commit this):

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=          # bcrypt hash of the admin password
SESSION_SECRET=               # 32+ random chars
UPLOAD_DIR=./uploads
```

Create `.env.example` (commit this with placeholder values so agents know what is required).

### 0.3 Database

Create `lib/db.ts` — singleton SQLite connection.

```ts
// lib/db.ts
import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'kuvalib.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) db = new Database(DB_PATH)
  return db
}
```

Create `lib/schema.ts` — run once to initialise tables:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  event_date  TEXT,
  password    TEXT NOT NULL,
  expires_at  TEXT,
  zip_enabled INTEGER NOT NULL DEFAULT 1,
  dl_enabled  INTEGER NOT NULL DEFAULT 1,
  dl_count    INTEGER NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_access TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  size        INTEGER NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
```

Run schema via an `initDb()` call inside `lib/db.ts`, executed at startup (call it from `instrumentation.ts`).

### 0.4 Auth utilities

Create `lib/auth.ts`:
- `getSession(req)` — reads Iron Session cookie, returns `{ admin: boolean }` or null
- `requireAdmin(req)` — throws/redirects if not admin
- `hashPassword(plain)` — returns bcrypt hash
- `verifyPassword(plain, hash)` — returns boolean

Session options:

```ts
export const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'kuvalib_session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
}
```

### 0.5 Upload directory

Create `lib/storage.ts`:
- `projectDir(projectId)` — returns absolute path to `uploads/[id]`
- `photosDir(projectId)` — `uploads/[id]/photos`
- `thumbsDir(projectId)` — `uploads/[id]/thumbs`
- `archiveDir(projectId)` — `uploads/[id]/archive`
- `ensureProjectDirs(projectId)` — `mkdir -p` all three subdirs

Add `uploads/` to `.gitignore`.

### 0.6 Acceptance criteria

- `npm run build` passes with no errors
- `uploads/` is gitignored
- `.env.example` is committed
- Database file is gitignored

---

## Phase 1 — Admin Authentication `[ ]`

Single-user login/logout. Protects all admin routes.

### 1.1 Login page

File: `app/(admin)/login/page.tsx`

- Server Component that redirects to `/projects` if already authenticated
- Renders a `<LoginForm>` client component

File: `app/(admin)/login/_components/LoginForm.tsx` (Client Component)

- Username + password fields
- On submit: POST to `/api/auth`
- On success: redirect to `/projects`
- On failure: show inline error ("Invalid credentials")
- No third-party form library — use native `<form>` and `useState`

### 1.2 Auth route handler

File: `app/api/auth/route.ts`

```ts
POST /api/auth   — verify credentials → set session → 200
DELETE /api/auth — clear session → 200
```

- POST: compare username to `ADMIN_USERNAME`, verify password against `ADMIN_PASSWORD_HASH` with bcryptjs
- DELETE: destroy session cookie

### 1.3 Admin layout with auth guard

File: `app/(admin)/layout.tsx`

- Server Component
- Reads session via `getSession()`
- If not authenticated and not on `/login`, redirect to `/login`
- Renders a minimal admin shell (no nav yet — added in Phase 2)

### 1.4 Logout

A `<LogoutButton>` client component that sends `DELETE /api/auth` then redirects to `/login`.

### 1.5 Acceptance criteria

- Visiting `/projects` unauthenticated redirects to `/login`
- Correct credentials set session cookie and redirect to `/projects`
- Wrong credentials show an error message without page reload
- Logout clears the session and returns to `/login`
- Keyboard: tab order is username → password → submit; Enter submits

---

## Phase 2 — Admin: Project Management `[ ]`

CRUD for projects. No photo upload yet.

### 2.1 Project data access layer

File: `lib/projects.ts`

Functions (all synchronous, using `better-sqlite3`):
- `listProjects()` → `Project[]` ordered by `created_at DESC`
- `getProject(id)` → `Project | null`
- `createProject(data)` → `Project`
- `updateProject(id, data)` → `Project`
- `deleteProject(id)` — deletes DB row (files cleaned up separately)

### 2.2 API routes

File: `app/api/projects/route.ts`

```
GET  /api/projects   → list all projects (admin only)
POST /api/projects   → create project (admin only)
```

File: `app/api/projects/[id]/route.ts`

```
GET    /api/projects/[id]   → get project + photo count
PUT    /api/projects/[id]   → update settings
DELETE /api/projects/[id]   → delete project + files
```

All routes check `requireAdmin()` before proceeding.

### 2.3 Project list page

File: `app/(admin)/projects/page.tsx` (Server Component)

- Fetches all projects directly via `listProjects()`
- Shows: title, event date, photo count, visit count, download count, last access
- "New project" button → `/projects/new`
- Each row links to `/projects/[id]`
- Empty state if no projects yet

### 2.4 Create project page

File: `app/(admin)/projects/new/page.tsx`

Client component form fields:
- Title (required)
- Event date (optional, date input)
- Password (required)
- Expiration date (optional)
- ZIP download toggle
- Image download toggle

On submit: POST to `/api/projects` → redirect to `/projects/[id]`.

### 2.5 Edit project page

File: `app/(admin)/projects/[id]/page.tsx` (Server Component)

- Fetches project via `getProject(id)`, 404 if not found
- Renders the same form pre-filled for editing
- Separate "Danger zone" section: delete project button (with confirmation)
- Stats display: visit count, download count, last access
- Photo list placeholder (photos added in Phase 3)

### 2.6 Admin navigation

Update `app/(admin)/layout.tsx` to include a simple top bar:
- "Kuvalib" wordmark (links to `/projects`)
- Logout button

### 2.7 Acceptance criteria

- Can create a project and see it in the list
- Can edit title, date, password, expiry, toggles
- Can delete a project (with confirmation prompt)
- All form submissions are keyboard-accessible
- Empty and error states are handled gracefully

---

## Phase 3 — Admin: Photo Upload `[ ]`

Upload JPEGs and ZIP archives. Generate thumbnails immediately.

### 3.1 Thumbnail generation

File: `lib/images.ts`

```ts
generateThumbs(projectId: string, filename: string): Promise<{ width, height }>
```

- Uses Sharp
- Reads from `photosDir(projectId)/filename`
- Writes `sm` (≤400 px wide) and `lg` (≤1200 px wide) to `thumbsDir(projectId)/`
- Naming convention: `[basename]-sm.jpg`, `[basename]-lg.jpg`
- Returns original dimensions

### 3.2 Upload route handler

File: `app/api/projects/[id]/upload/route.ts`

```
POST /api/projects/[id]/upload  multipart/form-data
```

Accepts:
- One or more JPEG files (validate MIME type server-side)
- One ZIP file (extract, filter JPEGs, process each)

For each JPEG:
1. Validate MIME (`image/jpeg`)
2. Generate a nanoid for the photo
3. Save original to `photosDir(projectId)/[photoid].jpg`
4. Call `generateThumbs()`
5. Insert row into `photos` table with dimensions, size, sort_order

For a ZIP:
1. Extract with `archiver` or the built-in `decompress` approach — use `unzipper` package
2. For each `.jpg`/`.jpeg` inside, process as above

> Note: add `unzipper` to dependencies for ZIP extraction if needed; `archiver` is for creating ZIPs.

### 3.3 Upload UI

Add to `app/(admin)/projects/[id]/page.tsx`:

A `<UploadZone>` client component:
- Drag-and-drop area using native drag events (no library)
- Also a file `<input>` as fallback (accessible, keyboard reachable)
- Accepts `image/jpeg` and `application/zip`
- Shows upload progress via fetch + ReadableStream or simple loading state
- After upload, refreshes photo list via `router.refresh()`

A `<PhotoGrid>` below the upload zone:
- Shows uploaded photos with `sm` thumbnails
- Delete button per photo (DELETE `/api/projects/[id]/photos/[photoId]`)
- Drag-to-reorder (CSS-only placeholder; full DnD out of scope for now)

### 3.4 Photo delete route

File: `app/api/projects/[id]/photos/[photoId]/route.ts`

```
DELETE /api/projects/[id]/photos/[photoId]
```

- Removes DB row
- Deletes original + both thumbs from disk

### 3.5 Acceptance criteria

- Upload 1–20 JPEGs: all processed, thumbnails visible in admin
- Upload a ZIP: extracted JPEGs processed correctly
- Invalid file type: rejected with a clear error message
- Delete a photo: removed from DB and disk
- Upload is keyboard-accessible (file input reachable by Tab, activatable by Enter/Space)

---

## Phase 4 — Client Gallery `[ ]`

Password-protected gallery. Responsive grid. No selection or lightbox yet.

### 4.1 Gallery password auth

File: `app/api/projects/[id]/auth/route.ts`

```
POST /api/projects/[id]/auth   { password } → set gallery cookie
```

- Verifies password against `projects.password` bcrypt hash
- Sets a cookie `gallery_[projectId]` (short-lived signed value)
- Returns 401 on mismatch

File: `lib/gallery-auth.ts`
- `verifyGalleryAccess(req, projectId)` — checks gallery cookie
- Returns `true` if valid admin session OR valid gallery cookie

### 4.2 Gallery page

File: `app/(gallery)/g/[slug]/page.tsx` (Server Component)

- Look up project by slug (project `id` is the slug)
- Check expiration: if expired, show "This gallery has expired"
- Check `verifyGalleryAccess()`: if denied, render `<PasswordGate>`
- If access granted: render `<GalleryShell>` with photo list

### 4.3 Password gate

File: `components/gallery/PasswordGate.tsx` (Client Component)

- Single password input + submit
- POSTs to `/api/projects/[id]/auth`
- On success: reload the page (the server will now see the cookie)
- Shows error on wrong password
- Auto-focus the password field on mount

### 4.4 Gallery shell + photo API

File: `app/api/projects/[id]/photos/route.ts`

```
GET /api/projects/[id]/photos  → photo list (requires gallery access)
```

Returns: `{ id, filename, width, height, thumbSm, thumbLg }[]`

Thumb URLs are constructed as `/uploads/[id]/thumbs/[filename]-sm.jpg` — serve `uploads/` as a static directory via `next.config.ts`:

```ts
// next.config.ts
export default {
  outputFileTracingIncludes: { '/uploads/**': ['./uploads/**'] },
  async rewrites() {
    return [{ source: '/uploads/:path*', destination: '/api/uploads/:path*' }]
  }
}
```

Or serve via a dedicated route handler that streams the file. Keep it simple.

### 4.5 Gallery layout

File: `components/gallery/Gallery.tsx` (Client Component)

- CSS-only masonry grid (CSS `columns` property — no library)
- Renders `<ImageTile>` for each photo
- `columns: 2` on mobile, `3` on tablet, `4` on desktop
- Lazy loading: `loading="lazy"` on every `<img>`

File: `components/gallery/ImageTile.tsx` (Client Component)

- Renders `<img>` with `sm` thumb src
- `srcSet` with both `sm` and `lg` for responsive loading
- Tap/click → calls `onOpen(photoId)` (wired up in Phase 6)
- `aspect-ratio` preserved from photo dimensions to avoid layout shift

File: `components/gallery/Toolbar.tsx` (Client Component)

- Fixed top bar, minimal height
- Normal mode: project title | [Select] [Download ZIP]
- ZIP button hidden if `zipEnabled === false`
- Download ZIP: links to `/api/projects/[id]/download`

### 4.6 Visit tracking

In the gallery page Server Component, increment `visit_count` and set `last_access` on each page load. Do this after rendering (use a fire-and-forget approach).

### 4.7 Acceptance criteria

- Unauthenticated visit shows password gate
- Wrong password shows error
- Correct password shows gallery
- Expired gallery shows expiry message
- Grid is responsive: 2 / 3 / 4 columns at mobile / tablet / desktop
- Images lazy-load
- No layout shift (aspect ratios preserved)
- ZIP button absent when `zip_enabled = 0`

---

## Phase 5 — Selection Mode `[ ]`

Multiple image selection and batch ZIP download.

### 5.1 Gallery state

In `components/gallery/Gallery.tsx`, introduce a reducer:

```ts
type GalleryMode =
  | { mode: 'gallery' }
  | { mode: 'selection'; selected: Set<string> }
```

- `SELECT_TOGGLE_MODE` — enter/exit selection
- `SELECT_TOGGLE_IMAGE(id)` — add/remove from selected set
- `SELECT_CLEAR` — exit selection and clear

### 5.2 Selection UX

When `mode === 'selection'`:
- Each `<ImageTile>` shows a checkbox indicator (CSS overlay, no library)
- Tap/click toggles selection instead of opening lightbox
- Checked images have a visible ring/check mark (meets contrast requirements)

Toolbar becomes:
- [Cancel] [Download Selected (N)]
- N = count of selected items
- "Download Selected" disabled when N = 0

### 5.3 Selection download route

File: `app/api/projects/[id]/download/route.ts`

```
GET  /api/projects/[id]/download          → full ZIP (zip_enabled check)
POST /api/projects/[id]/download          → selected photos ZIP { photoIds: string[] }
```

Stream a ZIP with `archiver` from the originals in `photosDir`.
Increment `dl_count` on download.

### 5.4 Keyboard integration

When `mode === 'selection'`:
- `Space` on a focused tile toggles selection
- `Escape` → cancel selection mode
- `D` → trigger download of selected

Global keyboard handler:
- `S` → toggle selection mode

### 5.5 Acceptance criteria

- Pressing Select enters selection mode; Cancel exits it
- Tapping images in selection mode toggles the check; does not open lightbox
- "Download Selected" is disabled with 0 selected
- Downloading selected creates a ZIP of only those images
- `dl_count` increments on every download
- All selection controls reachable and operable by keyboard

---

## Phase 6 — Lightbox `[ ]`

Full-screen photo viewer. Mobile gestures and desktop controls.

### 6.1 Viewer state

Add to the gallery reducer:

```ts
type GalleryMode =
  | { mode: 'gallery' }
  | { mode: 'selection'; selected: Set<string> }
  | { mode: 'viewer'; currentIndex: number }
  | { mode: 'viewer-fullscreen'; currentIndex: number }
```

Opening the viewer: `{ mode: 'viewer', currentIndex: n }`.

### 6.2 PhotoViewer component

File: `components/lightbox/PhotoViewer.tsx` (Client Component)

- Full-screen overlay (`position: fixed`, `inset: 0`, `z-index: 50`, black background)
- Shows the `lg` thumb (or original if `dl_enabled`) of the current photo
- Wraps `<ViewerControls>` and `<GestureHandler>`
- Traps focus inside while open
- On close: return focus to the `<ImageTile>` that was active before opening

### 6.3 Gesture handler (mobile)

File: `components/lightbox/GestureHandler.tsx` (Client Component)

Swipe detection using Pointer Events only — no library.

```
pointerdown → record start position
pointermove → track delta
pointerup   → classify gesture by dominant axis and distance threshold
```

| Gesture    | Threshold     | Action                |
|------------|---------------|-----------------------|
| Swipe left | > 50 px       | Next image            |
| Swipe right| > 50 px       | Previous image        |
| Swipe down | > 80 px       | Close viewer          |
| Swipe up   | > 80 px       | Reveal action panel   |
| Tap        | < 10 px delta | Toggle controls       |

Wrap in `touch-action: none` to prevent scroll interference.

### 6.4 Desktop controls

File: `components/lightbox/ViewerControls.tsx` (Client Component)

Always visible on desktop (not fullscreen). Each button must have an `aria-label`.

| Button      | Label              | Action                |
|-------------|--------------------|-----------------------|
| ←           | "Previous image"   | Previous              |
| →           | "Next image"       | Next                  |
| ↓           | "Download image"   | Download original     |
| ⛶           | "Enter fullscreen" | Fullscreen API        |
| ✕           | "Close viewer"     | Close                 |

Fullscreen mode: controls auto-hide after 3 s of inactivity. `mousemove` or any keypress resets the timer.

### 6.5 Fullscreen

Use `document.documentElement.requestFullscreen()` / `exitFullscreen()`. No library.

Listen to `fullscreenchange` event to sync `viewer-fullscreen` state.

### 6.6 Keyboard manager

File: `hooks/useKeyboard.ts`

A hook that attaches a `keydown` listener when the viewer is open:

| Key     | Action              |
|---------|---------------------|
| ←       | Previous image      |
| →       | Next image          |
| Escape  | Close viewer        |
| F       | Toggle fullscreen   |
| D       | Download image      |
| Home    | First image         |
| End     | Last image          |

And in gallery mode:

| Key     | Action              |
|---------|---------------------|
| S       | Toggle selection    |
| Escape  | Cancel selection    |
| D       | Download selected   |
| Z       | Download ZIP        |

### 6.7 Reduced motion

File: `hooks/useReducedMotion.ts`

```ts
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}
```

When `reduced === true`:
- Skip all CSS transitions in the viewer
- Disable slideshow autoplay (Space key does nothing)

### 6.8 Acceptance criteria

- Tapping an image opens the viewer on that image
- Swipe left/right navigates images on touch devices
- Swipe down closes the viewer
- Arrow keys navigate; Escape closes; F toggles fullscreen
- Controls auto-hide after 3 s in fullscreen; reappear on mousemove
- Focus moves inside viewer on open; returns to triggering tile on close
- `prefers-reduced-motion` disables all transitions
- Download button downloads the original (if `dl_enabled`)
- All buttons have visible labels/aria-labels

---

## Phase 7 — File Serving & ZIP Downloads `[ ]`

Serve uploaded files and stream ZIP archives.

### 7.1 Serve uploads

File: `app/api/uploads/[...path]/route.ts`

```
GET /api/uploads/[...path]
```

- Resolves path relative to `UPLOAD_DIR`
- Validates no directory traversal (`..`)
- Streams the file with correct `Content-Type`
- Sets `Cache-Control: public, max-age=31536000, immutable` for thumbs
- Sets `Content-Disposition: attachment` for original photo downloads

### 7.2 Full ZIP archive

`GET /api/projects/[id]/download`

- Check `zip_enabled`; return 403 if disabled
- Check gallery access (cookie or admin session)
- Stream a ZIP using `archiver` from all files in `photosDir`
- `Content-Disposition: attachment; filename="[project-title].zip"`
- Increment `dl_count` asynchronously after response starts

### 7.3 Selected photos ZIP

`POST /api/projects/[id]/download` `{ photoIds: string[] }`

- Validate each photoId belongs to the project
- Stream ZIP of those originals only
- Increment `dl_count`

### 7.4 Individual image download

When "Download image" is triggered in the lightbox:
- Fetch `/api/uploads/[id]/photos/[filename]` with `Content-Disposition: attachment`
- Or: use `<a download href="...">` — simplest approach

Check `dl_enabled` before serving originals.

### 7.5 Acceptance criteria

- Thumbs are served with long cache headers
- ZIP downloads stream correctly and have a sensible filename
- `dl_count` increments on every download
- Downloads disabled when `dl_enabled = 0`
- No directory traversal possible

---

## Phase 8 — Accessibility & Polish `[ ]`

Final accessibility pass, contrast audit, motion audit, and visual polish.

### 8.1 WCAG 2.1 AA audit

Audit every interactive element:
- Color contrast ≥ 4.5:1 for text, ≥ 3:1 for large text and UI components
- Use an overlay `rgba(0,0,0,0.5)` or similar behind controls on dark photos
- Add `focus-visible` ring styles to all interactive elements

### 8.2 Touch targets

Verify every button/control in the lightbox and toolbar is ≥ 44 × 44 px.

### 8.3 Focus management audit

- Lightbox open: focus moves to the viewer container or the first control
- Lightbox close: focus returns to the `<ImageTile>` that triggered it
- Password gate open: focus moves to the password input
- No focus trapping anywhere (Tab cycles through all controls, then exits)

### 8.4 Screen reader

- All `<img>` elements have meaningful `alt` text (e.g., photo filename or index)
- Gallery toolbar announces mode changes via `aria-live` region
- Lightbox announces current image (e.g., "Image 3 of 12") via `aria-label` or `aria-live`
- Selection count announced when it changes

### 8.5 Reduced motion final pass

Walk through every CSS transition and animation in the codebase. Each must:
- Be wrapped in `@media (prefers-reduced-motion: no-preference)` in CSS, OR
- Be skipped when `useReducedMotion()` returns true

### 8.6 Visual polish

- Consistent dark background (`#000` or `#0a0a0a`) for the gallery and lightbox
- Geist Sans for UI text (already in `layout.tsx`)
- No decorative borders, shadows, or gradients that distract from photos
- Loading skeleton for images before they load (simple grey `background-color` on the tile)

### 8.7 Acceptance criteria

- Zero WCAG 2.1 AA violations (use axe-core or browser DevTools audit)
- All interactive elements have visible focus indicators
- Screen reader announces viewer state and navigation
- App works identically with all CSS animations set to `0ms`

---

## Phase 9 — Hardening & Deployment Prep `[ ]`

Security, error handling, and production readiness.

### 9.1 Error boundaries

Add `app/error.tsx` (global error boundary) and `app/(gallery)/g/[slug]/error.tsx`.

### 9.2 Not found pages

Add `app/not-found.tsx` — minimal "not found" message.

### 9.3 Input validation

- Validate all API inputs server-side (no library required — native checks are fine)
- Sanitise filenames before writing to disk
- Check MIME type from file buffer (magic bytes), not just extension or Content-Type header

### 9.4 Rate limiting

Add a simple in-memory rate limiter on the gallery password route to prevent brute-force. (A `Map<ip, attempts>` reset every minute is sufficient given single-server deployment.)

### 9.5 Metadata

Update `app/layout.tsx` with proper metadata:
```ts
export const metadata = {
  title: { default: 'Kuvalib', template: '%s | Kuvalib' },
  robots: { index: false, follow: false },
}
```

Set `robots: noindex` on all gallery pages — this is a private delivery tool.

### 9.6 Environment checklist

Before first deployment, verify:
- [ ] `ADMIN_PASSWORD_HASH` is a real bcrypt hash (not plaintext)
- [ ] `SESSION_SECRET` is at least 32 random characters
- [ ] `UPLOAD_DIR` is an absolute path writable by the Node process
- [ ] `uploads/` is excluded from source control
- [ ] `kuvalib.db` is excluded from source control

### 9.7 Acceptance criteria

- All 9 phases pass their acceptance criteria
- `npm run build` completes without errors or warnings
- `npm run lint` passes
- Application starts cleanly in production mode (`NODE_ENV=production`)

---

## Completion Checklist

Mark each phase done as it is verified:

- [x] Phase 0 — Foundation
- [x] Phase 1 — Admin Authentication
- [x] Phase 2 — Admin: Project Management
- [x] Phase 3 — Admin: Photo Upload
- [x] Phase 4 — Client Gallery
- [x] Phase 5 — Selection Mode
- [x] Phase 6 — Lightbox
- [x] Phase 7 — File Serving & ZIP Downloads
- [x] Phase 8 — Accessibility & Polish
- [x] Phase 9 — Hardening & Deployment Prep
- [x] Phase 10 — PostgreSQL, Prisma, Roles and Access Types
- [x] Phase 11 — Password Visibility, Uploaded Archives, Original Filenames
- [x] Phase 12 — Client Photo Feedback (Like/Dislike/Comment)
- [x] Phase 13 — Album Showcase (Stage 2)

---

## Phase 13 — Album Showcase (Stage 2) `[DONE]`

Stage 2: an admin-built, page-by-page designed slideshow assembled from a project's photos and
shared on its own link. Built on Craft.js. See `design_handoff_album_showcase/` for the spec and
the interactive design reference.

**Data model** — `Showcase` (one per `Project`, inherits its access), `ShowcasePage`
(`blocksJson` — one JSON blob per page), `ShowcaseTrack` (music files under
`uploads/<project>/audio/`). Enums `ShowcaseEventType`, `ShowcaseBg`, `ShowcaseAnimation`.
Migration `20260910120000_add_showcase`.

**Shared, framework-free core** — `lib/showcase-blocks.ts` (block types, the no-overlap
stack/align geometry, Cover composite, flatten/nest, block sanitisation) and
`lib/showcase-theme.ts` (event-type accent CSS variables, per-block appearance). `lib/showcase.ts`
is the data-access layer; `lib/audio.ts` sniffs upload formats.

**API** — `POST/PUT/DELETE /api/projects/[id]/showcase`, `PUT .../showcase/pages`,
`POST/GET .../showcase/tracks`, `GET/DELETE .../showcase/tracks/[trackId]` (stream gated by
`verifyGalleryAccess`, supports `Range`). ZIP download reuses `POST /api/projects/[id]/download`.

**Builder** — `app/(admin)/projects/[id]/showcase/page.tsx` → `components/showcase/builder/*`.
Craft.js `<Editor>` with a flat node tree (group membership is the `parentGroupId` prop, not DOM
nesting); `react-rnd` drag/resize writing percentage props; `zustand` for album settings, the
page list and non-active page snapshots. Autosaves the whole deck.

**Viewer** — `app/(gallery)/s/[slug]/page.tsx` → `components/showcase/viewer/*`. Craft-free:
renders the flattened block list, runs the `idle→out→pre→in` page-turn machine (collapsed under
`prefers-reduced-motion`), autoplay + loop, thumbnail rail, fullscreen (`lib/fullscreen.ts`),
`<audio>` playlist, share link, download dialog. Reuses `components/gallery/AccessGate` and the
existing `POST /api/projects/[id]/auth` so the showcase and gallery share the
`kuvalib_gallery_[projectId]` cookie.

- [x] Schema, migration, storage helpers, shared libs
- [x] Create/delete showcase + admin entry point
- [x] Craft builder: blocks, drag/resize, settings panel, pages, autosave
- [x] Groups: re-parent by geometry, arrange without overlap
- [x] Album settings dialog + music upload/playback
- [x] Viewer: transitions, autoplay, thumbnails, fullscreen, music, download, access gate
- [ ] Full keyboard-only and screen-reader passes over the builder and viewer
- [ ] Re-run the accessibility checklist over the new surfaces

---

## Phase 10 — PostgreSQL, Prisma, Roles and Access Types `[DONE]`

Replaced the single-admin SQLite build with a multi-user PostgreSQL application.

### What changed

**Database**
- SQLite and `better-sqlite3` removed; PostgreSQL with Prisma 7 in their place.
- Prisma 7 needs an explicit driver adapter — `lib/prisma.ts` builds the client with
  `PrismaPg`. There is no implicit connection from `DATABASE_URL` alone.
- Schema in `prisma/schema.prisma`: `User`, `Project`, `ProjectAssignment`, `Photo`, plus the
  `Role` and `AccessType` enums.
- Field naming moved to camelCase throughout (`eventDate`, `zipEnabled`, `dlCount`, …).

**Configuration**
- Consolidated to a single `.env`, mirroring `wp-config.php`. `.env.local` deleted, and no
  other env variants may be created.
- `.gitignore` now ignores `.env` specifically so `.env.example` stays committed.
- Values containing `$` must be single-quoted; unquoted bcrypt hashes are silently truncated
  by variable interpolation. This cost an hour of debugging — do not undo it.

**Roles**
- Three roles: `ADMIN` (everything), `USER` (assigned projects only), `GUEST` (read-only,
  identified by email, no password).
- First-run flow at `/setup` creates the first admin; `/api/setup` refuses once one exists.
- Login accepts a username or an email.
- The last admin cannot be deleted or demoted.
- Admin user management at `/users`; per-project assignment on the project page.

**Project access**
- `accessType` is `PASSWORD` (one shared password) or `EMAIL` (assigned guest emails only).
- Both are read-only for viewers. Email-based access is groundwork for future client culling
  and notes.
- `AccessGate` replaces `PasswordGate` and renders the right prompt for the type.

**Other fixes**
- `/login` moved out of the `(admin)` route group. Inside it, the layout's auth guard
  redirected the login page to itself in an infinite loop.
- Admin routes marked `force-dynamic`; otherwise Next.js prerenders them at build time and the
  build dies on a database connection error.
- Uploads are stored under a generated UUID rather than the client's filename, and JPEGs are
  verified by magic bytes rather than by their declared MIME type.

### Verification

- `npx tsc --noEmit` clean
- `npm run build` clean
- Migration SQL generates correctly from the schema

### Not done

Requires a running PostgreSQL server, which was not available on the development machine:

- [x] Apply the migration (`npx prisma migrate dev --name init`)
- [ ] Walk through setup → login → create project → upload → gallery end to end
- [ ] Re-run the accessibility checklist against the new setup, users, and access-gate screens

---

## Phase 11 — Password Visibility, Uploaded Archives, Original Filenames `[DONE]`

### Gallery passwords are readable

Bcrypt hashes cannot be read back, so a password could only be reset, never looked up. Gallery
passwords now live as AES-256-GCM ciphertext (`lib/crypto.ts`) keyed off `SESSION_SECRET`, and the
project page shows them with **Show** and **Copy**. Account passwords stay on bcrypt.

The migration clears existing project passwords — old hashes cannot be decrypted, so those
projects need a new password set.

### The archive is uploaded, not generated

`GET /download` used to zip every original on demand. `Project.archiveName` / `archiveSize` now
record an admin-uploaded ZIP at `uploads/[id]/archive/archive.zip`, posted to
`/api/projects/[id]/archive`. The gallery shows **Download ZIP** only when that archive exists;
`GET /download` streams it and 404s otherwise.

Zipping a client's own selection (`POST /download`) is unchanged.

### Photos keep their original names

`Photo.filename` stays a generated UUID; `Photo.originalName` holds the uploaded name, with a
`(projectId, originalName)` unique constraint making duplicates detectable. The new route
`/api/projects/[id]/photos/[pid]/download` sets `Content-Disposition` from `originalName`, and
selection ZIPs name entries the same way.

Duplicate uploads return **409** with the conflicting names. `UploadZone` offers **Keep both**
(`name (2).jpg`) or **Replace existing** and re-sends with a `strategy` field.

`/api/uploads/[...path]` now serves thumbnails only. It previously served anything under the
project directory with no access check, bypassing the routes that verify access and count
downloads.

### CSS and lightbox fixes

- Gallery grid moved into a centred container at 80% width (90% on small screens, capped at
  1600px) with padding above and below, instead of running edge to edge.
- **Download ZIP** had a fixed height but no flex centering. Both toolbars now share one
  `inline-flex items-center justify-center` class.
- The first-open glitch was a focus holder styled `sr-only focus:not-sr-only`; focusing it on open
  rendered a "Close viewer" text block over the controls. The viewer now focuses the dialog itself
  and traps Tab within it.
- Unmounting calls `exitFullscreen()`, Escape exits fullscreen before closing, and body scroll is
  locked while the lightbox is open.

### Verification

`tsc --noEmit`, `npm run lint`, and `npm run build` all clean. Migration applied. An end-to-end
script covering login, upload, duplicate resolution, archive upload, and every download path
passed 23/23 against a running server.

### Not done

- [ ] Manual browser walkthrough of the conflict dialog and archive panel
- [ ] Re-run the accessibility checklist over those two new surfaces

---

## Phase 12 — Client Photo Feedback (Like/Dislike/Comment) `[DONE]`

Lets clients mark individual photos to help the photographer decide the final delivered set,
without any client accounts.

### What changed

**Database**
- New `FeedbackType` enum (`LIKE`, `DISLIKE`, `COMMENT`) and `PhotoFeedback` model: one row per
  `(photoId, visitorId)`, enforced with a unique constraint, cascading on `Photo` delete.
- `Project.feedbackEnabled` (default `false`) and `Project.feedbackResetAt` (bumped on reset).
- `lib/photo-feedback.ts`: `createFeedback`, `summarizeProjectFeedback`, `resetProjectFeedback`.

**Client (gallery + lightbox)**
- `PhotoFeedbackRow` (grid) and `PhotoFeedbackBar` (lightbox): Like/Dislike/Comment icon buttons,
  44×44 touch targets, `aria-pressed`/`aria-label` per state — never color alone.
- `FeedbackCommentDialog`, modeled on `DownloadOptionsDialog`'s focus-trap/keyboard pattern.
- A visitor's own reaction locks all three buttons for that photo (first choice is final) and
  draws a green/red/yellow ring on the tile and the lightbox image — sourced only from that
  visitor's own local state, never a server-side aggregate.
- `lib/feedback-storage.ts` + `hooks/usePhotoFeedback.ts`: a random per-browser visitor id and a
  per-project local cache, both in `localStorage` — the app's first use of client-side storage,
  since feedback is explicitly anonymous. The cache is keyed against the project's
  `feedbackResetAt`, so an admin reset re-opens the buttons even for a visitor who already used
  theirs, without the server ever touching another origin's storage.
- `POST /api/projects/[id]/photos/[photoId]/feedback`: gated by `verifyGalleryAccess` +
  `feedbackEnabled`, rate-limited, and rejects a second attempt for the same `(photo, visitor)`
  with 409 — server-side enforcement independent of the client's own bookkeeping.

**Admin**
- New `feedbackEnabled` toggle in `ProjectForm`, off by default so existing live galleries are
  unaffected until an admin opts in.
- New `FeedbackPanel`: aggregated like/dislike counts and comment text per photo, and a two-step
  "Reset feedback" action (`DeleteProjectButton`'s confirm pattern) that wipes all of it and bumps
  `feedbackResetAt`.

### Verification

`npx tsc --noEmit`, `npx eslint .`, and the project's license-header script all clean.

### Not done (at the time this phase first shipped)

No MySQL/MariaDB server was reachable from the development environment (`.env`'s
`DATABASE_URL` was a leftover `postgresql://` string from before the project's Postgres→MySQL
switch, not something to silently overwrite) — `prisma migrate dev` could not be run to generate
or apply the migration automatically. `prisma/migrations/20260809150000_add_photo_feedback/migration.sql`
was hand-written in the same style as the project's other MySQL migrations instead. See the
follow-up round below — a local dev database was set up in a later session and this was resolved.

---

## Phase 12 follow-up — feedback UI polish, per-visitor undo, and a real hydration bug

A round of fixes driven by hands-on use of Phase 12: several UI requests, and three symptoms
(feedback vanishing from the grid on reload, admin showing data the grid didn't, the lightbox
disagreeing with the grid) that turned out to be one root cause plus one pre-existing, unrelated
migration bug.

### What changed

**Bug fixes**
- The grid's like/dislike/comment state disappearing on reload was a React hydration mismatch:
  `usePhotoFeedback` read `localStorage` inside its `useState` initializer, so the client's first
  render disagreed with the server's (which has no `localStorage`), and React kept the server's
  stale DOM rather than patching it. Fixed by starting state empty and populating it in a
  `useEffect`, which only runs after hydration. This also explains why the lightbox was
  unaffected — it's never part of the server-rendered HTML.
- `prisma/migrations/20260730093327_init` and `20260730100000_...` contained PostgreSQL syntax
  (`CREATE TYPE ... AS ENUM`) despite the project having moved to MySQL — `prisma migrate deploy`
  could never have completed against a real, empty MySQL database. Rewritten in valid MySQL
  syntax producing the same schema; see the CHANGELOG for the one-time `migrate resolve` step
  needed on any database that already has data.
- `POST /api/projects` (project creation) never forwarded `feedbackEnabled` from the request body,
  so a project created with feedback checked still started disabled.

**Client-facing**
- A tooltip on each feedback button (hover, ~1.2s delay) naming what it does.
- A per-photo "undo your reaction" button (`DELETE /api/projects/[id]/photos/[pid]/feedback`,
  scoped to that visitor and photo only), visible only once the visitor has reacted; clears both
  their DB row and the matching `localStorage` entry.
- "Download All (Original ZIP)" moved from the gallery's top bar to below the grid.
- Mobile lightbox: the feedback bar and the swipe-up action sheet no longer overlap — the
  feedback bar hides while the sheet is open, and swiping down now closes the sheet first (if
  open) instead of always closing the viewer.

**Admin**
- A chevron on photos that have comments, indicating the row expands; the thumbnail is now its
  own control that opens a larger preview of the photo.

### Verification

`npx tsc --noEmit`, `npx eslint .`, and `npm run build` all clean. A local MySQL/MariaDB dev
database was set up (`kuvalib_dev`) and `.env` pointed at it, so this round — unlike Phase 12's
first pass — was verified against a real running app: migrations applied cleanly, and every fix
above was reproduced and confirmed fixed live in a browser (including the hydration bug itself,
confirmed via the exact React hydration-mismatch console warning before the fix, and its absence
after).

### Not done

- [ ] Keyboard-only and screen-reader passes over the new tooltip and reset-button additions
- [ ] Re-run the accessibility checklist over the changed surfaces

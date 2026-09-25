# Album Showcase

The **showcase** is a designed, page-by-page slideshow built from a project's photos and shared
with the client on its own link, separate from the raw gallery. Where the gallery is a grid for
viewing and downloading everything, the showcase is a curated, laid-out presentation — a cover,
captions, chapters, background music.

A project has **at most one** showcase. It is optional: build one only when you want it.

---

## Creating a showcase

On the project page, the **Showcase** section has a **Create showcase** button. It makes the
showcase (seeded with a Cover page) and opens the builder. Once it exists the section shows
**Open builder**, **View showcase ↗**, **Copy client link** (the `/s/<id>` URL, ready to send
to the client), and a **Delete** control.

Deleting a showcase removes its pages and music files. It does not touch the gallery or the
photos.

While a showcase exists, the project's gallery hides its like/dislike/comment buttons — the
showcase becomes the primary, polished way clients experience the work, and feedback controls
would just clutter it. The project's own feedback toggle is untouched; feedback reappears
automatically if the showcase is deleted.

---

## The builder

Three columns: the **page rail** on the left, the **canvas** in the middle, the **settings
panel** on the right. The top bar also has a **Copy link** button, next to Album settings, for
grabbing the showcase's public link without leaving the builder.

The canvas is a 16:10 frame. A block's position and size are stored as **percentages** of the
frame, so a layout you build on a laptop scales correctly on a phone or a projector.

**Text and other pixel sizes scale with the page.** Every size you type or pick in px (Headline
levels, Text presets, a custom size, and the padding, corner radius, shadow and blur that go with
them) is the size **at full width**: a page 1280 px wide or wider shows exactly that. A narrower
page scales it down in proportion, so a 68 px headline is 34 px on a 640 px page. Text never
drops below a readable floor (Headlines 22 px for H1 down to 14 px for H6; Text and Button labels
14 px) and never grows past the size you set; a size you set below its floor stays as set. The
builder canvas is narrower than a real screen, so text looks proportionally smaller there than
in the viewer; that is expected, and Preview shows the real result.

Changes **autosave**. There is also an explicit **Save** button, and a status line that reads
*Saving… / Unsaved changes / Saved*.

**Undo / Redo** buttons sit next to Copy link (also `Ctrl`/`Cmd`+`Z` and `Ctrl`/`Cmd`+`Shift`+`Z`).
They cover the current page's block edits — position, size, style, text, add/delete/re-parent.
Page add/delete and Album settings aren't part of this history.

### Blocks list

The **Blocks** button next to **+ Add block** toggles a list of the current page's blocks as a
flat, clickable list — an alternative to hunting for a block on the canvas. Its order always
matches stacking order: the first row is the block furthest back, the last row is the frontmost
one, and a group's children are indented under it, in that same back-to-front order.

#### Arrange

**Arrange** (top of the list, a toggle) gives every row a drag handle:

- **Drag up or down** to reorder — that changes stacking order.
- **Drag right** (onto or just under a Group's rows) to move the block **into that group**; **drag
  left** to move a child **out** to the top level. Only a Group can take children, and a Group can
  itself never be nested, so those targets simply are not offered for a Group.
- A blue line shows where the block will land, indented when it will join a group (the group is
  outlined), with a text label: *Reorder*, *Move into group* or *Move out of group*.
- Moving a Group moves its children with it.
- **Keyboard:** focus a handle, press **Space** to pick it up, **Up/Down** to move, **Right/Left**
  to move into/out of a group, **Space** or **Enter** to drop, **Escape** to cancel. Each step is
  announced to screen readers. **Touch** works from the handle too.
- A block keeps its place on the canvas, except when moving into a group: it is shifted the
  shortest distance that puts it wholly inside the group's box, and shrunk if it is bigger than the
  group allows (a child must stay under half the group's area, or "Arrange children" would treat it
  as not a child). If even the smallest size would not fit, the group is not offered as a target.
- A group's children always sit directly after it in the list, which is also how the client viewer
  paints them. Older showcases where a child sat further down the list are tidied into that order
  the first time you Arrange.
- One drop is one undo step, and autosave picks it up.

### Pages

- The page rail lists every page. Click one to edit it — including the page you're already on,
  which deselects any selected block and shows that page's own settings.
- **+ Add page** appends a blank page.
- The trash icon next to a page deletes it (you cannot delete the last page).

### Blocks

**+ Add block** inserts one of:

| Block  | What it is |
|--------|------------|
| **Cover** | Not a block type of its own — a shortcut that drops a full-bleed **Image** (sent to the back) plus a **Group** holding a **Headline**, a **Text** line, and a **Button** linked to the gallery. Every piece is then an ordinary block you can move, restyle, or delete. |
| **Image** | One photo. Pick it from the project's photos in the settings panel. |
| **Headline** | A heading — H1 through H6, editable text, alignment. |
| **Text** | A paragraph. Editable text, alignment. |
| **Button** | A labelled button. Links to a custom URL, to the ZIP download, or back to the gallery. |
| **Group** | A positioning container for other blocks (see below). |

- **Click** a block to select it — the settings panel fills in.
- **Drag** a block to move it; **drag a corner handle** (shown only on the selected block) to
  resize it.
- **Snapping.** Two things happen while you drag:
  - *Sibling adhesion (live).* A block's edge that comes within about 8 px of a neighbour's
    opposite edge is held flush against it (touching, no gap). Keep pushing and, once you are
    more than 12 px into the neighbour, it lets go and moves freely, so you can still overlap
    blocks on purpose. It works from every side and on both axes, and a released block does not
    grab again until it has left the pull zone. Only blocks at the same level attract each
    other: top-level blocks with top-level blocks, and children of one group with the other
    children of that group — never across a group boundary. Only neighbours that overlap the
    dragged block along the other axis count, so a block far above or below does not pull.
  - *Drop alignment.* On release, the block's edges and centre also nudge onto the page
    edges/centre and other blocks' edges/centres within about 6 px.
  Resizing does not snap.
- **Bring to front / Send to back** in the panel changes stacking order.
- The trash icon in the panel deletes the selected block.

### Groups

A **Group** is a box that helps you position a set of blocks together — a caption stack, a
title-and-button pair.

- **Membership is by position.** Drag a block so its centre lands inside a group's box and it
  becomes that group's child; drag a child's centre out and it becomes a top-level block again.
  There is no bind/unbind button.
- **Moving or resizing the group** carries its children along.
- **Arrange children** (in the panel, when a group is selected): **Stack ↓ / Stack →** and
  **align left / centre / right / top / middle / bottom**. These never let children overlap or
  clip their text — they space the children out along one axis with a real gap, then shrink them
  together if the group is too small, down to a minimum size.
- **Align in group** (in the panel, when a block *inside* a group is selected): snaps that one
  block to the group's left, centre, or right.
- **Add inside this group** adds a Headline / Text / Button straight into the selected group.
- Dragging a block over a group only re-parents it if the group is at least half that block's
  own area — a small caption group sitting in front of a full-bleed cover image can't
  accidentally swallow the image behind it.
- **Resizing a child never grows it past the group's own box** — dragging (not resizing) is how
  a block leaves a group, so a resize handle simply stops at the edge instead.

### Appearance

- **Corners** — Text, Button and Group blocks: square, rounded, or pill.
- **Background** — Text, Button and Group blocks: none, a surface tone, a deep tone, an accent
  tint, solid accent, a custom colour with an opacity slider, or a two-colour **gradient** with
  an adjustable angle.
- **Blur** (Group only) — a backdrop blur behind the group, for a glass-panel effect over a
  photo.
- **Shadow** (Group only) — a drop shadow behind the group's box: blur, offset X, offset Y,
  spread, colour and an opacity slider (0–100 %, so the shadow can be as faint as you like) — the same controls as CSS `box-shadow`. Blur is the on/off switch (0 turns
  it off); the offset/spread fields only appear once it's on. The border/corners stay crisp; only
  the shadow is soft.
- **Text colour** — Text and Button: default, accent, muted, or a custom colour with an opacity
  slider. **Headline text is always solid** — same swatches, no opacity, so it stays legible over
  a photo.
- **Style** (Headline and Text) — bold, italic, underline, any combination, independent of the
  block's base weight.
- **Border** (Image and Button blocks) — style (solid / dashed / dotted), a width slider (0–10px,
  starting at 0) with a number field next to it for typing a wider value directly, and colour.
- **Ken Burns** (Image blocks) — a slow pan/zoom while the image is on screen: none, zoom in, or
  slide left/right/up/down. **Speed** is a range in seconds, capped to the page's autoplay
  interval when autoplay is on (so the effect never gets cut off mid-motion). The border and
  corners stay put — only the photo inside pans/zooms, clipped to the block's own box. Disabled
  entirely under `prefers-reduced-motion`.
- **Size** — Headline: pick a level (H1–H6); the pixel size for each level comes from Album
  settings, or set a custom size on the block to override it. Text: pick a preset (small /
  normal / medium / large / huge), same override. The custom-size field accepts whatever you
  type without forcing it back to the valid range as you type — the border turns red and a
  tooltip explains the allowed range when the typed value is out of bounds; only the saved value
  is clamped. Long text wraps inside the block and is clipped if it still overflows — it never
  spills outside the block's box.
- **Font** — every Headline shares one Google Font, every Text block shares another, both set
  album-wide in Album settings (no per-block override).

Every colour swatch shows the colour it would actually apply — the "custom" and "gradient"
options preview the block's own configured colour, not a placeholder, and carry a small rainbow
ring so it's clear at a glance that swatch opens a colour picker rather than just selecting black
— and a **Reset** link
appears next to a swatch row once it's been changed from its default, to clear it back in one
click. Below any custom-colour picker, your **Color presets** (Album settings) appear as
one-click swatches too, so you rarely need to reopen the native colour picker at all.

The **accent** colour comes from the album's event type (see below).

### Page settings

Click empty canvas (or leave nothing selected) and the settings panel shows the **current
page's** own appearance instead of a block's:

- **Background** and **Border** — same controls as a Group/Image, applied to the whole page
  behind its blocks.
- A page's content always clips at its own edges — nothing bleeds past the page frame.

### Button links

A Button's **Link** setting decides what it does in the viewer:

- **Custom URL** — opens the address you enter (http/https only) in a new tab.
- **ZIP archive** — opens the download dialog (the showcase's photos, as originals). Only works
  if downloads are enabled for the project.
- **Back to gallery** — links to the full gallery this showcase was built from.

---

## Album settings

The **Album settings** dialog (button in the top bar):

| Setting | Effect |
|---------|--------|
| **Title**, **Date** | Shown wherever a Headline/Text block defaults to them; also the browser tab title of the public page. |
| **Event type** | Wedding / Birthday / Christening / Corporate / Generic — picks the accent hue used across the showcase. |
| **Album background** | Neutral, Deep, or Accent tint — the colour behind the page. |
| **Page transition** | Turn, Fade, Zoom, or Rotate — how one page gives way to the next. |
| **Autoplay** + **seconds per page** | Advance automatically and loop. Checked by default for a new showcase. |
| **Heading sizes** | The default pixel size for each Headline level, H1–H6. A block can still override it with a custom size. |
| **Text sizes** | The default pixel size for each Text preset (small / normal / medium / large / huge). A block can still override it. |
| **Fonts** | A Google Font for every Headline, and a separate one for every Text block — album-wide, no per-block override. "Default" uses the app's own font. |
| **Color presets** | Your own palette (up to 12 colours) — offered as one-click swatches below every custom-colour picker throughout the builder, so branding stays consistent without reopening the native colour picker each time. |
| **Page dots** | A checkbox to show or hide the page-position dots (top left of the viewer) entirely, plus active/inactive colours when shown. Leave the colours blank to use the event colour / a translucent white. |
| **Custom CSS** | A free-form stylesheet injected into the public viewer, for tweaks the settings panel doesn't cover. Admin-authored — treat it like any other content you control. The info icon next to the heading opens a reference of the stable class names available to target (`.sc-viewer`, `.sc-stage`, `.sc-page`, `.sc-block` and its per-type variants, `.sc-controls`, `.sc-dots`, `.sc-thumbnails`). |
| **Music playlist** | See below. |

### Music

Upload background tracks in the Album settings dialog:

- Formats: **MP3, M4A, OGG, WAV**, up to **20 MB** each, up to 12 tracks.
- **Loop the playlist while viewing** repeats from the first track after the last.
- **Autoplay music** starts the playlist automatically when the viewer loads. Disabled and shown
  checked when the slideshow's own **Autoplay** is on, since slides autoplaying always starts the
  music with them — there's nothing to decide in that case.
- Tracks are stored with the project's files under `uploads/<project>/audio/` and are removed
  when you delete a track or the showcase.

Whether music plays automatically follows the slideshow's own autoplay setting first:

| Slides autoplay | Autoplay music | Result |
|---|---|---|
| On | (ignored) | Music starts with the slides. Only a **mute/unmute** button is shown — there's nothing to "play", it's already playing. |
| Off | On | Music starts on its own. Only a **mute/unmute** button is shown. |
| Off | Off | Music does **not** start on its own. A separate **play/pause** button is shown instead. |

The music control sits in its own small pill below the main slideshow controls, so it's never
mistaken for the slideshow's own play/pause button.

---

## Preview

The **Build / Preview** toggle in the top bar switches the middle column between the editing
canvas and a live, in-app run of the finished showcase, using the current (unsaved) state.

---

## Sharing and access

The showcase has its own link:

```
https://yourdomain.com/s/<showcase-id>
```

- It uses the **same access as the gallery** — the same password, or the same email list, and
  the same expiry date. There is no separate showcase password to manage.
- A client who has entered the password (or their email) on **either** the showcase or the
  gallery can move to the other **without entering it again**. The gallery's top bar shows a
  **View showcase** button whenever the project has one; the showcase links back with any
  Button block set to *Back to gallery*.
- If the project has expired, the showcase shows an "expired" message, same as the gallery.

Copy the link with **Copy client link** on the project page, or with the copy-link button inside
the viewer (a "link copied" confirmation floats under the button). If the project is
password-protected, the confirmation also reminds the visitor to send the password separately,
without revealing it — pointing them to the admin or whoever shared the link if they don't know
it.

---

## The client viewer

A page is exactly its blocks, shown as you laid them out. The viewer is full-width — it fills
the whole browser window rather than sitting in a centred content column, so the photography
gets all the available space.

**On a narrow screen the page pans instead of squeezing.** The page is never laid out narrower
than 640 px. On a phone in portrait (or any window under 640 px wide) the page keeps that width,
starts centred, and can be dragged sideways with a finger; a short hint says so and fades after a
few seconds. The page still fills the screen's height, and arrows, keys, dots and the thumbnail
rail change pages as usual. Phones in landscape (about 640 px and wider) show the whole page.

**Controls** float as one compact pill in the top-right corner, over the photo, instead of a
full-width bar. From 768px wide up it holds, in order:

- **Autoplay** toggle
- **Music** (only when there are tracks) — see Music, above, for when it's mute/unmute vs.
  play/pause
- **Thumbnails** — a strip of scaled-down page previews to jump around
- **Fullscreen** (hidden on browsers without Fullscreen support, e.g. iOS Safari)
- **Copy link** (see Sharing and access above for the password reminder). The confirmation
  toast under the bar goes away by itself after about 3 seconds (5 for the longer
  "send the password too" reminder).
- **Download** — the showcase's photos as a ZIP of originals (when downloads are enabled)
- **Language** — a single button showing the current code (EN / RO); tap to switch

Below 768px only Autoplay, Music and a **More** (⋯) button remain in the pill; Thumbnails,
Fullscreen, Copy link, Download and Language move into the More menu. The menu is a plain
disclosure (`aria-expanded`): it opens with focus on its first item, Escape or a tap outside
closes it, and Escape puts focus back on the More button without also exiting fullscreen.
Space and Enter on a control activate that control and never trigger the viewer's Space shortcut.
The bar respects the phone's safe-area insets and never overlaps the page indicator.

The **page indicator** sits top-left. From 768px it is a row of **dots** — the current page's
dot is larger; click any dot to jump to that page; the row scrolls sideways (staying on the
current page) when there are more pages than fit beside the controls. Below 768px it is a
compact "3 / 10" counter instead. Shown or hidden, and coloured, by the Album settings'
**Page dots** setting. A screen-reader-only "Page N of Total" announcement keeps the page count
accessible regardless of whether it is shown.

**Arrows** on the sides move between pages. In fullscreen the controls hide after a few seconds
and return when the visitor moves the mouse or presses a key.

### Keyboard

| Key            | Action                |
|----------------|-----------------------|
| `←` / `→`      | Previous / Next page  |
| `Home` / `End` | First / Last page     |
| `F`            | Toggle fullscreen     |
| `Space`        | Play / pause autoplay |
| `D`            | Open the download dialog |
| `Escape`       | Exit fullscreen       |

### Reduced motion

If the visitor's device has "reduce motion" turned on, page transitions and the Ken Burns
pan/zoom are dropped — pages change instantly and autoplay still advances. Nothing is lost.

---

## For developers

The technical design — the Craft.js builder, the Craft-free viewer, the shared block model and
geometry, the routes and schema — is in [`ARCHITECTURE.md`](./ARCHITECTURE.md) under
*Showcase architecture (Stage 2)* and the decisions log.

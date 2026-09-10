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

---

## The builder

Three columns: the **page rail** on the left, the **canvas** in the middle, the **settings
panel** on the right.

The canvas is a 16:10 frame. A block's position and size are stored as **percentages** of the
frame, so a layout you build on a laptop scales correctly on a phone or a projector.

Changes **autosave**. There is also an explicit **Save** button, and a status line that reads
*Saving… / Unsaved changes / Saved*.

### Pages

- The page rail lists every page. Click one to edit it.
- **+ Add page** appends a blank page.
- The trash icon next to a page deletes it (you cannot delete the last page).

### Blocks

**+ Add block** inserts one of:

| Block  | What it is |
|--------|------------|
| **Cover** | Not a block type of its own — a shortcut that drops a full-bleed **Image** (sent to the back) plus a **Group** holding a **Title**, a **Text** line, and a **Button** linked to the gallery. Every piece is then an ordinary block you can move, restyle, or delete. |
| **Image** | One photo. Pick it from the project's photos in the settings panel. |
| **Title** | A heading. Editable text, alignment. |
| **Text** | A paragraph. Editable text, alignment. |
| **Button** | A labelled button. Links to a custom URL, to the ZIP download, or back to the gallery. |
| **Group** | A positioning container for other blocks (see below). |

- **Click** a block to select it — the settings panel fills in.
- **Drag** a block to move it; **drag a corner handle** (shown only on the selected block) to
  resize it.
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
- **Add inside this group** adds a Title / Text / Button straight into the selected group.

### Appearance

For Title, Text, Button and Group blocks the panel has:

- **Corners** — square, rounded, or pill.
- **Background** — none, a surface tone, a deep tone, an accent tint, solid accent, or a custom
  colour with an opacity slider.
- **Text colour** (Title / Text / Button) — default, accent, muted, or a custom colour with
  opacity.

The **accent** colour comes from the album's event type (see below).

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
| **Title**, **Date** | Shown wherever a Title/Text block defaults to them; also the browser tab title of the public page. |
| **Event type** | Wedding / Birthday / Christening / Corporate / Generic — picks the accent hue used across the showcase. |
| **Album background** | Neutral, Deep, or Accent tint — the colour behind the page. |
| **Page transition** | Turn, Fade, or Zoom — how one page gives way to the next. |
| **Autoplay** + **seconds per page** | Advance automatically and loop. |
| **Music playlist** | See below. |

### Music

Upload background tracks in the Album settings dialog:

- Formats: **MP3, M4A, OGG, WAV**, up to **20 MB** each, up to 12 tracks.
- **Loop the playlist while viewing** repeats from the first track after the last.
- Tracks are stored with the project's files under `uploads/<project>/audio/` and are removed
  when you delete a track or the showcase.

In the viewer, music never starts on its own (browsers block that) — the visitor turns it on
with the music button.

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

Copy the link with **Copy client link** on the project page, or with the share button inside the
viewer (which floats a "link copied" confirmation under the button).

---

## The client viewer

A page is exactly its blocks, shown as you laid them out.

**Top bar**

- Page counter
- **Music** toggle (only when there are tracks)
- **Autoplay** toggle
- **Thumbnails** — a strip of scaled-down page previews to jump around
- **Fullscreen** (hidden on browsers without Fullscreen support, e.g. iOS Safari)
- **Copy link**
- **Download** — the showcase's photos as a ZIP of originals (when downloads are enabled)

**Arrows** on the sides move between pages. In fullscreen the bar hides after a few seconds and
returns when the visitor moves the mouse or presses a key.

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

If the visitor's device has "reduce motion" turned on, page transitions are dropped — pages
change instantly and autoplay still advances. Nothing is lost.

---

## For developers

The technical design — the Craft.js builder, the Craft-free viewer, the shared block model and
geometry, the routes and schema — is in [`ARCHITECTURE.md`](./ARCHITECTURE.md) under
*Showcase architecture (Stage 2)* and the decisions log.

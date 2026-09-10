// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/**
 * The showcase block model and the pure geometry that goes with it.
 *
 * This file has no framework dependencies on purpose: the Craft.js builder, the
 * Craft-free viewer, and the API routes all share these types and functions.
 * Coordinates are percentages of the page frame and are **canvas-absolute even
 * for grouped blocks** — a group is a positioning/styling container, not a new
 * coordinate space (see `design_handoff_album_showcase/README.md`).
 */

export type BlockType = 'image' | 'title' | 'text' | 'button' | 'group'
export type BlockRadius = 'none' | 'md' | 'pill'
export type BlockBg = 'none' | 'surface' | 'deep' | 'accentTint' | 'accentSolid' | 'custom'
export type BlockTextColor = 'default' | 'accent' | 'muted' | 'custom'
export type BlockAlign = 'left' | 'center' | 'right'
export type ButtonStyle = 'primary' | 'secondary'
export type ButtonLinkType = 'custom' | 'zip' | 'gallery'

export interface Block {
  id: string
  type: BlockType
  /** All four are % of the page frame, 0–100, canvas-absolute. */
  x: number
  y: number
  w: number
  h: number
  radius: BlockRadius
  bg: BlockBg
  bgCustom?: string
  bgCustomAlpha?: number
  /** Not present on image blocks. */
  textColor?: BlockTextColor
  textColorCustom?: string
  textColorCustomAlpha?: number
  /** image */
  photoId?: string
  /** title / text */
  text?: string
  align?: BlockAlign
  /** button */
  label?: string
  style?: ButtonStyle
  linkType?: ButtonLinkType
  link?: string
  /** group */
  children?: Block[]
}

export interface ShowcasePageData {
  id: string
  blocks: Block[]
}

/** A project photo, reduced to what the showcase builder and viewer render. */
export interface ShowcasePhoto {
  id: string
  originalName: string
  thumbSm: string
  thumbLg: string
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  image: 'Image',
  title: 'Title',
  text: 'Text',
  button: 'Button',
  group: 'Group',
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** A block id that is stable across a save/reload and unique within a page. */
export function newBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `b_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

// ─── Defaults ────────────────────────────────────────────────────────────────

interface MakeBlockOpts {
  x?: number
  y?: number
  w?: number
  h?: number
}

export function makeBlock(type: BlockType, opts: MakeBlockOpts = {}): Block {
  const id = newBlockId()
  const base = { id, type } as Block
  switch (type) {
    case 'image':
      return { ...base, x: opts.x ?? 8, y: opts.y ?? 8, w: opts.w ?? 38, h: opts.h ?? 38, radius: 'md', bg: 'none' }
    case 'title':
      return {
        ...base,
        text: 'Heading',
        x: opts.x ?? 8, y: opts.y ?? 8, w: opts.w ?? 60, h: opts.h ?? 14,
        align: 'left', textColor: 'default', bg: 'none', radius: 'none',
      }
    case 'text':
      return {
        ...base,
        text: 'Add your text here.',
        x: opts.x ?? 8, y: opts.y ?? 24, w: opts.w ?? 60, h: opts.h ?? 20,
        align: 'left', textColor: 'default', bg: 'none', radius: 'none',
      }
    case 'button':
      return {
        ...base,
        label: 'View gallery', style: 'primary', linkType: 'custom', link: '',
        x: opts.x ?? 8, y: opts.y ?? 78, w: opts.w ?? 24, h: opts.h ?? 9,
        textColor: 'default', bg: 'none', radius: 'md',
      }
    case 'group':
      return {
        ...base,
        x: opts.x ?? 8, y: opts.y ?? 8, w: opts.w ?? 55, h: opts.h ?? 32,
        bg: 'accentTint', radius: 'md', children: [],
      }
  }
}

/**
 * A "Cover" is not a block type — it is a full-bleed Image sent to the back plus
 * a Group holding Title / Text / Button(linkType: 'gallery'). Every piece is then
 * an ordinary block: draggable, resizable, deletable, individually optional.
 */
export function buildCoverComposite(albumTitle: string, albumDate: string): Block[] {
  const img = makeBlock('image', { x: 0, y: 0, w: 100, h: 100 })
  img.radius = 'none'

  const title = makeBlock('title', { x: 12, y: 58, w: 50, h: 18 })
  title.text = albumTitle || 'Album title'

  const date = makeBlock('text', { x: 12, y: 78, w: 50, h: 9 })
  date.text = albumDate || 'Event date'

  const button = makeBlock('button', { x: 12, y: 89, w: 22, h: 8 })
  button.label = 'View gallery'
  button.linkType = 'gallery'

  const group: Block = {
    id: newBlockId(),
    type: 'group',
    x: 6, y: 54, w: 64, h: 44,
    bg: 'none', radius: 'md',
    children: [title, date, button],
  }
  return [img, group]
}

// ─── No-overlap child layout ─────────────────────────────────────────────────
//
// Group "Arrange children" actions must NEVER make children overlap or clip
// their text. The rule (ported from the prototype): re-sequence children along
// the relevant axis with a fixed minimum gap, shift the run to the requested
// anchor edge, and if the natural sizes do not fit, scale every child down
// together — never past a per-type minimum, so text never clips even if that
// means the run slightly overflows the group box.

export const STACK_GAP = 3

export function minBlockH(child: Pick<Block, 'type'>): number {
  return child.type === 'title' ? 10 : child.type === 'button' ? 7 : 6
}

type Child = Block

export function layoutStackV(group: Block, children: Child[], pad = 4): Child[] {
  const innerW = group.w - pad * 2
  const innerH = group.h - pad * 2
  const gaps = Math.max(0, children.length - 1)
  const naturalTotal = children.reduce((sum, c) => sum + c.h, 0)
  const totalWithGap = naturalTotal + STACK_GAP * gaps
  const scale =
    naturalTotal > 0 && totalWithGap > innerH
      ? Math.max(0.3, (innerH - STACK_GAP * gaps) / naturalTotal)
      : 1
  let y = group.y + pad
  return children.map((c) => {
    const h = Math.max(minBlockH(c), c.h * scale)
    const next = { ...c, x: group.x + pad, w: innerW, y, h }
    y += h + STACK_GAP
    return next
  })
}

export function layoutStackH(group: Block, children: Child[], pad = 4): Child[] {
  const innerH = group.h - pad * 2
  const innerW = group.w - pad * 2
  const gaps = Math.max(0, children.length - 1)
  const naturalTotal = children.reduce((sum, c) => sum + c.w, 0)
  const scale =
    naturalTotal > 0 && naturalTotal + STACK_GAP * gaps > innerW
      ? Math.max(0.3, (innerW - STACK_GAP * gaps) / naturalTotal)
      : 1
  let x = group.x + pad
  return children.map((c) => {
    const w = c.w * scale
    const h = Math.min(c.h, innerH)
    const next = { ...c, y: group.y + (group.h - h) / 2, h, x, w }
    x += w + STACK_GAP
    return next
  })
}

export function alignVertical(
  group: Block,
  children: Child[],
  anchor: 'top' | 'middle' | 'bottom',
  pad = 4,
): Child[] {
  const innerH = group.h - pad * 2
  const gaps = Math.max(0, children.length - 1)
  const naturalTotal = children.reduce((sum, c) => sum + c.h, 0)
  const scale =
    naturalTotal > 0 && naturalTotal + STACK_GAP * gaps > innerH
      ? Math.max(0.3, (innerH - STACK_GAP * gaps) / naturalTotal)
      : 1
  const heights = children.map((c) => Math.max(minBlockH(c), c.h * scale))
  const totalH = heights.reduce((sum, h) => sum + h, 0) + STACK_GAP * gaps
  let y =
    anchor === 'top'
      ? group.y + pad
      : anchor === 'bottom'
        ? group.y + group.h - pad - totalH
        : group.y + pad + (innerH - totalH) / 2
  return children.map((c, i) => {
    const h = heights[i]
    const next = { ...c, y, h }
    y += h + STACK_GAP
    return next
  })
}

export function alignHorizontal(
  group: Block,
  children: Child[],
  anchor: BlockAlign,
  pad = 4,
): Child[] {
  const innerW = group.w - pad * 2
  const gaps = Math.max(0, children.length - 1)
  const naturalTotal = children.reduce((sum, c) => sum + c.w, 0)
  const scale =
    naturalTotal > 0 && naturalTotal + STACK_GAP * gaps > innerW
      ? Math.max(0.3, (innerW - STACK_GAP * gaps) / naturalTotal)
      : 1
  const widths = children.map((c) => c.w * scale)
  const totalW = widths.reduce((sum, w) => sum + w, 0) + STACK_GAP * gaps
  let x =
    anchor === 'left'
      ? group.x + pad
      : anchor === 'right'
        ? group.x + group.w - pad - totalW
        : group.x + pad + (innerW - totalW) / 2
  return children.map((c, i) => {
    const w = widths[i]
    const next = { ...c, x, w }
    x += w + STACK_GAP
    return next
  })
}

export type ArrangeMode =
  | 'stack-v' | 'stack-h'
  | 'align-left' | 'align-center' | 'align-right'
  | 'align-top' | 'align-middle' | 'align-bottom'

export function arrangeGroupChildren(group: Block, mode: ArrangeMode, pad = 4): Block[] {
  const children = group.children ?? []
  switch (mode) {
    case 'stack-v': return layoutStackV(group, children, pad)
    case 'stack-h': return layoutStackH(group, children, pad)
    case 'align-left': return alignHorizontal(group, children, 'left', pad)
    case 'align-center': return alignHorizontal(group, children, 'center', pad)
    case 'align-right': return alignHorizontal(group, children, 'right', pad)
    case 'align-top': return alignVertical(group, children, 'top', pad)
    case 'align-middle': return alignVertical(group, children, 'middle', pad)
    case 'align-bottom': return alignVertical(group, children, 'bottom', pad)
  }
}

/**
 * Place a freshly added child so it can never land on top of an existing one:
 * append it, then re-stack the whole group vertically.
 */
export function addGroupChild(group: Block, type: BlockType, pad = 4): { group: Block; childId: string } {
  const h = Math.max(minBlockH({ type }), Math.min(14, group.h / 3))
  const child = makeBlock(type, {
    x: group.x + pad,
    y: group.y + pad,
    w: Math.max(10, group.w - pad * 2),
    h,
  })
  const children = layoutStackV(group, [...(group.children ?? []), child], pad)
  return { group: { ...group, children }, childId: child.id }
}

// ─── Re-parenting ────────────────────────────────────────────────────────────

/** The group whose box contains a point, or null. Ignores `exceptId`. */
export function groupAtPoint(blocks: Block[], px: number, py: number, exceptId?: string): Block | null {
  for (const b of blocks) {
    if (b.type !== 'group' || b.id === exceptId) continue
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b
  }
  return null
}

// ─── Flatten for rendering ───────────────────────────────────────────────────

export interface FlatBlock {
  block: Block
  parentGroupId: string | null
}

/**
 * Top-level blocks with each group's children spliced in right after it. Both the
 * builder canvas and the viewer render this single positioned list — a group's
 * children are drawn as canvas-absolute siblings, never nested in the DOM.
 */
export function flattenBlocks(blocks: Block[]): FlatBlock[] {
  const out: FlatBlock[] = []
  for (const b of blocks) {
    out.push({ block: b, parentGroupId: null })
    if (b.type === 'group' && b.children) {
      for (const c of b.children) out.push({ block: c, parentGroupId: b.id })
    }
  }
  return out
}

/**
 * A custom button link, restricted to http(s). Anything else (`javascript:`,
 * `data:`, a bare word) collapses to '' so the viewer renders a plain,
 * non-navigating button rather than an unsafe href.
 */
export function safeExternalHref(link: string | undefined): string {
  if (!link) return ''
  try {
    const url = new URL(link, 'https://example.invalid')
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
  } catch {
    /* fall through */
  }
  return ''
}

const BLOCK_TYPES: BlockType[] = ['image', 'title', 'text', 'button', 'group']
const RADII: BlockRadius[] = ['none', 'md', 'pill']
const BGS: BlockBg[] = ['none', 'surface', 'deep', 'accentTint', 'accentSolid', 'custom']
const TEXT_COLORS: BlockTextColor[] = ['default', 'accent', 'muted', 'custom']
const ALIGNS: BlockAlign[] = ['left', 'center', 'right']
const BUTTON_STYLES: ButtonStyle[] = ['primary', 'secondary']
const LINK_TYPES: ButtonLinkType[] = ['custom', 'zip', 'gallery']

function num(value: unknown, fallback: number, lo: number, hi: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, lo, hi) : fallback
}
function str(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}
function pick<T>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * Normalises one untrusted block from client JSON: enum fields are constrained to
 * their allowed values, numbers are clamped to 0–100, strings are length-capped,
 * and unknown keys are dropped. Group children recurse one level (a group never
 * contains a group).
 */
export function sanitizeBlock(raw: unknown, depth = 0): Block | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const type = pick<BlockType>(r.type, BLOCK_TYPES, 'text')
  if (type === 'group' && depth > 0) return null

  const block: Block = {
    id: str(r.id, 200) || newBlockId(),
    type,
    x: num(r.x, 0, 0, 100),
    y: num(r.y, 0, 0, 100),
    w: num(r.w, 20, 1, 100),
    h: num(r.h, 12, 1, 100),
    radius: pick(r.radius, RADII, 'none'),
    bg: pick(r.bg, BGS, 'none'),
  }
  if (typeof r.bgCustom === 'string') block.bgCustom = str(r.bgCustom, 32)
  if (Number.isFinite(r.bgCustomAlpha)) block.bgCustomAlpha = num(r.bgCustomAlpha, 100, 0, 100)

  if (type !== 'image') {
    block.textColor = pick(r.textColor, TEXT_COLORS, 'default')
    if (typeof r.textColorCustom === 'string') block.textColorCustom = str(r.textColorCustom, 32)
    if (Number.isFinite(r.textColorCustomAlpha)) {
      block.textColorCustomAlpha = num(r.textColorCustomAlpha, 100, 0, 100)
    }
  }

  if (type === 'image' && typeof r.photoId === 'string') block.photoId = str(r.photoId, 200)
  if (type === 'title' || type === 'text') {
    block.text = str(r.text, 4000)
    block.align = pick(r.align, ALIGNS, 'left')
  }
  if (type === 'button') {
    block.label = str(r.label, 200)
    block.style = pick(r.style, BUTTON_STYLES, 'primary')
    block.linkType = pick(r.linkType, LINK_TYPES, 'custom')
    block.link = str(r.link, 2000)
  }
  if (type === 'group') {
    const kids = Array.isArray(r.children) ? r.children : []
    block.children = kids
      .slice(0, 50)
      .map((c) => sanitizeBlock(c, depth + 1))
      .filter((c): c is Block => c !== null)
  }
  return block
}

export function sanitizeBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 100)
    .map((b) => sanitizeBlock(b, 0))
    .filter((b): b is Block => b !== null)
}

/**
 * Rebuild the nested `Block[]` (groups carrying `children`) from the flat list
 * the builder works with. Order is preserved; a child whose `parentGroupId` does
 * not resolve to a group falls back to the top level.
 */
export function nestFlatBlocks(flat: FlatBlock[]): Block[] {
  const groups = new Map<string, Block>()
  for (const { block, parentGroupId } of flat) {
    if (block.type === 'group' && !parentGroupId) {
      groups.set(block.id, { ...block, children: [] })
    }
  }
  const top: Block[] = []
  for (const { block, parentGroupId } of flat) {
    if (block.type === 'group' && !parentGroupId) {
      top.push(groups.get(block.id)!)
      continue
    }
    const group = parentGroupId ? groups.get(parentGroupId) : undefined
    if (group) {
      group.children!.push(block)
    } else {
      top.push(block)
    }
  }
  return top
}

/** Every distinct photoId placed anywhere in a set of pages, in first-seen order. */
export function collectPhotoIds(pages: ShowcasePageData[]): string[] {
  const seen = new Set<string>()
  for (const page of pages) {
    for (const { block } of flattenBlocks(page.blocks)) {
      if (block.type === 'image' && block.photoId) seen.add(block.photoId)
    }
  }
  return [...seen]
}

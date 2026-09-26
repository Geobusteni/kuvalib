// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/**
 * Live edge adhesion between sibling blocks in the showcase builder.
 *
 * While a block is dragged, an edge that comes within PULL_PX of a sibling's
 * opposite edge is held flush against it. Pushing on until the block overlaps
 * the sibling by more than PUSH_THROUGH_PX releases it. A released edge does not
 * grab again until the pointer has left the whole hold zone, so it never
 * flickers. Resizing works the same way for the edge(s) being moved: the moving
 * edge is held flush against (or aligned with) a sibling's edge, while the
 * opposite edge stays put. Positions are percentages of the frame; thresholds
 * are pixels and are converted per axis with the frame size.
 */

export const PULL_PX = 8
export const PUSH_THROUGH_PX = 12

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface SiblingRect extends Rect {
  id: string
}

export interface AxisAdhesion {
  held: string | null
  released: Set<string>
}

export interface Adhesion {
  x: AxisAdhesion
  y: AxisAdhesion
}

export function createAdhesion(): Adhesion {
  return { x: { held: null, released: new Set() }, y: { held: null, released: new Set() } }
}

interface Target {
  key: string
  /** Position of the dragged block's start that makes the edges touch. */
  flush: number
  /** +1 when the block approaches from before the sibling, -1 from after. */
  side: 1 | -1
}

/**
 * `pos` is how far the block's start is past its flush position, measured so
 * that positive always means "pushed into the neighbour".
 */
function penetration(pos: number, t: Target): number {
  return (pos - t.flush) * t.side
}

function adhereAxis(
  pos: number,
  size: number,
  spans: { id: string; start: number; end: number }[],
  pullPct: number,
  pushPct: number,
  state: AxisAdhesion,
): number {
  const targets: Target[] = spans.flatMap((s) => [
    { key: `${s.id}:before`, flush: s.start - size, side: 1 as const },
    { key: `${s.id}:after`, flush: s.end, side: -1 as const },
  ])
  return holdToTargets(pos, targets, pullPct, pushPct, state)
}

function holdToTargets(
  pos: number,
  targets: Target[],
  pullPct: number,
  pushPct: number,
  state: AxisAdhesion,
): number {
  for (const key of [...state.released]) {
    const t = targets.find((c) => c.key === key)
    if (!t) {
      state.released.delete(key)
      continue
    }
    const p = penetration(pos, t)
    if (p < -pullPct || p > pushPct + pullPct) state.released.delete(key)
  }

  if (state.held) {
    const t = targets.find((c) => c.key === state.held)
    if (t) {
      const p = penetration(pos, t)
      if (p <= pushPct) return t.flush
      // Both sides of the same line release together, or backing off would grab it again from the other side.
      for (const twin of targets) if (Math.abs(twin.flush - t.flush) < 1e-9) state.released.add(twin.key)
    }
    state.held = null
  }

  let best: Target | null = null
  let bestDist = Infinity
  for (const t of targets) {
    if (state.released.has(t.key)) continue
    const p = penetration(pos, t)
    if (p >= -pullPct && p <= 0 && -p < bestDist) {
      best = t
      bestDist = -p
    }
  }
  if (best) {
    state.held = best.key
    return best.flush
  }
  return pos
}

/**
 * Position a dragged block should be shown at, given where the pointer says it
 * is (`raw`, unsnapped) and the blocks at the same level. Only siblings that
 * overlap the block on the other axis attract it. `state` is mutated and must
 * live for one drag.
 */
export function adhere(
  raw: { x: number; y: number },
  size: { w: number; h: number },
  siblings: SiblingRect[],
  frame: { width: number; height: number },
  state: Adhesion,
): { x: number; y: number } {
  const pullX = (PULL_PX / frame.width) * 100
  const pullY = (PULL_PX / frame.height) * 100
  const pushX = (PUSH_THROUGH_PX / frame.width) * 100
  const pushY = (PUSH_THROUGH_PX / frame.height) * 100

  const overlapsY = siblings.filter((s) => raw.y < s.y + s.h && raw.y + size.h > s.y)
  const overlapsX = siblings.filter((s) => raw.x < s.x + s.w && raw.x + size.w > s.x)

  const x = adhereAxis(
    raw.x,
    size.w,
    overlapsY.map((s) => ({ id: s.id, start: s.x, end: s.x + s.w })),
    pullX,
    pushX,
    state.x,
  )
  const y = adhereAxis(
    raw.y,
    size.h,
    overlapsX.map((s) => ({ id: s.id, start: s.y, end: s.y + s.h })),
    pullY,
    pushY,
    state.y,
  )
  return { x, y }
}

export type ResizeDirection =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'topRight'
  | 'bottomRight'
  | 'bottomLeft'
  | 'topLeft'

/** The box a resized block must stay inside, and the smallest it may become. */
export interface ResizeLimits {
  x0: number
  y0: number
  x1: number
  y1: number
  minW: number
  minH: number
}

interface MovingEdges {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

function movingEdges(dir: ResizeDirection): MovingEdges {
  const d = dir.toLowerCase()
  return {
    left: d.endsWith('left'),
    right: d.endsWith('right'),
    top: d.startsWith('top'),
    bottom: d.startsWith('bottom'),
  }
}

/**
 * Every edge of every sibling is a target from both sides: the moving edge is
 * held when it arrives from either direction and released once it has been
 * pushed PUSH_THROUGH_PX past it. That covers both the opposite edge (flush)
 * and the same-side edge (aligned).
 */
function edgeTargets(spans: { id: string; start: number; end: number }[]): Target[] {
  return spans.flatMap((s) =>
    (['start', 'end'] as const).flatMap((edge) => {
      const value = edge === 'start' ? s.start : s.end
      return [
        { key: `${s.id}:${edge}:1`, flush: value, side: 1 as const },
        { key: `${s.id}:${edge}:-1`, flush: value, side: -1 as const },
      ]
    }),
  )
}

/**
 * Where the moving edge of one axis ends up. `fixed` never changes; the moving
 * edge stays at least `min` away from it and inside [lo, hi].
 */
function resizeAxis(
  movesStart: boolean,
  fixed: number,
  rawEdge: number,
  spans: { id: string; start: number; end: number }[] | null,
  pullPct: number,
  pushPct: number,
  state: AxisAdhesion,
  lo: number,
  hi: number,
  min: number,
): number {
  const from = movesStart ? lo : fixed + min
  const to = movesStart ? fixed - min : hi
  const limit = (v: number) => Math.max(from, Math.min(to, v))
  const edge = limit(rawEdge)
  if (!spans) return edge
  return limit(holdToTargets(edge, edgeTargets(spans), pullPct, pushPct, state))
}

/**
 * The rectangle a resized block should be shown as. `start` is the block when
 * the gesture began, `raw` what the pointer alone would make it (unsnapped).
 * Only the edge(s) named by `dir` move; the opposite edge is exactly `start`'s.
 * `state` is mutated and must live for one gesture.
 */
export function adhereResize(
  start: Rect,
  raw: Rect,
  dir: ResizeDirection,
  siblings: SiblingRect[],
  frame: { width: number; height: number },
  state: Adhesion,
  limits: ResizeLimits,
): Rect {
  const m = movingEdges(dir)
  const pullX = (PULL_PX / frame.width) * 100
  const pullY = (PULL_PX / frame.height) * 100
  const pushX = (PUSH_THROUGH_PX / frame.width) * 100
  const pushY = (PUSH_THROUGH_PX / frame.height) * 100

  const xSpans =
    m.left || m.right
      ? siblings
          .filter((s) => raw.y < s.y + s.h && raw.y + raw.h > s.y)
          .map((s) => ({ id: s.id, start: s.x, end: s.x + s.w }))
      : null
  const ySpans =
    m.top || m.bottom
      ? siblings
          .filter((s) => raw.x < s.x + s.w && raw.x + raw.w > s.x)
          .map((s) => ({ id: s.id, start: s.y, end: s.y + s.h }))
      : null

  let { x, y, w, h } = start
  if (m.left || m.right) {
    const fixed = m.left ? start.x + start.w : start.x
    const edge = resizeAxis(m.left, fixed, m.left ? raw.x : raw.x + raw.w, xSpans, pullX, pushX, state.x, limits.x0, limits.x1, limits.minW)
    x = m.left ? edge : start.x
    w = m.left ? fixed - edge : edge - fixed
  }
  if (m.top || m.bottom) {
    const fixed = m.top ? start.y + start.h : start.y
    const edge = resizeAxis(m.top, fixed, m.top ? raw.y : raw.y + raw.h, ySpans, pullY, pushY, state.y, limits.y0, limits.y1, limits.minH)
    y = m.top ? edge : start.y
    h = m.top ? fixed - edge : edge - fixed
  }
  return { x, y, w, h }
}

/** Force a rectangle inside the limits without letting it fall below the minimum size. */
export function clampToLimits(r: Rect, limits: ResizeLimits): Rect {
  const w = Math.max(limits.minW, Math.min(limits.x1 - limits.x0, r.w))
  const h = Math.max(limits.minH, Math.min(limits.y1 - limits.y0, r.h))
  return {
    w,
    h,
    x: Math.max(limits.x0, Math.min(limits.x1 - w, r.x)),
    y: Math.max(limits.y0, Math.min(limits.y1 - h, r.y)),
  }
}

/**
 * Drop-time alignment for a resize: each edge that moved is nudged onto the
 * nearest candidate line within the threshold; the fixed edge never moves.
 */
export function alignResize(
  r: Rect,
  dir: ResizeDirection,
  xCandidates: number[],
  yCandidates: number[],
  thresholdX: number,
  thresholdY: number,
  limits: ResizeLimits,
): Rect {
  const m = movingEdges(dir)
  const nearest = (edge: number, candidates: number[], threshold: number) => {
    let best = edge
    let bestDist = threshold
    for (const c of candidates) {
      if (Math.abs(c - edge) < bestDist) {
        bestDist = Math.abs(c - edge)
        best = c
      }
    }
    return best
  }
  let { x, y, w, h } = r
  if (m.left) {
    const right = x + w
    const nx = nearest(x, xCandidates, thresholdX)
    if (right - nx >= limits.minW && nx >= limits.x0) {
      x = nx
      w = right - nx
    }
  } else if (m.right) {
    const nw = nearest(x + w, xCandidates, thresholdX) - x
    if (nw >= limits.minW && x + nw <= limits.x1) w = nw
  }
  if (m.top) {
    const bottom = y + h
    const ny = nearest(y, yCandidates, thresholdY)
    if (bottom - ny >= limits.minH && ny >= limits.y0) {
      y = ny
      h = bottom - ny
    }
  } else if (m.bottom) {
    const nh = nearest(y + h, yCandidates, thresholdY) - y
    if (nh >= limits.minH && y + nh <= limits.y1) h = nh
  }
  return { x, y, w, h }
}

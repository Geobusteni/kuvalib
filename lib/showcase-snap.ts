// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/**
 * Live edge adhesion between sibling blocks in the showcase builder.
 *
 * While a block is dragged, an edge that comes within PULL_PX of a sibling's
 * opposite edge is held flush against it. Pushing on until the block overlaps
 * the sibling by more than PUSH_THROUGH_PX releases it. A released edge does not
 * grab again until the pointer has left the whole hold zone, so it never
 * flickers. Positions are percentages of the frame; thresholds are pixels and
 * are converted per axis with the frame size.
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
      state.released.add(t.key)
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

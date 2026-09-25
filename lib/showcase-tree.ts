// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { clamp, minBlockH, type Block } from './showcase-blocks'

/**
 * Pure ordering/nesting rules for the builder's "Arrange" block tree.
 *
 * The tree edits the same flat list Craft keeps under ROOT: every block is a
 * top-level row, and group membership is `parentGroupId`. Paint order is list
 * order, first row furthest back. The viewer draws a group's children right
 * after the group (`flattenBlocks`), so the builder must keep that shape too:
 *
 *   1. A group's children sit immediately after it (a "run"), in their
 *      existing relative order. `canonicalRows` enforces this.
 *   2. Only a group can be a parent, and only one level deep — a group is
 *      never a child.
 *   3. A block nested into a group must stay a child: its box is fitted inside
 *      the group's box (`fitIntoGroup`) and kept under half the group's area,
 *      the size at which "Arrange children" and the canvas drag rule stop
 *      treating a block as a child and free it.
 */

export interface TreeRow {
  id: string
  parentGroupId: string | null
  block: Pick<Block, 'id' | 'type' | 'x' | 'y' | 'w' | 'h'>
}

/** A place a dragged row can land: `index` counts the rows left after taking
 *  the dragged unit (the block plus, for a group, its children) out of the
 *  list; `parentId` is the group it would belong to, or null for top level. */
export interface DropSlot {
  index: number
  parentId: string | null
}

export type DropKind = 'reorder' | 'nest' | 'outdent'

/** Mirrors the resize floor in BlockShell. */
const MIN_BLOCK_PCT = 4

const round2 = (n: number) => Math.round(n * 100) / 100

/** Rows in viewer paint order: each group directly followed by its children,
 *  relative order otherwise kept. A child whose group is missing (or that is
 *  itself a group) becomes top level. */
export function canonicalRows<T extends TreeRow>(rows: T[]): T[] {
  const groupIds = new Set(rows.filter((r) => r.block.type === 'group' && !r.parentGroupId).map((r) => r.id))
  const parentOf = (r: T) =>
    r.parentGroupId && r.block.type !== 'group' && groupIds.has(r.parentGroupId) ? r.parentGroupId : null
  const childrenOf = new Map<string, T[]>()
  for (const r of rows) {
    const p = parentOf(r)
    if (p) childrenOf.set(p, [...(childrenOf.get(p) ?? []), r])
  }
  const out: T[] = []
  for (const r of rows) {
    if (parentOf(r)) continue
    out.push(r.parentGroupId ? { ...r, parentGroupId: null } : r)
    for (const c of childrenOf.get(r.id) ?? []) out.push(c)
  }
  return out
}

/**
 * The box `block` would take inside `group`, or null when it cannot be a child
 * at all. Size is kept where possible; it is shrunk only to fit the group and
 * to stay under half the group's area, never below the per-type minimum. Then
 * the box is moved the least distance that puts it wholly inside the group.
 */
export function fitIntoGroup(
  block: TreeRow['block'],
  group: TreeRow['block'],
): { x: number; y: number; w: number; h: number } | null {
  const cap = group.w * group.h * 0.45
  let w = Math.min(block.w, group.w)
  let h = Math.min(block.h, group.h)
  if (w * h > cap) {
    const s = Math.sqrt(cap / (w * h))
    w *= s
    h *= s
  }
  w = Math.max(w, MIN_BLOCK_PCT)
  h = Math.max(h, minBlockH(block))
  if (w > group.w || h > group.h || w * h * 2 >= group.w * group.h) return null
  return {
    w: round2(w),
    h: round2(h),
    x: round2(clamp(block.x, group.x, group.x + group.w - w)),
    y: round2(clamp(block.y, group.y, group.y + group.h - h)),
  }
}

function splitUnit<T extends TreeRow>(canon: T[], id: string): { moved: T | undefined; unit: T[]; rest: T[] } {
  const moved = canon.find((r) => r.id === id)
  const inUnit = (r: T) => r.id === id || (moved?.block.type === 'group' && r.parentGroupId === id)
  return { moved, unit: canon.filter(inUnit), rest: canon.filter((r) => !inUnit(r)) }
}

function canNest(moved: TreeRow, rest: TreeRow[], groupId: string): boolean {
  const group = rest.find((r) => r.id === groupId)
  return !!group && group.block.type === 'group' && fitIntoGroup(moved.block, group.block) !== null
}

/** Every position the row `id` may be dropped at, top to bottom; at one index
 *  the top-level slot comes before the nested one. */
export function dropSlots(rows: TreeRow[], id: string): DropSlot[] {
  const { moved, rest } = splitUnit(canonicalRows(rows), id)
  if (!moved) return []
  const isGroup = moved.block.type === 'group'
  const slots: DropSlot[] = []
  for (let index = 0; index <= rest.length; index++) {
    const next = rest[index]
    const prev = rest[index - 1]
    if (next?.parentGroupId) {
      // Inside a run: the only legal place is as one of that group's children.
      if (!isGroup && canNest(moved, rest, next.parentGroupId)) slots.push({ index, parentId: next.parentGroupId })
      continue
    }
    slots.push({ index, parentId: null })
    const runOwner = prev ? (prev.block.type === 'group' ? prev.id : prev.parentGroupId) : null
    if (!isGroup && runOwner && canNest(moved, rest, runOwner)) slots.push({ index, parentId: runOwner })
  }
  return slots
}

/** Where the row sits now, as a slot — the starting point of a drag. */
export function currentSlot(rows: TreeRow[], id: string): DropSlot | null {
  const canon = canonicalRows(rows)
  const { moved, rest } = splitUnit(canon, id)
  if (!moved) return null
  const at = canon.indexOf(moved)
  const index = canon.slice(0, at).filter((r) => rest.includes(r)).length
  return { index, parentId: moved.parentGroupId }
}

export function sameSlot(a: DropSlot, b: DropSlot): boolean {
  return a.index === b.index && a.parentId === b.parentId
}

export function dropKind(rows: TreeRow[], id: string, slot: DropSlot): DropKind {
  const from = canonicalRows(rows).find((r) => r.id === id)?.parentGroupId ?? null
  if (slot.parentId === from) return 'reorder'
  return slot.parentId ? 'nest' : 'outdent'
}

/**
 * The rows after dropping `id` into `slot`, or null when the slot is not
 * allowed (a group into a group, a non-group as parent, a block that cannot
 * fit the group). The dragged group's children travel with it; a nested
 * block's box is fitted inside its new group.
 */
export function applyDrop<T extends TreeRow>(rows: T[], id: string, slot: DropSlot): T[] | null {
  if (!dropSlots(rows, id).some((s) => sameSlot(s, slot))) return null
  const { moved, unit, rest } = splitUnit(canonicalRows(rows), id)
  if (!moved) return null
  let head: T = moved
  if (moved.parentGroupId !== slot.parentId) {
    const group = slot.parentId ? rest.find((r) => r.id === slot.parentId) : undefined
    const fitted = group ? fitIntoGroup(moved.block, group.block) : null
    head = { ...moved, parentGroupId: slot.parentId, block: { ...moved.block, ...fitted } }
  }
  const placed = unit.map((r) => (r.id === id ? head : r))
  return [...rest.slice(0, slot.index), ...placed, ...rest.slice(slot.index)]
}

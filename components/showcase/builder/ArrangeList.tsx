// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Block } from '@/lib/showcase-blocks'
import {
  applyDrop,
  canonicalRows,
  currentSlot,
  dropKind,
  dropSlots,
  sameSlot,
  type DropSlot,
  type TreeRow,
} from '@/lib/showcase-tree'
import { rowDetail } from './rowDetail'
import { useBlockTypeLabel } from './useBlockTypeLabel'

type Row = TreeRow & { block: Block }

const INDENT_PX = 24

interface Props {
  rows: Row[]
  selected: Set<string>
  onSelect: (id: string) => void
  onApply: (rows: Row[]) => void
}

/**
 * The block tree in Arrange mode: every row gets a drag handle. Dragging (or,
 * from the keyboard, picking a handle up with Space) only moves a drop marker;
 * nothing is written until the drop, and the drop is one call to `onApply`.
 * The rules for where a row may land live in `lib/showcase-tree.ts`.
 */
export function ArrangeList({ rows, selected, onSelect, onApply }: Props) {
  const t = useTranslations('showcaseBuilder.blockTree')
  const blockTypeLabel = useBlockTypeLabel()
  const hintId = useId()
  const list = canonicalRows(rows)
  const [drag, setDragState] = useState<{ id: string; slot: DropSlot } | null>(null)
  // Handlers read the ref: a blur fired by the drop's own re-render would
  // otherwise see the stale, still-dragging state and cancel a finished drop.
  const dragRef = useRef<{ id: string; slot: DropSlot } | null>(null)
  const setDrag = (next: { id: string; slot: DropSlot } | null) => {
    dragRef.current = next
    setDragState(next)
  }
  const [announcement, setAnnouncement] = useState('')
  const rowEls = useRef(new Map<string, HTMLLIElement>())
  const handleEls = useRef(new Map<string, HTMLButtonElement>())
  const origin = useRef({ x: 0, depth: 0 })
  const refocus = useRef<string | null>(null)

  useEffect(() => {
    if (!refocus.current) return
    handleEls.current.get(refocus.current)?.focus()
    refocus.current = null
  })

  const nameOf = (row: Row) => {
    const detail = rowDetail(row.block)
    return detail ? `${blockTypeLabel(row.block.type)}: ${detail}` : blockTypeLabel(row.block.type)
  }
  const unitIds = (id: string) => new Set(list.filter((r) => r.id === id || r.parentGroupId === id).map((r) => r.id))
  const kindLabel = (id: string, slot: DropSlot) => t(`drop.${dropKind(list, id, slot)}`)

  const where = (id: string, slot: DropSlot) => {
    const after = applyDrop(list, id, slot)
    if (!after) return ''
    const position = after.findIndex((r) => r.id === id) + 1
    return `${kindLabel(id, slot)}. ${t('position', { position, total: after.length })}`
  }

  const begin = (id: string, x: number) => {
    const slot = currentSlot(list, id)
    if (!slot) return
    origin.current = { x, depth: slot.parentId ? 1 : 0 }
    setDrag({ id, slot })
    const row = list.find((r) => r.id === id)!
    setAnnouncement(`${t('pickedUp', { name: nameOf(row) })} ${where(id, slot)}`)
  }

  const moveTo = (slot: DropSlot | null) => {
    const current = dragRef.current
    if (!current || !slot || sameSlot(slot, current.slot)) return
    setDrag({ id: current.id, slot })
    setAnnouncement(where(current.id, slot))
  }

  const finish = (commit: boolean) => {
    const current = dragRef.current
    if (!current) return
    const { id, slot } = current
    setDrag(null)
    refocus.current = id
    const start = currentSlot(list, id)
    const next = commit && start && !sameSlot(start, slot) ? applyDrop(list, id, slot) : null
    if (next) {
      onApply(next)
      const row = list.find((r) => r.id === id)!
      setAnnouncement(`${t('dropped', { name: nameOf(row) })} ${where(id, slot)}`)
    } else {
      setAnnouncement(t('cancelled'))
    }
  }

  const slotAtPointer = (id: string, x: number, y: number): DropSlot | null => {
    const slots = dropSlots(list, id)
    if (slots.length === 0) return null
    const inUnit = unitIds(id)
    let index = 0
    for (const r of list) {
      if (inUnit.has(r.id)) continue
      const el = rowEls.current.get(r.id)
      if (!el) continue
      const box = el.getBoundingClientRect()
      if (y > box.top + box.height / 2) index++
      else break
    }
    const nearest = slots.reduce((best, s) => (Math.abs(s.index - index) < Math.abs(best - index) ? s.index : best), slots[0].index)
    const here = slots.filter((s) => s.index === nearest)
    const depth = Math.min(1, Math.max(0, origin.current.depth + Math.round((x - origin.current.x) / INDENT_PX)))
    return here.find((s) => (s.parentId ? 1 : 0) === depth) ?? here[0]
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.focus()
    begin(id, e.clientX)
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (dragRef.current?.id === id) moveTo(slotAtPointer(id, e.clientX, e.clientY))
  }

  const step = (id: string, slot: DropSlot, key: string): DropSlot | null => {
    const slots = dropSlots(list, id)
    const indexes = [...new Set(slots.map((s) => s.index))]
    if (key === 'ArrowRight') return slots.find((s) => s.index === slot.index && s.parentId) ?? null
    if (key === 'ArrowLeft') return slots.find((s) => s.index === slot.index && !s.parentId) ?? null
    const target = key === 'ArrowUp' ? indexes.filter((i) => i < slot.index).pop() : indexes.find((i) => i > slot.index)
    if (target === undefined) return null
    const here = slots.filter((s) => s.index === target)
    return here.find((s) => !!s.parentId === !!slot.parentId) ?? here[0]
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const current = dragRef.current
    if (!current) {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault()
        begin(id, 0)
      }
      return
    }
    if (current.id !== id) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (!e.repeat) finish(true)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      finish(false)
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault()
      moveTo(step(id, current.slot, e.key))
    }
  }

  const inUnit = drag ? unitIds(drag.id) : new Set<string>()
  const rest = list.filter((r) => !inUnit.has(r.id))
  const markerBefore = drag ? rest[drag.slot.index]?.id : undefined
  const markerAfter = drag && drag.slot.index >= rest.length ? rest[rest.length - 1]?.id : undefined
  const nestGroupId = drag && dropKind(list, drag.id, drag.slot) === 'nest' ? drag.slot.parentId : null

  return (
    <div className="flex flex-col gap-1">
      <p id={hintId} className="text-xs text-zinc-500">
        {t('arrangeHint')}
      </p>
      <ol className="flex flex-col gap-0.5">
        {list.map((row) => {
          const isSelected = selected.has(row.id)
          const dragging = inUnit.has(row.id)
          const depthPx = row.parentGroupId ? INDENT_PX : 0
          const markerPx = drag && drag.slot.parentId ? INDENT_PX : 0
          return (
            <li
              key={row.id}
              ref={(el) => {
                if (el) rowEls.current.set(row.id, el)
                else rowEls.current.delete(row.id)
              }}
              className={`relative flex min-h-11 items-stretch gap-1 rounded ${dragging ? 'opacity-50' : ''} ${
                nestGroupId === row.id ? 'ring-2 ring-blue-600 dark:ring-blue-400' : ''
              }`}
              style={{ paddingLeft: depthPx }}
            >
              {markerBefore === row.id && <Marker at="top" offset={markerPx} />}
              {markerAfter === row.id && <Marker at="bottom" offset={markerPx} />}
              <button
                type="button"
                ref={(el) => {
                  if (el) handleEls.current.set(row.id, el)
                  else handleEls.current.delete(row.id)
                }}
                aria-label={t('moveHandle', { name: nameOf(row) })}
                aria-describedby={hintId}
                onPointerDown={(e) => onPointerDown(e, row.id)}
                onPointerMove={(e) => onPointerMove(e, row.id)}
                onPointerUp={() => finish(true)}
                onPointerCancel={() => finish(false)}
                onKeyDown={(e) => onKeyDown(e, row.id)}
                onBlur={() => dragRef.current?.id === row.id && finish(false)}
                className={`flex h-11 w-11 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:hover:bg-zinc-800 ${
                  drag?.id === row.id ? 'bg-zinc-200 dark:bg-zinc-700' : ''
                }`}
              >
                <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
                  {[3, 9, 15].flatMap((y) => [3, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded px-2 text-left text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="shrink-0 font-medium">{blockTypeLabel(row.block.type)}</span>
                {rowDetail(row.block) && <span className="truncate opacity-70">{rowDetail(row.block)}</span>}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="min-h-4 text-xs font-medium text-blue-700 dark:text-blue-300" aria-hidden="true">
        {drag ? kindLabel(drag.id, drag.slot) : ''}
      </p>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

function Marker({ at, offset }: { at: 'top' | 'bottom'; offset: number }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute right-0 z-10 h-0.5 bg-blue-600 dark:bg-blue-400 ${
        at === 'top' ? '-top-px' : '-bottom-px'
      }`}
      style={{ left: offset }}
    />
  )
}

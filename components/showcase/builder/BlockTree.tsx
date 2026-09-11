// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEditor } from '@craftjs/core'
import { BLOCK_TYPE_LABELS, type Block } from '@/lib/showcase-blocks'

/** A short label for the row beyond the block type — whatever text the block
 *  itself carries, so two Text blocks aren't indistinguishable in the list. */
function rowDetail(block: Block): string {
  if (block.type === 'title' || block.type === 'text') return block.text ?? ''
  if (block.type === 'button') return block.label ?? ''
  return ''
}

/**
 * A flat, selectable list of the current page's blocks — an alternative to
 * clicking directly on the canvas. Order matches paint order exactly (it's
 * the same Craft ROOT node order "bring to front"/"send to back" edit): the
 * first row is furthest back, the last row is frontmost. A group's children
 * are indented under it, still in that same back-to-front order.
 *
 * The collector below returns only `ids` — Craft's own, stable array
 * reference — and `selected`, never a freshly `.map()`-built array. A new
 * array reference every call breaks Craft's change detection and triggers a
 * setState-during-render warning (and, transiently, a blank page list on
 * first load). Per-row data is read from `query` in the render body instead,
 * same as SettingsPanel does for the selected block.
 */
export function BlockTree() {
  const { ids, selected, actions, query } = useEditor((state) => ({
    ids: state.nodes.ROOT?.data.nodes ?? [],
    selected: state.events.selected,
  }))

  if (ids.length === 0) {
    return <p className="text-xs text-zinc-500">No blocks on this page yet.</p>
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500">Blocks</span>
      <ol className="flex flex-col gap-0.5">
        {ids.map((id) => {
          const node = query.node(id).get()
          const block = node.data.props.block as Block
          const parentGroupId = (node.data.props.parentGroupId ?? null) as string | null
          const isSelected = selected.has(id)
          const detail = rowDetail(block)
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => actions.selectNode(id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors ${
                  parentGroupId ? 'pl-6' : ''
                } ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="shrink-0 font-medium">{BLOCK_TYPE_LABELS[block.type]}</span>
                {detail && <span className="truncate opacity-70">{detail}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

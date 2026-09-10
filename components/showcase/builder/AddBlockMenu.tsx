// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState } from 'react'
import { BLOCK_TYPE_LABELS, type BlockType } from '@/lib/showcase-blocks'
import { useBuilder } from './useBuilder'

const ORDER: BlockType[] = ['image', 'title', 'text', 'button', 'group']

export function AddBlockMenu() {
  const { addBlock, addCover } = useBuilder()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        + Add block
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-11 z-30 flex min-w-44 flex-col rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              addCover()
              setOpen(false)
            }}
            className="rounded-md px-3 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cover (image + caption)
          </button>
          <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          {ORDER.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              onClick={() => {
                addBlock(type)
                setOpen(false)
              }}
              className="rounded-md px-3 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {BLOCK_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

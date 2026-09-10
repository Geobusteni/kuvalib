// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

interface ToolbarProps {
  title: string
  mode: 'gallery' | 'selection'
  selectedCount: number
  /** Link to this project's showcase, when it has one. */
  showcaseHref: string | null
  onEnterSelection: () => void
  onExitSelection: () => void
  onOpenDownloadOptions: () => void
}

const buttonClass =
  'inline-flex h-9 items-center justify-center rounded-lg px-3 text-center text-sm font-medium leading-none text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'

export default function Toolbar({
  title,
  mode,
  selectedCount,
  showcaseHref,
  onEnterSelection,
  onExitSelection,
  onOpenDownloadOptions,
}: ToolbarProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-4 bg-black/80 px-4 backdrop-blur-sm">
      <span className="truncate text-sm font-medium text-zinc-100">{title}</span>

      {mode === 'gallery' ? (
        <div className="flex shrink-0 items-center gap-2">
          {showcaseHref && (
            <a href={showcaseHref} className={buttonClass}>
              View showcase
            </a>
          )}
          <button onClick={onEnterSelection} className={buttonClass}>
            Select
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onExitSelection} className={buttonClass}>
            Cancel
          </button>
          <button
            onClick={onOpenDownloadOptions}
            disabled={selectedCount === 0}
            aria-haspopup="dialog"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-center text-sm font-medium leading-none text-black transition-colors hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40"
          >
            Download{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      )}
    </div>
  )
}

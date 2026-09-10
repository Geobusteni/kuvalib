// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

export function ThumbnailRail({
  count,
  current,
  onSelect,
}: {
  count: number
  current: number
  onSelect: (index: number) => void
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 flex gap-2 overflow-x-auto px-4 py-3"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Go to page ${i + 1}`}
          aria-current={i === current ? 'true' : undefined}
          className="h-11 shrink-0 rounded-md border px-4 text-xs font-medium"
          style={{
            borderColor: i === current ? 'var(--sc-accent)' : 'rgba(255,255,255,0.25)',
            color: i === current ? 'var(--sc-accent)' : 'rgba(255,255,255,0.8)',
          }}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}

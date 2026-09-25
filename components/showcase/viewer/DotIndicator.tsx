// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

/** Top-left page indicator. From `md` up: dots the album can colour to match
 *  the event, each a full 44×44 target around a small mark, in a row that
 *  scrolls sideways (kept on the active page) rather than growing into the
 *  controls beside it. Below `md` the row cannot fit more than a few pages, so
 *  it is a compact "3 / 10" counter instead (the sr-only live status in
 *  `ShowcaseViewer` announces page changes; the counter is decoration).
 *  Optional: Album settings can hide it entirely. */
export function DotIndicator({
  total,
  current,
  onSelect,
  activeColor,
  inactiveColor,
}: {
  total: number
  current: number
  onSelect: (index: number) => void
  activeColor: string
  inactiveColor: string
}) {
  const t = useTranslations('showcaseViewer.nav')
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const row = rowRef.current
    const dot = row?.children[current] as HTMLElement | undefined
    if (!row || !dot) return
    row.scrollLeft = dot.offsetLeft - (row.clientWidth - dot.offsetWidth) / 2
  }, [current, total])

  return (
    <>
      <div
        ref={rowRef}
        className="sc-dots pointer-events-auto hidden w-fit max-w-full flex-row items-center gap-0.5 overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({ length: total }, (_, i) => {
          const active = i === current
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={t('goToPage', { page: i + 1 })}
              aria-current={active ? 'true' : undefined}
              className="flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span
                className={`sc-dot block rounded-full transition-all duration-200 motion-reduce:transition-none${active ? ' sc-dot-active' : ''}`}
                style={{
                  width: active ? 10 : 7,
                  height: active ? 10 : 7,
                  background: active ? activeColor : inactiveColor,
                }}
              />
            </button>
          )
        })}
      </div>
      <span
        data-counter
        aria-hidden="true"
        className="sc-counter pointer-events-none inline-flex h-11 items-center whitespace-nowrap rounded-full bg-black/55 px-3 text-sm font-medium tabular-nums text-white backdrop-blur-sm md:hidden"
      >
        {current + 1} / {total}
      </span>
    </>
  )
}

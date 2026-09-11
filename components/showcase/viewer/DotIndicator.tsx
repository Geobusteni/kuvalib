// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

/** Top-left page indicator — replaces a numeric "1 / 3" counter with dots the
 *  album can colour to match the event. Each dot is a full 44×44 touch target
 *  around a small visual mark, laid out in a horizontal row with a fixed gap
 *  (not `justify-between`, which would stretch to fill the row and read as
 *  misaligned with the controls pill above). Optional: Album settings can
 *  hide it entirely. */
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
  return (
    <div className="sc-dots pointer-events-auto absolute left-1 top-2 z-10 flex flex-row items-center gap-0.5 sm:left-2 sm:top-3">
      {Array.from({ length: total }, (_, i) => {
        const active = i === current
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Go to page ${i + 1}`}
            aria-current={active ? 'true' : undefined}
            className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span
              className={`sc-dot block rounded-full transition-all duration-200${active ? ' sc-dot-active' : ''}`}
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
  )
}

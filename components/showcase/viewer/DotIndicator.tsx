// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

/** Left-side page indicator — replaces a numeric "1 / 3" counter with dots the
 *  album can colour to match the event. Each dot is a full 44×44 touch target
 *  around a small visual mark. */
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
    <div className="pointer-events-auto absolute left-1 top-1/2 z-10 flex -translate-y-1/2 flex-col sm:left-2">
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
              className="block rounded-full transition-all duration-200"
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

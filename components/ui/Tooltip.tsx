// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import type { ReactNode } from 'react'

const tipClass =
  'pointer-events-none invisible absolute right-0 top-full z-50 mt-2 w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-md bg-black/80 px-2 py-1 text-xs font-medium leading-snug text-white opacity-0 ring-1 ring-white/15 backdrop-blur-sm motion-safe:transition-opacity motion-safe:duration-100 group-hover/tip:visible group-hover/tip:opacity-100 [@media(hover:hover)]:group-has-[:focus-visible]/tip:visible [@media(hover:hover)]:group-has-[:focus-visible]/tip:opacity-100'

/**
 * A hover / keyboard-focus tip for an icon-only control, CSS only. It appears
 * below the control with its right edge on the control's, so a control at the
 * right of the screen never pushes it off the viewport. Touch screens have no
 * hover, so nothing shows there (the Legend covers them). The tip is
 * `aria-hidden`: the control's own `aria-label` stays its one accessible name.
 */
export default function Tooltip({
  label,
  className = '',
  suppress = false,
  children,
}: {
  label: string
  className?: string
  /** Hold the tip back while something the control opened already sits where it would appear. */
  suppress?: boolean
  children: ReactNode
}) {
  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      {children}
      {!suppress && (
        <span aria-hidden="true" className={tipClass}>
          {label}
        </span>
      )}
    </span>
  )
}

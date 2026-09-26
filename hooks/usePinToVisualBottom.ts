// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { useEffect, type RefObject } from 'react'

const SETTLE_MS = 500
const MAX_SHIFT_PX = 300

// A mobile browser's toolbars collapse and expand while the page scrolls. The visual viewport
// follows immediately, but the layout viewport that `position: fixed` is anchored to can lag,
// leaving the page showing through a gap under a bottom-anchored element. This measures where the
// visible bottom is and closes the gap: `translate` moves the element down by the difference,
// `extend` grows a full-screen element's bottom edge instead. A no-op where the Visual Viewport
// API is missing, and while the visitor is pinch-zoomed.
export function usePinToVisualBottom(ref: RefObject<HTMLElement | null>, mode: 'translate' | 'extend') {
  useEffect(() => {
    const el = ref.current
    const vv = window.visualViewport
    if (!el || !vv) return

    let shift = 0
    let frame = 0
    let until = 0

    const write = (value: number) => {
      if (mode === 'translate') el.style.transform = value === 0 ? '' : `translateY(${value}px)`
      else el.style.bottom = value === 0 ? '' : `${-value}px`
    }

    const tick = () => {
      frame = 0
      const natural = el.getBoundingClientRect().bottom - shift
      const target = vv.scale > 1.01 ? natural : vv.offsetTop + vv.height
      const next = Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, Math.round((target - natural) * 2) / 2))
      if (next !== shift) {
        shift = next
        write(shift)
      }
      if (performance.now() < until) frame = requestAnimationFrame(tick)
    }

    const kick = () => {
      until = performance.now() + SETTLE_MS
      if (!frame) frame = requestAnimationFrame(tick)
    }

    kick()
    vv.addEventListener('resize', kick)
    vv.addEventListener('scroll', kick)
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    return () => {
      vv.removeEventListener('resize', kick)
      vv.removeEventListener('scroll', kick)
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      if (frame) cancelAnimationFrame(frame)
      write(0)
    }
  }, [ref, mode])
}

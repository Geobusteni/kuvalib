// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

function focusVisible(...candidates: (HTMLElement | null | undefined)[]) {
  candidates.find((el) => el && el.getClientRects().length > 0)?.focus()
}

/**
 * Open / close state for a Legend disclosure. Opening moves focus onto the
 * panel; Escape (caught in the capture phase, so the surrounding shortcuts and
 * fullscreen handling never see it), an outside press, or focus tabbing out of
 * the panel closes it. Escape and the Close button hand focus back to whichever
 * trigger is on screen.
 *
 * `alternateTrigger` is for a surface that swaps the "?" for another control at
 * narrow widths: focus goes to whichever of the two is on screen.
 */
export function useLegend(alternateTrigger?: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = (restoreFocus = false) => {
    setOpen(false)
    if (!restoreFocus) return
    focusVisible(triggerRef.current, alternateTrigger?.current)
  }

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
      focusVisible(triggerRef.current, alternateTrigger?.current)
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, alternateTrigger])

  const toggle = () => setOpen((v) => !v)
  const show = () => setOpen(true)

  return { open, show, toggle, close, triggerRef, panelRef }
}

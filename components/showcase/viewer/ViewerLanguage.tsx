// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

/** A pill of its own under the page dots (top-left), so the top-right pills
 *  keep their room on narrow screens. Fades with the other controls in
 *  fullscreen. Space/Enter on a focused language button must activate that
 *  button, so they are kept from reaching the viewer's window-level shortcuts
 *  (Space = play/pause); the other shortcut keys are not letters that a button
 *  consumes, so they still work. */
export function ViewerLanguage({ visible }: { visible: boolean }) {
  return (
    <div
      className="pointer-events-auto absolute left-1 top-14 z-10 rounded-full bg-black/40 px-1 backdrop-blur-sm transition-opacity duration-300 sm:left-2 sm:top-16"
      style={{ opacity: visible ? 1 : 0 }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') e.stopPropagation()
      }}
    >
      <LanguageSwitcher className="text-white/40 [&_button]:text-white/75 [&_button]:hover:text-white [&_button[aria-current=true]]:text-white" />
    </div>
  )
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { Frame } from '@craftjs/core'
import { useShowcaseStore } from '../store'
import { showcaseThemeVars } from '@/lib/showcase-theme'
import { FrameSizeProvider } from '../frame-size'

/**
 * The 16:10 editing surface. `<Frame>` is keyed by the current page id so
 * switching pages remounts it with that page's serialized tree; `useBuilder`
 * has already stashed the outgoing page's state by the time this re-renders.
 */
export function Canvas() {
  const pages = useShowcaseStore((s) => s.pages)
  const currentPageId = useShowcaseStore((s) => s.currentPageId)
  const eventType = useShowcaseStore((s) => s.settings.eventType)
  const albumBg = useShowcaseStore((s) => s.settings.albumBg)

  const page = pages.find((p) => p.id === currentPageId) ?? pages[0]

  if (!page) return null

  return (
    <FrameSizeProvider
      className="relative w-full overflow-hidden rounded-xl shadow-lg"
      style={{
        ...showcaseThemeVars(eventType, albumBg),
        aspectRatio: '16 / 10',
        background: 'var(--sc-album-bg)',
      }}
    >
      <Frame key={page.id} data={page.snapshot} />
    </FrameSizeProvider>
  )
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { CSSProperties } from 'react'
import type { ShowcaseAnimation } from '@/lib/generated/prisma/client'
import type { Block, HeadingLevel, PageSettings, TextSizePreset } from '@/lib/showcase-blocks'
import { blockBackgroundCss, blockBorderCss } from '@/lib/showcase-theme'
import type { AnimDir, AnimPhase } from './useSlideshow'
import { BlockRenderer } from './BlockRenderer'
import type { ShowcasePhoto } from '../photos-context'

function pageTransform(
  style: ShowcaseAnimation,
  phase: AnimPhase,
  dir: AnimDir,
): CSSProperties {
  if (phase === 'idle' || phase === 'in') {
    return { transform: 'none', opacity: 1, transition: 'transform 260ms ease, opacity 260ms ease' }
  }
  if (style === 'FADE') {
    return { opacity: 0, transition: phase === 'pre' ? 'none' : 'opacity 260ms ease' }
  }
  if (style === 'ZOOM') {
    return phase === 'out'
      ? { transform: 'scale(0.94)', opacity: 0, transition: 'transform 220ms ease, opacity 220ms ease' }
      : { transform: 'scale(1.05)', opacity: 0, transition: 'none' }
  }
  if (style === 'ROTATE') {
    const outT = dir === 'next' ? 'rotate(-8deg) scale(0.92)' : 'rotate(8deg) scale(0.92)'
    const preT = dir === 'next' ? 'rotate(8deg) scale(0.92)' : 'rotate(-8deg) scale(0.92)'
    return phase === 'out'
      ? { transform: outT, opacity: 0, transition: 'transform 260ms ease, opacity 260ms ease' }
      : { transform: preT, opacity: 0, transition: 'none' }
  }
  // TURN
  const outT = dir === 'next' ? 'rotateY(-18deg) translateX(-30px)' : 'rotateY(18deg) translateX(30px)'
  const preT = dir === 'next' ? 'rotateY(18deg) translateX(30px)' : 'rotateY(-18deg) translateX(-30px)'
  return phase === 'out'
    ? { transform: outT, opacity: 0, transition: 'transform 220ms ease, opacity 220ms ease' }
    : { transform: preT, opacity: 0, transition: 'none' }
}

export function PageStage({
  pageId,
  blocks,
  photos,
  settings,
  animationStyle,
  phase,
  dir,
  galleryHref,
  onZipClick,
  headingSizes,
  textSizes,
  headingFont,
  textFont,
}: {
  pageId: string
  blocks: Block[]
  photos: ShowcasePhoto[]
  settings: PageSettings
  animationStyle: ShowcaseAnimation
  phase: AnimPhase
  dir: AnimDir
  galleryHref?: string
  onZipClick?: () => void
  headingSizes?: Partial<Record<HeadingLevel, number>>
  textSizes?: Partial<Record<TextSizePreset, number>>
  headingFont?: string | null
  textFont?: string | null
}) {
  return (
    // Edge-to-edge: the page fills 100% of the viewer, not a fixed-aspect
    // letterboxed card — a full-bleed Image block then genuinely covers the
    // whole browser window instead of whatever the 16:10 ratio left over.
    // `perspective` has to live on this outer, untransformed wrapper — it has
    // no effect set on the same element that's being transformed below.
    <div className="sc-stage" style={{ position: 'absolute', inset: 0, perspective: 2000 }}>
      <div
        className="sc-page"
        style={{
          position: 'absolute',
          inset: 0,
          background: settings.bg === 'none' ? 'var(--sc-album-bg)' : blockBackgroundCss(settings),
          border: blockBorderCss(settings),
          // Always clipped — a slide's content never spills past its own frame.
          overflow: 'hidden',
          boxSizing: 'border-box',
          transformStyle: 'preserve-3d',
          ...pageTransform(animationStyle, phase, dir),
        }}
      >
        <BlockRenderer
          key={pageId}
          blocks={blocks}
          photos={photos}
          galleryHref={galleryHref}
          onZipClick={onZipClick}
          headingSizes={headingSizes}
          textSizes={textSizes}
          headingFont={headingFont}
          textFont={textFont}
        />
      </div>
    </div>
  )
}

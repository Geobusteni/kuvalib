// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { CSSProperties } from 'react'
import type { ShowcaseAnimation } from '@/lib/generated/prisma/client'
import type { Block } from '@/lib/showcase-blocks'
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
  // TURN
  const outT = dir === 'next' ? 'rotateY(-18deg) translateX(-30px)' : 'rotateY(18deg) translateX(30px)'
  const preT = dir === 'next' ? 'rotateY(18deg) translateX(30px)' : 'rotateY(-18deg) translateX(-30px)'
  return phase === 'out'
    ? { transform: outT, opacity: 0, transition: 'transform 220ms ease, opacity 220ms ease' }
    : { transform: preT, opacity: 0, transition: 'none' }
}

export function PageStage({
  blocks,
  photos,
  animationStyle,
  phase,
  dir,
  galleryHref,
  onZipClick,
}: {
  blocks: Block[]
  photos: ShowcasePhoto[]
  animationStyle: ShowcaseAnimation
  phase: AnimPhase
  dir: AnimDir
  galleryHref?: string
  onZipClick?: () => void
}) {
  return (
    <div style={{ position: 'relative', width: 'min(960px, 92vw)', aspectRatio: '16 / 10', perspective: 2000 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--sc-album-bg)',
          borderRadius: '0.75rem',
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          transformStyle: 'preserve-3d',
          ...pageTransform(animationStyle, phase, dir),
        }}
      >
        <BlockRenderer blocks={blocks} photos={photos} galleryHref={galleryHref} onZipClick={onZipClick} />
      </div>
    </div>
  )
}

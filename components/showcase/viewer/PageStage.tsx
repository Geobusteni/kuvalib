// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import type { ShowcaseAnimation } from '@/lib/generated/prisma/client'
import type { Block, HeadingLevel, PageSettings, TextSizePreset } from '@/lib/showcase-blocks'
import { MIN_FRAME_WIDTH, blockBackgroundCss, blockBorderCss } from '@/lib/showcase-theme'
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
  const t = useTranslations('showcaseViewer.stage')
  const panRef = useRef<HTMLDivElement>(null)
  const centredAt = useRef(0)
  const [hintVisible, setHintVisible] = useState(false)

  // A frame narrower than MIN_FRAME_WIDTH is wider than the screen: centre it,
  // and tell the visitor once that it pans. Re-centre on resize/rotation only
  // while they have not panned themselves.
  useEffect(() => {
    const el = panRef.current
    if (!el) return
    const overflows = () => el.scrollWidth > el.clientWidth + 1
    const centre = () => {
      if (Math.abs(el.scrollLeft - centredAt.current) > 2) return
      centredAt.current = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
      el.scrollLeft = centredAt.current
    }
    centre()
    setHintVisible(overflows())
    const observer = new ResizeObserver(() => {
      centre()
      if (!overflows()) setHintVisible(false)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!hintVisible) return
    const id = setTimeout(() => setHintVisible(false), 4000)
    return () => clearTimeout(id)
  }, [hintVisible])

  return (
    // The pan container: as wide as the screen, or the frame's minimum width
    // when the screen is narrower — then it scrolls sideways natively.
    <div
      ref={panRef}
      className="sc-pan"
      onScroll={(e) => {
        if (Math.abs(e.currentTarget.scrollLeft - centredAt.current) > 2) setHintVisible(false)
      }}
      style={{
        position: 'absolute',
        inset: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        overscrollBehaviorX: 'contain',
        scrollbarWidth: 'none',
      }}
    >
      {/* The frame fills the viewer's height and its full width (never less
          than MIN_FRAME_WIDTH), so a full-bleed Image block covers the whole
          window. `perspective` lives on this outer, untransformed wrapper —
          it has no effect on the element being transformed below. `overflow:
          hidden` keeps a page-turn from extending the pan container's
          scrollable area. */}
      <div
        className="sc-stage"
        style={{
          position: 'relative',
          width: '100%',
          minWidth: MIN_FRAME_WIDTH,
          height: '100%',
          perspective: 2000,
          overflow: 'hidden',
        }}
      >
        <div
          className="sc-page"
          style={{
            position: 'absolute',
            inset: 0,
            containerType: 'inline-size',
            background: settings.bg === 'none' ? 'var(--sc-album-bg)' : blockBackgroundCss(settings),
            border: blockBorderCss(settings),
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
      {hintVisible && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-10 flex justify-center"
        >
          <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {t('panHint')}
          </span>
        </div>
      )}
    </div>
  )
}

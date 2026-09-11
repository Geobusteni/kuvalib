// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { Block, HeadingLevel, TextSizePreset } from '@/lib/showcase-blocks'
import type { ShowcasePhoto } from '../photos-context'
import { BlockRenderer } from './BlockRenderer'

// The preview is a real render of the page scaled down, so a tiny box keeps the
// same proportions and font sizing as the full stage.
const PREVIEW_W = 960
const PREVIEW_H = 600
const THUMB_W = 132

export function ThumbnailRail({
  pages,
  photos,
  current,
  onSelect,
  headingSizes,
  textSizes,
}: {
  pages: { id: string; blocks: Block[] }[]
  photos: ShowcasePhoto[]
  current: number
  onSelect: (index: number) => void
  headingSizes?: Partial<Record<HeadingLevel, number>>
  textSizes?: Partial<Record<TextSizePreset, number>>
}) {
  const scale = THUMB_W / PREVIEW_W

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 flex gap-2 overflow-x-auto px-4 py-3"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
    >
      {pages.map((page, i) => (
        // A <div role="button"> rather than a real <button>: the preview inside
        // can contain a Button block (which renders as <button>/<a>), and
        // interactive content cannot nest inside a <button>.
        <div
          key={page.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(i)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect(i)
            }
          }}
          aria-label={`Go to page ${i + 1}`}
          aria-current={i === current ? 'true' : undefined}
          className="relative shrink-0 cursor-pointer overflow-hidden rounded-md border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{
            width: THUMB_W,
            height: THUMB_W * (PREVIEW_H / PREVIEW_W),
            borderColor: i === current ? 'var(--sc-accent)' : 'rgba(255,255,255,0.25)',
            background: 'var(--sc-album-bg)',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: PREVIEW_W,
              height: PREVIEW_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <BlockRenderer
              blocks={page.blocks}
              photos={photos}
              headingSizes={headingSizes}
              textSizes={textSizes}
            />
          </div>
          <span
            className="absolute bottom-0.5 right-1 text-[10px] font-semibold tabular-nums"
            style={{
              color: i === current ? 'var(--sc-accent)' : 'rgba(255,255,255,0.85)',
              textShadow: '0 1px 2px rgba(0,0,0,0.7)',
            }}
          >
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  )
}

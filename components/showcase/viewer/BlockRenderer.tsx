// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { CSSProperties } from 'react'
import { flattenBlocks, type Block, type HeadingLevel, type TextSizePreset } from '@/lib/showcase-blocks'
import { blockBackgroundCss, blockRadiusCss, blockShadowCss } from '@/lib/showcase-theme'
import { BlockContent } from '../BlockContent'
import type { ShowcasePhoto } from '../photos-context'

/**
 * Renders one page's blocks as a single flat, absolutely-positioned list — the
 * same "flatten, never nest" strategy the builder uses. No Craft.js here: the
 * viewer only needs the geometry and `BlockContent`.
 */
export function BlockRenderer({
  blocks,
  photos,
  galleryHref,
  onZipClick,
  headingSizes,
  textSizes,
  headingFont,
  textFont,
}: {
  blocks: Block[]
  photos: ShowcasePhoto[]
  galleryHref?: string
  onZipClick?: () => void
  headingSizes?: Partial<Record<HeadingLevel, number>>
  textSizes?: Partial<Record<TextSizePreset, number>>
  headingFont?: string | null
  textFont?: string | null
}) {
  const flat = flattenBlocks(blocks)
  return (
    <>
      {flat.map(({ block }) => {
        const photo =
          block.type === 'image' && block.photoId
            ? photos.find((p) => p.id === block.photoId)
            : undefined
        const isGroup = block.type === 'group'
        const outerStyle: CSSProperties = {
          position: 'absolute',
          left: `${block.x}%`,
          top: `${block.y}%`,
          width: `${block.w}%`,
          height: `${block.h}%`,
          boxSizing: 'border-box',
          borderRadius: blockRadiusCss(block.radius),
          // A shadow renders outside the box, so it lives on this outer,
          // unclipped wrapper — the inner one below clips the blur/background.
          boxShadow: isGroup ? blockShadowCss(block) : undefined,
        }
        return (
          <div key={block.id} className={`sc-block sc-block-${block.type}`} style={outerStyle}>
            {isGroup ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 'inherit',
                  overflow: 'hidden',
                  background: blockBackgroundCss(block),
                  backdropFilter: block.blur ? `blur(${block.blur}px)` : undefined,
                }}
              />
            ) : (
              <BlockContent
                block={block}
                photo={photo}
                galleryHref={galleryHref}
                onZipClick={onZipClick}
                headingSizes={headingSizes}
                textSizes={textSizes}
                headingFont={headingFont}
                textFont={textFont}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

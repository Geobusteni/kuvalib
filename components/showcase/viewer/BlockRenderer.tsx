// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { flattenBlocks, type Block, type HeadingLevel, type TextSizePreset } from '@/lib/showcase-blocks'
import { blockBackgroundCss, blockRadiusCss } from '@/lib/showcase-theme'
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
}: {
  blocks: Block[]
  photos: ShowcasePhoto[]
  galleryHref?: string
  onZipClick?: () => void
  headingSizes?: Partial<Record<HeadingLevel, number>>
  textSizes?: Partial<Record<TextSizePreset, number>>
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
        return (
          <div
            key={block.id}
            className={`sc-block sc-block-${block.type}`}
            style={{
              position: 'absolute',
              left: `${block.x}%`,
              top: `${block.y}%`,
              width: `${block.w}%`,
              height: `${block.h}%`,
              boxSizing: 'border-box',
              borderRadius: blockRadiusCss(block.radius),
              background: isGroup ? blockBackgroundCss(block) : undefined,
              backdropFilter: isGroup && block.blur ? `blur(${block.blur}px)` : undefined,
              overflow: isGroup ? 'hidden' : undefined,
            }}
          >
            {!isGroup && (
              <BlockContent
                block={block}
                photo={photo}
                galleryHref={galleryHref}
                onZipClick={onZipClick}
                headingSizes={headingSizes}
                textSizes={textSizes}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

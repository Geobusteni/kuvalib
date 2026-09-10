// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { Block } from '@/lib/showcase-blocks'
import { safeExternalHref } from '@/lib/showcase-blocks'
import { blockBackgroundCss, blockRadiusCss, blockTextColorCss } from '@/lib/showcase-theme'
import type { ShowcasePhoto } from './photos-context'

/**
 * The visual inside a block — shared by the builder canvas and the viewer so the
 * two never drift. The outer positioned box (drag handles in the builder, the
 * page-turn transform in the viewer) is the caller's job.
 */

interface Props {
  block: Block
  photo?: ShowcasePhoto
  /** Builder canvas: buttons never navigate, images fall back to a placeholder label. */
  editable?: boolean
  /** Viewer only. */
  galleryHref?: string
  onZipClick?: () => void
}

export function BlockContent({ block, photo, editable = false, galleryHref, onZipClick }: Props) {
  if (block.type === 'image') {
    const radius = blockRadiusCss(block.radius)
    if (photo) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- showcase art direction needs object-fit, not the Image layout box
        <img
          src={photo.thumbLg}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: radius,
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      )
    }
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          color: 'var(--sc-text-muted)',
          background:
            'repeating-linear-gradient(135deg, var(--sc-surface), var(--sc-surface) 9px, var(--sc-deep) 9px, var(--sc-deep) 18px)',
        }}
      >
        {editable ? 'Pick a photo' : ''}
      </div>
    )
  }

  if (block.type === 'title' || block.type === 'text') {
    const isTitle = block.type === 'title'
    const Tag = isTitle ? 'h3' : 'p'
    const hasBg = block.bg !== 'none'
    return (
      <Tag
        style={{
          margin: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: block.align ?? 'left',
          fontSize: isTitle ? 'clamp(15px, 2.6vw, 26px)' : 'clamp(12px, 1.5vw, 15px)',
          fontWeight: isTitle ? 600 : 400,
          lineHeight: 1.35,
          color: blockTextColorCss(block),
          background: hasBg ? blockBackgroundCss(block) : undefined,
          borderRadius: blockRadiusCss(block.radius),
          padding: hasBg ? '0.5rem 0.75rem' : 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {block.text}
      </Tag>
    )
  }

  if (block.type === 'button') {
    const primary = block.style !== 'secondary'
    const hasBg = block.bg !== 'none'
    const style: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontSize: 'clamp(12px, 1.4vw, 15px)',
      fontWeight: 600,
      textDecoration: 'none',
      boxSizing: 'border-box',
      padding: '0 0.75rem',
      borderRadius: blockRadiusCss(block.radius),
      background: hasBg
        ? blockBackgroundCss(block)
        : primary
          ? 'var(--sc-accent)'
          : 'transparent',
      color: hasBg
        ? blockTextColorCss(block)
        : primary
          ? 'var(--sc-accent-contrast)'
          : 'var(--sc-text)',
      border: primary ? 'none' : '1px solid var(--sc-text-muted)',
      overflow: 'hidden',
    }
    const label = block.label || 'Button'

    if (editable) return <span style={style}>{label}</span>

    if (block.linkType === 'zip') {
      return (
        <button type="button" onClick={onZipClick} style={{ ...style, cursor: 'pointer' }}>
          {label}
        </button>
      )
    }
    if (block.linkType === 'gallery' && galleryHref) {
      return (
        <a href={galleryHref} style={style}>
          {label}
        </a>
      )
    }
    const href = safeExternalHref(block.link)
    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
          {label}
        </a>
      )
    }
    return <span style={style}>{label}</span>
  }

  return null
}

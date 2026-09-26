// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { ICON_STROKE_DEFAULT, safeExternalHref, type Block, type HeadingLevel, type TextSizePreset } from '@/lib/showcase-blocks'
import {
  KEN_BURNS_KEYFRAMES,
  blockBackgroundCss,
  blockBorderCss,
  blockFontSizeCss,
  blockFontStyleCss,
  blockRadiusCss,
  blockTextColorCss,
  blockButtonFontSizeCss,
  fluidPx,
  googleFontFamilyCss,
} from '@/lib/showcase-theme'
import { parseIconId } from '@/lib/icons/ids'
import { ShowcaseIcon } from './Icon'
import { useKenBurnsMin, type ShowcasePhoto } from './photos-context'

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
  /** Album defaults a Headline/Text block's own `fontSize` overrides. */
  headingSizes?: Partial<Record<HeadingLevel, number>>
  textSizes?: Partial<Record<TextSizePreset, number>>
  /** Album-wide Google Font choice for Headline/Text blocks (no per-block override). */
  headingFont?: string | null
  textFont?: string | null
}

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

/** What an icon is called to assistive tech when no label was typed: a built-in
 *  icon's own name, otherwise `fallback` (a custom icon's name is not in the viewer). */
function iconName(block: Block, fallback: string): string {
  const typed = block.iconLabel?.trim()
  if (typed) return typed
  const ref = parseIconId(block.icon)
  return ref?.kind === 'lucide' ? ref.key.replace(/-/g, ' ') : fallback
}

/** The element a Button or Icon block draws in, by link type: `zip` opens the
 *  download dialog, `gallery` and a custom http(s) URL are anchors, and anything
 *  else (or the builder canvas) is an inert box. `ariaLabel` is passed only by an
 *  Icon block, which has no text of its own: when it links it is the accessible
 *  name, and when it does not the block is decorative unless a label was typed. */
function linkedElement({
  block,
  style,
  editable,
  galleryHref,
  onZipClick,
  ariaLabel,
  typedLabel,
  children,
}: {
  block: Block
  style: CSSProperties
  editable: boolean
  galleryHref?: string
  onZipClick?: () => void
  ariaLabel?: string
  typedLabel?: string
  children: React.ReactNode
}) {
  if (!editable) {
    if (block.linkType === 'zip') {
      return (
        <button type="button" onClick={onZipClick} aria-label={ariaLabel} style={{ ...style, cursor: 'pointer' }}>
          {children}
        </button>
      )
    }
    if (block.linkType === 'gallery' && galleryHref) {
      return (
        <a href={galleryHref} aria-label={ariaLabel} style={style}>
          {children}
        </a>
      )
    }
    const href = block.linkType === 'none' ? '' : safeExternalHref(block.link)
    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} style={style}>
          {children}
        </a>
      )
    }
  }
  if (ariaLabel === undefined) return <span style={style}>{children}</span>
  return typedLabel ? (
    <span role="img" aria-label={typedLabel} style={style}>
      {children}
    </span>
  ) : (
    <span aria-hidden="true" style={style}>
      {children}
    </span>
  )
}

export function BlockContent({
  block,
  photo,
  editable = false,
  galleryHref,
  onZipClick,
  headingSizes,
  textSizes,
  headingFont,
  textFont,
}: Props) {
  const t = useTranslations('showcaseViewer.block')
  const kenBurnsMin = useKenBurnsMin()
  if (block.type === 'image') {
    const radius = blockRadiusCss(block.radius)
    const border = blockBorderCss(block)
    if (photo) {
      // The border/radius/clip live on this static frame. Inside it, one layer
      // carries the Ken Burns animation and the <img> carries the photographer's
      // focus/zoom: separate elements, because a CSS animation on `transform`
      // replaces a static `transform` on the same element. Both only ever
      // enlarge a cover-fitted image about a point inside the block, so it can
      // never leave a gap.
      const kenBurns = block.kenBurns ?? 'none'
      const kenBurnsAnimation = KEN_BURNS_KEYFRAMES[kenBurns]
      const fx = block.focusX ?? 50
      const fy = block.focusY ?? 50
      const scale = (block.imageScale ?? 100) / 100
      // The slide effects translate by up to 2% on top of a 112% scale; that
      // margin only holds on the sliding axis when the scale is centred there,
      // so a focus point at an edge must not be their origin on that axis.
      const kbOriginX = kenBurns === 'slide-left' || kenBurns === 'slide-right' ? 50 : fx
      const kbOriginY = kenBurns === 'slide-up' || kenBurns === 'slide-down' ? 50 : fy
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: radius,
            border,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            data-kb-layer=""
            style={{
              width: '100%',
              height: '100%',
              transformOrigin: `${kbOriginX}% ${kbOriginY}%`,
              animationName: kenBurnsAnimation,
              animationDuration: kenBurnsAnimation ? `${Math.max(block.kenBurnsSpeed ?? 8, kenBurnsMin)}s` : undefined,
              animationTimingFunction: 'ease-in-out',
              animationFillMode: 'forwards',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- showcase art direction needs object-fit, not the Image layout box */}
            <img
              src={photo.thumbLg}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${fx}% ${fy}%`,
                transform: scale > 1 ? `scale(${scale})` : undefined,
                transformOrigin: `${fx}% ${fy}%`,
                display: 'block',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          </div>
        </div>
      )
    }
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          border,
          boxSizing: 'border-box',
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
        {editable ? t('pickPhoto') : ''}
      </div>
    )
  }

  if (block.type === 'title' || block.type === 'text') {
    const isTitle = block.type === 'title'
    const Tag = isTitle ? HEADING_TAGS[(block.level ?? 2) - 1] : 'p'
    const hasBg = block.bg !== 'none'
    const fontFamily = googleFontFamilyCss(isTitle ? headingFont ?? undefined : textFont ?? undefined)
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
          fontSize: blockFontSizeCss(block, headingSizes, textSizes),
          fontFamily,
          ...blockFontStyleCss(block),
          lineHeight: 1.35,
          color: blockTextColorCss(block),
          background: hasBg ? blockBackgroundCss(block) : undefined,
          borderRadius: blockRadiusCss(block.radius),
          padding: hasBg ? `${fluidPx(8)} ${fluidPx(12)}` : 0,
          boxSizing: 'border-box',
          // Wrap as much as fits the box, then clip the rest — never spill
          // outside it or push other blocks around.
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
    // An explicit border wins; otherwise fall back to the old implicit look
    // (secondary gets a subtle outline, primary none) so existing buttons
    // don't change.
    const explicitBorder = blockBorderCss(block)
    const hasIcon = parseIconId(block.icon) !== null
    const iconOnly = hasIcon && !block.label
    const label = block.label || t('defaultButtonLabel')
    const style: CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: hasIcon && !iconOnly ? '0.5em' : undefined,
      textAlign: 'center',
      fontSize: blockButtonFontSizeCss(block),
      fontWeight: 600,
      textDecoration: 'none',
      boxSizing: 'border-box',
      padding: `0 ${fluidPx(12)}`,
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
      border: explicitBorder !== 'none' ? explicitBorder : primary ? 'none' : '1px solid var(--sc-text-muted)',
      overflow: 'hidden',
    }
    const icon = hasIcon ? <ShowcaseIcon icon={block.icon} size="1.15em" style={{ flexShrink: 0 }} /> : null
    // An icon-only button is named by visually hidden text: the icon itself is decorative.
    const content = (
      <>
        {block.iconPosition !== 'right' && icon}
        {iconOnly ? <span className="sr-only">{iconName(block, t('defaultButtonLabel'))}</span> : <span>{label}</span>}
        {block.iconPosition === 'right' && icon}
      </>
    )
    return linkedElement({ block, style, editable, galleryHref, onZipClick, children: hasIcon ? content : label })
  }

  if (block.type === 'icon') {
    const hasBg = block.bg !== 'none'
    const style: CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      padding: 0,
      borderRadius: blockRadiusCss(block.radius),
      background: hasBg ? blockBackgroundCss(block) : 'transparent',
      color: blockTextColorCss(block),
      border: blockBorderCss(block),
      overflow: 'hidden',
      // The glyph is sized in `cqmin` of this box, so it stays square and centred
      // whatever the block's proportions.
      containerType: 'size',
    }
    const glyph = (
      <ShowcaseIcon
        icon={block.icon}
        strokeWidth={block.iconStroke ?? ICON_STROKE_DEFAULT}
        style={{ width: '84cqmin', height: '84cqmin', flexShrink: 0 }}
      />
    )
    return linkedElement({
      block,
      style,
      editable,
      galleryHref,
      onZipClick,
      ariaLabel: iconName(block, t('defaultIconLabel')),
      typedLabel: block.iconLabel?.trim(),
      children: glyph,
    })
  }

  return null
}

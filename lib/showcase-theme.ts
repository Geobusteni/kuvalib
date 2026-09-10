// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/**
 * Showcase theming. The event type picks an accent hue; everything else is
 * derived from CSS custom properties so the builder canvas and the viewer stay
 * in sync from one source. The viewer is dark (like the gallery and lightbox);
 * the builder inherits the admin zinc theme and only borrows the accent.
 */

import type { CSSProperties } from 'react'
import type { ShowcaseEventType, ShowcaseBg } from './generated/prisma/client'
import type { Block, BlockRadius } from './showcase-blocks'

export const EVENT_TYPE_LABELS: Record<ShowcaseEventType, string> = {
  WEDDING: 'Wedding',
  BIRTHDAY: 'Birthday',
  CHRISTENING: 'Christening',
  CORPORATE: 'Corporate',
  GENERIC: 'Generic',
}

/** oklch hue angles. */
const EVENT_HUE: Record<ShowcaseEventType, number> = {
  WEDDING: 12,
  BIRTHDAY: 35,
  CHRISTENING: 255,
  CORPORATE: 165,
  GENERIC: 289,
}

export const ALBUM_BG_LABELS: Record<ShowcaseBg, string> = {
  NEUTRAL: 'Neutral',
  DEEP: 'Deep',
  ACCENT: 'Accent tint',
}

/**
 * The CSS variables every showcase surface reads. Set on the builder canvas
 * wrapper and on the viewer stage via inline `style`.
 */
export function showcaseThemeVars(eventType: ShowcaseEventType, albumBg: ShowcaseBg): CSSProperties {
  const hue = EVENT_HUE[eventType] ?? EVENT_HUE.GENERIC
  const accent = `oklch(0.68 0.15 ${hue})`
  const albumBackground =
    albumBg === 'DEEP'
      ? 'oklch(0.14 0.005 285)'
      : albumBg === 'ACCENT'
        ? `oklch(0.19 0.04 ${hue})`
        : 'oklch(0.21 0.005 285)'

  return {
    '--sc-accent': accent,
    '--sc-accent-tint': `color-mix(in oklab, ${accent} 22%, transparent)`,
    '--sc-accent-contrast': `oklch(0.99 0 0)`,
    '--sc-surface': 'oklch(0.27 0.005 285)',
    '--sc-deep': 'oklch(0.12 0.005 285)',
    '--sc-text': 'oklch(0.96 0 0)',
    '--sc-text-muted': 'color-mix(in oklab, oklch(0.96 0 0) 60%, transparent)',
    '--sc-album-bg': albumBackground,
  } as CSSProperties
}

// ─── Per-block appearance ────────────────────────────────────────────────────

export function withAlpha(hex: string, alpha: number | undefined): string {
  const a = alpha ?? 100
  return a >= 100 ? hex : `color-mix(in srgb, ${hex} ${a}%, transparent)`
}

export function blockRadiusCss(radius: BlockRadius | undefined): string {
  return radius === 'md' ? '0.5rem' : radius === 'pill' ? '999px' : '0px'
}

export function blockBackgroundCss(block: Pick<Block, 'bg' | 'bgCustom' | 'bgCustomAlpha'>): string {
  switch (block.bg) {
    case 'surface': return 'var(--sc-surface)'
    case 'deep': return 'var(--sc-deep)'
    case 'accentTint': return 'var(--sc-accent-tint)'
    case 'accentSolid': return 'var(--sc-accent)'
    case 'custom': return withAlpha(block.bgCustom || '#1a1a1a', block.bgCustomAlpha)
    default: return 'transparent'
  }
}

export function blockTextColorCss(
  block: Pick<Block, 'textColor' | 'textColorCustom' | 'textColorCustomAlpha'>,
): string {
  switch (block.textColor) {
    case 'accent': return 'var(--sc-accent)'
    case 'muted': return 'var(--sc-text-muted)'
    case 'custom': return withAlpha(block.textColorCustom || '#e9e9ed', block.textColorCustomAlpha)
    default: return 'var(--sc-text)'
  }
}

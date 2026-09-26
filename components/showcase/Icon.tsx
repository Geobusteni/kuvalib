// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { CSSProperties } from 'react'
import { parseIconId } from '@/lib/icons/ids'
import { safeSvg, type SanitizedSvg } from '@/lib/svg-sanitize'
import { useIconLibrary } from './icons-context'

interface ShowcaseIconProps {
  /** `lucide:<name>` or `custom:<id>`. Anything unknown renders nothing. */
  icon: string | undefined | null
  /** CSS length or pixels. Defaults to `1em`, so the icon follows the text size. */
  size?: number | string
  /** Built-in icons only; a custom icon keeps the stroke width it was drawn with. */
  strokeWidth?: number
  className?: string
  style?: CSSProperties
  /** Accessible name. Without it the icon is decorative (`aria-hidden`). */
  label?: string
}

const REACT_PROP: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'fill-opacity': 'fillOpacity',
  'stroke-opacity': 'strokeOpacity',
}

/** Draws in `currentColor`, so the surrounding text colour recolours it. */
export function ShowcaseIcon({ icon, size = '1em', strokeWidth = 2, className, style, label }: ShowcaseIconProps) {
  const library = useIconLibrary()
  const ref = parseIconId(icon)
  if (!ref) return null

  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    className,
    style,
    focusable: 'false' as const,
    ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }),
  }

  if (ref.kind === 'lucide') {
    const inner = Object.hasOwn(library.builtin, ref.key) ? library.builtin[ref.key] : undefined
    if (inner === undefined) return null
    return (
      <svg
        {...common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    )
  }

  const stored = Object.hasOwn(library.custom, ref.key) ? library.custom[ref.key] : undefined
  const clean = stored ? safeSvg(stored.svg) : null
  if (!clean) return null
  return <SanitizedSvgImage svg={clean} {...common} />
}

/** Draws markup that has already been through `sanitizeSvg`; never pass anything else. */
export function SanitizedSvgImage({
  svg,
  ...rest
}: { svg: SanitizedSvg } & Omit<React.SVGProps<SVGSVGElement>, 'viewBox' | 'dangerouslySetInnerHTML' | 'children'>) {
  const presentation = Object.fromEntries(Object.entries(svg.attrs).map(([k, v]) => [REACT_PROP[k] ?? k, v]))
  return <svg {...rest} viewBox={svg.viewBox} {...presentation} dangerouslySetInnerHTML={{ __html: svg.inner }} />
}

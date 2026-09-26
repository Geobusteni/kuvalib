// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import type { ReactNode } from 'react'

/**
 * Every icon-only control and its Legend row draw from here, so a button and
 * its explanation can never drift apart. Two families: the gallery header set
 * (24-unit grid) and the viewer / lightbox set (20-unit grid).
 */
interface IconProps {
  size?: number
  strokeWidth?: number
  className?: string
}

function Svg({
  box,
  size,
  strokeWidth,
  className,
  fill = 'none',
  stroke = 'currentColor',
  children,
}: IconProps & { box: number; fill?: string; stroke?: string; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function SlideshowIcon({ size = 22, strokeWidth = 1.75, className }: IconProps) {
  return (
    <Svg box={24} size={size} strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M10 8.5v4l3.5-2z" />
      <path d="M8 21h8M12 17v4" />
    </Svg>
  )
}

export function SelectIcon({ size = 22, strokeWidth = 1.75, className }: IconProps) {
  return (
    <Svg box={24} size={size} strokeWidth={strokeWidth} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </Svg>
  )
}

export function ArchiveIcon({ size = 22, strokeWidth = 1.75, className }: IconProps) {
  return (
    <Svg box={24} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 19h16" />
    </Svg>
  )
}

export function HelpIcon({ size = 22, strokeWidth = 1.75, className }: IconProps) {
  return (
    <Svg box={24} size={size} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.25c-.75.4-1.1.9-1.1 1.75" />
      <path d="M12 16.75v.01" />
    </Svg>
  )
}

export function PhotoIcon({ size = 20, strokeWidth = 1.5, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <circle cx="7" cy="8" r="1.2" />
      <path d="M3 15l4.5-4.5 3 3 2-2L17 15" />
    </Svg>
  )
}

export function DownloadIcon({ size = 20, strokeWidth = 1.5, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M10 3v10M6 9l4 4 4-4M3 15h14" />
    </Svg>
  )
}

export function FullscreenIcon({ size = 20, strokeWidth = 1.5, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
    </Svg>
  )
}

export function ExitFullscreenIcon({ size = 20, strokeWidth = 1.5, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M7 3v4H3M13 3v4h4M17 13h-4v4M7 17v-4H3" />
    </Svg>
  )
}

export function CloseIcon({ size = 20, strokeWidth = 1.5, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M4 4l12 12M16 4L4 16" />
    </Svg>
  )
}

export function ChevronLeftIcon({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M13 4l-6 6 6 6" />
    </Svg>
  )
}

export function ChevronRightIcon({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M7 4l6 6-6 6" />
    </Svg>
  )
}

export function LikeIcon({ size = 20, strokeWidth = 1.5, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M4 10.5l4 4 8-9" />
    </Svg>
  )
}

export function DislikeIcon({ size = 20, strokeWidth = 1.5, className }: IconProps) {
  return <CloseIcon size={size} strokeWidth={strokeWidth} className={className} />
}

export function CommentIcon({ size = 20, strokeWidth = 1.5, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
      <path d="M7 7h6M7 10h6M7 13h3" />
    </Svg>
  )
}

export function UndoIcon({ size = 18, strokeWidth = 1.5, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M4 4v5h5" />
      <path d="M4.6 13a6.5 6.5 0 1 0 1-8.4L4 9" />
    </Svg>
  )
}

export function ThumbnailsIcon({ size = 18, strokeWidth = 1.6, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
      <path d="M7 5v10M13 5v10" />
    </Svg>
  )
}

export function CopyLinkIcon({ size = 18, strokeWidth = 1.6, className }: IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4H12" />
    </Svg>
  )
}

export function PlayPauseIcon({
  playing,
  size = 18,
  className,
}: { playing: boolean } & Pick<IconProps, 'size' | 'className'>) {
  return (
    <Svg box={20} size={size} strokeWidth={1.6} fill="currentColor" className={className}>
      {playing ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" /> : <path d="M6 4l11 6-11 6z" />}
    </Svg>
  )
}

/** The speaker glyph: waves when sound is (or would be) on, a cross when it is off. */
export function SpeakerIcon({
  waves,
  size = 18,
  strokeWidth = 1.6,
  className,
}: { waves: boolean } & IconProps) {
  return (
    <Svg box={20} size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor" stroke="none" />
      {waves ? (
        <path d="M13 6.5c1.4 1 1.4 6 0 7M15.3 4.5c2.6 2 2.6 9.5 0 11.5" />
      ) : (
        <path d="M13.5 7.5l4 5M17.5 7.5l-4 5" />
      )}
    </Svg>
  )
}

export function MoreIcon({ size = 18, className }: Pick<IconProps, 'size' | 'className'>) {
  return (
    <Svg box={20} size={size} strokeWidth={1.6} fill="currentColor" stroke="none" className={className}>
      <circle cx="4.5" cy="10" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="15.5" cy="10" r="1.6" />
    </Svg>
  )
}

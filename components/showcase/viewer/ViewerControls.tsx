// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

const btn =
  'flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70'

function Icon({ children, label, onClick, pressed }: {
  children: ReactNode
  label: string
  onClick: () => void
  pressed?: boolean
}) {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick} className={btn} title={label}>
      {children}
    </button>
  )
}

/** A small floating pill, top-right — not a full-width bar, so the photo
 *  underneath (the whole point of the showcase) stays uninterrupted. Music
 *  has its own separate pill (`MusicControls`) so it's never confused with
 *  the slideshow's own play/pause here. */
export function ViewerControls({
  autoplay,
  onToggleAutoplay,
  onToggleThumbs,
  showFullscreen,
  onToggleFullscreen,
  onCopyLink,
  onDownload,
  showDownload,
  backHref,
  visible,
}: {
  autoplay: boolean
  onToggleAutoplay: () => void
  onToggleThumbs: () => void
  showFullscreen: boolean
  onToggleFullscreen: () => void
  onCopyLink: () => void
  onDownload: () => void
  showDownload: boolean
  backHref?: string
  visible: boolean
}) {
  const t = useTranslations('showcaseViewer.controls')
  return (
    <div
      className="sc-controls pointer-events-auto absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-full bg-black/40 p-1 backdrop-blur-sm transition-opacity duration-300 sm:right-3 sm:top-3"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {backHref && (
        <a href={backHref} className="flex h-10 items-center rounded-full px-3 text-sm text-white/90 hover:bg-white/10">
          {t('backToEditor')}
        </a>
      )}
      <Icon label={autoplay ? t('pauseSlideshow') : t('playSlideshow')} onClick={onToggleAutoplay} pressed={autoplay}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {autoplay ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" /> : <path d="M6 4l11 6-11 6z" />}
        </svg>
      </Icon>
      <Icon label={t('togglePageThumbnails')} onClick={onToggleThumbs}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
          <path d="M7 5v10M13 5v10" />
        </svg>
      </Icon>
      {showFullscreen && (
        <Icon label={t('toggleFullscreen')} onClick={onToggleFullscreen}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
          </svg>
        </Icon>
      )}
      <Icon label={t('copyLink')} onClick={onCopyLink}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="7" width="9" height="9" rx="1.5" />
          <path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4H12" />
        </svg>
      </Icon>
      {showDownload && (
        <Icon label={t('downloadAlbum')} onClick={onDownload}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3v10M6 9l4 4 4-4M3 15h14" />
          </svg>
        </Icon>
      )}
    </div>
  )
}

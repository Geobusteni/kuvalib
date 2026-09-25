// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { MusicControls, type MusicControlsProps } from './MusicControls'
import { ViewerLanguage } from './ViewerLanguage'

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

interface Action {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
  pressed?: boolean
}

const inlineBtn =
  'flex h-11 w-11 items-center justify-center rounded-full text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
const menuBtn =
  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm leading-snug text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70'

/**
 * The top bar. The left slot (`children`, the page indicator) takes whatever
 * room the right group leaves, so the two can never overlap. From `md` up the
 * secondary actions sit inline; below it they fold into a "More" disclosure so
 * the row never outgrows a 240px phone. Autoplay and music stay in reach at
 * every width. Space/Enter on any control belong to that control, so they are
 * kept from the viewer's window-level shortcuts (Space = play/pause).
 */
export function ViewerControls({
  autoplay,
  onToggleAutoplay,
  onToggleThumbs,
  thumbsOpen,
  showFullscreen,
  onToggleFullscreen,
  onCopyLink,
  onDownload,
  showDownload,
  music,
  backHref,
  visible,
  children,
}: {
  autoplay: boolean
  onToggleAutoplay: () => void
  onToggleThumbs: () => void
  thumbsOpen: boolean
  showFullscreen: boolean
  onToggleFullscreen: () => void
  onCopyLink: () => void
  onDownload: () => void
  showDownload: boolean
  music?: MusicControlsProps
  backHref?: string
  visible: boolean
  children?: ReactNode
}) {
  const t = useTranslations('showcaseViewer.controls')
  const tl = useTranslations('language')
  const [menuRequested, setOpen] = useState(false)
  const open = menuRequested && visible
  const groupRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLElement>('button, a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!groupRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const actions: Action[] = [
    {
      key: 'thumbs',
      label: t('togglePageThumbnails'),
      onClick: onToggleThumbs,
      pressed: thumbsOpen,
      icon: (
        <svg {...ICON_PROPS} className="shrink-0">
          <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
          <path d="M7 5v10M13 5v10" />
        </svg>
      ),
    },
    ...(showFullscreen
      ? [{
          key: 'fullscreen',
          label: t('toggleFullscreen'),
          onClick: onToggleFullscreen,
          icon: (
            <svg {...ICON_PROPS} className="shrink-0">
              <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
            </svg>
          ),
        }]
      : []),
    {
      key: 'copy',
      label: t('copyLink'),
      onClick: onCopyLink,
      icon: (
        <svg {...ICON_PROPS} className="shrink-0">
          <rect x="7" y="7" width="9" height="9" rx="1.5" />
          <path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4H12" />
        </svg>
      ),
    },
    ...(showDownload
      ? [{
          key: 'download',
          label: t('downloadAlbum'),
          onClick: onDownload,
          icon: (
            <svg {...ICON_PROPS} className="shrink-0">
              <path d="M10 3v10M6 9l4 4 4-4M3 15h14" />
            </svg>
          ),
        }]
      : []),
  ]

  return (
    <div
      className="sc-controls-bar pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 pb-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))]"
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="min-w-0 flex-1">{children}</div>

      <div ref={groupRef} className="relative shrink-0">
        <div
          className={`sc-controls flex items-center gap-0.5 rounded-full bg-black/55 p-0.5 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ opacity: visible ? 1 : 0 }}
        >
          {backHref && (
            <a
              href={backHref}
              className="hidden h-11 items-center rounded-full px-3 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:flex"
            >
              {t('backToEditor')}
            </a>
          )}
          <button
            type="button"
            aria-label={autoplay ? t('pauseSlideshow') : t('playSlideshow')}
            aria-pressed={autoplay}
            title={autoplay ? t('pauseSlideshow') : t('playSlideshow')}
            onClick={onToggleAutoplay}
            className={inlineBtn}
          >
            <svg {...ICON_PROPS} fill="currentColor">
              {autoplay ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" /> : <path d="M6 4l11 6-11 6z" />}
            </svg>
          </button>
          {music && <MusicControls {...music} className={inlineBtn} />}

          <div className="hidden items-center gap-0.5 md:flex">
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                aria-label={a.label}
                aria-pressed={a.pressed}
                title={a.label}
                onClick={a.onClick}
                className={inlineBtn}
              >
                {a.icon}
              </button>
            ))}
            <ViewerLanguage className="rounded-full text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70" />
          </div>

          <button
            ref={triggerRef}
            type="button"
            aria-label={t('more')}
            title={t('more')}
            aria-expanded={open}
            aria-controls="sc-controls-menu"
            onClick={() => setOpen((v) => !v)}
            className={`${inlineBtn} md:hidden`}
          >
            <svg {...ICON_PROPS} fill="currentColor" stroke="none">
              <circle cx="4.5" cy="10" r="1.6" />
              <circle cx="10" cy="10" r="1.6" />
              <circle cx="15.5" cy="10" r="1.6" />
            </svg>
          </button>
        </div>

        {open && (
          <div
            ref={panelRef}
            id="sc-controls-menu"
            className="pointer-events-auto absolute right-0 top-full mt-2 max-h-[calc(100dvh-5rem)] w-56 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl bg-zinc-900/95 p-1 shadow-xl backdrop-blur-sm md:hidden"
          >
            {backHref && (
              <a href={backHref} className={menuBtn}>
                {t('backToEditor')}
              </a>
            )}
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                aria-pressed={a.pressed}
                onClick={() => {
                  closeMenu(true)
                  a.onClick()
                }}
                className={menuBtn}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm text-white">
              <span>{tl('label')}</span>
              <ViewerLanguage className="rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

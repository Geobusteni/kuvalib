// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { LegendButton } from '@/components/ui/Legend'
import Tooltip from '@/components/ui/Tooltip'
import {
  CopyLinkIcon,
  GalleryIcon,
  DownloadIcon,
  FullscreenIcon,
  HelpIcon,
  MoreIcon,
  PlayPauseIcon,
  ThumbnailsIcon,
} from '@/components/ui/icons'
import { useLegend } from '@/hooks/useLegend'
import { MusicControls, type MusicControlsProps } from './MusicControls'
import ShowcaseLegend from './ShowcaseLegend'
import { ViewerLanguage } from './ViewerLanguage'

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
  galleryHref,
  visible,
  onLegendOpenChange,
  showPages,
  showDots,
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
  galleryHref: string
  visible: boolean
  onLegendOpenChange: (open: boolean) => void
  showPages: boolean
  showDots: boolean
  children?: ReactNode
}) {
  const t = useTranslations('showcaseViewer.controls')
  const tl = useTranslations('language')
  const tg = useTranslations('legend')
  const legendId = useId()
  const [menuRequested, setOpen] = useState(false)
  const open = menuRequested && visible
  const groupRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const legend = useLegend(triggerRef)
  const legendOpen = legend.open && visible
  useEffect(() => {
    onLegendOpenChange(legendOpen)
  }, [legendOpen, onLegendOpenChange])
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
      icon: <ThumbnailsIcon className="shrink-0" />,
    },
    ...(showFullscreen
      ? [{
          key: 'fullscreen',
          label: t('toggleFullscreen'),
          onClick: onToggleFullscreen,
          icon: <FullscreenIcon size={18} strokeWidth={1.6} className="shrink-0" />,
        }]
      : []),
    {
      key: 'copy',
      label: t('copyLink'),
      onClick: onCopyLink,
      icon: <CopyLinkIcon className="shrink-0" />,
    },
    ...(showDownload
      ? [{
          key: 'download',
          label: t('downloadAlbum'),
          onClick: onDownload,
          icon: <DownloadIcon size={18} strokeWidth={1.6} className="shrink-0" />,
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
          <Tooltip label={autoplay ? t('pauseSlideshow') : t('playSlideshow')}>
            <button
              type="button"
              aria-label={autoplay ? t('pauseSlideshow') : t('playSlideshow')}
              aria-pressed={autoplay}
              onClick={onToggleAutoplay}
              className={inlineBtn}
            >
              <PlayPauseIcon playing={autoplay} />
            </button>
          </Tooltip>
          {music && <MusicControls {...music} className={inlineBtn} />}

          <div className="hidden items-center gap-0.5 md:flex">
            <Tooltip label={t('gallery')}>
              <a href={galleryHref} aria-label={t('gallery')} className={inlineBtn}>
                <GalleryIcon className="shrink-0" />
              </a>
            </Tooltip>
            {actions.map((a) => (
              <Tooltip key={a.key} label={a.label}>
                <button
                  type="button"
                  aria-label={a.label}
                  aria-pressed={a.pressed}
                  onClick={a.onClick}
                  className={inlineBtn}
                >
                  {a.icon}
                </button>
              </Tooltip>
            ))}
            <Tooltip label={tg('open')} suppress={legendOpen}>
              <LegendButton
                open={legendOpen}
                controls={legendId}
                onClick={legend.toggle}
                buttonRef={legend.triggerRef}
                className={inlineBtn}
                iconSize={18}
                iconStrokeWidth={1.9}
              />
            </Tooltip>
            <ViewerLanguage
              tooltip
              className="rounded-full text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            />
          </div>

          <Tooltip label={t('more')} className="md:hidden" suppress={open}>
            <button
              ref={triggerRef}
              type="button"
              aria-label={t('more')}
              aria-expanded={open}
              aria-controls="sc-controls-menu"
              onClick={() => setOpen((v) => !v)}
              className={inlineBtn}
            >
              <MoreIcon />
            </button>
          </Tooltip>
        </div>

        {legendOpen && (
          <ShowcaseLegend
            id={legendId}
            panelRef={legend.panelRef}
            onClose={() => legend.close(true)}
            className="absolute right-0 top-full z-30 mt-2 max-h-[calc(100dvh-5rem-env(safe-area-inset-top))]"
            music={music ? (music.autoStarted ? 'autostarted' : 'manual') : null}
            showFullscreen={showFullscreen}
            showDownload={showDownload}
            showPages={showPages}
            showDots={showDots}
          />
        )}

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
            <a href={galleryHref} className={menuBtn}>
              <GalleryIcon className="shrink-0" />
              {t('gallery')}
            </a>
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
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                closeMenu(false)
                legend.show()
              }}
              className={menuBtn}
            >
              <HelpIcon size={18} strokeWidth={1.9} className="shrink-0" />
              {tg('open')}
            </button>
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

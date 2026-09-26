// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import ExpiryStrip from '@/components/ui/ExpiryStrip'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Block, HeadingLevel, PageSettings, TextSizePreset } from '@/lib/showcase-blocks'
import { collectPhotoIds } from '@/lib/showcase-blocks'
import { DEFAULT_DOT_COLORS, googleFontsHref, showcaseThemeVars } from '@/lib/showcase-theme'
import {
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  requestFullscreen,
} from '@/lib/fullscreen'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type {
  ShowcaseAnimation,
  ShowcaseBg,
  ShowcaseEventType,
} from '@/lib/generated/prisma/client'
import type { ShowcasePhoto } from '../photos-context'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'
import { PageStage } from './PageStage'
import { ViewerControls } from './ViewerControls'
import { ThumbnailRail } from './ThumbnailRail'
import { DotIndicator } from './DotIndicator'
import { MusicPlayer } from './MusicPlayer'
import { ShowcaseDownloadDialog } from './ShowcaseDownloadDialog'
import { useSlideshow } from './useSlideshow'

export interface ShowcaseViewerSettings {
  title: string
  eventType: ShowcaseEventType
  albumBg: ShowcaseBg
  animationStyle: ShowcaseAnimation
  autoplay: boolean
  autoplaySeconds: number
  playlistLoop: boolean
  musicAutoplay: boolean
  headingSizes: Partial<Record<HeadingLevel, number>>
  textSizes: Partial<Record<TextSizePreset, number>>
  headingFont: string | null
  textFont: string | null
  dotsEnabled: boolean
  dotColorActive: string | null
  dotColorInactive: string | null
  customCss: string
}

export interface ShowcaseViewerProps {
  projectId: string
  pages: { id: string; blocks: Block[]; settings: PageSettings }[]
  photos: ShowcasePhoto[]
  settings: ShowcaseViewerSettings
  trackIds: string[]
  galleryHref: string
  shareUrl: string
  downloadEnabled: boolean
  /** Whether this showcase's gallery access requires a password — the
   *  password itself is never known here, only that one exists, so the
   *  copy-link toast can remind whoever's sharing it to send that along. */
  passwordProtected: boolean
  /** Shown only inside the builder preview. */
  backHref?: string
  /** ISO timestamp when access expires, if it does — shown as a warning strip. */
  expiresAt?: string | null
}

const CONTROLS_HIDE_MS = 3000
const TOAST_MS = 3000
const TOAST_LONG_MS = 5000

export function ShowcaseViewer({
  projectId,
  pages,
  photos,
  settings,
  trackIds,
  galleryHref,
  shareUrl,
  downloadEnabled,
  passwordProtected,
  backHref,
  expiresAt,
}: ShowcaseViewerProps) {
  const t = useTranslations('showcaseViewer')
  const reducedMotion = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const total = Math.max(1, pages.length)

  const { current, phase, dir, playing, setPlaying, next, prev, goTo } = useSlideshow({
    total,
    autoplay: settings.autoplay,
    autoplaySeconds: settings.autoplaySeconds,
    reducedMotion,
  })

  // Music starts on its own whenever the slides do, or when the album's own
  // "Autoplay music" setting is on — in that mode there's only a mute
  // toggle. Otherwise it waits for the visitor to press play, via a
  // dedicated control (MusicControls) kept visually separate from the
  // slideshow's own play/pause so the two are never confused.
  const musicAutoStarts = settings.autoplay || settings.musicAutoplay
  const [musicPlaying, setMusicPlaying] = useState(musicAutoStarts)
  const [musicMuted, setMusicMuted] = useState(false)
  const [thumbsOpen, setThumbsOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [legendOpen, setLegendOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // `isFullscreenSupported()` reads `document`; the server snapshot is `false` so
  // the first client render matches, then React swaps in the real value without a
  // hydration error.
  const fullscreenSupported = useSyncExternalStore(
    () => () => {},
    () => isFullscreenSupported(),
    () => false,
  )
  const page = pages[Math.min(current, pages.length - 1)]
  const downloadPhotoIds = collectPhotoIds(pages.map((p) => ({ id: p.id, blocks: p.blocks })))
  const fontsHref = googleFontsHref([settings.headingFont, settings.textFont])

  const flashToast = useCallback((message: string, durationMs = TOAST_MS) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), durationMs)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  // Fullscreen: track the browser state; leave fullscreen when the viewer unmounts.
  useEffect(() => {
    const onChange = () => {
      const active = isFullscreenActive()
      setIsFs(active)
      if (!active) setControlsVisible(true)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      if (isFullscreenActive()) exitFullscreen().catch(() => {})
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (isFullscreenActive()) {
      exitFullscreen().catch(() => {})
    } else if (stageRef.current) {
      requestFullscreen(stageRef.current).catch(() => {})
    }
  }, [])

  // Auto-hide controls after inactivity while in fullscreen. Activity handlers
  // (event-driven) reveal them again; leaving fullscreen restores them above.
  useEffect(() => {
    if (!isFs || legendOpen) return
    const bump = () => {
      setControlsVisible(true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS)
    }
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS)
    window.addEventListener('mousemove', bump)
    window.addEventListener('keydown', bump)
    window.addEventListener('touchstart', bump)
    return () => {
      window.removeEventListener('mousemove', bump)
      window.removeEventListener('keydown', bump)
      window.removeEventListener('touchstart', bump)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [isFs, legendOpen])

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      switch (e.key) {
        case 'ArrowRight': next(); break
        case 'ArrowLeft': prev(); break
        case 'Home': goTo(0); break
        case 'End': goTo(total - 1); break
        case 'f': case 'F': if (fullscreenSupported) toggleFullscreen(); break
        case ' ': e.preventDefault(); setPlaying(!playing); break
        case 'd': case 'D': if (downloadEnabled) setDownloadOpen(true); break
        case 'Escape': if (isFullscreenActive()) exitFullscreen().catch(() => {}); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, goTo, total, toggleFullscreen, fullscreenSupported, playing, setPlaying, downloadEnabled])

  const copyLink = useCallback(() => {
    const absolute =
      typeof window !== 'undefined' ? new URL(shareUrl, window.location.origin).href : shareUrl
    navigator.clipboard?.writeText(absolute).then(
      () => {
        if (passwordProtected) {
          flashToast(t('toast.linkCopiedWithPassword'), TOAST_LONG_MS)
        } else {
          flashToast(t('toast.linkCopied'))
        }
      },
      () => flashToast(t('toast.copyFailed')),
    )
  }, [shareUrl, passwordProtected, flashToast, t])

  return (
    <div
      ref={stageRef}
      className="sc-viewer relative min-h-dvh w-full overflow-hidden bg-black"
      style={{
        ...showcaseThemeVars(settings.eventType, settings.albumBg),
        backgroundImage:
          'radial-gradient(ellipse at 50% 15%, color-mix(in oklab, var(--sc-accent) 22%, #000), #000 62%)',
      }}
      onClick={() => {
        if (isFs) setControlsVisible((v) => !v)
      }}
    >
      {/* Admin-authored, same trust level as the rest of the builder. */}
      {settings.customCss && <style dangerouslySetInnerHTML={{ __html: settings.customCss }} />}
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}

      <div aria-live="polite" className="sr-only">
        {t('stage.pageStatus', { current: current + 1, total })}
      </div>

      <ViewerControls
        autoplay={playing}
        onToggleAutoplay={() => setPlaying(!playing)}
        onToggleThumbs={() => setThumbsOpen((v) => !v)}
        thumbsOpen={thumbsOpen}
        showFullscreen={fullscreenSupported}
        onToggleFullscreen={toggleFullscreen}
        onCopyLink={copyLink}
        onDownload={() => setDownloadOpen(true)}
        showDownload={downloadEnabled}
        music={
          trackIds.length > 0
            ? {
                autoStarted: musicAutoStarts,
                playing: musicPlaying,
                onTogglePlaying: () => setMusicPlaying((v) => !v),
                muted: musicMuted,
                onToggleMuted: () => setMusicMuted((v) => !v),
              }
            : undefined
        }
        backHref={backHref}
        galleryHref={galleryHref}
        visible={controlsVisible}
        onLegendOpenChange={setLegendOpen}
        showPages={total > 1}
        showDots={settings.dotsEnabled && total > 1}
      >
        {settings.dotsEnabled && total > 1 && (
          <DotIndicator
            total={total}
            current={current}
            onSelect={goTo}
            activeColor={settings.dotColorActive ?? DEFAULT_DOT_COLORS.active}
            inactiveColor={settings.dotColorInactive ?? DEFAULT_DOT_COLORS.inactive}
          />
        )}
      </ViewerControls>

      <div
        className="sc-stagebox absolute inset-x-0 top-0 bottom-[var(--expiry-bar-h,0px)] z-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="sc-stage-bands" />
        {page && (
          <PageStage
            pageId={page.id}
            blocks={page.blocks}
            photos={photos}
            settings={page.settings}
            animationStyle={settings.animationStyle}
            phase={phase}
            dir={dir}
            galleryHref={galleryHref}
            onZipClick={downloadEnabled ? () => setDownloadOpen(true) : undefined}
            headingSizes={settings.headingSizes}
            textSizes={settings.textSizes}
            headingFont={settings.headingFont}
            textFont={settings.textFont}
          />
        )}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label={t('nav.previousPage')}
              onClick={prev}
              className="sc-nav-arrow absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 sm:left-3"
            >
              <ChevronLeftIcon size={18} />
            </button>
            <button
              type="button"
              aria-label={t('nav.nextPage')}
              onClick={next}
              className="sc-nav-arrow absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 sm:right-3"
            >
              <ChevronRightIcon size={18} />
            </button>
          </>
        )}
      </div>

      {thumbsOpen && (
        <ThumbnailRail
          pages={pages}
          photos={photos}
          current={current}
          onSelect={(i) => { goTo(i); setThumbsOpen(false) }}
          headingSizes={settings.headingSizes}
          textSizes={settings.textSizes}
          headingFont={settings.headingFont}
          textFont={settings.textFont}
        />
      )}

      <MusicPlayer
        projectId={projectId}
        trackIds={trackIds}
        loop={settings.playlistLoop}
        playing={musicPlaying}
        muted={musicMuted}
        onStopped={() => setMusicPlaying(false)}
      />

      {downloadOpen && (
        <ShowcaseDownloadDialog
          projectId={projectId}
          title={settings.title}
          photoIds={downloadPhotoIds}
          onClose={() => setDownloadOpen(false)}
        />
      )}

      <div
        role="status"
        className="pointer-events-none absolute right-[max(0.5rem,env(safe-area-inset-right))] top-[calc(max(0.5rem,env(safe-area-inset-top))+3.75rem)] z-20 w-72 max-w-[calc(100%-1rem)]"
      >
        {toast && (
          <p className="ml-auto w-fit max-w-full rounded-lg bg-white px-3 py-2 text-left text-xs font-medium leading-snug text-zinc-900 shadow-lg">
            {toast}
          </p>
        )}
      </div>

      {expiresAt && <ExpiryStrip expiresAt={expiresAt} />}
    </div>
  )
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Block, HeadingLevel, PageSettings, TextSizePreset } from '@/lib/showcase-blocks'
import { collectPhotoIds } from '@/lib/showcase-blocks'
import { DEFAULT_DOT_COLORS, showcaseThemeVars } from '@/lib/showcase-theme'
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
  headingSizes: Partial<Record<HeadingLevel, number>>
  textSizes: Partial<Record<TextSizePreset, number>>
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
  /** Shown only inside the builder preview. */
  backHref?: string
}

const CONTROLS_HIDE_MS = 3000

export function ShowcaseViewer({
  projectId,
  pages,
  photos,
  settings,
  trackIds,
  galleryHref,
  shareUrl,
  downloadEnabled,
  backHref,
}: ShowcaseViewerProps) {
  const reducedMotion = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const total = Math.max(1, pages.length)

  const { current, phase, dir, playing, setPlaying, next, prev, goTo } = useSlideshow({
    total,
    autoplay: settings.autoplay,
    autoplaySeconds: settings.autoplaySeconds,
    reducedMotion,
  })

  const [musicOn, setMusicOn] = useState(false)
  const [thumbsOpen, setThumbsOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const flashToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2200)
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
    if (!isFs) return
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
  }, [isFs])

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

  const share = useCallback(() => {
    const absolute =
      typeof window !== 'undefined' ? new URL(shareUrl, window.location.origin).href : shareUrl
    navigator.clipboard?.writeText(absolute).then(
      () => flashToast('Showcase link copied'),
      () => flashToast('Could not copy the link'),
    )
  }, [shareUrl, flashToast])

  return (
    <div
      ref={stageRef}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black"
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

      <div aria-live="polite" className="sr-only">
        Page {current + 1} of {total}
      </div>

      <ViewerControls
        hasMusic={trackIds.length > 0}
        musicOn={musicOn}
        onToggleMusic={() => setMusicOn((v) => !v)}
        autoplay={playing}
        onToggleAutoplay={() => setPlaying(!playing)}
        onToggleThumbs={() => setThumbsOpen((v) => !v)}
        showFullscreen={fullscreenSupported}
        onToggleFullscreen={toggleFullscreen}
        onShare={share}
        onDownload={() => setDownloadOpen(true)}
        showDownload={downloadEnabled}
        backHref={backHref}
        visible={controlsVisible}
      />

      {total > 1 && (
        <DotIndicator
          total={total}
          current={current}
          onSelect={goTo}
          activeColor={settings.dotColorActive ?? DEFAULT_DOT_COLORS.active}
          inactiveColor={settings.dotColorInactive ?? DEFAULT_DOT_COLORS.inactive}
        />
      )}

      <div className="relative w-full px-2 sm:px-4" onClick={(e) => e.stopPropagation()}>
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
          />
        )}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous page"
              onClick={prev}
              className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 sm:left-3"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4l-6 6 6 6" /></svg>
            </button>
            <button
              type="button"
              aria-label="Next page"
              onClick={next}
              className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 sm:right-3"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4l6 6-6 6" /></svg>
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
        />
      )}

      <MusicPlayer
        projectId={projectId}
        trackIds={trackIds}
        loop={settings.playlistLoop}
        playing={musicOn}
        onStopped={() => setMusicOn(false)}
      />

      {downloadOpen && (
        <ShowcaseDownloadDialog
          projectId={projectId}
          title={settings.title}
          photoIds={downloadPhotoIds}
          onClose={() => setDownloadOpen(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="pointer-events-none absolute right-2 top-14 z-20 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-lg sm:right-3 sm:top-16"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

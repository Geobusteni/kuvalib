// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGestures } from '@/hooks/useGestures'
import { useImageZoom } from '@/hooks/useImageZoom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useKeyboard } from '@/hooks/useKeyboard'
import DownloadOptionsDialog from '@/components/gallery/DownloadOptionsDialog'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  requestFullscreen,
} from '@/lib/fullscreen'
import ViewerControls from './ViewerControls'
import PhotoFeedbackBar from './PhotoFeedbackBar'
import FeedbackCommentDialog from '@/components/gallery/FeedbackCommentDialog'
import type { PhotoData, PhotoReaction } from '@/components/gallery/ImageTile'
import type { FeedbackType } from '@/lib/feedback-storage'

interface PhotoViewerProps {
  photos: PhotoData[]
  currentIndex: number
  title: string
  projectId: string
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onFirst: () => void
  onLast: () => void
  feedbackEnabled: boolean
  getFeedback: (photoId: string) => PhotoReaction
  submitFeedback: (photoId: string, type: FeedbackType, comment?: string) => Promise<void>
  resetFeedback: (photoId: string) => Promise<void>
}

const SETTLE_MS = 220
const SPRING_MS = 180
const DISMISS_FRACTION = 0.25
const DISMISS_VELOCITY = 0.5
const OPEN_VELOCITY = 0.4
const PANEL_CLOSED = 'translateY(calc(100% + var(--expiry-bar-h, 0px)))'

function expiryBarHeight() {
  return parseFloat(document.documentElement.style.getPropertyValue('--expiry-bar-h')) || 0
}

export default function PhotoViewer({
  photos,
  currentIndex,
  title,
  projectId,
  onClose,
  onPrev,
  onNext,
  onFirst,
  onLast,
  feedbackEnabled,
  getFeedback,
  submitFeedback,
  resetFeedback,
}: PhotoViewerProps) {
  const t = useTranslations('lightbox')
  const dialogRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const liftRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelCancelRef = useRef<HTMLButtonElement>(null)
  const panelHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(reducedMotion)
  useEffect(() => {
    reducedMotionRef.current = reducedMotion
  })
  // iOS Safari has no Fullscreen API for non-<video> elements. Rather than offer a
  // control with nothing behind it there, the control itself is hidden.
  const [fullscreenCapable] = useState(() => isFullscreenSupported())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [actionPanel, setActionPanel] = useState(false)
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
  const zoom = useImageZoom(containerRef)

  const photo = photos[currentIndex]

  // Zoom must not follow the viewer across photos.
  useEffect(() => {
    zoom.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setControlsVisible(true)
    if (isFullscreen) hideTimer.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [isFullscreen])

  // Focus the dialog itself rather than a control, so opening the viewer never
  // reveals a focus-styled button on top of the image.
  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const timer = hideTimer
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // The page keeps scrolling behind an open lightbox otherwise.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previous = {
      html: html.style.overflow,
      body: body.style.overflow,
      overscroll: html.style.overscrollBehavior,
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = previous.html
      body.style.overflow = previous.body
      html.style.overscrollBehavior = previous.overscroll
    }
  }, [])

  useEffect(() => {
    const timers = [panelHideTimer, closeTimer]
    return () => {
      timers.forEach((t) => {
        if (t.current) clearTimeout(t.current)
      })
    }
  }, [])

  // Closing the viewer must also leave the browser's fullscreen mode, otherwise
  // the page stays fullscreen with nothing in it.
  useEffect(() => {
    return () => {
      if (isFullscreenActive()) exitFullscreen().catch(() => {})
    }
  }, [])

  // Controls only auto-hide in fullscreen; leaving it restores them for good.
  useEffect(() => {
    if (!isFullscreen) return
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [isFullscreen])

  const exitFullscreenUI = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setControlsVisible(true)
    setIsFullscreen(false)
  }, [])

  // A fullscreen session can also end externally (browser back-gesture, system UI),
  // which only fires this DOM event, never our own toggle/Escape handling.
  useEffect(() => {
    if (!isFullscreen) return
    function onFsChange() {
      if (!isFullscreenActive()) exitFullscreenUI()
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [isFullscreen, exitFullscreenUI])

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen().catch(() => {})
      exitFullscreenUI()
      return
    }
    if (!fullscreenCapable) return
    requestFullscreen(document.documentElement)
      .then(() => setIsFullscreen(true))
      .catch(() => {})
  }, [isFullscreen, fullscreenCapable, exitFullscreenUI])

  // The lift and the sheet follow the finger through direct style writes, not state, so a drag
  // costs no re-render. Reduced motion keeps that direct tracking but settles instantly.
  const settleMs = (ms: number) => (reducedMotionRef.current ? 0 : ms)

  const applyLift = useCallback((dy: number, ms: number) => {
    const lift = liftRef.current
    const backdrop = backdropRef.current
    if (!lift || !backdrop) return
    const vh = window.innerHeight
    const progress = Math.min(1, dy / vh)
    const transition = ms > 0 ? `transform ${ms}ms ease-out, opacity ${ms}ms ease-out` : 'none'
    lift.style.transition = transition
    backdrop.style.transition = transition
    lift.style.transform = dy === 0 ? '' : `translateY(${dy}px) scale(${1 - progress * 0.08})`
    backdrop.style.opacity = String(Math.max(0, 1 - progress * 2.5))
  }, [])

  const applySheet = useCallback((offset: number | 'open' | 'closed', ms: number) => {
    const panel = panelRef.current
    if (!panel) return
    if (panelHideTimer.current) clearTimeout(panelHideTimer.current)
    panel.style.visibility = 'visible'
    panel.style.transition = ms > 0 ? `transform ${ms}ms ease-out` : 'none'
    panel.style.transform =
      offset === 'open'
        ? 'translateY(0)'
        : offset === 'closed'
          ? PANEL_CLOSED
          : `translateY(${offset}px)`
    if (offset === 'closed') {
      panelHideTimer.current = setTimeout(() => {
        panel.style.visibility = 'hidden'
      }, ms)
    }
  }, [])

  const openSheet = useCallback(() => {
    applySheet('open', settleMs(SETTLE_MS))
    setActionPanel(true)
     
  }, [applySheet])

  const closeSheet = useCallback(() => {
    applySheet('closed', settleMs(SETTLE_MS))
    setActionPanel(false)
     
  }, [applySheet])

  const dismissAnimated = useCallback(() => {
    const ms = settleMs(SETTLE_MS)
    if (ms === 0) {
      onClose()
      return
    }
    applyLift(window.innerHeight, ms)
    closeTimer.current = setTimeout(onClose, ms)
     
  }, [applyLift, onClose])

  // The sheet is a phone-only affordance (hidden from sm up), so there it must not react at all.
  const sheetAvailable = () => (panelRef.current?.offsetHeight ?? 0) > 0
  const sheetTravel = () => (panelRef.current?.offsetHeight ?? 0) + expiryBarHeight()

  const onVerticalDrag = useCallback(
    (dy: number) => {
      if (actionPanel && sheetAvailable()) {
        applySheet(Math.min(Math.max(0, dy), sheetTravel()), 0)
        return
      }
      if (dy > 0) {
        applySheet('closed', 0)
        applyLift(dy, 0)
      } else if (sheetAvailable()) {
        applyLift(0, 0)
        const travel = sheetTravel()
        applySheet(Math.max(0, travel + dy), 0)
      }
    },
    [actionPanel, applyLift, applySheet]
  )

  const onVerticalRelease = useCallback(
    ({ dy, vy }: { dy: number; vy: number }) => {
      const travel = sheetTravel()
      if (actionPanel && sheetAvailable()) {
        if (dy > travel * DISMISS_FRACTION || (vy > DISMISS_VELOCITY && dy > 10)) closeSheet()
        else applySheet('open', settleMs(SPRING_MS))
        return
      }
      if (dy > 0) {
        if (dy > window.innerHeight * DISMISS_FRACTION || (vy > DISMISS_VELOCITY && dy > 30)) {
          dismissAnimated()
        } else {
          applyLift(0, settleMs(SPRING_MS))
        }
        return
      }
      if (!sheetAvailable()) return
      if (-dy > travel * DISMISS_FRACTION || (vy < -OPEN_VELOCITY && dy < -30)) openSheet()
      else applySheet('closed', settleMs(SPRING_MS))
    },
    [actionPanel, applyLift, applySheet, closeSheet, dismissAnimated, openSheet]
  )

  const onVerticalCancel = useCallback(() => {
    applyLift(0, settleMs(SPRING_MS))
    applySheet(actionPanel ? 'open' : 'closed', settleMs(SPRING_MS))
     
  }, [actionPanel, applyLift, applySheet])

  // Focus moves into the sheet when it opens and back to the dialog when it closes.
  useEffect(() => {
    if (actionPanel) {
      panelCancelRef.current?.focus({ preventScroll: true })
    } else if (panelRef.current?.contains(document.activeElement)) {
      dialogRef.current?.focus({ preventScroll: true })
    }
  }, [actionPanel])

  const openDownload = useCallback(() => {
    setDownloadDialogOpen(true)
  }, [])

  const keyMap = useMemo(
    () => ({
      // Escape steps out of fullscreen first, then closes.
      Escape: () => {
        if (isFullscreen) {
          exitFullscreen().catch(() => {})
          exitFullscreenUI()
        } else if (actionPanel) {
          closeSheet()
        } else {
          onClose()
        }
      },
      ArrowLeft: () => {
        onPrev()
        resetHideTimer()
      },
      ArrowRight: () => {
        onNext()
        resetHideTimer()
      },
      Home: () => {
        onFirst()
        resetHideTimer()
      },
      End: () => {
        onLast()
        resetHideTimer()
      },
      f: toggleFullscreen,
      F: toggleFullscreen,
      d: openDownload,
      D: openDownload,
    }),
    [
      onClose,
      onPrev,
      onNext,
      onFirst,
      onLast,
      resetHideTimer,
      toggleFullscreen,
      isFullscreen,
      exitFullscreenUI,
      actionPanel,
      closeSheet,
      openDownload,
    ]
  )

  useKeyboard(keyMap, !downloadDialogOpen && !commentDialogOpen)

  useGestures(
    containerRef,
    {
      onSwipeLeft: onNext,
      onSwipeRight: onPrev,
      // Vertical drags drive the lift-to-close and the action sheet; while the sheet is open a
      // downward drag closes it rather than the whole viewer.
      onVerticalDrag,
      onVerticalRelease,
      onVerticalCancel,
      onTap: () => {
        if (actionPanel) {
          closeSheet()
          return
        }
        setControlsVisible((v) => !v)
        if (isFullscreen) resetHideTimer()
      },
      onDoubleTap: zoom.onDoubleTap,
      onPinchStart: zoom.onPinchStart,
      onPinchMove: zoom.onPinchMove,
      onPinchEnd: zoom.onPinchEnd,
      onPanMove: zoom.onPanMove,
      onPanEnd: zoom.onPanEnd,
    },
    { zoomed: zoom.isZoomed() }
  )

  const trapFocus = useFocusTrap(dialogRef)

  if (!photo) return null

  const reaction = feedbackEnabled ? getFeedback(photo.id) : null
  const reactionRing =
    reaction === 'LIKE'
      ? 'ring-2 ring-green-500'
      : reaction === 'DISLIKE'
        ? 'ring-2 ring-red-500'
        : reaction === 'COMMENT'
          ? 'ring-2 ring-yellow-400'
          : ''

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal
      tabIndex={-1}
      aria-label={t('dialogLabel', { index: currentIndex + 1, total: photos.length })}
      className="fixed inset-0 z-50 overscroll-contain focus:outline-none"
      onMouseMove={resetHideTimer}
      onKeyDown={trapFocus}
    >
      {/* Black backdrop drawn well past the bottom edge: while a mobile browser's toolbar is
          collapsing or expanding, the fixed box can briefly be shorter than the screen, and this
          keeps the gallery from showing through that gap. */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -bottom-[100vh] bg-black"
      />

      <div ref={liftRef} className="absolute inset-0">
        <div
          ref={containerRef}
          className="absolute inset-0 flex touch-none select-none items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.id}
            src={photo.thumbLg}
            alt={t('photoAlt', { index: currentIndex + 1, total: photos.length })}
            className={`max-h-full max-w-full object-contain ${reactionRing}`}
            style={{
              userSelect: 'none',
              pointerEvents: 'none',
              transform: `translate(${zoom.zoom.x}px, ${zoom.zoom.y}px) scale(${zoom.zoom.scale})`,
              transition: zoom.zoom.snapping ? 'transform 200ms' : 'none',
            }}
            draggable={false}
          />
        </div>

        <ViewerControls
          currentIndex={currentIndex}
          total={photos.length}
          fullscreenCapable={fullscreenCapable}
          isFullscreen={isFullscreen}
          controlsVisible={controlsVisible}
          onPrev={onPrev}
          onNext={onNext}
          onClose={onClose}
          onToggleFullscreen={toggleFullscreen}
        />

        {feedbackEnabled && !actionPanel && (
          <PhotoFeedbackBar
            reaction={reaction}
            controlsVisible={controlsVisible}
            onLike={() => submitFeedback(photo.id, 'LIKE')}
            onDislike={() => submitFeedback(photo.id, 'DISLIKE')}
            onComment={() => setCommentDialogOpen(true)}
            onReset={() => resetFeedback(photo.id)}
          />
        )}
      </div>

      <div
        ref={panelRef}
        inert={!actionPanel}
        aria-hidden={!actionPanel}
        className="absolute inset-x-0 bottom-[var(--expiry-bar-h,0px)] flex flex-col gap-2 rounded-t-2xl bg-zinc-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:hidden"
        style={{ transform: PANEL_CLOSED, visibility: 'hidden' }}
      >
        <button
          ref={panelCancelRef}
          onClick={() => {
            closeSheet()
            openDownload()
          }}
          className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-medium text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {t('download')}
        </button>
        <button
          onClick={closeSheet}
          className="h-12 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {t('cancel')}
        </button>
      </div>

      {downloadDialogOpen && (
        <DownloadOptionsDialog
          photos={[photo]}
          projectId={projectId}
          title={title}
          onClose={() => setDownloadDialogOpen(false)}
        />
      )}

      {commentDialogOpen && (
        <FeedbackCommentDialog
          onSubmit={async (comment) => {
            await submitFeedback(photo.id, 'COMMENT', comment)
            setCommentDialogOpen(false)
          }}
          onClose={() => setCommentDialogOpen(false)}
        />
      )}
    </div>
  )
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGestures } from '@/hooks/useGestures'
import { useImageZoom } from '@/hooks/useImageZoom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useKeyboard } from '@/hooks/useKeyboard'
import {
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  requestFullscreen,
} from '@/lib/fullscreen'
import ViewerControls from './ViewerControls'
import PhotoFeedbackBar from './PhotoFeedbackBar'
import DownloadOptionsDialog from '@/components/gallery/DownloadOptionsDialog'
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
  const dialogRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // iOS Safari has no Fullscreen API for non-<video> elements. Rather than offer a
  // control with nothing behind it there, the control itself is hidden.
  const [fullscreenCapable] = useState(() => isFullscreenSupported())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [actionPanel, setActionPanel] = useState(false)
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
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
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
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
      openDownload,
      resetHideTimer,
      toggleFullscreen,
      isFullscreen,
      exitFullscreenUI,
    ]
  )

  useKeyboard(keyMap, !downloadDialogOpen && !commentDialogOpen)

  useGestures(
    containerRef,
    {
      onSwipeLeft: onNext,
      onSwipeRight: onPrev,
      // Swipe down closes the action sheet if it's open (mirroring the swipe
      // up that opened it) rather than always closing the whole viewer — the
      // two gestures would otherwise fight over the same screen region.
      onSwipeDown: () => (actionPanel ? setActionPanel(false) : onClose()),
      onSwipeUp: () => setActionPanel((v) => !v),
      onTap: () => {
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
      aria-label={`Photo viewer: image ${currentIndex + 1} of ${photos.length}`}
      className="fixed inset-0 z-50 flex h-dvh items-center justify-center bg-black focus:outline-none"
      onMouseMove={resetHideTimer}
      onKeyDown={trapFocus}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 flex touch-none select-none items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.thumbLg}
          alt={`Photo ${currentIndex + 1} of ${photos.length}`}
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
        canDownload={Boolean(photo.original)}
        fullscreenCapable={fullscreenCapable}
        isFullscreen={isFullscreen}
        controlsVisible={controlsVisible}
        onPrev={onPrev}
        onNext={onNext}
        onClose={onClose}
        onToggleFullscreen={toggleFullscreen}
        onOpenDownload={openDownload}
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

      {actionPanel && photo.original && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-t-2xl bg-zinc-900 p-6 sm:hidden">
          <button
            onClick={() => {
              setActionPanel(false)
              openDownload()
            }}
            className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-medium text-zinc-900"
          >
            Download image
          </button>
          <button
            onClick={() => setActionPanel(false)}
            className="h-12 rounded-xl text-sm font-medium text-zinc-400"
          >
            Cancel
          </button>
        </div>
      )}

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

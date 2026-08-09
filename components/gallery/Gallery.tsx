// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import Toolbar from './Toolbar'
import ImageTile, { type PhotoData } from './ImageTile'
import PhotoFeedbackRow from './PhotoFeedbackRow'
import FeedbackCommentDialog from './FeedbackCommentDialog'
import DownloadOptionsDialog from './DownloadOptionsDialog'
import PhotoViewer from '@/components/lightbox/PhotoViewer'
import { usePhotoFeedback } from '@/hooks/usePhotoFeedback'

type GalleryState =
  | { mode: 'gallery' }
  | { mode: 'selection'; selected: Set<string> }
  | { mode: 'viewer'; currentIndex: number }

type Action =
  | { type: 'ENTER_SELECTION' }
  | { type: 'EXIT_SELECTION' }
  | { type: 'TOGGLE_SELECT'; id: string }
  | { type: 'OPEN_VIEWER'; index: number }
  | { type: 'CLOSE_VIEWER' }
  | { type: 'GO_TO'; index: number }

function reducer(state: GalleryState, action: Action): GalleryState {
  switch (action.type) {
    case 'ENTER_SELECTION':
      if (state.mode === 'viewer') return state
      return { mode: 'selection', selected: new Set() }

    case 'EXIT_SELECTION':
      return { mode: 'gallery' }

    case 'TOGGLE_SELECT': {
      if (state.mode !== 'selection') return state
      const selected = new Set(state.selected)
      if (selected.has(action.id)) selected.delete(action.id)
      else selected.add(action.id)
      return { mode: 'selection', selected }
    }

    // The lightbox stays shut during selection; that rule lives here, not in the UI.
    case 'OPEN_VIEWER':
      if (state.mode === 'selection') return state
      return { mode: 'viewer', currentIndex: action.index }

    case 'GO_TO':
      if (state.mode !== 'viewer') return state
      return { mode: 'viewer', currentIndex: action.index }

    case 'CLOSE_VIEWER':
      return { mode: 'gallery' }

    default:
      return state
  }
}

interface GalleryProps {
  photos: PhotoData[]
  title: string
  projectId: string
  /** True only when the photographer uploaded an archive for this gallery. */
  hasArchive: boolean
  /** Whether clients may like/dislike/comment on photos in this gallery. */
  feedbackEnabled: boolean
  /** ISO timestamp; bumped by the admin's "reset feedback" action. */
  feedbackResetAt: string
}

export default function Gallery({
  photos,
  title,
  projectId,
  hasArchive,
  feedbackEnabled,
  feedbackResetAt,
}: GalleryProps) {
  const [state, dispatch] = useReducer(reducer, { mode: 'gallery' })
  const openedFrom = useRef<HTMLElement | null>(null)
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
  const downloadTriggerRef = useRef<HTMLElement | null>(null)
  const feedback = usePhotoFeedback(projectId, feedbackEnabled, feedbackResetAt)
  const [commentTarget, setCommentTarget] = useState<string | null>(null)
  const commentTriggerRef = useRef<HTMLElement | null>(null)

  const lastIndex = photos.length - 1
  const selected = state.mode === 'selection' ? state.selected : null
  const archiveUrl = hasArchive ? `/api/projects/${projectId}/download` : null

  const openViewer = useCallback((index: number) => {
    openedFrom.current = document.querySelector<HTMLElement>(
      `[data-photo-index="${index}"]`
    )
    dispatch({ type: 'OPEN_VIEWER', index })
  }, [])

  const closeViewer = useCallback(() => {
    dispatch({ type: 'CLOSE_VIEWER' })
    // Focus must land back on the tile that opened the viewer.
    requestAnimationFrame(() => openedFrom.current?.focus())
  }, [])

  const goTo = useCallback(
    (index: number) => {
      dispatch({ type: 'GO_TO', index: Math.max(0, Math.min(lastIndex, index)) })
    },
    [lastIndex]
  )

  const openDownloadDialog = useCallback(() => {
    if (!selected || selected.size === 0) return
    downloadTriggerRef.current = document.activeElement as HTMLElement
    setDownloadDialogOpen(true)
  }, [selected])

  const closeDownloadDialog = useCallback(() => {
    setDownloadDialogOpen(false)
    requestAnimationFrame(() => downloadTriggerRef.current?.focus())
  }, [])

  const openCommentDialog = useCallback((photoId: string) => {
    commentTriggerRef.current = document.activeElement as HTMLElement
    setCommentTarget(photoId)
  }, [])

  const closeCommentDialog = useCallback(() => {
    setCommentTarget(null)
    requestAnimationFrame(() => commentTriggerRef.current?.focus())
  }, [])

  // Gallery-level shortcuts. The viewer and the download/comment dialogs each
  // register their own while open.
  useEffect(() => {
    if (state.mode === 'viewer' || downloadDialogOpen || commentTarget) return

    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 's':
        case 'S':
          dispatch({ type: state.mode === 'gallery' ? 'ENTER_SELECTION' : 'EXIT_SELECTION' })
          break
        case 'Escape':
          if (state.mode === 'selection') dispatch({ type: 'EXIT_SELECTION' })
          break
        case 'd':
        case 'D':
          if (state.mode === 'selection') openDownloadDialog()
          break
        case 'z':
        case 'Z':
          if (state.mode === 'gallery' && archiveUrl) window.location.href = archiveUrl
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state.mode, downloadDialogOpen, commentTarget, openDownloadDialog, archiveUrl])

  return (
    <>
      <Toolbar
        title={title}
        mode={state.mode === 'selection' ? 'selection' : 'gallery'}
        selectedCount={selected?.size ?? 0}
        onEnterSelection={() => dispatch({ type: 'ENTER_SELECTION' })}
        onExitSelection={() => dispatch({ type: 'EXIT_SELECTION' })}
        onOpenDownloadOptions={openDownloadDialog}
      />

      {/* The grid sits in an 80%-wide column, so photos are never flush to the
          viewport edges, with the breathing room above and below. */}
      <main className="mx-auto w-[90%] max-w-[1600px] pb-16 pt-24 sm:w-[80%]">
        <h1 className="sr-only">{title}</h1>
        <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
          {photos.map((photo, index) => (
            <div key={photo.id} className="mb-2 break-inside-avoid">
              <ImageTile
                photo={photo}
                index={index}
                total={photos.length}
                mode={state.mode === 'selection' ? 'selection' : 'gallery'}
                selected={selected?.has(photo.id) ?? false}
                reaction={feedbackEnabled ? feedback.reactionFor(photo.id) : null}
                onOpen={openViewer}
                onToggleSelect={(id) => dispatch({ type: 'TOGGLE_SELECT', id })}
              />
              {feedbackEnabled && state.mode !== 'selection' && (
                <PhotoFeedbackRow
                  reaction={feedback.reactionFor(photo.id)}
                  onLike={() => feedback.submit(photo.id, 'LIKE')}
                  onDislike={() => feedback.submit(photo.id, 'DISLIKE')}
                  onComment={() => openCommentDialog(photo.id)}
                  onReset={() => feedback.resetOne(photo.id)}
                />
              )}
            </div>
          ))}
        </div>

        {archiveUrl && state.mode === 'gallery' && (
          <div className="mt-8 flex justify-center">
            <a
              href={archiveUrl}
              download
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Download All (Original ZIP)
            </a>
          </div>
        )}
      </main>

      {state.mode === 'viewer' && (
        <PhotoViewer
          photos={photos}
          currentIndex={state.currentIndex}
          title={title}
          projectId={projectId}
          onClose={closeViewer}
          onPrev={() => goTo(state.currentIndex - 1)}
          onNext={() => goTo(state.currentIndex + 1)}
          onFirst={() => goTo(0)}
          onLast={() => goTo(lastIndex)}
          feedbackEnabled={feedbackEnabled}
          getFeedback={feedback.reactionFor}
          submitFeedback={feedback.submit}
          resetFeedback={feedback.resetOne}
        />
      )}

      {downloadDialogOpen && state.mode === 'selection' && (
        <DownloadOptionsDialog
          photos={photos.filter((p) => state.selected.has(p.id))}
          projectId={projectId}
          title={title}
          onClose={closeDownloadDialog}
        />
      )}

      {commentTarget && (
        <FeedbackCommentDialog
          onSubmit={async (comment) => {
            await feedback.submit(commentTarget, 'COMMENT', comment)
            closeCommentDialog()
          }}
          onClose={closeCommentDialog}
        />
      )}

      <div aria-live="polite" className="sr-only">
        {selected && selected.size > 0
          ? `${selected.size} photo${selected.size === 1 ? '' : 's'} selected`
          : null}
      </div>
    </>
  )
}

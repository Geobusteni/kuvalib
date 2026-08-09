// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useKeyboard } from '@/hooks/useKeyboard'

interface FeedbackPhotoSummary {
  photoId: string
  originalName: string
  thumbSm: string
  thumbLg: string
  likes: number
  dislikes: number
  comments: { id: string; comment: string; createdAt: string }[]
}

export default function FeedbackPanel({
  projectId,
  enabled,
  summaries,
}: {
  projectId: string
  enabled: boolean
  summaries: FeedbackPhotoSummary[]
}) {
  const router = useRouter()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)

  async function handleReset() {
    setResetting(true)
    await fetch(`/api/projects/${projectId}/feedback`, { method: 'DELETE' })
    setResetting(false)
    setConfirmingReset(false)
    router.refresh()
  }

  if (!enabled) {
    return (
      <p className="text-sm text-zinc-500">
        Feedback is off for this gallery. Turn it on in Settings below to let clients like,
        dislike, and comment on photos.
      </p>
    )
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      likes: acc.likes + s.likes,
      dislikes: acc.dislikes + s.dislikes,
      comments: acc.comments + s.comments.length,
    }),
    { likes: 0, dislikes: 0, comments: 0 }
  )
  const withFeedback = summaries.filter((s) => s.likes + s.dislikes + s.comments.length > 0)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">
          {totals.likes} likes · {totals.dislikes} dislikes · {totals.comments} comments
        </p>

        {!confirmingReset ? (
          <button
            onClick={() => setConfirmingReset(true)}
            disabled={totals.likes + totals.dislikes + totals.comments === 0}
            className="h-9 shrink-0 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            Reset feedback
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This deletes every like, dislike, and comment, and lets clients react again. This
              cannot be undone.
            </p>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {resetting ? 'Resetting…' : 'Yes, reset'}
            </button>
            <button
              onClick={() => setConfirmingReset(false)}
              disabled={resetting}
              className="h-9 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {withFeedback.length === 0 ? (
        <p className="text-sm text-zinc-500">No feedback yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {withFeedback.map((s) => {
            const hasComments = s.comments.length > 0
            const isExpanded = expanded === s.photoId
            return (
              <li key={s.photoId} className="py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPreview({ url: s.thumbLg, name: s.originalName })}
                    aria-label={`View a larger version of ${s.originalName}`}
                    className="shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.thumbSm} alt="" className="h-10 w-10 rounded object-cover" />
                  </button>

                  {hasComments ? (
                    <button
                      onClick={() => setExpanded((id) => (id === s.photoId ? null : s.photoId))}
                      aria-expanded={isExpanded}
                      className="flex flex-1 items-center gap-2 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                    >
                      <span className="flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">
                        {s.originalName}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {s.likes} likes · {s.dislikes} dislikes · {s.comments.length} comments
                      </span>
                      <ChevronIcon expanded={isExpanded} />
                    </button>
                  ) : (
                    <div className="flex flex-1 items-center gap-2">
                      <span className="flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">
                        {s.originalName}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {s.likes} likes · {s.dislikes} dislikes · 0 comments
                      </span>
                    </div>
                  )}
                </div>
                {isExpanded && hasComments && (
                  <ul className="mt-2 flex flex-col gap-1 pl-13 text-sm text-zinc-600 dark:text-zinc-400">
                    {s.comments.map((c) => (
                      <li key={c.id}>
                        &ldquo;{c.comment}&rdquo; —{' '}
                        <time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleString()}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {preview && (
        <PhotoPreviewDialog url={preview.url} name={preview.name} onClose={() => setPreview(null)} />
      )}
    </div>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 text-zinc-400 transition-transform duration-150 [.reduce-motion_&]:transition-none ${
        expanded ? 'rotate-180' : ''
      }`}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function PhotoPreviewDialog({
  url,
  name,
  onClose,
}: {
  url: string
  name: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const trapFocus = useFocusTrap(dialogRef)

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true })
  }, [])

  useKeyboard({ Escape: onClose }, true)

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal
      aria-label={name}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 focus:outline-none"
      onKeyDown={trapFocus}
      onClick={onClose}
    >
      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

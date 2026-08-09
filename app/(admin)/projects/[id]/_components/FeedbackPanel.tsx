// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FeedbackPhotoSummary {
  photoId: string
  originalName: string
  thumbSm: string
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
          {withFeedback.map((s) => (
            <li key={s.photoId} className="py-3">
              <button
                onClick={() => setExpanded((id) => (id === s.photoId ? null : s.photoId))}
                aria-expanded={expanded === s.photoId}
                className="flex w-full items-center gap-3 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumbSm} alt="" className="h-10 w-10 rounded object-cover" />
                <span className="flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">
                  {s.originalName}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {s.likes} likes · {s.dislikes} dislikes · {s.comments.length} comments
                </span>
              </button>
              {expanded === s.photoId && s.comments.length > 0 && (
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
          ))}
        </ul>
      )}
    </div>
  )
}

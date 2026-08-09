// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useKeyboard } from '@/hooks/useKeyboard'

type Phase = { kind: 'writing' } | { kind: 'submitting' } | { kind: 'error'; message: string }

const MAX_LENGTH = 2000

interface FeedbackCommentDialogProps {
  onSubmit: (comment: string) => Promise<void>
  onClose: () => void
}

export default function FeedbackCommentDialog({ onSubmit, onClose }: FeedbackCommentDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const trapFocus = useFocusTrap(dialogRef)
  const [phase, setPhase] = useState<Phase>({ kind: 'writing' })
  const [text, setText] = useState('')
  const busy = phase.kind === 'submitting'

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true })
  }, [])

  const keyMap = useMemo(
    () => ({
      Escape: () => {
        if (!busy) onClose()
      },
    }),
    [busy, onClose]
  )
  useKeyboard(keyMap, true)

  async function handleSubmit() {
    if (!text.trim()) return
    setPhase({ kind: 'submitting' })
    try {
      await onSubmit(text.trim())
    } catch {
      setPhase({ kind: 'error', message: 'Could not send your comment. Please try again.' })
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal
      aria-labelledby="feedback-comment-heading"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 focus:outline-none"
      onKeyDown={trapFocus}
    >
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 text-white">
        <h2 id="feedback-comment-heading" className="text-base font-semibold">
          Add a comment
        </h2>
        <p className="mt-1 text-xs text-zinc-400">You can only comment once on this photo.</p>

        <label htmlFor="feedback-comment-text" className="sr-only">
          Your comment
        </label>
        <textarea
          id="feedback-comment-text"
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_LENGTH}
          disabled={busy}
          rows={4}
          className="mt-3 w-full rounded-xl border border-white/20 bg-black/30 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50"
        />

        {phase.kind === 'error' && (
          <p role="alert" className="mt-2 text-sm text-red-400">
            {phase.message}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={busy || !text.trim()}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-white text-sm font-medium text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40"
          >
            {busy ? 'Sending…' : 'Send comment'}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

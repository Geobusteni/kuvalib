// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  clearFeedback,
  getVisitorId,
  loadFeedbackState,
  recordFeedback,
  type FeedbackType,
  type LocalFeedbackState,
} from '@/lib/feedback-storage'

export function usePhotoFeedback(projectId: string, enabled: boolean, resetAt: string) {
  const [visitorId] = useState(() => (enabled ? getVisitorId() : ''))
  const [state, setState] = useState<LocalFeedbackState>({ resetAt, photos: {} })

  // Deliberately NOT read in the state initializer above: the server has no
  // localStorage, so it always renders "no reaction" for every photo. Reading
  // it synchronously on the client's first render made that first render
  // disagree with the server-rendered HTML, and React's hydration mismatch
  // recovery keeps the server's (stale, unreacted) DOM rather than patching
  // it — so a visitor's own past reactions silently vanished from the grid on
  // every reload. Populating state in an effect (client-only, post-hydration)
  // keeps the first render identical on both sides and avoids that entirely.
  useEffect(() => {
    if (!enabled) return
    // Syncing from localStorage (an external, client-only store) into React
    // state once after mount is exactly the hydration-mismatch escape hatch
    // this effect exists for — the one-time extra render it causes here is
    // the intended trade-off, not the cascading-render pattern this rule
    // otherwise warns about.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadFeedbackState(projectId, resetAt))
    // Intentionally runs once per mount — projectId/resetAt/enabled are fixed
    // for the lifetime of a given gallery page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reactionFor = useCallback(
    (photoId: string): FeedbackType | null => state.photos[photoId]?.type ?? null,
    [state]
  )

  const submit = useCallback(
    async (photoId: string, type: FeedbackType, comment?: string) => {
      const res = await fetch(`/api/projects/${projectId}/photos/${photoId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, type, comment }),
      })
      // A 409 (e.g. a race from a second tab) is treated as success — the lock
      // the UI is about to record locally already matches server reality.
      if (!res.ok && res.status !== 409) throw new Error('Could not submit feedback')
      setState(recordFeedback(projectId, resetAt, photoId, type))
    },
    [projectId, visitorId, resetAt]
  )

  // Undoes this visitor's own reaction on one photo — deletes their DB row
  // first, and only clears the local cache once that's confirmed, so a failed
  // request can't leave the UI believing it's unreacted while the server
  // still has the old row (which would then just 409 on the next attempt).
  const resetOne = useCallback(
    async (photoId: string) => {
      const res = await fetch(`/api/projects/${projectId}/photos/${photoId}/feedback`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      })
      if (!res.ok) throw new Error('Could not reset feedback')
      setState(clearFeedback(projectId, resetAt, photoId))
    },
    [projectId, visitorId, resetAt]
  )

  return { reactionFor, submit, resetOne }
}

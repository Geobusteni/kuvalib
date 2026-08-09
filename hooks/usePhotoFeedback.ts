// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useState } from 'react'
import {
  getVisitorId,
  loadFeedbackState,
  recordFeedback,
  type FeedbackType,
  type LocalFeedbackState,
} from '@/lib/feedback-storage'

export function usePhotoFeedback(projectId: string, enabled: boolean, resetAt: string) {
  const [visitorId] = useState(() => (enabled ? getVisitorId() : ''))
  const [state, setState] = useState<LocalFeedbackState>(() =>
    enabled ? loadFeedbackState(projectId, resetAt) : { resetAt, photos: {} }
  )

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

  return { reactionFor, submit }
}

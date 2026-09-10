// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

export type FeedbackType = 'LIKE' | 'DISLIKE' | 'COMMENT'

const VISITOR_ID_KEY = 'kuvalib:visitorId'
const FEEDBACK_KEY_PREFIX = 'kuvalib:feedback:'

// One id per browser, reused across every project it visits — not per-project.
export function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(VISITOR_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(VISITOR_ID_KEY, id)
  }
  return id
}

export interface LocalFeedbackState {
  /** The project's feedbackResetAt this cache was recorded against. */
  resetAt: string
  photos: Record<string, { type: FeedbackType }>
}

function storageKey(projectId: string) {
  return `${FEEDBACK_KEY_PREFIX}${projectId}`
}

// Discards the cache if it was recorded against an older feedbackResetAt than
// the one the server just sent — exactly what an admin reset produces, and
// what lets a visitor who already reacted before the reset react again after.
export function loadFeedbackState(projectId: string, serverResetAt: string): LocalFeedbackState {
  if (typeof window === 'undefined') return { resetAt: serverResetAt, photos: {} }
  const raw = localStorage.getItem(storageKey(projectId))
  if (!raw) return { resetAt: serverResetAt, photos: {} }
  try {
    const parsed = JSON.parse(raw) as LocalFeedbackState
    return parsed.resetAt === serverResetAt ? parsed : { resetAt: serverResetAt, photos: {} }
  } catch {
    return { resetAt: serverResetAt, photos: {} }
  }
}

export function recordFeedback(
  projectId: string,
  serverResetAt: string,
  photoId: string,
  type: FeedbackType
): LocalFeedbackState {
  const state = loadFeedbackState(projectId, serverResetAt)
  const next: LocalFeedbackState = {
    resetAt: serverResetAt,
    photos: { ...state.photos, [photoId]: { type } },
  }
  localStorage.setItem(storageKey(projectId), JSON.stringify(next))
  return next
}

// The client-facing "undo my reaction" counterpart to recordFeedback — used
// after the server confirms this visitor's own row for the photo is gone, so
// the two stay in sync rather than the browser remembering a reaction the
// database no longer has.
export function clearFeedback(
  projectId: string,
  serverResetAt: string,
  photoId: string
): LocalFeedbackState {
  const state = loadFeedbackState(projectId, serverResetAt)
  const photos = { ...state.photos }
  delete photos[photoId]
  const next: LocalFeedbackState = { resetAt: serverResetAt, photos }
  localStorage.setItem(storageKey(projectId), JSON.stringify(next))
  return next
}

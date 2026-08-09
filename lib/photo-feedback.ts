// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import prisma from './prisma'
import type { FeedbackType } from './generated/prisma/client'

export type { FeedbackType }

export interface CreateFeedbackData {
  photoId: string
  visitorId: string
  type: FeedbackType
  comment?: string | null
}

// Throws Prisma's P2002 (unique constraint on photoId+visitorId) if this
// visitor already has a row for this photo — the route layer maps that to 409.
export async function createFeedback(data: CreateFeedbackData) {
  return prisma.photoFeedback.create({
    data: {
      photoId: data.photoId,
      visitorId: data.visitorId,
      type: data.type,
      comment: data.type === 'COMMENT' ? (data.comment ?? null) : null,
    },
  })
}

// Idempotent: at most one row can match, per the (photoId, visitorId) unique
// constraint, and deleting zero rows (already reset, or never reacted) is not
// an error — the client's own "reset" button should never fail just because
// it was already clicked once.
export async function deleteVisitorFeedback(photoId: string, visitorId: string): Promise<void> {
  await prisma.photoFeedback.deleteMany({ where: { photoId, visitorId } })
}

export interface PhotoFeedbackSummary {
  likes: number
  dislikes: number
  comments: { id: string; comment: string; createdAt: Date }[]
}

// Grouped in application code, not three groupBy queries, since the admin view
// needs the actual comment text next to the counts, not just totals.
export async function summarizeProjectFeedback(
  projectId: string
): Promise<Map<string, PhotoFeedbackSummary>> {
  const rows = await prisma.photoFeedback.findMany({
    where: { photo: { projectId } },
    orderBy: { createdAt: 'desc' },
  })

  const summary = new Map<string, PhotoFeedbackSummary>()
  for (const row of rows) {
    const entry = summary.get(row.photoId) ?? { likes: 0, dislikes: 0, comments: [] }
    if (row.type === 'LIKE') entry.likes++
    else if (row.type === 'DISLIKE') entry.dislikes++
    else if (row.comment) entry.comments.push({ id: row.id, comment: row.comment, createdAt: row.createdAt })
    summary.set(row.photoId, entry)
  }
  return summary
}

// Wipes every feedback row for the project's photos and bumps feedbackResetAt
// in one transaction, so a crash mid-reset can't leave stale rows paired with a
// bumped epoch, or wiped rows paired with a stale epoch.
export async function resetProjectFeedback(projectId: string): Promise<void> {
  await prisma.$transaction([
    prisma.photoFeedback.deleteMany({ where: { photo: { projectId } } }),
    prisma.project.update({ where: { id: projectId }, data: { feedbackResetAt: new Date() } }),
  ])
}

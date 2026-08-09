// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { getProject, getPhoto } from '@/lib/projects'
import { createFeedback } from '@/lib/photo-feedback'
import { checkRateLimit } from '@/lib/rate-limit'
import { Prisma } from '@/lib/generated/prisma/client'

type Ctx = { params: Promise<{ id: string; photoId: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id, photoId } = await ctx.params

  if (!(await verifyGalleryAccess(id))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!project.feedbackEnabled) {
    return Response.json({ error: 'Feedback is not enabled for this gallery' }, { status: 403 })
  }

  const photo = await getPhoto(photoId)
  if (!photo || photo.projectId !== id) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(`feedback:${ip}:${id}`).allowed) {
    return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const { visitorId, type, comment } = body
  if (typeof visitorId !== 'string' || !visitorId || visitorId.length > 100) {
    return Response.json({ error: 'A visitor id is required' }, { status: 400 })
  }
  if (type !== 'LIKE' && type !== 'DISLIKE' && type !== 'COMMENT') {
    return Response.json({ error: 'Invalid feedback type' }, { status: 400 })
  }

  let trimmedComment: string | null = null
  if (type === 'COMMENT') {
    if (typeof comment !== 'string' || !comment.trim()) {
      return Response.json({ error: 'A comment is required' }, { status: 400 })
    }
    if (comment.trim().length > 2000) {
      return Response.json({ error: 'Comment is too long' }, { status: 400 })
    }
    trimmedComment = comment.trim()
  }

  try {
    const feedback = await createFeedback({ photoId, visitorId, type, comment: trimmedComment })
    return Response.json({ ok: true, id: feedback.id })
  } catch (err) {
    // Same (photo, visitor) already has a row — the client's own localStorage
    // should have prevented this, but a second tab, a cleared cache, or a
    // replayed request can still reach here, and it must not slip through.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return Response.json({ error: 'You have already given feedback on this photo' }, { status: 409 })
    }
    throw err
  }
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import { getProject } from '@/lib/projects'
import {
  grantGalleryAccess,
  verifyEmailAccess,
  verifyPasswordAccess,
} from '@/lib/gallery-auth'
import { checkRateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(`gallery-auth:${ip}:${id}`).allowed) {
    return Response.json({ error: 'too_many_attempts' }, { status: 429 })
  }

  const project = await getProject(id)
  if (!project) return Response.json({ error: 'not_found' }, { status: 404 })

  const body = await request.json().catch(() => null)

  if (project.accessType === 'EMAIL') {
    if (typeof body?.email !== 'string' || !body.email.includes('@')) {
      return Response.json({ error: 'valid_email_required' }, { status: 400 })
    }
    if (!(await verifyEmailAccess(id, body.email))) {
      return Response.json({ error: 'email_no_access' }, { status: 401 })
    }
    await grantGalleryAccess(id, body.email.toLowerCase().trim())
    return Response.json({ ok: true })
  }

  if (typeof body?.password !== 'string' || !body.password) {
    return Response.json({ error: 'password_required' }, { status: 400 })
  }
  if (!project.password || !verifyPasswordAccess(body.password, project.password)) {
    return Response.json({ error: 'incorrect_password' }, { status: 401 })
  }

  await grantGalleryAccess(id)
  return Response.json({ ok: true })
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import { getProject } from '@/lib/projects'
import { resetProjectFeedback } from '@/lib/photo-feedback'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  await resetProjectFeedback(id)
  return Response.json({ ok: true })
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import { getProject } from '@/lib/projects'
import { ARCHIVE_CHUNK_SIZE, UploadError, createUpload } from '@/lib/archive-upload'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!(await getProject(id))) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (typeof body?.name !== 'string' || typeof body?.size !== 'number') {
    return Response.json({ error: 'name and size required' }, { status: 400 })
  }

  try {
    const uploadId = await createUpload(id, body.name, body.size)
    return Response.json({ uploadId, chunkSize: ARCHIVE_CHUNK_SIZE })
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('[archive] could not start upload:', error)
    return Response.json({ error: 'Could not start the upload' }, { status: 500 })
  }
}

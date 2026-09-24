// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import { getProject, setArchive } from '@/lib/projects'
import { UploadError, completeUpload, isUploadId } from '@/lib/archive-upload'

type Ctx = { params: Promise<{ id: string; uploadId: string }> }

export async function POST(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id, uploadId } = await ctx.params
  if (!isUploadId(uploadId) || !(await getProject(id))) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { name, size } = await completeUpload(id, uploadId)
    await setArchive(id, { archiveName: name, archiveSize: size })
    return Response.json({ ok: true, archiveName: name, archiveSize: size })
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json(
        { error: error.message, received: error.received },
        { status: error.status }
      )
    }
    console.error('[archive] completing upload failed:', error)
    return Response.json({ error: 'Could not store the archive' }, { status: 500 })
  }
}

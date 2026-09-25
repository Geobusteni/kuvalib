// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import { getProject, setArchive } from '@/lib/projects'
import { deleteArchiveFile } from '@/lib/storage'

type Ctx = { params: Promise<{ id: string }> }

// Uploading goes through ./uploads (chunked); this route only removes the archive.
export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  if (!(await getProject(id))) {
    return Response.json({ error: 'archive_not_found' }, { status: 404 })
  }

  await deleteArchiveFile(id)
  await setArchive(id, null)
  return Response.json({ ok: true })
}

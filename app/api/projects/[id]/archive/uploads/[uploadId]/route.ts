// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { Readable } from 'stream'
import type { ReadableStream as NodeReadableStream } from 'stream/web'
import { requireAdmin } from '@/lib/auth'
import { getProject } from '@/lib/projects'
import {
  UploadError,
  abortUpload,
  appendChunk,
  getReceived,
  isUploadId,
} from '@/lib/archive-upload'

type Ctx = { params: Promise<{ id: string; uploadId: string }> }

function failure(error: unknown) {
  if (error instanceof UploadError) {
    return Response.json(
      { error: error.message, received: error.received },
      { status: error.status }
    )
  }
  console.error('[archive] chunk upload failed:', error)
  return Response.json({ error: 'archive_chunk_failed' }, { status: 500 })
}

async function resolve(ctx: Ctx) {
  await requireAdmin()
  const { id, uploadId } = await ctx.params
  if (!isUploadId(uploadId) || !(await getProject(id))) return null
  return { id, uploadId }
}

export async function GET(_req: Request, ctx: Ctx) {
  const target = await resolve(ctx)
  if (!target) return Response.json({ error: 'archive_not_found' }, { status: 404 })
  try {
    return Response.json({ received: await getReceived(target.id, target.uploadId) })
  } catch (error) {
    return failure(error)
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const target = await resolve(ctx)
  if (!target) return Response.json({ error: 'archive_not_found' }, { status: 404 })
  if (!request.body) return Response.json({ error: 'archive_empty_chunk' }, { status: 400 })

  const offset = Number(new URL(request.url).searchParams.get('offset'))
  try {
    const received = await appendChunk(
      target.id,
      target.uploadId,
      offset,
      Readable.fromWeb(request.body as unknown as NodeReadableStream)
    )
    return Response.json({ received })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const target = await resolve(ctx)
  if (!target) return Response.json({ error: 'archive_not_found' }, { status: 404 })
  await abortUpload(target.id, target.uploadId)
  return Response.json({ ok: true })
}

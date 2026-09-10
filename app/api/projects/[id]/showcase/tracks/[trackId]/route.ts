// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import { requireAdmin } from '@/lib/auth'
import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { deleteTrack, getShowcaseByProject, getTrack } from '@/lib/showcase'
import { audioPath, deleteAudioFile } from '@/lib/storage'
import { audioMimeForFilename } from '@/lib/audio'

type Ctx = { params: Promise<{ id: string; trackId: string }> }

async function resolveTrack(projectId: string, trackId: string) {
  const showcase = await getShowcaseByProject(projectId)
  if (!showcase) return null
  const track = await getTrack(trackId)
  if (!track || track.showcaseId !== showcase.id) return null
  return track
}

/**
 * Streams one track. Gated by the same gallery access as the showcase itself, so
 * a link that has not passed the password/email gate cannot pull the audio. An
 * unguarded `/api/uploads` path is deliberately not used (that route is
 * thumbnails only — see the decisions log).
 */
export async function GET(request: NextRequest, ctx: Ctx) {
  const { id, trackId } = await ctx.params

  if (!(await verifyGalleryAccess(id))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const track = await resolveTrack(id, trackId)
  if (!track) return Response.json({ error: 'Not found' }, { status: 404 })

  let buffer: Buffer
  try {
    buffer = await fs.readFile(audioPath(id, track.filename))
  } catch {
    return Response.json({ error: 'The track file is missing' }, { status: 404 })
  }

  const total = buffer.length
  const contentType = audioMimeForFilename(track.filename)
  const range = request.headers.get('range')

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0
      const end = match[2] ? parseInt(match[2], 10) : total - 1
      if (start <= end && start < total) {
        const slice = buffer.subarray(start, Math.min(end, total - 1) + 1)
        return new Response(new Uint8Array(slice), {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Range': `bytes ${start}-${start + slice.length - 1}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(slice.length),
            'Cache-Control': 'private, max-age=3600',
          },
        })
      }
    }
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(total),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id, trackId } = await ctx.params

  const track = await resolveTrack(id, trackId)
  if (!track) return Response.json({ error: 'Not found' }, { status: 404 })

  await deleteAudioFile(id, track.filename).catch(() => {})
  await deleteTrack(track.id)
  return Response.json({ ok: true })
}

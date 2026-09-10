// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { requireAdmin } from '@/lib/auth'
import { getShowcaseByProject, insertTrack, listTracks } from '@/lib/showcase'
import { audioPath, ensureProjectDirs } from '@/lib/storage'
import { sniffAudio } from '@/lib/audio'

type Ctx = { params: Promise<{ id: string }> }

const MAX_TRACKS = 12
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB per track

export async function GET(_req: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const showcase = await getShowcaseByProject(id)
  if (!showcase) return Response.json({ error: 'Not found' }, { status: 404 })

  const tracks = await listTracks(showcase.id)
  return Response.json({
    tracks: tracks.map((t) => ({ id: t.id, originalName: t.originalName, size: t.size })),
  })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const showcase = await getShowcaseByProject(id)
  if (!showcase) return Response.json({ error: 'Not found' }, { status: 404 })

  if ((await listTracks(showcase.id)).length >= MAX_TRACKS) {
    return Response.json({ error: `A showcase can hold at most ${MAX_TRACKS} tracks` }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'That audio file is larger than 20 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = sniffAudio(buffer)
  if (!ext) {
    return Response.json({ error: 'Upload an MP3, M4A, OGG or WAV file' }, { status: 400 })
  }

  const filename = `${crypto.randomUUID()}.${ext}`
  try {
    await ensureProjectDirs(id)
    await fs.writeFile(audioPath(id, filename), buffer)
    const track = await insertTrack({
      showcaseId: showcase.id,
      filename,
      originalName: path.basename(file.name) || `track.${ext}`,
      size: buffer.length,
    })
    return Response.json({
      ok: true,
      track: { id: track.id, originalName: track.originalName, size: track.size },
    })
  } catch (error) {
    console.error('[showcase-tracks] upload failed:', error)
    await fs.rm(audioPath(id, filename), { force: true }).catch(() => {})
    return Response.json({ error: 'Could not store the track' }, { status: 500 })
  }
}

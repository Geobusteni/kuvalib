// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { getPhoto, getProject, incrementDownload } from '@/lib/projects'
import { archivePath, photosDir } from '@/lib/storage'
import path from 'path'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { parseRange } from '@/lib/http-range'
import { zipSync } from 'fflate'

type Ctx = { params: Promise<{ id: string }> }

function attachmentName(name: string): string {
  // Strip quotes and control characters that would break the header.
  return name.replace(/["\r\n]/g, '').trim() || 'download.zip'
}

/**
 * The full archive is whatever the admin uploaded — it is never assembled from the
 * photos. Only a client's own selection is zipped on the fly.
 */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project) return Response.json({ error: 'download_not_found' }, { status: 404 })
  if (!project.zipEnabled || !project.archiveName) {
    return Response.json({ error: 'download_no_archive' }, { status: 404 })
  }
  if (!(await verifyGalleryAccess(id))) {
    return Response.json({ error: 'download_unauthorized' }, { status: 401 })
  }

  let size: number
  try {
    size = (await fs.stat(archivePath(id))).size
  } catch {
    return Response.json({ error: 'download_archive_missing' }, { status: 404 })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${attachmentName(project.archiveName)}"`,
    'Accept-Ranges': 'bytes',
  }

  const rangeHeader = request.headers.get('range')
  let start = 0
  let end = size - 1
  let status = 200
  if (rangeHeader) {
    const range = parseRange(rangeHeader, size)
    if (!range) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    ;({ start, end } = range)
    status = 206
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`
  }
  headers['Content-Length'] = String(end - start + 1)

  // A resumed or probing range request that skips the start is not a new download.
  if (start === 0) await incrementDownload(id)

  const stream = createReadStream(archivePath(id), { start, end })
  return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers })
}

/** Zips exactly the photos the client selected, under their original names. */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project) return Response.json({ error: 'download_not_found' }, { status: 404 })
  if (!(await verifyGalleryAccess(id))) {
    return Response.json({ error: 'download_unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.photoIds) || body.photoIds.length === 0) {
    return Response.json({ error: 'download_photo_ids_required' }, { status: 400 })
  }

  const dir = photosDir(id)
  const files: Record<string, Uint8Array> = {}
  const used = new Set<string>()

  for (const photoId of body.photoIds as string[]) {
    const photo = await getPhoto(photoId)
    if (!photo || photo.projectId !== id) continue

    // Two photos can share an original name only across projects, but guard anyway.
    let entryName = photo.originalName
    if (used.has(entryName)) {
      const ext = path.extname(entryName)
      entryName = `${path.basename(entryName, ext)}-${photo.id.slice(0, 6)}${ext}`
    }
    used.add(entryName)

    try {
      files[entryName] = new Uint8Array(await fs.readFile(path.join(dir, photo.filename)))
    } catch {
      // A missing file should not fail the whole download.
      continue
    }
  }

  if (Object.keys(files).length === 0) {
    return Response.json({ error: 'download_no_valid_photos' }, { status: 400 })
  }

  const data = zipSync(files, { level: 1 })
  await incrementDownload(id)

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${attachmentName(`${project.title}-selection.zip`)}"`,
      'Content-Length': String(data.length),
    },
  })
}

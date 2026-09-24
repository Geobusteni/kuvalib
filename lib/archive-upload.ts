// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'
import { archiveDir, archivePath, ensureProjectDirs } from './storage'

export const ARCHIVE_CHUNK_SIZE = 32 * 1024 * 1024
const STALE_MS = 24 * 60 * 60 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class UploadError extends Error {
  constructor(
    message: string,
    public status: number,
    public received?: number
  ) {
    super(message)
  }
}

export function isUploadId(value: string): boolean {
  return UUID_RE.test(value)
}

function partPath(projectId: string, uploadId: string): string {
  return path.join(archiveDir(projectId), `${uploadId}.part`)
}

function metaPath(projectId: string, uploadId: string): string {
  return path.join(archiveDir(projectId), `${uploadId}.json`)
}

async function purgeStale(projectId: string): Promise<void> {
  const dir = archiveDir(projectId)
  const entries = await fs.readdir(dir).catch(() => [] as string[])
  const cutoff = Date.now() - STALE_MS
  await Promise.all(
    entries
      .filter((name) => name.endsWith('.part') || name.endsWith('.json'))
      .map(async (name) => {
        const file = path.join(dir, name)
        const stat = await fs.stat(file).catch(() => null)
        if (stat && stat.mtimeMs < cutoff) await fs.rm(file, { force: true })
      })
  )
}

export async function createUpload(
  projectId: string,
  name: string,
  size: number
): Promise<string> {
  if (!Number.isSafeInteger(size) || size <= 0) throw new UploadError('Invalid file size', 400)
  await ensureProjectDirs(projectId)
  await purgeStale(projectId)
  const uploadId = crypto.randomUUID()
  await fs.writeFile(partPath(projectId, uploadId), '')
  await fs.writeFile(
    metaPath(projectId, uploadId),
    JSON.stringify({ name: path.basename(name) || 'archive.zip', size })
  )
  return uploadId
}

async function readSession(projectId: string, uploadId: string) {
  try {
    const meta = JSON.parse(await fs.readFile(metaPath(projectId, uploadId), 'utf8')) as {
      name: string
      size: number
    }
    const { size: received } = await fs.stat(partPath(projectId, uploadId))
    return { ...meta, received }
  } catch {
    throw new UploadError('Upload not found', 404)
  }
}

export async function getReceived(projectId: string, uploadId: string): Promise<number> {
  return (await readSession(projectId, uploadId)).received
}

/**
 * Streams one chunk to the temp file. The chunk must start exactly where the file ends;
 * a chunk that starts earlier was already stored, so it is drained and acknowledged.
 */
export async function appendChunk(
  projectId: string,
  uploadId: string,
  offset: number,
  body: Readable
): Promise<number> {
  const session = await readSession(projectId, uploadId)
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > session.received) {
    body.resume()
    throw new UploadError('Offset does not match received bytes', 409, session.received)
  }
  if (offset < session.received) {
    body.resume()
    return session.received
  }

  const limit = Math.min(ARCHIVE_CHUNK_SIZE, session.size - offset)
  let written = 0
  const file = partPath(projectId, uploadId)
  try {
    await pipeline(
      body,
      async function* (source: AsyncIterable<Buffer>) {
        for await (const chunk of source) {
          written += chunk.length
          if (written > limit) throw new UploadError('Chunk is larger than allowed', 413)
          yield chunk
        }
      },
      createWriteStream(file, { flags: 'r+', start: offset })
    )
  } catch (error) {
    await fs.truncate(file, offset).catch(() => {})
    throw error
  }
  return offset + written
}

export async function completeUpload(
  projectId: string,
  uploadId: string
): Promise<{ name: string; size: number }> {
  const session = await readSession(projectId, uploadId)
  if (session.received !== session.size) {
    throw new UploadError('Upload is incomplete', 409, session.received)
  }
  const file = partPath(projectId, uploadId)
  const handle = await fs.open(file, 'r')
  const head = Buffer.alloc(4)
  try {
    await handle.read(head, 0, 4, 0)
  } finally {
    await handle.close()
  }
  const isZip = head[0] === 0x50 && head[1] === 0x4b && [0x03, 0x05, 0x07].includes(head[2])
  if (!isZip) {
    await abortUpload(projectId, uploadId)
    throw new UploadError('The archive must be a ZIP file', 400)
  }
  await fs.rename(file, archivePath(projectId))
  await fs.rm(metaPath(projectId, uploadId), { force: true })
  return { name: session.name, size: session.size }
}

export async function abortUpload(projectId: string, uploadId: string): Promise<void> {
  await Promise.all([
    fs.rm(partPath(projectId, uploadId), { force: true }),
    fs.rm(metaPath(projectId, uploadId), { force: true }),
  ])
}

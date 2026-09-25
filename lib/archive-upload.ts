// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'
import { archiveDir, archivePath, ensureProjectDirs } from './storage'

export const ARCHIVE_CHUNK_SIZE = 32 * 1024 * 1024
const MAX_NAME_LENGTH = 255
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class UploadError extends Error {
  // `message` is a stable error code the client translates, not display text.
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

function tempPath(projectId: string, uploadId: string): string {
  return path.join(archiveDir(projectId), `${uploadId}.done`)
}

// Sessions currently being written or completed. Kuvalib runs as one process, so an
// in-memory set is enough to keep two requests off the same file.
const busy = new Set<string>()

async function clearSessions(projectId: string): Promise<void> {
  const dir = archiveDir(projectId)
  const entries = await fs.readdir(dir).catch(() => [] as string[])
  await Promise.all(
    entries
      .filter((name) => /\.(part|json|done)$/.test(name))
      .map((name) => fs.rm(path.join(dir, name), { force: true }))
  )
}

export async function createUpload(
  projectId: string,
  name: string,
  size: number
): Promise<string> {
  if (!Number.isSafeInteger(size) || size <= 0) throw new UploadError('archive_invalid_size', 400)
  if (name.length > MAX_NAME_LENGTH) throw new UploadError('archive_name_too_long', 400)
  await ensureProjectDirs(projectId)
  // One session per project: starting a new upload discards the previous one's files.
  await clearSessions(projectId)
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
    throw new UploadError('archive_upload_not_found', 404)
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
  if (
    busy.has(uploadId) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > session.received
  ) {
    body.resume()
    throw new UploadError('archive_offset_mismatch', 409, session.received)
  }
  if (offset < session.received) {
    body.resume()
    return session.received
  }

  busy.add(uploadId)
  const limit = Math.min(ARCHIVE_CHUNK_SIZE, session.size - offset)
  let written = 0
  const file = partPath(projectId, uploadId)
  try {
    await pipeline(
      body,
      async function* (source: AsyncIterable<Buffer>) {
        for await (const chunk of source) {
          written += chunk.length
          if (written > limit) throw new UploadError('archive_chunk_too_large', 413)
          yield chunk
        }
      },
      createWriteStream(file, { flags: 'r+', start: offset })
    )
  } catch (error) {
    await fs.truncate(file, offset).catch(() => {})
    throw error
  } finally {
    busy.delete(uploadId)
  }
  return offset + written
}

/**
 * Validates the finished upload, records it through `register`, then swaps it in as the
 * live archive. The live file is only replaced after `register` succeeds, so a database
 * failure leaves the previous archive and its record untouched and the upload retryable.
 */
export async function completeUpload(
  projectId: string,
  uploadId: string,
  register: (archive: { name: string; size: number }) => Promise<void>
): Promise<{ name: string; size: number }> {
  const session = await readSession(projectId, uploadId)
  if (busy.has(uploadId) || session.received !== session.size) {
    throw new UploadError('archive_incomplete', 409, session.received)
  }
  busy.add(uploadId)
  try {
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
      throw new UploadError('archive_not_zip', 400)
    }

    const temp = tempPath(projectId, uploadId)
    await fs.rename(file, temp)
    const archive = { name: session.name, size: session.size }
    try {
      await register(archive)
    } catch (error) {
      await fs.rename(temp, file).catch(() => {})
      throw error
    }
    await fs.rename(temp, archivePath(projectId))
    await fs.rm(metaPath(projectId, uploadId), { force: true })
    return archive
  } finally {
    busy.delete(uploadId)
  }
}

export async function abortUpload(projectId: string, uploadId: string): Promise<void> {
  await Promise.all([
    fs.rm(partPath(projectId, uploadId), { force: true }),
    fs.rm(metaPath(projectId, uploadId), { force: true }),
  ])
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { sendWithProgress } from './xhr-upload'

const MAX_ATTEMPTS = 3
const BACKOFF_MS = 1000

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// An expired admin session redirects API calls to the HTML login page, so a body that is
// not JSON means "signed out".
async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json()
  } catch {
    throw new Error('unauthorized')
  }
}

async function errorFrom(res: Response, fallbackCode: string): Promise<Error> {
  const data = await readJson(res)
  return new Error(typeof data.error === 'string' ? data.error : fallbackCode)
}

/**
 * Errors thrown here carry a stable error code as their message; callers translate it.
 * Sends a large file to the archive endpoint in sequential chunks. After a failed chunk
 * the server is asked how many bytes it really has, so a retry resumes from there. Only
 * network errors and 5xx responses are retried; any other server error is final. A failed
 * upload asks the server to drop its partial file.
 */
export async function uploadArchive(
  projectId: string,
  file: File,
  onProgress: (sent: number) => void
): Promise<void> {
  const base = `/api/projects/${projectId}/archive/uploads`

  const created = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size }),
  })
  if (!created.ok) throw await errorFrom(created, 'archive_start_failed')
  const { uploadId, chunkSize } = (await readJson(created)) as {
    uploadId: string
    chunkSize: number
  }
  const target = `${base}/${uploadId}`

  try {
    await sendChunks(target, file, chunkSize, onProgress)
  } catch (error) {
    await fetch(target, { method: 'DELETE' }).catch(() => {})
    throw error
  }
}

async function sendChunks(
  target: string,
  file: File,
  chunkSize: number,
  onProgress: (sent: number) => void
): Promise<void> {
  async function received(): Promise<number> {
    const res = await fetch(target)
    if (!res.ok) throw await errorFrom(res, 'archive_resume_failed')
    return ((await readJson(res)) as { received: number }).received
  }

  let offset = 0
  let failures = 0
  onProgress(0)
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    const result = await sendWithProgress(
      'PUT',
      `${target}?offset=${offset}`,
      chunk,
      ({ loaded }) => onProgress(Math.min(file.size, offset + Math.min(loaded, chunk.size)))
    ).catch(() => null)

    if (result?.ok) {
      if (typeof result.data.received !== 'number') throw new Error('unauthorized')
      offset = result.data.received
      failures = 0
      onProgress(offset)
      continue
    }
    if (result && result.status !== 409 && result.status < 500) {
      throw new Error(result.data.error ?? 'archive_upload_failed')
    }

    failures++
    if (failures >= MAX_ATTEMPTS) {
      throw new Error(result?.data.error ?? 'archive_connection_failed')
    }
    await wait(BACKOFF_MS * 2 ** (failures - 1))
    offset = await received().catch(() => offset)
    onProgress(offset)
  }

  const done = await fetch(`${target}/complete`, { method: 'POST' })
  if (!done.ok) throw await errorFrom(done, 'archive_store_failed')
}

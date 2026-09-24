// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { sendWithProgress } from './xhr-upload'

const MAX_ATTEMPTS = 3
const BACKOFF_MS = 1000

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function errorFrom(res: Response, fallback: string): Promise<Error> {
  const data = await res.json().catch(() => ({}))
  return new Error(data.error ?? fallback)
}

/**
 * Sends a large file to the archive endpoint in sequential chunks. After a failed chunk
 * the server is asked how many bytes it really has, so a retry resumes from there.
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
  if (!created.ok) throw await errorFrom(created, 'Could not start the upload')
  const { uploadId, chunkSize } = (await created.json()) as { uploadId: string; chunkSize: number }
  const target = `${base}/${uploadId}`

  async function received(): Promise<number> {
    const res = await fetch(target)
    if (!res.ok) throw await errorFrom(res, 'Could not resume the upload')
    return (await res.json()).received
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
      offset = result.data.received
      failures = 0
      onProgress(offset)
      continue
    }
    if (result && result.status !== 409 && result.status < 500) {
      throw new Error(result.data.error ?? 'Upload failed')
    }

    failures++
    if (failures >= MAX_ATTEMPTS) throw new Error('The connection kept failing. Try again.')
    await wait(BACKOFF_MS * 2 ** (failures - 1))
    offset = await received()
    onProgress(offset)
  }

  const done = await fetch(`${target}/complete`, { method: 'POST' })
  if (!done.ok) throw await errorFrom(done, 'Could not store the archive')
}

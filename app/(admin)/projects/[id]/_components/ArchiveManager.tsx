// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import ProgressBar from '@/components/ui/ProgressBar'
import { useFormatBytes } from '@/hooks/useFormatBytes'
import { useErrorMessage } from '@/hooks/useErrorMessage'
import { uploadArchive } from '@/lib/chunked-upload'

interface Props {
  projectId: string
  archiveName: string | null
  archiveSize: number | null
}

export default function ArchiveManager({ projectId, archiveName, archiveSize }: Props) {
  const router = useRouter()
  const t = useTranslations('upload.archive')
  const format = useFormatter()
  const formatBytes = useFormatBytes()
  const msg = useErrorMessage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [upload, setUpload] = useState<{ sent: number; total: number } | null>(null)

  async function send(file: File) {
    setError(null)
    setBusy(true)
    setUpload({ sent: 0, total: file.size })
    try {
      await uploadArchive(projectId, file, (sent) => setUpload({ sent, total: file.size }))
      router.refresh()
    } catch (e) {
      setError(msg(e instanceof Error ? e.message : null))
    } finally {
      setBusy(false)
      setUpload(null)
    }
  }

  async function remove() {
    setBusy(true)
    await fetch(`/api/projects/${projectId}/archive`, { method: 'DELETE' })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {t('description')}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) send(file)
          e.target.value = ''
        }}
      />

      {archiveName ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {archiveName}
            {archiveSize != null && (
              <span className="text-zinc-500"> · {formatBytes(archiveSize)}</span>
            )}
          </span>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t('replace')}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {t('remove')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-3 h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? t('uploading') : t('upload')}
        </button>
      )}

      {upload && (
        <div className="mt-3">
          <p aria-live="polite" className="text-xs text-zinc-500">
            {t('progress', {
              sent: formatBytes(upload.sent),
              total: formatBytes(upload.total),
              percent: format.number(upload.sent / upload.total, { style: 'percent' }),
            })}
          </p>
          <div className="mt-1">
            <ProgressBar
              value={(upload.sent / upload.total) * 100}
              label={t('progressLabel')}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

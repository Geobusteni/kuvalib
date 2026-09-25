// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { postWithProgress } from '@/lib/xhr-upload'
import ProgressBar from '@/components/ui/ProgressBar'
import { useFormatBytes } from '@/hooks/useFormatBytes'
import { useErrorMessage } from '@/hooks/useErrorMessage'

type Strategy = 'overwrite' | 'rename' | 'skip'

interface Conflict {
  files: File[]
  names: string[]
}

export default function UploadZone({ projectId }: { projectId: string }) {
  const router = useRouter()
  const t = useTranslations('upload.zone')
  const format = useFormatter()
  const formatBytes = useFormatBytes()
  const msg = useErrorMessage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [overall, setOverall] = useState<{ sent: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<Conflict | null>(null)

  const busy = status !== null

  async function send(file: File, strategy: Strategy | undefined, completed: number, total: number) {
    const form = new FormData()
    form.append('file', file)
    if (strategy) form.append('strategy', strategy)
    setProgress(0)
    const lastReported = { current: 0 }
    const { status, ok, data } = await postWithProgress(
      `/api/projects/${projectId}/upload`,
      form,
      ({ loaded, total: requestTotal }) => {
        const fraction = requestTotal > 0 ? Math.min(1, loaded / requestTotal) : 0
        const pct = Math.round(fraction * 100)
        // Throttle to >=5% deltas so screen readers and re-renders aren't
        // flooded by raw per-byte progress events.
        if (pct - lastReported.current >= 5 || pct === 100) {
          lastReported.current = pct
          setProgress(pct)
          setOverall({ sent: completed + Math.round(fraction * file.size), total })
        }
      }
    )
    return { res: { status, ok }, data }
  }

  async function upload(files: File[], strategy?: Strategy) {
    const accepted = files.filter(
      (f) =>
        f.type === 'image/jpeg' ||
        /\.jpe?g$/i.test(f.name) ||
        f.type === 'application/zip' ||
        /\.zip$/i.test(f.name)
    )

    if (accepted.length === 0) {
      setError(t('onlyAccepted'))
      return
    }

    setError(null)
    setConflict(null)

    const pending: File[] = []
    const names: string[] = []
    const totalBytes = accepted.reduce((sum, f) => sum + f.size, 0)
    let completedBytes = 0
    setOverall({ sent: 0, total: totalBytes })

    for (const [i, file] of accepted.entries()) {
      setStatus(t('status', { current: i + 1, count: accepted.length, name: file.name }))
      let result: Awaited<ReturnType<typeof send>>
      try {
        result = await send(file, strategy, completedBytes, totalBytes)
      } catch (e) {
        setError(msg(e instanceof Error ? e.message : null))
        setStatus(null)
        setProgress(null)
        setOverall(null)
        router.refresh()
        return
      }
      const { res, data } = result
      completedBytes += file.size

      if (res.status === 409) {
        pending.push(file)
        names.push(...(data.conflicts ?? []))
        continue
      }
      if (!res.ok) {
        setError(data.error ? msg(data) : t('couldNotUpload', { name: file.name }))
        setStatus(null)
        setProgress(null)
        setOverall(null)
        router.refresh()
        return
      }
    }

    setStatus(null)
    setProgress(null)
    setOverall(null)
    router.refresh()

    if (pending.length > 0) setConflict({ files: pending, names })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) upload(Array.from(e.dataTransfer.files))
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={t('ariaLabel')}
        aria-busy={busy}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!busy) inputRef.current?.click()
          }
        }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 ${
          dragging
            ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800'
            : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,.jpg,.jpeg,.zip,application/zip"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files?.length) upload(Array.from(e.target.files))
            e.target.value = ''
          }}
        />
        {busy ? (
          <div className="w-full max-w-xs">
            <p aria-live="polite" className="text-sm text-zinc-500">
              {progress != null
                ? t('statusPercent', { status, percent: format.number(progress / 100, { style: 'percent' }) })
                : status}
            </p>
            <div className="mt-2">
              <ProgressBar value={progress ?? 0} label={status ?? t('uploadingLabel')} />
            </div>
            {overall && (
              <div className="mt-3">
                <p className="text-xs text-zinc-500">
                  {t('totalProgress', {
                    sent: formatBytes(overall.sent),
                    total: formatBytes(overall.total),
                    percent: format.number(overall.total > 0 ? overall.sent / overall.total : 0, {
                      style: 'percent',
                    }),
                  })}
                </p>
                <div className="mt-1">
                  <ProgressBar
                    value={overall.total > 0 ? (overall.sent / overall.total) * 100 : 0}
                    label={t('totalLabel')}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('drop')}
            </p>
            <p className="text-xs text-zinc-500">
              {t('hint')}
            </p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {conflict && (
        <div
          role="alertdialog"
          aria-labelledby="conflict-heading"
          className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40"
        >
          <h3
            id="conflict-heading"
            className="text-sm font-semibold text-amber-900 dark:text-amber-200"
          >
            {t('conflictTitle', { count: conflict.names.length })}
          </h3>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {conflict.names.length > 5
              ? t('conflictMore', {
                  names: conflict.names.slice(0, 5).join(', '),
                  count: conflict.names.length - 5,
                })
              : conflict.names.join(', ')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => upload(conflict.files, 'rename')}
              className="h-9 rounded-lg bg-amber-900 px-4 text-sm font-medium text-white hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:bg-amber-200 dark:text-amber-950"
            >
              {t('keepBoth')}
            </button>
            <button
              onClick={() => upload(conflict.files, 'overwrite')}
              className="h-9 rounded-lg border border-amber-400 px-4 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              {t('replaceExisting')}
            </button>
            <button
              onClick={() => setConflict(null)}
              className="h-9 rounded-lg px-4 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

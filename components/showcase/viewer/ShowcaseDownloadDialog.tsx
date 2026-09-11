// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const REVOKE_DELAY_MS = 1000

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

/**
 * "Download as ZIP (originals)" for the photos placed in the showcase. Reuses the
 * gallery's selection-ZIP route (`POST /api/projects/[id]/download`).
 */
export function ShowcaseDownloadDialog({
  projectId,
  title,
  photoIds,
  onClose,
}: {
  projectId: string
  title: string
  photoIds: string[]
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const trapFocus = useFocusTrap(dialogRef)
  const [phase, setPhase] = useState<'choosing' | 'preparing' | 'error'>('choosing')

  // Mount-only — see AlbumSettingsDialog for why `onClose` (a fresh function
  // on every parent render) must not be a dependency here.
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirm = async () => {
    setPhase('preparing')
    try {
      const res = await fetch(`/api/projects/${projectId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds }),
      })
      if (!res.ok) {
        setPhase('error')
        return
      }
      downloadBlob(await res.blob(), `${title || 'album'}.zip`)
      onClose()
    } catch {
      setPhase('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Download this album"
        onKeyDown={trapFocus}
        className="w-full max-w-sm rounded-xl bg-zinc-900 p-5 text-zinc-100 shadow-xl"
      >
        <h2 className="text-base font-semibold">Download this album</h2>
        {phase === 'preparing' ? (
          <p className="mt-3 text-sm text-zinc-400">Preparing your download…</p>
        ) : (
          <>
            {phase === 'error' && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                Something went wrong. Please try again.
              </p>
            )}
            <p className="mt-2 text-sm text-zinc-400">
              {photoIds.length} {photoIds.length === 1 ? 'photo' : 'photos'} · {title}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirm}
                disabled={photoIds.length === 0}
                className="h-10 rounded-lg bg-zinc-100 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
              >
                Download as ZIP (originals)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-zinc-700 text-sm font-medium hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

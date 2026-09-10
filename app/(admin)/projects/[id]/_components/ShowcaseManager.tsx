// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  showcase: { id: string; pageCount: number } | null
}

export default function ShowcaseManager({ projectId, showcase }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyLink() {
    if (!showcase) return
    const url = `${window.location.origin}/s/${showcase.id}`
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => setError('Could not copy the link'),
    )
  }

  async function create() {
    setError(null)
    setBusy(true)
    const res = await fetch(`/api/projects/${projectId}/showcase`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error ?? 'Could not create the showcase')
      return
    }
    router.push(`/projects/${projectId}/showcase`)
  }

  async function remove() {
    setBusy(true)
    await fetch(`/api/projects/${projectId}/showcase`, { method: 'DELETE' })
    setBusy(false)
    setConfirmingDelete(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Showcase</h2>
      <p className="mt-1 text-xs text-zinc-500">
        A designed, page-by-page slideshow built from this project&rsquo;s photos, shared on its
        own link. It uses the same access and password as the gallery — a client who opens one
        can move to the other without signing in again.
      </p>

      {showcase ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {showcase.pageCount} {showcase.pageCount === 1 ? 'page' : 'pages'}
          </span>
          <a
            href={`/projects/${projectId}/showcase`}
            className="inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Open builder
          </a>
          <a
            href={`/s/${showcase.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            View showcase ↗
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {copied ? 'Link copied ✓' : 'Copy client link'}
          </button>
          {confirmingDelete ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Delete the whole showcase?</span>
              <button
                onClick={remove}
                disabled={busy}
                className="h-9 rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="h-9 rounded-lg px-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={create}
          disabled={busy}
          className="mt-3 h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? 'Creating…' : 'Create showcase'}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

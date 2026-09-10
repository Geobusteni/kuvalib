// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ShowcaseAnimation,
  ShowcaseBg,
  ShowcaseEventType,
} from '@/lib/generated/prisma/client'
import { ALBUM_BG_LABELS, EVENT_TYPE_LABELS } from '@/lib/showcase-theme'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useShowcaseStore, type AlbumSettings } from '../store'

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as ShowcaseEventType[]
const BGS = Object.keys(ALBUM_BG_LABELS) as ShowcaseBg[]
const ANIMATIONS: { value: ShowcaseAnimation; label: string }[] = [
  { value: 'TURN', label: 'Turn' },
  { value: 'FADE', label: 'Fade' },
  { value: 'ZOOM', label: 'Zoom' },
]
const SECONDS = [3, 5, 8]

const fieldLabel = 'text-xs font-medium text-zinc-500'
const input =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900'

export function AlbumSettingsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const trapFocus = useFocusTrap(dialogRef)

  const projectId = useShowcaseStore((s) => s.projectId)
  const settings = useShowcaseStore((s) => s.settings)
  const setSettings = useShowcaseStore((s) => s.setSettings)
  const tracks = useShowcaseStore((s) => s.tracks)
  const setTracks = useShowcaseStore((s) => s.setTracks)

  const [saving, setSaving] = useState(false)
  const [trackBusy, setTrackBusy] = useState(false)
  const [trackError, setTrackError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const patch = (p: Partial<AlbumSettings>) => setSettings(p)

  const persist = async () => {
    setSaving(true)
    await fetch(`/api/projects/${projectId}/showcase`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    onClose()
  }

  const uploadTrack = async (file: File) => {
    setTrackError(null)
    setTrackBusy(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/projects/${projectId}/showcase/tracks`, { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    setTrackBusy(false)
    if (!res.ok) {
      setTrackError(data.error ?? 'Upload failed')
      return
    }
    setTracks([...tracks, data.track])
  }

  const removeTrack = async (trackId: string) => {
    setTrackBusy(true)
    await fetch(`/api/projects/${projectId}/showcase/tracks/${trackId}`, { method: 'DELETE' })
    setTrackBusy(false)
    setTracks(tracks.filter((t) => t.id !== trackId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Album settings"
        onKeyDown={trapFocus}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl bg-white p-5 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 className="text-base font-semibold">Album settings</h2>

        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Title</span>
          <input className={input} value={settings.title} onChange={(e) => patch({ title: e.target.value })} />
        </label>

        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Date</span>
          <input
            type="date"
            className={input}
            value={settings.eventDate ?? ''}
            onChange={(e) => patch({ eventDate: e.target.value || null })}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Event type</span>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.map((et) => (
              <button
                key={et}
                type="button"
                onClick={() => patch({ eventType: et })}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  settings.eventType === et
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {EVENT_TYPE_LABELS[et]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Album background</span>
          <div className="flex gap-1.5">
            {BGS.map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => patch({ albumBg: bg })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  settings.albumBg === bg
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {ALBUM_BG_LABELS[bg]}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Music playlist</span>
        <ul className="flex flex-col gap-1.5">
          {tracks.map((track) => (
            <li key={track.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{track.originalName}</span>
              <button
                type="button"
                onClick={() => removeTrack(track.id)}
                disabled={trackBusy}
                aria-label={`Remove ${track.originalName}`}
                className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
              >
                ×
              </button>
            </li>
          ))}
          {tracks.length === 0 && <li className="text-xs text-zinc-500">No tracks yet.</li>}
        </ul>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.ogg,.wav"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadTrack(file)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={trackBusy}
          className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {trackBusy ? 'Uploading…' : '+ Add track'}
        </button>
        {trackError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{trackError}</p>}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.playlistLoop}
            onChange={(e) => patch({ playlistLoop: e.target.checked })}
          />
          Loop the playlist while viewing
        </label>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Slideshow</span>
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Page transition</span>
          <div className="flex gap-1.5">
            {ANIMATIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => patch({ animationStyle: a.value })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  settings.animationStyle === a.value
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.autoplay} onChange={(e) => patch({ autoplay: e.target.checked })} />
          Autoplay
        </label>
        {settings.autoplay && (
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Seconds per page</span>
            <div className="flex gap-1.5">
              {SECONDS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => patch({ autoplaySeconds: n })}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                    settings.autoplaySeconds === n
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {n}s
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={persist}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}

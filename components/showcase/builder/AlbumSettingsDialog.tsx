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
import { HEADING_SIZE_DEFAULTS, TEXT_SIZE_DEFAULTS, type HeadingLevel, type TextSizePreset } from '@/lib/showcase-blocks'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useShowcaseStore, type AlbumSettings } from '../store'

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as ShowcaseEventType[]
const BGS = Object.keys(ALBUM_BG_LABELS) as ShowcaseBg[]
const ANIMATIONS: { value: ShowcaseAnimation; label: string }[] = [
  { value: 'TURN', label: 'Turn' },
  { value: 'FADE', label: 'Fade' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'ROTATE', label: 'Rotate' },
]
const SECONDS = [3, 5, 8]
const HEADING_LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6]
const TEXT_SIZE_PRESETS: TextSizePreset[] = ['small', 'normal', 'medium', 'large', 'huge']

/** The stable class names the public viewer renders (components/showcase/viewer/*),
 *  for admins writing Custom CSS. Keep in sync with where each is applied. */
const CSS_CLASS_LEGEND: { selector: string; description: string }[] = [
  { selector: '.sc-viewer', description: "The whole viewer — full-bleed background behind everything." },
  { selector: '.sc-stage', description: 'Positioning wrapper around the current page (holds the 3D perspective for the Turn transition).' },
  { selector: '.sc-page', description: 'The page itself — background, border, and where the page transition animates.' },
  { selector: '.sc-block', description: 'Every block’s wrapper. Combine with a type below to target just one kind.' },
  { selector: '.sc-block-image / -title / -text / -button / -group', description: 'One block type’s wrapper.' },
  { selector: '.sc-controls', description: 'The floating top-right controls pill.' },
  { selector: '.sc-dots', description: 'The left-side page-dot column. `.sc-dot` is one dot, `.sc-dot-active` the current page’s.' },
  { selector: '.sc-thumbnails', description: 'The bottom thumbnail strip. `.sc-thumbnail` is one preview, `.sc-thumbnail-active` the current page’s.' },
]

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
  const [legendOpen, setLegendOpen] = useState(false)
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

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Heading sizes</span>
        <p className="text-[11px] text-zinc-400">
          Default px size for each Headline level. A block can override its own size.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {HEADING_LEVELS.map((level) => (
            <label key={level} className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              H{level}
              <input
                type="number"
                min={8}
                max={200}
                className={input}
                value={settings.headingSizes[level] ?? HEADING_SIZE_DEFAULTS[level]}
                onChange={(e) =>
                  patch({
                    headingSizes: { ...settings.headingSizes, [level]: parseInt(e.target.value, 10) || HEADING_SIZE_DEFAULTS[level] },
                  })
                }
              />
            </label>
          ))}
        </div>

        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Text sizes</span>
        <p className="text-[11px] text-zinc-400">
          Default px size for each Text block preset. A block can override its own size.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_SIZE_PRESETS.map((preset) => (
            <label key={preset} className="flex flex-col gap-1 text-xs font-medium capitalize text-zinc-500">
              {preset}
              <input
                type="number"
                min={8}
                max={200}
                className={input}
                value={settings.textSizes[preset] ?? TEXT_SIZE_DEFAULTS[preset]}
                onChange={(e) =>
                  patch({
                    textSizes: { ...settings.textSizes, [preset]: parseInt(e.target.value, 10) || TEXT_SIZE_DEFAULTS[preset] },
                  })
                }
              />
            </label>
          ))}
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Page dots</span>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            Active
            <div className="flex gap-1.5">
              <input
                type="color"
                value={settings.dotColorActive ?? '#6366f1'}
                onChange={(e) => patch({ dotColorActive: e.target.value })}
                className="h-8 w-full cursor-pointer rounded"
              />
              {settings.dotColorActive && (
                <button type="button" onClick={() => patch({ dotColorActive: null })} className="shrink-0 text-[11px] text-zinc-400 underline">
                  Reset
                </button>
              )}
            </div>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            Inactive
            <div className="flex gap-1.5">
              <input
                type="color"
                value={settings.dotColorInactive ?? '#ffffff'}
                onChange={(e) => patch({ dotColorInactive: e.target.value })}
                className="h-8 w-full cursor-pointer rounded"
              />
              {settings.dotColorInactive && (
                <button type="button" onClick={() => patch({ dotColorInactive: null })} className="shrink-0 text-[11px] text-zinc-400 underline">
                  Reset
                </button>
              )}
            </div>
          </label>
        </div>
        <p className="text-[11px] text-zinc-400">
          Blank uses the event colour for the active dot and a translucent white for the rest.
        </p>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Custom CSS</span>
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            aria-expanded={legendOpen}
            aria-controls="sc-css-legend"
            aria-label={legendOpen ? 'Hide the CSS class reference' : 'Show the CSS class reference'}
            className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 9v5" strokeLinecap="round" />
              <circle cx="10" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-zinc-400">Applied only inside this showcase&rsquo;s public viewer.</p>
        {legendOpen && (
          <div id="sc-css-legend" className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-[11px] text-zinc-500">The classes available to target in the public viewer:</p>
            <dl className="flex flex-col gap-1.5">
              {CSS_CLASS_LEGEND.map((row) => (
                <div key={row.selector} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">{row.selector}</dt>
                  <dd className="text-[11px] text-zinc-500">{row.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <textarea
          className="min-h-24 rounded-lg border border-zinc-300 bg-white p-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
          spellCheck={false}
          placeholder=".sc-page { }"
          value={settings.customCss}
          onChange={(e) => patch({ customCss: e.target.value })}
        />

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

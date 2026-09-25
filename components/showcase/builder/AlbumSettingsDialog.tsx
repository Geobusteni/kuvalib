// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import {
  ShowcaseAnimation,
  ShowcaseBg,
  ShowcaseEventType,
} from '@/lib/generated/prisma/client'
import { GOOGLE_FONTS, HEADING_SIZE_DEFAULTS, TEXT_SIZE_DEFAULTS, type HeadingLevel, type TextSizePreset } from '@/lib/showcase-blocks'
import { useErrorMessage } from '@/hooks/useErrorMessage'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useShowcaseStore, type AlbumSettings } from '../store'
import { PresetSwatchRow } from './PresetSwatchRow'

const EVENT_TYPES: ShowcaseEventType[] = ['WEDDING', 'BIRTHDAY', 'CHRISTENING', 'CORPORATE', 'GENERIC']
const BGS: ShowcaseBg[] = ['NEUTRAL', 'DEEP', 'ACCENT']
const ANIMATIONS: ShowcaseAnimation[] = ['TURN', 'FADE', 'ZOOM', 'ROTATE']
const SECONDS = [3, 5, 8]
const HEADING_LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6]
const TEXT_SIZE_PRESETS: TextSizePreset[] = ['small', 'normal', 'medium', 'large', 'huge']

/** The stable class names the public viewer renders (components/showcase/viewer/*),
 *  for admins writing Custom CSS. Keep in sync with where each is applied. */
const CSS_CLASS_LEGEND: {
  selector: string
  key: 'viewer' | 'stage' | 'page' | 'block' | 'blockTypes' | 'controls' | 'dots' | 'thumbnails'
}[] = [
  { selector: '.sc-viewer', key: 'viewer' },
  { selector: '.sc-stage', key: 'stage' },
  { selector: '.sc-page', key: 'page' },
  { selector: '.sc-block', key: 'block' },
  { selector: '.sc-block-image / -title / -text / -button / -group', key: 'blockTypes' },
  { selector: '.sc-controls', key: 'controls' },
  { selector: '.sc-dots', key: 'dots' },
  { selector: '.sc-thumbnails', key: 'thumbnails' },
]

const fieldLabel = 'text-xs font-medium text-zinc-500'
const input =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900'

export function AlbumSettingsDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('showcaseBuilder.albumSettings')
  const tOpt = useTranslations('showcaseBuilder.options')
  const errorMessage = useErrorMessage()
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

  // Mount-only: focus the dialog and wire Escape once. `onClose` always does
  // the same thing (closes this dialog) regardless of which render created
  // it, so a stale closure is safe — and necessary, since re-running this on
  // every keystroke/toggle (onClose is a fresh function each render of the
  // parent) used to re-focus the Title field and jerk the dialog's scroll
  // back to the top on every single settings change.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      setTrackError(errorMessage(data.error))
      return
    }
    setTracks([...tracks, data.track])
  }

  const removeTrack = async (trackId: string) => {
    setTrackBusy(true)
    await fetch(`/api/projects/${projectId}/showcase/tracks/${trackId}`, { method: 'DELETE' })
    setTrackBusy(false)
    setTracks(tracks.filter((track) => track.id !== trackId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        onKeyDown={trapFocus}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl bg-white p-5 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 className="text-base font-semibold">{t('title')}</h2>

        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>{t('albumTitle')}</span>
          <input className={input} value={settings.title} onChange={(e) => patch({ title: e.target.value })} />
        </label>

        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>{t('date')}</span>
          <input
            type="date"
            className={input}
            value={settings.eventDate ?? ''}
            onChange={(e) => patch({ eventDate: e.target.value || null })}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>{t('eventType')}</span>
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
                {tOpt(`eventType.${et}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>{t('albumBackground')}</span>
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
                {tOpt(`albumBg.${bg}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('musicPlaylist')}</span>
        <ul className="flex flex-col gap-1.5">
          {tracks.map((track) => (
            <li key={track.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{track.originalName}</span>
              <button
                type="button"
                onClick={() => removeTrack(track.id)}
                disabled={trackBusy}
                aria-label={t('removeTrack', { name: track.originalName })}
                className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
              >
                ×
              </button>
            </li>
          ))}
          {tracks.length === 0 && <li className="text-xs text-zinc-500">{t('noTracks')}</li>}
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
          {trackBusy ? t('uploading') : t('addTrack')}
        </button>
        {trackError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{trackError}</p>}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.playlistLoop}
            onChange={(e) => patch({ playlistLoop: e.target.checked })}
          />
          {t('loopPlaylist')}
        </label>
        <label className={`flex items-center gap-2 text-sm ${settings.autoplay ? 'opacity-60' : ''}`}>
          <input
            type="checkbox"
            checked={settings.autoplay || settings.musicAutoplay}
            disabled={settings.autoplay}
            onChange={(e) => patch({ musicAutoplay: e.target.checked })}
          />
          {t('autoplayMusic')}
        </label>
        <p className="text-[11px] text-zinc-400">
          {settings.autoplay
            ? t('musicAutoplayOn')
            : t('musicAutoplayOff')}
        </p>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('slideshow')}</span>
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>{t('pageTransition')}</span>
          <div className="flex gap-1.5">
            {ANIMATIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => patch({ animationStyle: a })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  settings.animationStyle === a
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {tOpt(`animation.${a}`)}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.autoplay} onChange={(e) => patch({ autoplay: e.target.checked })} />
          {t('autoplay')}
        </label>
        {settings.autoplay && (
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>{t('secondsPerPage')}</span>
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
                  {t('seconds', { n })}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('headingSizes')}</span>
        <p className="text-[11px] text-zinc-400">
          {t('headingSizesHint')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {HEADING_LEVELS.map((level) => (
            <label key={level} className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              {tOpt('headingLevel', { level })}
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

        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('textSizes')}</span>
        <p className="text-[11px] text-zinc-400">
          {t('textSizesHint')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_SIZE_PRESETS.map((preset) => (
            <label key={preset} className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              {tOpt(`textSize.${preset}`)}
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
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('fonts')}</span>
        <p className="text-[11px] text-zinc-400">
          {t('fontsHint')}
        </p>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            {t('headingFont')}
            <select
              className={input}
              value={settings.headingFont ?? ''}
              onChange={(e) => patch({ headingFont: e.target.value || null })}
            >
              <option value="">{t('defaultFont')}</option>
              {GOOGLE_FONTS.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            {t('textFont')}
            <select
              className={input}
              value={settings.textFont ?? ''}
              onChange={(e) => patch({ textFont: e.target.value || null })}
            >
              <option value="">{t('defaultFont')}</option>
              {GOOGLE_FONTS.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('colorPresets')}</span>
        <p className="text-[11px] text-zinc-400">
          {t('colorPresetsHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          {settings.colorPresets.map((hex, i) => (
            <div key={i} className="relative">
              <input
                type="color"
                value={hex}
                onChange={(e) => {
                  const next = [...settings.colorPresets]
                  next[i] = e.target.value
                  patch({ colorPresets: next })
                }}
                className="h-8 w-8 cursor-pointer rounded"
              />
              <button
                type="button"
                onClick={() => patch({ colorPresets: settings.colorPresets.filter((_, j) => j !== i) })}
                aria-label={t('removePreset', { hex })}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] leading-none text-white hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
          {settings.colorPresets.length < 12 && (
            <button
              type="button"
              onClick={() => patch({ colorPresets: [...settings.colorPresets, '#888888'] })}
              aria-label={t('addPreset')}
              className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-zinc-400 text-zinc-400 hover:border-zinc-300 hover:text-zinc-300"
            >
              +
            </button>
          )}
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('pageDots')}</span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.dotsEnabled}
            onChange={(e) => patch({ dotsEnabled: e.target.checked })}
          />
          {t('showDots')}
        </label>
        {settings.dotsEnabled && (
          <>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
                {t('active')}
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={settings.dotColorActive ?? '#6366f1'}
                    onChange={(e) => patch({ dotColorActive: e.target.value })}
                    className="h-8 w-full cursor-pointer rounded"
                  />
                  {settings.dotColorActive && (
                    <button type="button" onClick={() => patch({ dotColorActive: null })} className="shrink-0 text-[11px] text-zinc-400 underline">
                      {t('reset')}
                    </button>
                  )}
                </div>
                <PresetSwatchRow presets={settings.colorPresets} onPick={(hex) => patch({ dotColorActive: hex })} />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
                {t('inactive')}
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={settings.dotColorInactive ?? '#ffffff'}
                    onChange={(e) => patch({ dotColorInactive: e.target.value })}
                    className="h-8 w-full cursor-pointer rounded"
                  />
                  {settings.dotColorInactive && (
                    <button type="button" onClick={() => patch({ dotColorInactive: null })} className="shrink-0 text-[11px] text-zinc-400 underline">
                      {t('reset')}
                    </button>
                  )}
                </div>
                <PresetSwatchRow presets={settings.colorPresets} onPick={(hex) => patch({ dotColorInactive: hex })} />
              </label>
            </div>
            <p className="text-[11px] text-zinc-400">
              {t('dotsHint')}
            </p>
          </>
        )}

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('customCss')}</span>
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            aria-expanded={legendOpen}
            aria-controls="sc-css-legend"
            aria-label={legendOpen ? t('hideCssRef') : t('showCssRef')}
            className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 9v5" strokeLinecap="round" />
              <circle cx="10" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-zinc-400">{t('cssScopeHint')}</p>
        {legendOpen && (
          <div id="sc-css-legend" className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-[11px] text-zinc-500">{t('cssLegendIntro')}</p>
            <dl className="flex flex-col gap-1.5">
              {CSS_CLASS_LEGEND.map((row) => (
                <div key={row.selector} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">{row.selector}</dt>
                  <dd className="text-[11px] text-zinc-500">{t(`cssLegend.${row.key}`)}</dd>
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
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={persist}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? t('saving') : t('done')}
          </button>
        </div>
      </div>
    </div>
  )
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useRef, useState } from 'react'
import { useErrorMessage } from '@/hooks/useErrorMessage'
import { sanitizeSvg, SvgSanitizeError, SVG_MAX_BYTES, type SanitizedSvg } from '@/lib/svg-sanitize'
import { SanitizedSvgImage } from '../Icon'
import { useIconManager } from '../icons-context'

const field =
  'w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900'
const button =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700'

export function AddIconForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useTranslations('showcaseBuilder.iconPicker')
  const errorMessage = useErrorMessage()
  const manager = useIconManager()
  const fileRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState('')
  const [name, setName] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const checked = useMemo<{ ok: SanitizedSvg } | { error: string } | null>(() => {
    if (!source.trim()) return null
    try {
      return { ok: sanitizeSvg(source) }
    } catch (e) {
      if (e instanceof SvgSanitizeError) return { error: errorMessage({ error: e.code, detail: e.detail ?? '' } as never) }
      return { error: errorMessage(null) }
    }
    // errorMessage is recreated every render; its output only depends on the locale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  const readFile = async (file: File) => {
    setFileError(null)
    if (file.size > SVG_MAX_BYTES) {
      setFileError(t('fileTooLarge'))
      return
    }
    setSource(await file.text())
    if (!name.trim()) setName(file.name.replace(/\.svg$/i, '').slice(0, 60))
  }

  const save = async () => {
    setSaveError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/icons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, svg: source }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setSaveError(errorMessage(data))
        return
      }
      await manager?.reload()
      onDone()
    } catch {
      setSaveError(errorMessage(null))
    } finally {
      setSaving(false)
    }
  }

  const valid = checked !== null && 'ok' in checked
  const message = fileError ?? (checked && 'error' in checked ? checked.error : null) ?? saveError

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && name.trim() && !saving) void save()
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500">{t('paste')}</span>
        <textarea
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setSaveError(null)
            setFileError(null)
          }}
          rows={6}
          spellCheck={false}
          placeholder={t('pastePlaceholder')}
          aria-describedby="icon-add-hint"
          aria-invalid={checked !== null && 'error' in checked}
          className={`${field} p-2 font-mono text-xs`}
        />
      </label>
      <p id="icon-add-hint" className="text-xs text-zinc-500">
        {t('hint')}
      </p>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void readFile(file)
            e.target.value = ''
          }}
        />
        <button type="button" className={button} onClick={() => fileRef.current?.click()}>
          {t('chooseFile')}
        </button>
      </div>

      <div role="alert" className="min-h-0 text-sm text-red-700 dark:text-red-400">
        {message}
      </div>

      <div className="flex items-center gap-3">
        <div
          aria-label={t('preview')}
          role="img"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
        >
          {checked && 'ok' in checked ? <SanitizedSvgImage svg={checked.ok} width={40} height={40} aria-hidden focusable="false" /> : null}
        </div>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">{t('name')}</span>
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className={`${field} h-11`}
          />
        </label>
      </div>
      {!valid && <p className="text-xs text-zinc-500">{t('previewEmpty')}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={button} onClick={onCancel}>
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={!valid || !name.trim() || saving}
          className={`${button} border-zinc-900 bg-zinc-900 text-white disabled:opacity-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900`}
        >
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  )
}

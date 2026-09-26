// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useErrorMessage } from '@/hooks/useErrorMessage'
import { locales } from '@/lib/locales'

type AccessType = 'PASSWORD' | 'EMAIL'

interface ProjectFormProps {
  mode: 'create' | 'edit'
  projectId?: string
  defaults?: {
    title?: string
    eventDate?: Date | string | null
    expiresAt?: Date | string | null
    accessType?: AccessType
    zipEnabled?: boolean
    dlEnabled?: boolean
    feedbackEnabled?: boolean
    defaultLocale?: string | null
  }
}

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toISOString().split('T')[0]
}

export default function ProjectForm({ mode, projectId, defaults }: ProjectFormProps) {
  const router = useRouter()
  const t = useTranslations('ui.projectForm')
  const tl = useTranslations('language')
  const msg = useErrorMessage()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [accessType, setAccessType] = useState<AccessType>(defaults?.accessType ?? 'PASSWORD')

  const needsPassword = accessType === 'PASSWORD'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const value = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value || undefined
    const checked = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement).checked

    const password = value('password')

    if (mode === 'create' && needsPassword && !password) {
      setError(t('passwordRequired'))
      setLoading(false)
      return
    }

    const body: Record<string, unknown> = {
      title: value('title'),
      eventDate: value('eventDate') ?? null,
      expiresAt: value('expiresAt') ?? null,
      accessType,
      zipEnabled: checked('zipEnabled'),
      dlEnabled: checked('dlEnabled'),
      feedbackEnabled: checked('feedbackEnabled'),
      defaultLocale: value('defaultLocale') ?? null,
    }
    if (password) body.password = password

    try {
      const res = await fetch(
        mode === 'create' ? '/api/projects' : `/api/projects/${projectId}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!res.ok) {
        setError(msg(await res.json().catch(() => ({}))))
        return
      }

      const project = await res.json()
      router.push(`/projects/${project.id}`)
      router.refresh()
    } catch {
      setError(msg(null))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Field label={t('title')} htmlFor="title" required>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaults?.title}
          autoFocus={mode === 'create'}
          className={inputClass}
        />
      </Field>

      <Field label={t('eventDate')} htmlFor="eventDate">
        <input
          id="eventDate"
          name="eventDate"
          type="date"
          defaultValue={toDateInput(defaults?.eventDate)}
          className={inputClass}
        />
      </Field>

      <Field
        label={t('accessType')}
        htmlFor="accessType"
        hint={t('accessHint')}
      >
        <select
          id="accessType"
          name="accessType"
          value={accessType}
          onChange={(e) => setAccessType(e.target.value as AccessType)}
          className={inputClass}
        >
          <option value="PASSWORD">{t('passwordOption')}</option>
          <option value="EMAIL">{t('emailOption')}</option>
        </select>
      </Field>

      {needsPassword && (
        <Field
          label={mode === 'create' ? t('galleryPassword') : t('newGalleryPassword')}
          htmlFor="password"
          required={mode === 'create'}
          hint={mode === 'edit' ? t('keepPasswordHint') : undefined}
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
      )}

      <Field
        label={t('expiresAt')}
        htmlFor="expiresAt"
        hint={t('expiresHint')}
      >
        <input
          id="expiresAt"
          name="expiresAt"
          type="date"
          defaultValue={toDateInput(defaults?.expiresAt)}
          className={inputClass}
        />
      </Field>

      <Field label={t('defaultLocale')} htmlFor="defaultLocale" hint={t('defaultLocaleHint')}>
        <select
          id="defaultLocale"
          name="defaultLocale"
          defaultValue={defaults?.defaultLocale ?? ''}
          className={inputClass}
        >
          <option value="">{t('defaultLocaleAuto')}</option>
          {locales.map((locale) => (
            <option key={locale} value={locale} lang={locale}>
              {tl(`names.${locale}`)}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-3">
        <Toggle
          id="zipEnabled"
          label={t('zipEnabled')}
          defaultChecked={defaults?.zipEnabled ?? true}
        />
        <Toggle
          id="dlEnabled"
          label={t('dlEnabled')}
          defaultChecked={defaults?.dlEnabled ?? true}
        />
        <Toggle
          id="feedbackEnabled"
          label={t('feedbackEnabled')}
          defaultChecked={defaults?.feedbackEnabled ?? false}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? t('saving') : mode === 'create' ? t('create') : t('save')}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-10 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
      </label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
    </div>
  )
}

function Toggle({
  id,
  label,
  defaultChecked,
}: {
  id: string
  label: string
  defaultChecked: boolean
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <input
        id={id}
        name={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
      />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </label>
  )
}

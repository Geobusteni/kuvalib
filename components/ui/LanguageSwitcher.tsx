// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { setLocale } from '@/app/actions/locale'
import { locales, type Locale } from '@/lib/locales'

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const t = useTranslations('language')
  const current = useLocale()
  const [pending, startTransition] = useTransition()

  function choose(locale: Locale) {
    if (locale === current) return
    startTransition(() => setLocale(locale))
  }

  return (
    <div
      role="group"
      aria-label={t('label')}
      aria-busy={pending}
      className={`inline-flex items-center text-sm ${className}`}
    >
      {locales.map((locale, i) => {
        const active = locale === current
        return (
          <span key={locale} className="inline-flex items-center">
            {i > 0 && <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">|</span>}
            <button
              type="button"
              lang={locale}
              aria-current={active ? 'true' : undefined}
              aria-label={t('switchTo', { language: t(`names.${locale}`) })}
              disabled={pending}
              onClick={() => choose(locale)}
              className={`min-h-11 min-w-11 px-2 uppercase transition-colors disabled:opacity-60 ${
                active
                  ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {locale}
            </button>
          </span>
        )
      })}
    </div>
  )
}

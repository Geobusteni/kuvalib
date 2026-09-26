// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { LOCALE_COOKIE, parsePublicPath, resolveLocale, type Locale } from '@/lib/locales'
import { getProjectDefaultLocale, getShowcaseDefaultLocale } from '@/lib/projects'

// One lookup per request, and only for a visitor without their own choice. A database
// hiccup must never take the page down over a language preference.
const forcedLocale = cache(async (pathname: string | null): Promise<Locale | null> => {
  const target = parsePublicPath(pathname)
  if (!target) return null
  try {
    return target.kind === 'g'
      ? await getProjectDefaultLocale(target.id)
      : await getShowcaseDefaultLocale(target.id)
  } catch {
    return null
  }
})

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const chosen = cookieStore.get(LOCALE_COOKIE)?.value
  const projectDefault = chosen ? null : await forcedLocale(headerStore.get('x-kuvalib-path'))
  const locale = resolveLocale(chosen, headerStore.get('accept-language'), projectDefault)

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

export const locales = ['en', 'ro'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'
export const LOCALE_COOKIE = 'kuvalib_locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}

// Best supported language from an Accept-Language header, by q-value then order.
function matchAcceptLanguage(header: string): Locale | null {
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      const weight = q ? Number(q.slice(2)) : 1
      return { language: tag.trim().toLowerCase().split('-')[0], weight, index }
    })
    .filter((entry) => entry.language && Number.isFinite(entry.weight) && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)

  for (const { language } of ranked) {
    if (isLocale(language)) return language
  }
  return null
}

export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieValue)) return cookieValue
  if (acceptLanguage) return matchAcceptLanguage(acceptLanguage) ?? defaultLocale
  return defaultLocale
}

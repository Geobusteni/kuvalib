// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { setLocale } from '@/app/actions/locale'
import { isLocale, LOCALE_COOKIE, LOCALE_STORAGE_KEY, type Locale } from '@/lib/locales'

function readCookie(): Locale | null {
  try {
    const entry = document.cookie.split('; ').find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
    const value = entry?.slice(LOCALE_COOKIE.length + 1)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

function readStored(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

function writeStored(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {}
}

// Second layer behind the server-set cookie: some browsers (Safari ITP, in-app webviews,
// cleared cookie jars) lose the cookie while localStorage survives. Renders nothing.
export default function LocaleSync() {
  const router = useRouter()
  const rendered = useLocale()
  const attempted = useRef<Locale | null>(null)

  useEffect(() => {
    function sync() {
      const cookie = readCookie()

      if (cookie) {
        // The cookie is only ever set by an explicit choice, so it is safe to mirror.
        writeStored(cookie)
        // Restored from the back/forward cache with a page rendered in another language.
        if (cookie !== rendered && attempted.current !== cookie) {
          attempted.current = cookie
          router.refresh()
        }
        return
      }

      const stored = readStored()
      if (!stored || stored === rendered || attempted.current === stored) return
      // At most once per value per page load, so a browser that refuses the cookie cannot loop.
      attempted.current = stored
      setLocale(stored)
        .then(() => router.refresh())
        .catch(() => {})
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) sync()
    }

    sync()
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [rendered, router])

  return null
}

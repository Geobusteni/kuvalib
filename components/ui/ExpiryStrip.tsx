// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'

const DAY_MS = 24 * 60 * 60 * 1000
const URGENT_DAYS = 3

function daysLeft(expiresAt: string) {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY_MS)
}

// Sticks to the bottom edge above everything but never intercepts a click. Its height is
// published as --expiry-bar-h so bottom-anchored UI (footer, rail, dialogs) can stay clear of it.
// The after: skirt paints the same colour well below the strip: on phones the browser toolbar
// collapses while scrolling and a fixed box can trail the real bottom edge for a few frames, so
// the skirt fills that gap instead of letting the page show through. No backdrop-filter: it
// cannot be extended by a pseudo-element and forces a costly layer that lags during scroll.
export default function ExpiryStrip({ expiresAt }: { expiresAt: string }) {
  const t = useTranslations('expiry')
  const format = useFormatter()
  const ref = useRef<HTMLDivElement>(null)
  const [days, setDays] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setDays(daysLeft(expiresAt))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [expiresAt])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const publish = () => root.style.setProperty('--expiry-bar-h', `${el.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--expiry-bar-h')
    }
  }, [])

  const date = format.dateTime(new Date(expiresAt), { dateStyle: 'long', timeZone: 'UTC' })
  const urgent = days !== null && days <= URGENT_DAYS

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] bg-black/80 after:absolute after:inset-x-0 after:top-full after:h-screen after:bg-black/80 after:content-[''] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-2 text-center text-xs leading-snug"
    >
      <p className={urgent ? 'text-amber-200' : 'text-zinc-200'}>
        {days !== null && days <= 0 ? t('expired') : t('text', { date })}
        {days !== null && days > 0 && (
          <span suppressHydrationWarning> · {t('daysLeft', { days })}</span>
        )}
      </p>
    </div>
  )
}

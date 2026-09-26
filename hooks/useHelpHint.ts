// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type HelpSurface = 'gallery' | 'slideshow'

const ONE_YEAR = 60 * 60 * 24 * 365

const storageKey = (surface: HelpSurface) => `kuvalib:helpSeen:${surface}`
const cookieName = (surface: HelpSurface) => `kuvalib_help_seen_${surface}`

// Last resort when both localStorage and cookies are unavailable: the hint
// stays off for the rest of this page load only.
const seenInMemory = new Set<HelpSurface>()
const listeners = new Set<() => void>()

function readLocalStorage(surface: HelpSurface) {
  try {
    return window.localStorage.getItem(storageKey(surface)) === '1'
  } catch {
    return false
  }
}

function readCookie(surface: HelpSurface) {
  try {
    return document.cookie.split('; ').includes(`${cookieName(surface)}=1`)
  } catch {
    return false
  }
}

function persist(surface: HelpSurface) {
  try {
    window.localStorage.setItem(storageKey(surface), '1')
  } catch {}
  try {
    // iOS Safari (ITP) caps script-set cookies at 7 days; fine for a hint.
    document.cookie = `${cookieName(surface)}=1; max-age=${ONE_YEAR}; path=/; SameSite=Lax`
  } catch {}
}

function isSeen(surface: HelpSurface) {
  return seenInMemory.has(surface) || readLocalStorage(surface) || readCookie(surface)
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  window.addEventListener('pageshow', notify)
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('pageshow', notify)
    window.removeEventListener('storage', notify)
  }
}

/**
 * Whether the visitor is new to a surface's Legend, so its "?" button should
 * draw attention. Storage is read only on the client (the server snapshot is
 * "seen"), so there is no hydration mismatch and the hint starts after mount.
 */
export function useHelpHint(surface: HelpSurface) {
  const seen = useSyncExternalStore(
    subscribe,
    () => isSeen(surface),
    () => true,
  )

  const markSeen = useCallback(() => {
    seenInMemory.add(surface)
    persist(surface)
    listeners.forEach((notify) => notify())
  }, [surface])

  return { hint: !seen, markSeen }
}

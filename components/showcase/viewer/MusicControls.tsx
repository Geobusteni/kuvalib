// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'

/**
 * A small pill of its own, separate from the main slideshow controls, so it's
 * never mistaken for the slides' own play/pause. Exactly one control shows,
 * never both:
 *  - Music is already playing (album or slides autoplay): a mute/unmute
 *    toggle only — there's nothing to "play", it already is.
 *  - Music isn't autoplaying: a play/pause toggle only — nothing to mute
 *    until it's actually making sound.
 */
export function MusicControls({
  autoStarted,
  playing,
  onTogglePlaying,
  muted,
  onToggleMuted,
  visible,
}: {
  autoStarted: boolean
  playing: boolean
  onTogglePlaying: () => void
  muted: boolean
  onToggleMuted: () => void
  visible: boolean
}) {
  const t = useTranslations('showcaseViewer.music')
  return (
    <div
      className="pointer-events-auto absolute right-2 top-16 z-10 flex items-center gap-0.5 rounded-full bg-black/40 p-1 backdrop-blur-sm transition-opacity duration-300 sm:right-3 sm:top-16"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {autoStarted ? (
        <button
          type="button"
          aria-label={muted ? t('unmute') : t('mute')}
          aria-pressed={muted}
          onClick={onToggleMuted}
          title={muted ? t('unmute') : t('mute')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor" stroke="none" />
            {muted ? <path d="M13.5 7.5l4 5M17.5 7.5l-4 5" /> : <path d="M13 6.5c1.4 1 1.4 6 0 7M15.3 4.5c2.6 2 2.6 9.5 0 11.5" />}
          </svg>
        </button>
      ) : (
        <button
          type="button"
          aria-label={playing ? t('pause') : t('play')}
          aria-pressed={playing}
          onClick={onTogglePlaying}
          title={playing ? t('pause') : t('play')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {playing ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" /> : <path d="M6 4l11 6-11 6z" />}
          </svg>
        </button>
      )}
    </div>
  )
}

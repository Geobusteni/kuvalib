// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'

export interface MusicControlsProps {
  autoStarted: boolean
  playing: boolean
  onTogglePlaying: () => void
  muted: boolean
  onToggleMuted: () => void
}

/**
 * One button in the top bar, kept visually distinct from the slideshow's own
 * play/pause (speaker vs. play glyph) so the two are never confused. Exactly
 * one control shows, never both:
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
  className,
}: MusicControlsProps & { className: string }) {
  const t = useTranslations('showcaseViewer.music')
  if (autoStarted) {
    return (
      <button
        type="button"
        aria-label={muted ? t('unmute') : t('mute')}
        aria-pressed={muted}
        onClick={onToggleMuted}
        title={muted ? t('unmute') : t('mute')}
        className={className}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor" stroke="none" />
          {muted ? <path d="M13.5 7.5l4 5M17.5 7.5l-4 5" /> : <path d="M13 6.5c1.4 1 1.4 6 0 7M15.3 4.5c2.6 2 2.6 9.5 0 11.5" />}
        </svg>
      </button>
    )
  }
  return (
    <button
      type="button"
      aria-label={playing ? t('pause') : t('play')}
      aria-pressed={playing}
      onClick={onTogglePlaying}
      title={playing ? t('pause') : t('play')}
      className={className}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor" stroke="none" />
        {playing ? <path d="M13 6.5c1.4 1 1.4 6 0 7M15.3 4.5c2.6 2 2.6 9.5 0 11.5" /> : <path d="M13.5 7.5l4 5M17.5 7.5l-4 5" />}
      </svg>
    </button>
  )
}

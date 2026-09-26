// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import Tooltip from '@/components/ui/Tooltip'
import { SpeakerIcon } from '@/components/ui/icons'

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
  const label = autoStarted ? (muted ? t('unmute') : t('mute')) : playing ? t('pause') : t('play')
  const waves = autoStarted ? !muted : playing
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={autoStarted ? muted : playing}
        onClick={autoStarted ? onToggleMuted : onTogglePlaying}
        className={className}
      >
        <SpeakerIcon waves={waves} />
      </button>
    </Tooltip>
  )
}

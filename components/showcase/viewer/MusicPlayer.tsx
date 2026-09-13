// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Background playlist. Plays tracks in order; when the last one ends it either
 * loops back to the first (`loop`) or stops. `playing` is "should currently be
 * playing" — driven either by the album's autoplay setting or a manual toggle,
 * the caller decides which. Starting playback always requests it muted first
 * (browsers allow muted autoplay without a user gesture) and unmutes right
 * after, which is what actually lets unattended audio start playing at all;
 * `onStopped` fires if even that gets blocked, so the caller can fall back to
 * a manual play control.
 */
export function MusicPlayer({
  projectId,
  trackIds,
  loop,
  playing,
  muted,
  onStopped,
}: {
  projectId: string
  trackIds: string[]
  loop: boolean
  playing: boolean
  muted: boolean
  onStopped: () => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.muted = true
      audio.play().then(() => {
        audio.muted = muted
      }, () => onStopped())
    } else {
      audio.pause()
    }
    // `muted` deliberately excluded — the separate effect below handles it
    // live, without restarting playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, onStopped])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.muted = muted
  }, [muted])

  if (trackIds.length === 0) return null

  const src = `/api/projects/${projectId}/showcase/tracks/${trackIds[index] ?? trackIds[0]}`

  return (
    <audio
      ref={audioRef}
      src={src}
      preload="none"
      onEnded={() => {
        if (index < trackIds.length - 1) {
          setIndex(index + 1)
        } else if (loop) {
          setIndex(0)
        } else {
          onStopped()
        }
      }}
    />
  )
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Background playlist. Plays tracks in order; when the last one ends it either
 * loops back to the first (`loop`) or stops. Browsers block audio until a user
 * gesture, so playback only ever starts from the viewer's music toggle
 * (`playing`).
 */
export function MusicPlayer({
  projectId,
  trackIds,
  loop,
  playing,
  onStopped,
}: {
  projectId: string
  trackIds: string[]
  loop: boolean
  playing: boolean
  onStopped: () => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.play().catch(() => onStopped())
    } else {
      audio.pause()
    }
  }, [playing, index, onStopped])

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

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The page-turn state machine, ported from the design prototype:
 *
 *   idle ──next/prev──▶ out ──(220ms)──▶ pre (unanimated swap) ──raf──▶ in ──(280ms)──▶ idle
 *
 * `pre` positions the incoming page off-screen with transitions disabled so the
 * swap is invisible; `in` animates it home. With reduced motion the whole dance
 * collapses to an instant `goTo`. Autoplay reuses `next` and loops.
 */

export type AnimPhase = 'idle' | 'out' | 'pre' | 'in'
export type AnimDir = 'next' | 'prev'

const OUT_MS = 220
const IN_MS = 280

interface Options {
  total: number
  autoplay: boolean
  autoplaySeconds: number
  reducedMotion: boolean
}

export function useSlideshow({ total, autoplay, autoplaySeconds, reducedMotion }: Options) {
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<AnimPhase>('idle')
  const [dir, setDir] = useState<AnimDir>('next')
  const [playing, setPlaying] = useState(autoplay)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const goTo = useCallback(
    (index: number) => {
      clearTimers()
      setPhase('idle')
      setCurrent(((index % total) + total) % total)
    },
    [clearTimers, total],
  )

  const step = useCallback(
    (nextDir: AnimDir) => {
      setPhase((activePhase) => {
        if (activePhase !== 'idle') return activePhase

        const advance = () =>
          setCurrent((c) => {
            const next = nextDir === 'next' ? c + 1 : c - 1
            return ((next % total) + total) % total
          })

        if (total <= 1) return activePhase

        if (reducedMotion) {
          advance()
          return 'idle'
        }

        setDir(nextDir)
        timers.current.push(
          setTimeout(() => {
            advance()
            setPhase('pre')
            requestAnimationFrame(() =>
              requestAnimationFrame(() => setPhase('in')),
            )
            timers.current.push(setTimeout(() => setPhase('idle'), IN_MS))
          }, OUT_MS),
        )
        return 'out'
      })
    },
    [reducedMotion, total],
  )

  const next = useCallback(() => step('next'), [step])
  const prev = useCallback(() => step('prev'), [step])

  // Autoplay loop.
  useEffect(() => {
    if (!playing || total <= 1) return
    const id = setInterval(() => step('next'), Math.max(2, autoplaySeconds) * 1000)
    return () => clearInterval(id)
  }, [playing, autoplaySeconds, step, total])

  return {
    current,
    phase,
    dir,
    playing,
    setPlaying,
    next,
    prev,
    goTo,
  }
}

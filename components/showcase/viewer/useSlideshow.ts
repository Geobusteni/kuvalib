// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The page-turn state machine, ported from the design prototype:
 *
 *   idle ──next/prev──▶ out ──(220ms)──▶ pre (unanimated swap) ──(~2 frames)──▶ in ──(280ms)──▶ idle
 *
 * `pre` positions the incoming page off-screen with transitions disabled so the
 * swap is invisible; `in` animates it home. With reduced motion the whole dance
 * collapses to an instant `goTo`. Autoplay reuses `next` and loops.
 */

export type AnimPhase = 'idle' | 'out' | 'pre' | 'in'
export type AnimDir = 'next' | 'prev'

const OUT_MS = 220
const IN_MS = 280
const PRE_MS = 34

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
  const [navTick, setNavTick] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  // The ref is the gate `step` reads, so a step never depends on (or runs side
  // effects inside) a state updater — those run twice under React Strict Mode.
  const phaseRef = useRef<AnimPhase>('idle')
  const updatePhase = useCallback((p: AnimPhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const goTo = useCallback(
    (index: number) => {
      clearTimers()
      updatePhase('idle')
      setCurrent(((index % total) + total) % total)
    },
    [clearTimers, updatePhase, total],
  )

  const step = useCallback(
    (nextDir: AnimDir) => {
      if (phaseRef.current !== 'idle' || total <= 1) return

      const advance = () =>
        setCurrent((c) => {
          const next = nextDir === 'next' ? c + 1 : c - 1
          return ((next % total) + total) % total
        })

      if (reducedMotion) {
        advance()
        return
      }

      setDir(nextDir)
      updatePhase('out')
      timers.current.push(
        setTimeout(() => {
          advance()
          updatePhase('pre')
          timers.current.push(
            setTimeout(() => {
              updatePhase('in')
              timers.current.push(setTimeout(() => updatePhase('idle'), IN_MS))
            }, PRE_MS),
          )
        }, OUT_MS),
      )
    },
    [reducedMotion, total, updatePhase],
  )

  const next = useCallback(() => {
    setNavTick((n) => n + 1)
    step('next')
  }, [step])
  const prev = useCallback(() => {
    setNavTick((n) => n + 1)
    step('prev')
  }, [step])
  const goToManual = useCallback(
    (index: number) => {
      setNavTick((n) => n + 1)
      goTo(index)
    },
    [goTo],
  )

  // Autoplay: one timeout per page, counted from the moment the page is settled.
  // Any manual navigation (navTick), page change or transition phase change
  // re-runs the effect, so the countdown always restarts from full and never
  // fires while a transition is in flight.
  useEffect(() => {
    if (!playing || total <= 1 || phase !== 'idle') return
    const id = setTimeout(() => step('next'), Math.max(2, autoplaySeconds) * 1000)
    return () => clearTimeout(id)
  }, [playing, autoplaySeconds, step, total, current, phase, navTick])

  return {
    current,
    phase,
    dir,
    playing,
    setPlaying,
    next,
    prev,
    goTo: goToManual,
  }
}

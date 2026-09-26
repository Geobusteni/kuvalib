// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef } from 'react'

export interface GestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  /** Vertical drag, reported live as the finger moves; dy is relative to where the axis locked. */
  onVerticalDrag?: (dy: number) => void
  /** Finger lifted after a vertical drag; vy is px/ms, negative when moving up. */
  onVerticalRelease?: (info: { dy: number; vy: number }) => void
  /** The vertical drag was interrupted (second finger, pointercancel). */
  onVerticalCancel?: () => void
  onTap?: () => void
  onDoubleTap?: (point: { x: number; y: number }) => void
  onPinchStart?: () => void
  onPinchMove?: (info: { scaleRatio: number; centerX: number; centerY: number }) => void
  onPinchEnd?: () => void
  onPanMove?: (info: { dx: number; dy: number }) => void
  onPanEnd?: () => void
}

export interface GestureOptions {
  /** Swipe-to-navigate and tap-to-toggle only make sense at 1x; a single
   * finger pans the image instead once zoomed in. */
  zoomed: boolean
}

const SWIPE_HORIZONTAL_THRESHOLD = 50
const TAP_THRESHOLD = 10
const VELOCITY_WINDOW_MS = 100
const DOUBLE_TAP_WINDOW_MS = 300
const DOUBLE_TAP_DISTANCE = 30

type Point = { x: number; y: number }
type Phase = 'idle' | 'tracking' | 'panning' | 'pinching'
type Axis = 'h' | 'v'

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function useGestures(
  ref: React.RefObject<HTMLElement | null>,
  handlers: GestureHandlers,
  options: GestureOptions = { zoomed: false }
) {
  // Callers pass fresh objects each render; refs keep the listeners stable.
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })
  const zoomedRef = useRef(options.zoomed)
  useEffect(() => {
    zoomedRef.current = options.zoomed
  })

  // Every active pointer's last known position, keyed by pointerId — this is
  // what lets a second touch start a pinch instead of corrupting the first
  // pointer's swipe/tap delta (the bug that made concurrent touches flaky).
  const pointers = useRef(new Map<number, Point>())
  const phase = useRef<Phase>('idle')
  const trackId = useRef<number | null>(null)
  const trackStart = useRef<Point | null>(null)
  // Decided once, a few px into a 1x drag, so a vertical drag never also navigates and vice versa.
  const axis = useRef<Axis | null>(null)
  const verticalAnchor = useRef(0)
  const samples = useRef<{ t: number; y: number }[]>([])
  const panLast = useRef<Point | null>(null)
  const pinchIds = useRef<[number, number] | null>(null)
  const pinchStartDistance = useRef(1)
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function classifyTap(x: number, y: number) {
      const now = Date.now()
      const last = lastTap.current
      if (last && now - last.time < DOUBLE_TAP_WINDOW_MS && dist(last, { x, y }) < DOUBLE_TAP_DISTANCE) {
        if (tapTimer.current) clearTimeout(tapTimer.current)
        tapTimer.current = null
        lastTap.current = null
        latest.current.onDoubleTap?.({ x, y })
        return
      }
      lastTap.current = { time: now, x, y }
      if (tapTimer.current) clearTimeout(tapTimer.current)
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null
        latest.current.onTap?.()
      }, DOUBLE_TAP_WINDOW_MS)
    }

    function beginPinch() {
      const ids = Array.from(pointers.current.keys())
      const [a, b] = [ids[0], ids[1]]
      const pa = pointers.current.get(a)
      const pb = pointers.current.get(b)
      if (!pa || !pb) return
      if (axis.current === 'v') latest.current.onVerticalCancel?.()
      axis.current = null
      phase.current = 'pinching'
      pinchIds.current = [a, b]
      pinchStartDistance.current = dist(pa, pb) || 1
      latest.current.onPinchStart?.()
    }

    function onPointerDown(e: PointerEvent) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      try {
        el!.setPointerCapture(e.pointerId)
      } catch {
        // Capture can already be gone (e.g. pointer already released); harmless.
      }

      if (phase.current === 'idle') {
        phase.current = 'tracking'
        trackId.current = e.pointerId
        trackStart.current = { x: e.clientX, y: e.clientY }
        axis.current = null
        samples.current = [{ t: e.timeStamp, y: e.clientY }]
        return
      }

      // A second touch mid-gesture is always the start of a pinch, even at
      // 1x zoom (so the user can pinch in from unzoomed) — never lets it
      // corrupt the first pointer's swipe/tap classification.
      if ((phase.current === 'tracking' || phase.current === 'panning') && pointers.current.size === 2) {
        beginPinch()
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (phase.current === 'pinching' && pinchIds.current) {
        const [a, b] = pinchIds.current
        const pa = pointers.current.get(a)
        const pb = pointers.current.get(b)
        if (!pa || !pb) return
        const rect = el!.getBoundingClientRect()
        const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }
        latest.current.onPinchMove?.({
          scaleRatio: dist(pa, pb) / pinchStartDistance.current,
          centerX: mid.x - rect.left,
          centerY: mid.y - rect.top,
        })
        return
      }

      if (phase.current === 'tracking' && trackId.current === e.pointerId && trackStart.current) {
        const dx = e.clientX - trackStart.current.x
        const dy = e.clientY - trackStart.current.y
        if (Math.max(Math.abs(dx), Math.abs(dy)) < TAP_THRESHOLD) return
        if (zoomedRef.current) {
          phase.current = 'panning'
          panLast.current = { x: e.clientX, y: e.clientY }
          latest.current.onPanMove?.({ dx, dy })
          return
        }
        if (!axis.current) {
          axis.current = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h'
          verticalAnchor.current = e.clientY
        }
        if (axis.current === 'v') {
          samples.current.push({ t: e.timeStamp, y: e.clientY })
          latest.current.onVerticalDrag?.(e.clientY - verticalAnchor.current)
        }
        // A horizontal drag stays a swipe candidate; classified on pointerup below.
        return
      }

      if (phase.current === 'panning' && trackId.current === e.pointerId && panLast.current) {
        const dx = e.clientX - panLast.current.x
        const dy = e.clientY - panLast.current.y
        panLast.current = { x: e.clientX, y: e.clientY }
        latest.current.onPanMove?.({ dx, dy })
      }
    }

    function releaseVelocity(endT: number, endY: number) {
      const recent = samples.current.filter((s) => endT - s.t <= VELOCITY_WINDOW_MS)
      const first = recent[0]
      if (!first || endT === first.t) return 0
      return (endY - first.y) / (endT - first.t)
    }

    function endToIdle() {
      axis.current = null
      samples.current = []
      phase.current = 'idle'
      trackId.current = null
      trackStart.current = null
      panLast.current = null
      pinchIds.current = null
    }

    function onPointerUp(e: PointerEvent) {
      try {
        el!.releasePointerCapture(e.pointerId)
      } catch {
        // Already released; harmless.
      }

      if (phase.current === 'pinching' && pinchIds.current?.includes(e.pointerId)) {
        latest.current.onPinchEnd?.()
        pointers.current.delete(e.pointerId)
        const remaining = Array.from(pointers.current.keys())
        if (remaining.length === 1) {
          // Releasing one finger of a pinch hands off to a single-finger pan.
          phase.current = 'panning'
          trackId.current = remaining[0]
          panLast.current = pointers.current.get(remaining[0]) ?? null
          pinchIds.current = null
        } else {
          endToIdle()
        }
        return
      }

      if (phase.current === 'panning' && trackId.current === e.pointerId) {
        latest.current.onPanEnd?.()
        pointers.current.delete(e.pointerId)
        endToIdle()
        return
      }

      if (phase.current === 'tracking' && trackId.current === e.pointerId && trackStart.current) {
        const dx = e.clientX - trackStart.current.x
        const dy = e.clientY - trackStart.current.y
        const axisLocked = axis.current
        const vy = releaseVelocity(e.timeStamp, e.clientY)
        const dragDy = e.clientY - verticalAnchor.current
        const h = latest.current

        pointers.current.delete(e.pointerId)
        endToIdle()

        if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) {
          classifyTap(e.clientX, e.clientY)
          return
        }

        // Swipe-to-navigate only fires at 1x; while zoomed, a completed drag
        // that didn't escalate to panning (e.g. only crossed the tap
        // threshold right at release) is simply dropped, not misread as nav.
        if (zoomedRef.current) return

        if (axisLocked === 'v') {
          h.onVerticalRelease?.({ dy: dragDy, vy })
          return
        }
        if (Math.abs(dx) < SWIPE_HORIZONTAL_THRESHOLD) return
        if (dx < 0) h.onSwipeLeft?.()
        else h.onSwipeRight?.()
        return
      }

      // An untracked pointer lifting (e.g. a third finger); just forget it.
      pointers.current.delete(e.pointerId)
    }

    function onPointerCancel(e: PointerEvent) {
      if (phase.current === 'pinching') {
        latest.current.onPinchEnd?.()
      } else if (phase.current === 'panning' && trackId.current === e.pointerId) {
        latest.current.onPanEnd?.()
      } else if (phase.current === 'tracking' && axis.current === 'v') {
        latest.current.onVerticalCancel?.()
      }
      try {
        el!.releasePointerCapture(e.pointerId)
      } catch {
        // Already released; harmless.
      }
      pointers.current.delete(e.pointerId)
      if (pointers.current.size === 0) endToIdle()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
      if (tapTimer.current) clearTimeout(tapTimer.current)
    }
  }, [ref])
}

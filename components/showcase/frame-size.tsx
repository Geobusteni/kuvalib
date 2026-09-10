// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * The pixel size of the page frame. Blocks store position as a percentage of it;
 * react-rnd needs pixels, so drag/resize maths round-trips through here.
 */
interface FrameSize {
  width: number
  height: number
}

const FrameSizeContext = createContext<FrameSize>({ width: 0, height: 0 })

export function useFrameSize(): FrameSize {
  return useContext(FrameSizeContext)
}

export function pctToPx(pct: number, dimension: number): number {
  return (pct / 100) * dimension
}

export function pxToPct(px: number, dimension: number): number {
  if (dimension <= 0) return 0
  return (px / dimension) * 100
}

export function FrameSizeProvider({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<FrameSize>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} style={style}>
      <FrameSizeContext.Provider value={size}>{children}</FrameSizeContext.Provider>
    </div>
  )
}

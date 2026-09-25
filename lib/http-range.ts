// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

export type ByteRange = { start: number; end: number }

/**
 * Parses a `Range: bytes=…` header. Returns null when the header should be ignored
 * (unparseable, or several ranges — the caller then serves the whole body), and
 * 'unsatisfiable' for a valid single range that lies outside the body.
 */
export function parseRange(header: string, size: number): ByteRange | 'unsatisfiable' | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === '' && match[2] === '')) return null
  if (match[1] !== '' && match[2] !== '' && Number(match[1]) > Number(match[2])) return null

  let start: number
  let end: number
  if (match[1] === '') {
    const suffix = Number(match[2])
    if (suffix === 0 || size === 0) return 'unsatisfiable'
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
  }
  if (start >= size) return 'unsatisfiable'
  return { start, end }
}

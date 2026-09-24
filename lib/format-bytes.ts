// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

export type ByteUnit = 'kb' | 'mb' | 'gb'

export interface ByteParts {
  unit: ByteUnit
  value: number
  fractionDigits: number
}

// Pure and locale-free: picks the unit and precision. The caller localises the number
// and the unit label (see hooks/useFormatBytes.ts).
export function splitBytes(bytes: number): ByteParts {
  if (bytes < 1024 * 1024) return { unit: 'kb', value: Math.round(bytes / 1024), fractionDigits: 0 }
  if (bytes < 1024 * 1024 * 1024) {
    return { unit: 'mb', value: bytes / 1024 / 1024, fractionDigits: 1 }
  }
  return { unit: 'gb', value: bytes / 1024 / 1024 / 1024, fractionDigits: 2 }
}

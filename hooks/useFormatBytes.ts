// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { useFormatter, useTranslations } from 'next-intl'
import { splitBytes } from '@/lib/format-bytes'

export function useFormatBytes() {
  const t = useTranslations('upload.size')
  const format = useFormatter()
  return (bytes: number): string => {
    const { unit, value, fractionDigits } = splitBytes(bytes)
    return t(unit, {
      value: format.number(value, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }),
    })
  }
}

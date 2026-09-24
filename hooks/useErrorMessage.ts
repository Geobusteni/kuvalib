// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { useTranslations } from 'next-intl'

// Maps a stable API error code to its translated message, falling back to the generic one.
export function useErrorMessage() {
  const t = useTranslations('errors')
  return (code: unknown): string =>
    typeof code === 'string' && t.has(code as never) ? t(code as never) : t('generic')
}

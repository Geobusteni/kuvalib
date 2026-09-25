// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { useTranslations } from 'next-intl'

type ErrorBody = { error?: unknown; [param: string]: unknown }

// Maps an API error body to its translated message, falling back to the generic one.
// Extra fields on the body (e.g. maxMb) fill the message's ICU placeholders.
export function useErrorMessage() {
  const t = useTranslations('errors')
  return (body: ErrorBody | string | null | undefined): string => {
    const code = typeof body === 'string' ? body : body?.error
    if (typeof code !== 'string' || !t.has(code as never)) return t('generic')
    const params = typeof body === 'object' && body ? (body as Record<string, string | number>) : {}
    return t(code as never, params as never)
  }
}

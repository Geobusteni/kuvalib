// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function LogoutButton() {
  const router = useRouter()
  const t = useTranslations('ui.logout')

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="min-h-11 px-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      {t('signOut')}
    </button>
  )
}

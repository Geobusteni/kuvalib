// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { setupRequired } from '@/lib/users'
import LogoutButton from '@/components/ui/LogoutButton'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

// Every admin route depends on the session and live database state.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (await setupRequired()) redirect('/setup')

  const session = await requireAuth()
  const isAdmin = session.role === 'ADMIN'
  const t = await getTranslations('admin.nav')
  const tc = await getTranslations('common')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-x-4 px-4">
          <nav className="flex items-center gap-2" aria-label={t('label')}>
            <Link
              href="/projects"
              className="inline-flex min-h-11 items-center px-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              {tc('appName')}
            </Link>
            <Link
              href="/projects"
              className="inline-flex min-h-11 items-center px-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {t('projects')}
            </Link>
            {isAdmin && (
              <Link
                href="/users"
                className="inline-flex min-h-11 items-center px-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {t('users')}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}

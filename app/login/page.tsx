// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { setupRequired } from '@/lib/users'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import LoginForm from './_components/LoginForm'

export async function generateMetadata() {
  const t = await getTranslations('auth.login')
  return { title: t('metaTitle') }
}

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await setupRequired()) redirect('/setup')

  const tc = await getTranslations('common')
  const session = await getSession()
  if (session.userId) redirect('/projects')

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <LanguageSwitcher className="absolute right-2 top-2" />
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {tc('appName')}
        </h1>
        <LoginForm />
      </div>
    </div>
  )
}

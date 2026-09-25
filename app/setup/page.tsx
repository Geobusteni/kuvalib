// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { setupRequired } from '@/lib/users'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import SetupForm from './_components/SetupForm'

export async function generateMetadata() {
  const t = await getTranslations('auth.setup')
  return { title: t('metaTitle') }
}

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  if (!(await setupRequired())) redirect('/login')

  const t = await getTranslations('auth.setup')

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <LanguageSwitcher className="absolute right-2 top-2" />
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {t('welcome')}
        </h1>
        <p className="mb-8 mt-2 text-sm text-zinc-500">
          {t('intro')}
        </p>
        <SetupForm />
      </div>
    </div>
  )
}

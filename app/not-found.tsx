// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('common')

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="text-center">
        <p className="mb-4 text-sm text-zinc-500">{t('notFound')}</p>
        <Link href="/projects" className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100">
          {t('goToProjects')}
        </Link>
      </div>
    </div>
  )
}

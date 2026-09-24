// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { getTranslations } from 'next-intl/server'
import ProjectForm from '@/components/ui/ProjectForm'

export async function generateMetadata() {
  const t = await getTranslations('admin.newProject')
  return { title: t('metaTitle') }
}

export default async function NewProjectPage() {
  const t = await getTranslations('admin.newProject')
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h1>
      <ProjectForm mode="create" />
    </div>
  )
}

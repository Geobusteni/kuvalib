// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/auth'
import { listUsers } from '@/lib/users'
import UserManager from './_components/UserManager'

export async function generateMetadata() {
  const t = await getTranslations('admin.users')
  return { title: t('metaTitle') }
}

export default async function UsersPage() {
  const t = await getTranslations('admin.users')
  const session = await requireAdmin()

  const users = await listUsers()

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {t('description')}
      </p>
      <UserManager
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          name: u.name,
          role: u.role,
        }))}
        currentUserId={session.userId}
      />
    </div>
  )
}

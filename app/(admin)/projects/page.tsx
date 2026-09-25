// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth'
import { countPhotos, getUserProjects, listProjects } from '@/lib/projects'

export async function generateMetadata() {
  const t = await getTranslations('admin.projects')
  return { title: t('metaTitle') }
}

export default async function ProjectsPage() {
  const t = await getTranslations('admin.projects')
  const ta = await getTranslations('admin.accessType')
  const format = await getFormatter()
  const formatDate = (date: Date | null) =>
    date ? format.dateTime(new Date(date), { dateStyle: 'medium' }) : '—'
  const session = await requireAuth()
  const isAdmin = session.role === 'ADMIN'

  const projects = isAdmin ? await listProjects() : await getUserProjects(session.userId)
  const counts = await Promise.all(projects.map((p) => countPhotos(p.id)))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h1>
        {isAdmin && (
          <Link
            href="/projects/new"
            className="inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {t('newProject')}
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            {isAdmin ? t('empty') : t('emptyAssigned')}
          </p>
          {isAdmin && (
            <Link
              href="/projects/new"
              className="mt-2 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              {t('createFirst')}
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">{t('columns.title')}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 sm:table-cell">{t('columns.access')}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 sm:table-cell">{t('columns.date')}</th>
                <th className="hidden px-4 py-3 text-right font-medium text-zinc-500 md:table-cell">{t('columns.photos')}</th>
                <th className="hidden px-4 py-3 text-right font-medium text-zinc-500 md:table-cell">{t('columns.visits')}</th>
                <th className="hidden px-4 py-3 text-right font-medium text-zinc-500 lg:table-cell">{t('columns.downloads')}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 lg:table-cell">{t('columns.lastAccess')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                    {p.accessType === 'EMAIL' ? ta('email') : ta('password')}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">{formatDate(p.eventDate)}</td>
                  <td className="hidden px-4 py-3 text-right text-zinc-500 md:table-cell">{counts[i]}</td>
                  <td className="hidden px-4 py-3 text-right text-zinc-500 md:table-cell">{p.visitCount}</td>
                  <td className="hidden px-4 py-3 text-right text-zinc-500 lg:table-cell">{p.dlCount}</td>
                  <td className="hidden px-4 py-3 text-zinc-500 lg:table-cell">{formatDate(p.lastAccess)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

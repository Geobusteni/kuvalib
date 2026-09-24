// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { getTranslations } from 'next-intl/server'

export default async function GalleryNotFound() {
  const t = await getTranslations('gallery.notFound')
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <p className="text-center text-sm text-zinc-500">{t('message')}</p>
    </div>
  )
}

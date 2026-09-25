// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface PhotoRow {
  id: string
  filename: string
  originalName: string
}

export default function AdminPhotoGrid({
  photos,
  projectId,
}: {
  photos: PhotoRow[]
  projectId: string
}) {
  const router = useRouter()
  const t = useTranslations('admin.photoGrid')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleDelete(photoId: string) {
    setDeleting(photoId)
    await fetch(`/api/projects/${projectId}/photos/${photoId}`, { method: 'DELETE' })
    setDeleting(null)
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="admin-photo-grid"
        aria-label={open ? t('collapse') : t('expand')}
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <span>{t('count', { count: photos.length })}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden
          className={open ? 'rotate-180' : undefined}
        >
          <path
            d="M3 6l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div id="admin-photo-grid" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((photo) => {
            const base = photo.filename.replace(/\.[^.]+$/, '')
            return (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${projectId}/thumbs/${base}-sm.jpg`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <p
                  title={photo.originalName}
                  className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {photo.originalName}
                </p>
                <button
                  onClick={() => handleDelete(photo.id)}
                  disabled={deleting === photo.id}
                  aria-label={t('deletePhoto', { name: photo.originalName })}
                  className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-white opacity-0 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 disabled:opacity-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70">
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                      <path
                        d="M1 1l8 8M9 1L1 9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

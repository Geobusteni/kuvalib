// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { notFound } from 'next/navigation'
import type { Metadata, Viewport } from 'next'
import { getTranslations } from 'next-intl/server'
import { getProject, listPhotos } from '@/lib/projects'
import { recordVisit } from '@/lib/visits'
import { getShowcaseByProject } from '@/lib/showcase'
import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { toPhotoData } from '@/lib/photo-data'
import AccessGate from '@/components/gallery/AccessGate'
import Gallery from '@/components/gallery/Gallery'

type Props = { params: Promise<{ slug: string }> }

// Lets the gallery draw under a notch; the toolbar and lightbox pad themselves with env(safe-area-inset-*).
export const viewport: Viewport = { viewportFit: 'cover' }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [project, t] = await Promise.all([getProject(slug), getTranslations('gallery')])
  return {
    title: project?.title ?? t('metaTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) notFound()
  const t = await getTranslations('gallery')

  if (project.expiresAt && new Date(project.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <p className="text-center text-sm text-zinc-400">{t('expired')}</p>
      </div>
    )
  }

  if (!(await verifyGalleryAccess(slug))) {
    return <AccessGate projectId={slug} accessType={project.accessType} />
  }

  await recordVisit(slug)

  const [photos, showcase] = await Promise.all([listPhotos(slug), getShowcaseByProject(slug)])

  // Once a showcase exists, the polished presentation is the primary
  // experience — the raw gallery drops like/dislike/comment to stay out of
  // its way. The admin's feedbackEnabled setting itself is untouched, so
  // feedback reappears automatically if the showcase is deleted.
  const feedbackEnabled = project.feedbackEnabled && !showcase

  return (
    <div className="min-h-screen bg-black">
      <Gallery
        photos={photos.map((p) => toPhotoData(p, project.dlEnabled))}
        title={project.title}
        projectId={slug}
        hasArchive={project.zipEnabled && !!project.archiveName}
        feedbackEnabled={feedbackEnabled}
        feedbackResetAt={project.feedbackResetAt.toISOString()}
        showcaseHref={showcase ? `/s/${showcase.id}` : null}
      />
    </div>
  )
}

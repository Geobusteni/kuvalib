// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProject, incrementVisit, listPhotos } from '@/lib/projects'
import { getShowcaseById, pageSettingsFromRow } from '@/lib/showcase'
import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { toShowcasePhoto } from '@/lib/photo-data'
import {
  collectPhotoIds,
  HEADING_SIZE_DEFAULTS,
  TEXT_SIZE_DEFAULTS,
  type Block,
  type HeadingLevel,
  type TextSizePreset,
} from '@/lib/showcase-blocks'
import AccessGate from '@/components/gallery/AccessGate'
import { ShowcaseViewer } from '@/components/showcase/viewer/ShowcaseViewer'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const showcase = await getShowcaseById(slug)
  return {
    title: showcase?.title ?? 'Showcase',
    robots: { index: false, follow: false },
  }
}

export default async function ShowcasePage({ params }: Props) {
  const { slug } = await params
  const showcase = await getShowcaseById(slug)
  if (!showcase) notFound()

  const project = await getProject(showcase.projectId)
  if (!project) notFound()

  if (project.expiresAt && new Date(project.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <p className="text-center text-sm text-zinc-400">This showcase has expired.</p>
      </div>
    )
  }

  if (!(await verifyGalleryAccess(project.id))) {
    return <AccessGate projectId={project.id} accessType={project.accessType} />
  }

  await incrementVisit(project.id)

  const photoRecords = await listPhotos(project.id)
  const pages = showcase.pages.map((p) => ({
    id: p.id,
    blocks: (p.blocksJson ?? []) as unknown as Block[],
    settings: pageSettingsFromRow(p),
  }))
  const usedPhotoIds = new Set(collectPhotoIds(pages))

  return (
    <ShowcaseViewer
      projectId={project.id}
      pages={pages}
      photos={photoRecords
        .filter((photo) => usedPhotoIds.has(photo.id))
        .map(toShowcasePhoto)}
      settings={{
        title: showcase.title,
        eventType: showcase.eventType,
        albumBg: showcase.albumBg,
        animationStyle: showcase.animationStyle,
        autoplay: showcase.autoplay,
        autoplaySeconds: showcase.autoplaySeconds,
        playlistLoop: showcase.playlistLoop,
        headingSizes: {
          ...HEADING_SIZE_DEFAULTS,
          ...((showcase.headingSizes ?? {}) as Partial<Record<HeadingLevel, number>>),
        },
        textSizes: {
          ...TEXT_SIZE_DEFAULTS,
          ...((showcase.textSizes ?? {}) as Partial<Record<TextSizePreset, number>>),
        },
        headingFont: showcase.headingFont,
        textFont: showcase.textFont,
        dotsEnabled: showcase.dotsEnabled,
        dotColorActive: showcase.dotColorActive,
        dotColorInactive: showcase.dotColorInactive,
        customCss: showcase.customCss ?? '',
      }}
      trackIds={showcase.tracks.map((t) => t.id)}
      galleryHref={`/g/${project.id}`}
      shareUrl={`/s/${showcase.id}`}
      downloadEnabled={project.dlEnabled}
    />
  )
}

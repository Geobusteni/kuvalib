// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getProject, listPhotos } from '@/lib/projects'
import { getShowcaseByProject, pageSettingsFromRow } from '@/lib/showcase'
import { toShowcasePhoto } from '@/lib/photo-data'
import { HEADING_SIZE_DEFAULTS, TEXT_SIZE_DEFAULTS, type Block, type HeadingLevel, type TextSizePreset } from '@/lib/showcase-blocks'
import { ShowcaseBuilder } from '@/components/showcase/builder/ShowcaseBuilder'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const project = await getProject(id)
  return { title: project ? `Showcase · ${project.title}` : 'Showcase' }
}

export default async function ShowcaseBuilderPage({ params }: Props) {
  const { id } = await params
  const session = await requireAuth()

  const project = await getProject(id)
  if (!project) notFound()

  if (session.role !== 'ADMIN') {
    const assignment = await prisma.projectAssignment.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.userId } },
    })
    if (!assignment) redirect('/projects')
  }

  const showcase = await getShowcaseByProject(id)
  if (!showcase) redirect(`/projects/${id}`)

  const photos = await listPhotos(id)

  return (
    <ShowcaseBuilder
      projectId={id}
      showcaseId={showcase.id}
      settings={{
        title: showcase.title,
        eventDate: showcase.eventDate ? showcase.eventDate.toISOString().slice(0, 10) : null,
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
        dotColorActive: showcase.dotColorActive,
        dotColorInactive: showcase.dotColorInactive,
        customCss: showcase.customCss ?? '',
      }}
      pages={showcase.pages.map((p) => ({
        id: p.id,
        blocks: (p.blocksJson ?? []) as unknown as Block[],
        settings: pageSettingsFromRow(p),
      }))}
      tracks={showcase.tracks.map((t) => ({ id: t.id, originalName: t.originalName, size: t.size }))}
      photos={photos.map(toShowcasePhoto)}
      galleryHref={`/g/${id}`}
      shareUrl={`/s/${showcase.id}`}
      downloadEnabled={project.dlEnabled}
    />
  )
}

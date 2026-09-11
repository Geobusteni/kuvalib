// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import prisma from './prisma'
import type {
  ShowcaseAnimation,
  ShowcaseBg,
  ShowcaseEventType,
} from './generated/prisma/client'
import {
  buildCoverComposite,
  type Block,
  type HeadingLevel,
  type PageSettings,
  type TextSizePreset,
} from './showcase-blocks'

export type { ShowcaseAnimation, ShowcaseBg, ShowcaseEventType }

export interface ShowcaseSettingsData {
  title?: string
  eventDate?: Date | null
  eventType?: ShowcaseEventType
  albumBg?: ShowcaseBg
  animationStyle?: ShowcaseAnimation
  autoplay?: boolean
  autoplaySeconds?: number
  playlistLoop?: boolean
  headingSizes?: Partial<Record<HeadingLevel, number>>
  textSizes?: Partial<Record<TextSizePreset, number>>
  dotsEnabled?: boolean
  dotColorActive?: string | null
  dotColorInactive?: string | null
  customCss?: string | null
}

const pagesOrdered = { orderBy: { sortOrder: 'asc' } } as const
const tracksOrdered = { orderBy: { sortOrder: 'asc' } } as const

/** A ShowcasePage row's appearance columns → the PageSettings shape the
 *  builder and viewer share. Used by both the builder page and the public
 *  viewer route, which each fetch pages through Prisma directly. */
export function pageSettingsFromRow(row: {
  bg: string
  bgCustom: string | null
  bgCustomAlpha: number | null
  bgGradientFrom: string | null
  bgGradientTo: string | null
  bgGradientAngle: number | null
  borderStyle: string
  borderWidth: number
  borderColor: string | null
}): PageSettings {
  return {
    bg: row.bg as PageSettings['bg'],
    bgCustom: row.bgCustom ?? undefined,
    bgCustomAlpha: row.bgCustomAlpha ?? undefined,
    bgGradientFrom: row.bgGradientFrom ?? undefined,
    bgGradientTo: row.bgGradientTo ?? undefined,
    bgGradientAngle: row.bgGradientAngle ?? undefined,
    borderStyle: row.borderStyle as PageSettings['borderStyle'],
    borderWidth: row.borderWidth,
    borderColor: row.borderColor ?? undefined,
  }
}

export async function getShowcaseByProject(projectId: string) {
  return prisma.showcase.findUnique({
    where: { projectId },
    include: { pages: pagesOrdered, tracks: tracksOrdered },
  })
}

export async function getShowcaseById(id: string) {
  return prisma.showcase.findUnique({
    where: { id },
    include: { pages: pagesOrdered, tracks: tracksOrdered },
  })
}

/**
 * Creates the showcase and seeds it with a single Cover page. The title and date
 * are copied from the project so the cover reads sensibly straight away; the
 * admin can change everything in Album settings afterwards.
 */
export async function createShowcase(project: {
  id: string
  title: string
  eventDate: Date | null
}) {
  const dateLabel = project.eventDate ? project.eventDate.toISOString().slice(0, 10) : ''
  const coverBlocks = buildCoverComposite(project.title, dateLabel)

  return prisma.showcase.create({
    data: {
      projectId: project.id,
      title: project.title,
      eventDate: project.eventDate,
      pages: {
        create: [{ sortOrder: 0, blocksJson: coverBlocks as unknown as object }],
      },
    },
    include: { pages: pagesOrdered, tracks: tracksOrdered },
  })
}

export async function updateShowcaseSettings(id: string, data: ShowcaseSettingsData) {
  return prisma.showcase.update({ where: { id }, data })
}

export async function deleteShowcase(id: string) {
  return prisma.showcase.delete({ where: { id } })
}

/**
 * Replaces the whole page list in one transaction. A page's block tree is
 * authored and saved as a unit, so there is no per-page or per-block update path.
 * A page's own appearance (background/border) travels alongside it.
 */
export async function replacePages(
  showcaseId: string,
  pages: { blocks: Block[]; settings: PageSettings }[],
) {
  return prisma.$transaction([
    prisma.showcasePage.deleteMany({ where: { showcaseId } }),
    ...pages.map((page, index) =>
      prisma.showcasePage.create({
        data: {
          showcaseId,
          sortOrder: index,
          blocksJson: page.blocks as unknown as object,
          ...page.settings,
        },
      }),
    ),
  ])
}

export async function listTracks(showcaseId: string) {
  return prisma.showcaseTrack.findMany({ where: { showcaseId }, ...tracksOrdered })
}

export async function getTrack(id: string) {
  return prisma.showcaseTrack.findUnique({ where: { id } })
}

export async function insertTrack(data: {
  showcaseId: string
  filename: string
  originalName: string
  size: number
}) {
  const last = await prisma.showcaseTrack.findFirst({
    where: { showcaseId: data.showcaseId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  return prisma.showcaseTrack.create({
    data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 },
  })
}

export async function deleteTrack(id: string) {
  return prisma.showcaseTrack.delete({ where: { id } })
}

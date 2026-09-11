// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getProject } from '@/lib/projects'
import {
  createShowcase,
  deleteShowcase,
  getShowcaseByProject,
  updateShowcaseSettings,
  type ShowcaseSettingsData,
} from '@/lib/showcase'
import { hexColor, sanitizeColorPresets, sanitizeHeadingSizes, sanitizeTextSizes } from '@/lib/showcase-blocks'
import { deleteAudioFile } from '@/lib/storage'
import {
  ShowcaseAnimation,
  ShowcaseBg,
  ShowcaseEventType,
} from '@/lib/generated/prisma/client'

type Ctx = { params: Promise<{ id: string }> }

/** Create the project's showcase. One per project — a second attempt is 409. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  if (await getShowcaseByProject(id)) {
    return Response.json({ error: 'This project already has a showcase' }, { status: 409 })
  }

  const showcase = await createShowcase(project)
  return Response.json({ showcaseId: showcase.id }, { status: 201 })
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const showcase = await getShowcaseByProject(id)
  if (!showcase) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const data: ShowcaseSettingsData = {}

  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if ('eventDate' in body) {
    data.eventDate = body.eventDate ? new Date(body.eventDate) : null
    if (data.eventDate && Number.isNaN(data.eventDate.getTime())) {
      return Response.json({ error: 'Invalid eventDate' }, { status: 400 })
    }
  }
  if (body.eventType in ShowcaseEventType) data.eventType = body.eventType
  if (body.albumBg in ShowcaseBg) data.albumBg = body.albumBg
  if (body.animationStyle in ShowcaseAnimation) data.animationStyle = body.animationStyle
  if (typeof body.autoplay === 'boolean') data.autoplay = body.autoplay
  if (typeof body.playlistLoop === 'boolean') data.playlistLoop = body.playlistLoop
  if (Number.isFinite(body.autoplaySeconds)) {
    data.autoplaySeconds = Math.min(60, Math.max(2, Math.round(body.autoplaySeconds)))
  }
  if ('headingSizes' in body) data.headingSizes = sanitizeHeadingSizes(body.headingSizes)
  if ('textSizes' in body) data.textSizes = sanitizeTextSizes(body.textSizes)
  if ('colorPresets' in body) data.colorPresets = sanitizeColorPresets(body.colorPresets)
  if (typeof body.dotsEnabled === 'boolean') data.dotsEnabled = body.dotsEnabled
  if ('dotColorActive' in body) data.dotColorActive = hexColor(body.dotColorActive) ?? null
  if ('dotColorInactive' in body) data.dotColorInactive = hexColor(body.dotColorInactive) ?? null
  if ('customCss' in body) {
    data.customCss = typeof body.customCss === 'string' ? body.customCss.slice(0, 20_000) : null
  }

  const updated = await updateShowcaseSettings(showcase.id, data)
  return Response.json({ ok: true, showcase: updated })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const showcase = await getShowcaseByProject(id)
  if (!showcase) return Response.json({ error: 'Not found' }, { status: 404 })

  await Promise.all(
    showcase.tracks.map((track) => deleteAudioFile(id, track.filename).catch(() => {})),
  )
  await deleteShowcase(showcase.id)
  return Response.json({ ok: true })
}

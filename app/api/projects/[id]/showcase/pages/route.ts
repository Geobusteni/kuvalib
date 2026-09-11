// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getShowcaseByProject, replacePages } from '@/lib/showcase'
import { sanitizeBlocks, sanitizePageSettings } from '@/lib/showcase-blocks'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Replaces the showcase's whole page list. The builder autosaves the entire deck
 * as one payload — a page's block tree is one JSON blob, never patched per block.
 */
export async function PUT(request: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const showcase = await getShowcaseByProject(id)
  if (!showcase) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.pages) || body.pages.length === 0) {
    return Response.json({ error: 'pages required' }, { status: 400 })
  }
  if (body.pages.length > 100) {
    return Response.json({ error: 'Too many pages' }, { status: 400 })
  }

  const pages = (body.pages as unknown[]).map((page) => ({
    blocks: sanitizeBlocks((page as { blocks?: unknown })?.blocks),
    settings: sanitizePageSettings((page as { settings?: unknown })?.settings),
  }))

  await replacePages(showcase.id, pages)
  return Response.json({ ok: true })
}

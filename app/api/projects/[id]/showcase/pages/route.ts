// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getShowcaseByProject, replacePages } from '@/lib/showcase'
import { LUCIDE_PATHS } from '@/lib/icons/lucide-paths'
import { parseIconId } from '@/lib/icons/ids'
import { sanitizeBlocks, sanitizePageSettings } from '@/lib/showcase-blocks'

type Ctx = { params: Promise<{ id: string }> }

/** The block sanitiser only checks an icon id's shape; here the built-in ones are also checked against the shipped set. */
function isKnownIcon(id: string): boolean {
  const ref = parseIconId(id)
  return ref?.kind === 'custom' || (ref?.kind === 'lucide' && Object.hasOwn(LUCIDE_PATHS, ref.key))
}

/**
 * Replaces the showcase's whole page list. The builder autosaves the entire deck
 * as one payload — a page's block tree is one JSON blob, never patched per block.
 */
export async function PUT(request: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const showcase = await getShowcaseByProject(id)
  if (!showcase) return Response.json({ error: 'not_found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.pages) || body.pages.length === 0) {
    return Response.json({ error: 'pages_required' }, { status: 400 })
  }
  if (body.pages.length > 100) {
    return Response.json({ error: 'too_many_pages' }, { status: 400 })
  }

  const pages = (body.pages as unknown[]).map((page) => ({
    blocks: sanitizeBlocks((page as { blocks?: unknown })?.blocks, isKnownIcon),
    settings: sanitizePageSettings((page as { settings?: unknown })?.settings),
  }))

  await replacePages(showcase.id, pages)
  return Response.json({ ok: true })
}

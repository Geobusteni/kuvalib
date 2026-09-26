// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import {
  countCustomIcons,
  createCustomIcon,
  listCustomIcons,
  MAX_CUSTOM_ICONS,
  MAX_ICON_NAME_LENGTH,
} from '@/lib/custom-icons'
import { SVG_MAX_BYTES, SvgSanitizeError } from '@/lib/svg-sanitize'

export async function GET() {
  await requireAdmin()
  return Response.json({ icons: await listCustomIcons() })
}

/** Accepts `{ name, svg }` as JSON, or multipart with `name` and either `svg` (text) or `file` (.svg). */
export async function POST(request: NextRequest) {
  await requireAdmin()

  // The body is bounded up front so an oversized upload is never buffered whole.
  if (Number(request.headers.get('content-length') ?? 0) > SVG_MAX_BYTES * 2) {
    return Response.json({ error: 'svg_too_large' }, { status: 413 })
  }

  let name = ''
  let svg = ''
  try {
    if ((request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (file instanceof File) {
        if (file.size > SVG_MAX_BYTES) return Response.json({ error: 'svg_too_large' }, { status: 413 })
        svg = await file.text()
        name = file.name.replace(/\.svg$/i, '')
      } else if (typeof form.get('svg') === 'string') {
        svg = form.get('svg') as string
      }
      if (typeof form.get('name') === 'string') name = form.get('name') as string
    } else {
      const body = (await request.json()) as { name?: unknown; svg?: unknown }
      if (typeof body.svg === 'string') svg = body.svg
      if (typeof body.name === 'string') name = body.name
    }
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  name = name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!name) return Response.json({ error: 'icon_name_required' }, { status: 400 })
  if (name.length > MAX_ICON_NAME_LENGTH) {
    return Response.json({ error: 'icon_name_too_long', max: MAX_ICON_NAME_LENGTH }, { status: 400 })
  }
  if (!svg.trim()) return Response.json({ error: 'icon_svg_required' }, { status: 400 })

  if ((await countCustomIcons()) >= MAX_CUSTOM_ICONS) {
    return Response.json({ error: 'icon_limit_reached', max: MAX_CUSTOM_ICONS }, { status: 409 })
  }

  try {
    return Response.json({ ok: true, icon: await createCustomIcon(name, svg) })
  } catch (error) {
    if (error instanceof SvgSanitizeError) {
      return Response.json({ error: error.code, detail: error.detail ?? '' }, { status: 400 })
    }
    console.error('[icons] create failed:', error)
    return Response.json({ error: 'generic' }, { status: 500 })
  }
}

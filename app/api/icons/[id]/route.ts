// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { customIconExists, deleteCustomIcon, isCustomIconInUse } from '@/lib/custom-icons'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  if (!(await customIconExists(id))) return Response.json({ error: 'icon_not_found' }, { status: 404 })
  if (await isCustomIconInUse(id)) return Response.json({ error: 'icon_in_use' }, { status: 409 })

  await deleteCustomIcon(id)
  return Response.json({ ok: true })
}

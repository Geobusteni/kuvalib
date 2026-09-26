// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import prisma from './prisma'
import { customIconId, parseIconId, type IconLibrary } from './icons/ids'
import { LUCIDE_PATHS } from './icons/lucide-paths'
import { safeSvg, sanitizeSvg } from './svg-sanitize'

export const MAX_CUSTOM_ICONS = 200
export const MAX_ICON_NAME_LENGTH = 60

export interface CustomIconRow {
  id: string
  name: string
  svg: string
}

function toRow(row: { id: string; name: string; svg: string }): CustomIconRow | null {
  const clean = safeSvg(row.svg)
  return clean ? { id: row.id, name: row.name, svg: clean.svg } : null
}

export async function listCustomIcons(): Promise<CustomIconRow[]> {
  const rows = await prisma.customIcon.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] })
  return rows.map(toRow).filter((r): r is CustomIconRow => r !== null)
}

export async function countCustomIcons(): Promise<number> {
  return prisma.customIcon.count()
}

/** Throws SvgSanitizeError when the markup is rejected. */
export async function createCustomIcon(name: string, rawSvg: string): Promise<CustomIconRow> {
  const { svg } = sanitizeSvg(rawSvg)
  const row = await prisma.customIcon.create({ data: { name, svg } })
  return { id: row.id, name: row.name, svg: row.svg }
}

export async function deleteCustomIcon(id: string): Promise<boolean> {
  const { count } = await prisma.customIcon.deleteMany({ where: { id } })
  return count > 0
}

export async function customIconExists(id: string): Promise<boolean> {
  return (await prisma.customIcon.count({ where: { id } })) > 0
}

/** Whether any showcase page still places `custom:<id>`. Scans every page's block JSON: admin-only and rare, so simple beats indexed. */
export async function isCustomIconInUse(id: string): Promise<boolean> {
  const needle = `"${customIconId(id)}"`
  const pages = await prisma.showcasePage.findMany({ select: { blocksJson: true } })
  return pages.some((p) => JSON.stringify(p.blocksJson).includes(needle))
}

/** Loads exactly the icons a showcase references. Custom markup is re-sanitised; anything invalid or unknown is left out. */
export async function loadIconLibrary(iconIds: string[]): Promise<IconLibrary> {
  const builtin: IconLibrary['builtin'] = {}
  const customKeys: string[] = []
  for (const id of iconIds) {
    const ref = parseIconId(id)
    if (!ref) continue
    if (ref.kind === 'lucide') {
      if (Object.hasOwn(LUCIDE_PATHS, ref.key)) builtin[ref.key] = LUCIDE_PATHS[ref.key]
    } else {
      customKeys.push(ref.key)
    }
  }
  const custom: IconLibrary['custom'] = {}
  if (customKeys.length > 0) {
    const rows = await prisma.customIcon.findMany({ where: { id: { in: customKeys } } })
    for (const row of rows) {
      const clean = toRow(row)
      if (clean) custom[row.id] = { svg: clean.svg }
    }
  }
  return { builtin, custom }
}

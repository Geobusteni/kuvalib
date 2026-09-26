// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/** An icon reference stored on a block: `lucide:<name>` (built in) or `custom:<id>` (admin-uploaded). */
export type IconRef = { kind: 'lucide' | 'custom'; key: string }

export function lucideIconId(name: string): string {
  return `lucide:${name}`
}

export function customIconId(id: string): string {
  return `custom:${id}`
}

export function parseIconId(icon: string | undefined | null): IconRef | null {
  if (!icon) return null
  const m = /^(lucide|custom):([A-Za-z0-9-]{1,64})$/.exec(icon)
  return m ? { kind: m[1] as IconRef['kind'], key: m[2] } : null
}

/** What a page needs in order to draw the icons it references. */
export interface IconLibrary {
  /** Lucide name to the inside of its 24x24 stroke icon. */
  builtin: Record<string, string>
  /** Custom icon id to its sanitised SVG. */
  custom: Record<string, { svg: string }>
}

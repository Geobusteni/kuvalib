// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useMemo, useState } from 'react'
import { LUCIDE_PATHS } from '@/lib/icons/lucide-paths'
import { IconsProvider, type IconManager } from '../icons-context'

export interface CustomIconItem {
  id: string
  name: string
  svg: string
}

/** The builder's icon source: the whole built-in set plus the admin's live custom-icon list. */
export function BuilderIconsProvider({
  initialIcons,
  canManage,
  children,
}: {
  initialIcons: CustomIconItem[]
  canManage: boolean
  children: React.ReactNode
}) {
  const [icons, setIcons] = useState(initialIcons)

  const reload = useCallback(async () => {
    const res = await fetch('/api/icons')
    if (!res.ok) return
    const data = (await res.json()) as { icons?: CustomIconItem[] }
    if (Array.isArray(data.icons)) setIcons(data.icons)
  }, [])

  const library = useMemo(
    () => ({ builtin: LUCIDE_PATHS, custom: Object.fromEntries(icons.map((i) => [i.id, { svg: i.svg }])) }),
    [icons],
  )
  const manager = useMemo<IconManager>(() => ({ icons, canManage, reload }), [icons, canManage, reload])

  return (
    <IconsProvider library={library} manager={manager}>
      {children}
    </IconsProvider>
  )
}

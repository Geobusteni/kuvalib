// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { createContext, useContext } from 'react'
import type { IconLibrary } from '@/lib/icons/ids'

export type { IconLibrary }

/** Builder only: the named custom-icon list, and whether this person may change it. */
export interface IconManager {
  icons: { id: string; name: string; svg: string }[]
  canManage: boolean
  /** Refetch the list after one was added or removed. */
  reload: () => Promise<void>
}

interface IconsContextValue {
  library: IconLibrary
  manager: IconManager | null
}

const IconsContext = createContext<IconsContextValue>({ library: { builtin: {}, custom: {} }, manager: null })

/**
 * Supplies the icons a subtree may draw. The viewer passes only what its blocks
 * reference (resolved on the server, so the built-in set never ships to it);
 * the builder passes the whole built-in set, the live custom icons and a manager.
 */
export function IconsProvider({
  library,
  manager = null,
  children,
}: {
  library: IconLibrary
  manager?: IconManager | null
  children: React.ReactNode
}) {
  return <IconsContext.Provider value={{ library, manager }}>{children}</IconsContext.Provider>
}

export function useIconLibrary(): IconLibrary {
  return useContext(IconsContext).library
}

export function useIconManager(): IconManager | null {
  return useContext(IconsContext).manager
}

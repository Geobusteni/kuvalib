// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { createContext, useContext } from 'react'
import type { ShowcasePhoto } from '@/lib/showcase-blocks'

export type { ShowcasePhoto }

const PhotosContext = createContext<ShowcasePhoto[]>([])

export function PhotosProvider({
  photos,
  children,
}: {
  photos: ShowcasePhoto[]
  children: React.ReactNode
}) {
  return <PhotosContext.Provider value={photos}>{children}</PhotosContext.Provider>
}

const KenBurnsMinContext = createContext(0)

// The shortest Ken Burns duration allowed (seconds); see kenBurnsMinSeconds in lib/showcase-blocks.
export function KenBurnsMinProvider({ seconds, children }: { seconds: number; children: React.ReactNode }) {
  return <KenBurnsMinContext.Provider value={seconds}>{children}</KenBurnsMinContext.Provider>
}

export function useKenBurnsMin(): number {
  return useContext(KenBurnsMinContext)
}

export function usePhotos(): ShowcasePhoto[] {
  return useContext(PhotosContext)
}

export function usePhoto(photoId: string | undefined): ShowcasePhoto | undefined {
  const photos = usePhotos()
  return photoId ? photos.find((p) => p.id === photoId) : undefined
}

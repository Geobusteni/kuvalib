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

export function usePhotos(): ShowcasePhoto[] {
  return useContext(PhotosContext)
}

export function usePhoto(photoId: string | undefined): ShowcasePhoto | undefined {
  const photos = usePhotos()
  return photoId ? photos.find((p) => p.id === photoId) : undefined
}

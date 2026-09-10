// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import type { PhotoData } from '@/components/gallery/ImageTile'
import type { ShowcasePhoto } from '@/lib/showcase-blocks'

interface PhotoRecord {
  id: string
  projectId: string
  filename: string
  originalName: string
  width: number
  height: number
}

export function toPhotoData(photo: PhotoRecord, dlEnabled: boolean): PhotoData {
  const base = photo.filename.replace(/\.[^.]+$/, '')
  const dir = `/api/uploads/${photo.projectId}`
  return {
    id: photo.id,
    filename: photo.originalName,
    width: photo.width,
    height: photo.height,
    thumbSm: `${dir}/thumbs/${base}-sm.jpg`,
    thumbLg: `${dir}/thumbs/${base}-lg.jpg`,
    // Downloads route through the photo id so the server can restore the original name.
    original: dlEnabled ? `/api/projects/${photo.projectId}/photos/${photo.id}/download` : null,
  }
}

/** The subset the showcase builder and viewer need for a project photo. */
export function toShowcasePhoto(photo: PhotoRecord): ShowcasePhoto {
  const base = photo.filename.replace(/\.[^.]+$/, '')
  const dir = `/api/uploads/${photo.projectId}`
  return {
    id: photo.id,
    originalName: photo.originalName,
    thumbSm: `${dir}/thumbs/${base}-sm.jpg`,
    thumbLg: `${dir}/thumbs/${base}-lg.jpg`,
  }
}

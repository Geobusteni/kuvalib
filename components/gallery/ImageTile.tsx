// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

export interface PhotoData {
  id: string
  filename: string
  width: number
  height: number
  thumbSm: string
  thumbLg: string
  original: string | null
}

export type PhotoReaction = 'LIKE' | 'DISLIKE' | 'COMMENT' | null

interface ImageTileProps {
  photo: PhotoData
  index: number
  total: number
  mode: 'gallery' | 'selection'
  selected: boolean
  reaction: PhotoReaction
  onOpen: (index: number) => void
  onToggleSelect: (id: string) => void
}

export default function ImageTile({
  photo,
  index,
  total,
  mode,
  selected,
  reaction,
  onOpen,
  onToggleSelect,
}: ImageTileProps) {
  const selecting = mode === 'selection'
  const position = `${index + 1} of ${total}`

  function handleClick() {
    if (selecting) onToggleSelect(photo.id)
    else onOpen(index)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === ' ') {
      e.preventDefault()
      onToggleSelect(photo.id)
    }
  }

  // A sighted-user reinforcement only — the primary, non-color-alone signal is
  // this suffix on the tile's own label plus the feedback row's own
  // aria-pressed/disabled state below it.
  const reactionRing =
    reaction === 'LIKE'
      ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-black'
      : reaction === 'DISLIKE'
        ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-black'
        : reaction === 'COMMENT'
          ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black'
          : ''
  const reactionSuffix =
    reaction === 'LIKE'
      ? ', liked'
      : reaction === 'DISLIKE'
        ? ', disliked'
        : reaction === 'COMMENT'
          ? ', commented'
          : ''

  return (
    <button
      data-photo-index={index}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={
        (selecting
          ? `${selected ? 'Deselect' : 'Select'} photo ${position}`
          : `Open photo ${position}`) + reactionSuffix
      }
      aria-pressed={selecting ? selected : undefined}
      className={`group relative block w-full overflow-hidden rounded-sm bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${reactionRing}`}
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbSm}
        srcSet={`${photo.thumbSm} 400w, ${photo.thumbLg} 1200w`}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block h-full w-full object-cover"
      />

      {selecting && (
        <span
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center transition-colors ${
            selected ? 'bg-black/40' : 'group-hover:bg-black/10'
          }`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
              selected ? 'border-white bg-white' : 'border-white/80'
            }`}
          >
            {selected && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden>
                <path
                  d="M1 5l3 3 7-7"
                  stroke="#000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </span>
      )}
    </button>
  )
}

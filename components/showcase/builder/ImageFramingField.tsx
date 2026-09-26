// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { clamp, IMAGE_SCALE_MAX, IMAGE_SCALE_MIN, type Block } from '@/lib/showcase-blocks'
import type { ShowcasePhoto } from '../photos-context'

const FRAME_ASPECT = 16 / 10
const BUTTON_CLASS =
  'min-h-11 rounded-lg border border-zinc-300 px-3 text-xs font-medium hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800'

interface Props {
  block: Block
  photo: ShowcasePhoto | undefined
  /** `merge` folds a burst of edits (a drag) into one undo step. */
  onChange: (patch: Partial<Block>, merge?: boolean) => void
}

/** Focus point and zoom for an Image block. The preview draws the photo whole,
 *  with the part the block actually shows lit and the rest dimmed. */
export function ImageFramingField({ block, photo, onChange }: Props) {
  const t = useTranslations('showcaseBuilder.settingsPanel')
  const [photoAspect, setPhotoAspect] = useState(1.5)

  const fx = block.focusX ?? 50
  const fy = block.focusY ?? 50
  const scale = block.imageScale ?? 100

  if (!photo) {
    return <p className="text-xs text-zinc-500">{t('framingNeedsPhoto')}</p>
  }

  const blockAspect = (block.w * FRAME_ASPECT) / block.h
  const baseW = photoAspect > blockAspect ? blockAspect / photoAspect : 1
  const baseH = photoAspect > blockAspect ? 1 : photoAspect / blockAspect
  const visW = baseW / (scale / 100)
  const visH = baseH / (scale / 100)
  const visLeft = (fx / 100) * (1 - visW)
  const visTop = (fy / 100) * (1 - visH)

  const setFocus = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onChange(
      {
        focusX: Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)),
        focusY: Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)),
      },
      true,
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('framing')}</span>

      <div className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
        {t('focusPoint')}
        <div
          data-testid="focus-preview"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            setFocus(e)
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) setFocus(e)
          }}
          onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
          className="relative mx-auto cursor-crosshair touch-none select-none"
          style={{ aspectRatio: String(photoAspect), width: `min(100%, ${240 * photoAspect}px)` }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- natural-size preview, aspect ratio is read from the file */}
            <img
              src={photo.thumbLg}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget
                if (naturalWidth && naturalHeight) setPhotoAspect(naturalWidth / naturalHeight)
              }}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
            <div
              data-testid="focus-visible-area"
              aria-hidden="true"
              className="pointer-events-none absolute border border-white"
              style={{
                left: `${visLeft * 100}%`,
                top: `${visTop * 100}%`,
                width: `${visW * 100}%`,
                height: `${visH * 100}%`,
                boxShadow: '0 0 0 999px rgba(0,0,0,0.55)',
              }}
            />
          </div>
          <div
            data-testid="focus-handle"
            aria-hidden="true"
            className="pointer-events-none absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: `${fx}%`, top: `${fy}%` }}
          >
            <span className="h-4 w-4 rounded-full border-2 border-white bg-zinc-900/60 shadow ring-1 ring-black/60" />
          </div>
        </div>
        <span className="text-[11px] font-normal text-zinc-400">{t('focusHint')}</span>
      </div>

      <label className="text-[11px] text-zinc-400">
        {t('focusHorizontal', { value: fx })}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={fx}
          aria-valuetext={t('percentValue', { value: fx })}
          onChange={(e) => onChange({ focusX: parseInt(e.target.value, 10) }, true)}
          className="h-11 w-full"
        />
      </label>
      <label className="text-[11px] text-zinc-400">
        {t('focusVertical', { value: fy })}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={fy}
          aria-valuetext={t('percentValue', { value: fy })}
          onChange={(e) => onChange({ focusY: parseInt(e.target.value, 10) }, true)}
          className="h-11 w-full"
        />
      </label>
      <button
        type="button"
        className={BUTTON_CLASS}
        disabled={fx === 50 && fy === 50}
        onClick={() => onChange({ focusX: 50, focusY: 50 })}
      >
        {t('resetFocus')}
      </button>

      <label className="text-[11px] text-zinc-400">
        {t('imageScale', { value: scale })}
        <input
          type="range"
          min={IMAGE_SCALE_MIN}
          max={IMAGE_SCALE_MAX}
          step={5}
          value={scale}
          aria-valuetext={t('percentValue', { value: scale })}
          onChange={(e) => onChange({ imageScale: parseInt(e.target.value, 10) }, true)}
          className="h-11 w-full"
        />
        <span className="block">{t('imageScaleHint')}</span>
      </label>
      <button
        type="button"
        className={BUTTON_CLASS}
        disabled={scale === IMAGE_SCALE_MIN}
        onClick={() => onChange({ imageScale: IMAGE_SCALE_MIN })}
      >
        {t('resetScale')}
      </button>
    </div>
  )
}

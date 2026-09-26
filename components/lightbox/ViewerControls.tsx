// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
} from '@/components/ui/icons'

interface ViewerControlsProps {
  currentIndex: number
  total: number
  fullscreenCapable: boolean
  isFullscreen: boolean
  controlsVisible: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onToggleFullscreen: () => void
}

export default function ViewerControls({
  currentIndex,
  total,
  fullscreenCapable,
  isFullscreen,
  controlsVisible,
  onPrev,
  onNext,
  onClose,
  onToggleFullscreen,
}: ViewerControlsProps) {
  const t = useTranslations('lightbox')
  const visible = controlsVisible

  return (
    <>
      {/* Top bar */}
      <div
        aria-hidden={!visible}
        className={`absolute inset-x-0 top-0 z-10 flex min-h-14 items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent pl-[max(1rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] transition-opacity duration-200 [.reduce-motion_&]:transition-none ${
          visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <span className="text-sm text-white/70">
          {t('counter', { index: currentIndex + 1, total })}
        </span>
        <div className="flex items-center gap-1">
          {fullscreenCapable && (
            <button
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
              className={iconBtn}
              tabIndex={visible ? 0 : -1}
            >
              {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label={t('close')}
            className={iconBtn}
            tabIndex={visible ? 0 : -1}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        aria-label={t('previous')}
        className={`${navBtn} left-[max(0.5rem,env(safe-area-inset-left))] ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} disabled:opacity-0`}
        tabIndex={visible ? 0 : -1}
      >
        <ChevronLeftIcon />
      </button>
      <button
        onClick={onNext}
        disabled={currentIndex === total - 1}
        aria-label={t('next')}
        className={`${navBtn} right-[max(0.5rem,env(safe-area-inset-right))] ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} disabled:opacity-0`}
        tabIndex={visible ? 0 : -1}
      >
        <ChevronRightIcon />
      </button>
    </>
  )
}

const iconBtn =
  'flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors'

const navBtn =
  'absolute top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-opacity duration-200 [.reduce-motion_&]:transition-none'

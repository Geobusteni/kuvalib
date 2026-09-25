// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

interface ToolbarProps {
  title: string
  mode: 'gallery' | 'selection'
  selectedCount: number
  /** Link to this project's showcase, when it has one. */
  showcaseHref: string | null
  onEnterSelection: () => void
  onExitSelection: () => void
  onOpenDownloadOptions: () => void
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-center text-sm font-medium leading-none text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'

export default function Toolbar({
  title,
  mode,
  selectedCount,
  showcaseHref,
  onEnterSelection,
  onExitSelection,
  onOpenDownloadOptions,
}: ToolbarProps) {
  const t = useTranslations('gallery.toolbar')

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-3 bg-black/80 pb-1 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.25rem,env(safe-area-inset-top))] backdrop-blur-sm">
      <span title={title} className="min-w-0 flex-1 basis-32 truncate text-sm font-medium text-zinc-100">
        {title}
      </span>

      {mode === 'gallery' ? (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-1">
          {showcaseHref && (
            <a href={showcaseHref} className={buttonClass}>
              {t('viewShowcase')}
            </a>
          )}
          <LanguageSwitcher compact className={buttonClass} />
          <button onClick={onEnterSelection} className={buttonClass}>
            {t('select')}
          </button>
        </div>
      ) : (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-1">
          <button onClick={onExitSelection} className={buttonClass}>
            {t('cancel')}
          </button>
          <button
            onClick={onOpenDownloadOptions}
            disabled={selectedCount === 0}
            aria-haspopup="dialog"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-3 text-center text-sm font-medium leading-none text-black transition-colors hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40"
          >
            {selectedCount > 0 ? t('downloadCount', { count: selectedCount }) : t('download')}
          </button>
        </div>
      )}
    </div>
  )
}

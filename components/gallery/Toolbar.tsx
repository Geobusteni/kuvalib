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
  /** Download URL of the photographer's uploaded ZIP, when there is one. */
  archiveHref: string | null
  onEnterSelection: () => void
  onExitSelection: () => void
  onOpenDownloadOptions: () => void
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-center text-sm font-medium leading-none text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'

const iconButtonClass = `${buttonClass} min-w-11 px-0`

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export default function Toolbar({
  title,
  mode,
  selectedCount,
  showcaseHref,
  archiveHref,
  onEnterSelection,
  onExitSelection,
  onOpenDownloadOptions,
}: ToolbarProps) {
  const t = useTranslations('gallery.toolbar')

  return (
    <div className="sticky top-0 z-30 bg-black/80 pb-1 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm">
      <p title={title} className="truncate text-base font-medium text-zinc-100">
        {title}
      </p>

      {mode === 'gallery' ? (
        <div className="-ml-2 flex items-center gap-1">
          {showcaseHref && (
            <a href={showcaseHref} aria-label={t('viewShowcase')} title={t('viewShowcase')} className={iconButtonClass}>
              <Icon>
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path d="M10 8.5v4l3.5-2z" />
                <path d="M8 21h8M12 17v4" />
              </Icon>
            </a>
          )}
          <button onClick={onEnterSelection} aria-label={t('select')} title={t('select')} className={iconButtonClass}>
            <Icon>
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M8.5 12.5l2.5 2.5 4.5-5" />
            </Icon>
          </button>
          {archiveHref && (
            <a href={archiveHref} download aria-label={t('downloadZip')} title={t('downloadZip')} className={iconButtonClass}>
              <Icon>
                <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
                <path d="M4 19h16" />
              </Icon>
            </a>
          )}
          <LanguageSwitcher compact className={`${buttonClass} ml-auto`} />
        </div>
      ) : (
        <div className="-ml-2 flex flex-wrap items-center gap-1">
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

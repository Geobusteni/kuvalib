// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { LegendButton } from '@/components/ui/Legend'
import Tooltip from '@/components/ui/Tooltip'
import { ArchiveIcon, SelectIcon, SlideshowIcon } from '@/components/ui/icons'
import { useLegend } from '@/hooks/useLegend'
import GalleryLegend from './GalleryLegend'

interface ToolbarProps {
  title: string
  mode: 'gallery' | 'selection'
  selectedCount: number
  /** Link to this project's showcase, when it has one. */
  showcaseHref: string | null
  /** Download URL of the photographer's uploaded ZIP, when there is one. */
  archiveHref: string | null
  feedbackEnabled: boolean
  onEnterSelection: () => void
  onExitSelection: () => void
  onOpenDownloadOptions: () => void
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-center text-sm font-medium leading-none text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'

const iconButtonClass = `${buttonClass} min-w-11 px-0`

// Phones: the second line of the sticky header. From md up: a pill that floats over the page,
// like the slideshow's controls, so the photos get the whole width.
const actionsClass =
  '-ml-2 flex flex-wrap items-center gap-1 md:fixed md:right-[max(1rem,env(safe-area-inset-right))] md:top-[max(0.75rem,env(safe-area-inset-top))] md:z-30 md:ml-0 md:flex-nowrap md:rounded-full md:bg-black/60 md:px-2 md:ring-1 md:ring-white/15 md:backdrop-blur-sm'

// Under the header's second line on phones; anchored under the pill from md up.
const legendClass =
  'absolute right-[max(1rem,env(safe-area-inset-right))] top-full z-40 mt-1 max-h-[min(70dvh,calc(100dvh-8rem))] md:fixed md:top-[calc(max(0.75rem,env(safe-area-inset-top))+4rem)] md:mt-0 md:max-h-[calc(100dvh-6rem)]'

export default function Toolbar({
  title,
  mode,
  selectedCount,
  showcaseHref,
  archiveHref,
  feedbackEnabled,
  onEnterSelection,
  onExitSelection,
  onOpenDownloadOptions,
}: ToolbarProps) {
  const t = useTranslations('gallery.toolbar')
  const tt = useTranslations('legend')
  const legendId = useId()
  const legend = useLegend()

  return (
    <div className="sticky top-0 z-30 bg-black/80 pb-1 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm md:static md:bg-transparent md:pb-0 md:pr-56 md:pt-5 md:backdrop-blur-none">
      <p title={title} className="truncate text-base font-medium text-zinc-100 md:text-lg">
        {title}
      </p>

      {mode === 'gallery' ? (
        <div className={actionsClass}>
          {showcaseHref && (
            <Tooltip label={t('viewShowcase')}>
              <a href={showcaseHref} aria-label={t('viewShowcase')} className={iconButtonClass}>
                <SlideshowIcon />
              </a>
            </Tooltip>
          )}
          <Tooltip label={t('select')}>
            <button onClick={onEnterSelection} aria-label={t('select')} className={iconButtonClass}>
              <SelectIcon />
            </button>
          </Tooltip>
          {archiveHref && (
            <Tooltip label={t('downloadZip')}>
              <a href={archiveHref} download aria-label={t('downloadZip')} className={iconButtonClass}>
                <ArchiveIcon />
              </a>
            </Tooltip>
          )}
          <Tooltip label={tt('open')} className="ml-auto md:ml-0" suppress={legend.open}>
            <LegendButton
              open={legend.open}
              controls={legendId}
              onClick={legend.toggle}
              buttonRef={legend.triggerRef}
              className={iconButtonClass}
            />
          </Tooltip>
          <LanguageSwitcher compact tooltip className={buttonClass} />
        </div>
      ) : (
        <div className={`${actionsClass} flex-wrap`}>
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

      {mode === 'gallery' && legend.open && (
        <GalleryLegend
          id={legendId}
          panelRef={legend.panelRef}
          onClose={() => legend.close(true)}
          hasShowcase={showcaseHref !== null}
          hasArchive={archiveHref !== null}
          feedbackEnabled={feedbackEnabled}
          className={legendClass}
        />
      )}
    </div>
  )
}

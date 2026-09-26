// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { RefObject } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Legend, { type LegendSection } from '@/components/ui/Legend'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyLinkIcon,
  GalleryIcon,
  DownloadIcon,
  FullscreenIcon,
  MoreIcon,
  PlayPauseIcon,
  SpeakerIcon,
  ThumbnailsIcon,
} from '@/components/ui/icons'
import { locales, type Locale } from '@/lib/locales'

export type LegendMusic = 'autostarted' | 'manual' | null

export default function ShowcaseLegend({
  id,
  panelRef,
  onClose,
  className,
  music,
  showFullscreen,
  showDownload,
  showPages,
  showDots,
}: {
  id: string
  panelRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  className: string
  music: LegendMusic
  showFullscreen: boolean
  showDownload: boolean
  showPages: boolean
  showDots: boolean
}) {
  const t = useTranslations('showcaseViewer.legend')
  const tc = useTranslations('showcaseViewer.controls')
  const tm = useTranslations('showcaseViewer.music')
  const tn = useTranslations('showcaseViewer.nav')
  const tg = useTranslations('language')
  const tt = useTranslations('legend')
  const locale = useLocale()
  const nextLocale = locales[(locales.indexOf(locale as Locale) + 1) % locales.length]

  const sections: LegendSection[] = [
    {
      heading: t('controls.heading'),
      items: [
        { icon: <GalleryIcon />, name: tc('gallery'), description: t('controls.gallery') },
        { icon: <PlayPauseIcon playing={false} />, name: tc('playSlideshow'), description: t('controls.autoplay') },
        ...(music === 'autostarted'
          ? [{ icon: <SpeakerIcon waves />, name: tm('mute'), description: t('controls.musicMute') }]
          : music === 'manual'
            ? [{ icon: <SpeakerIcon waves={false} />, name: tm('play'), description: t('controls.musicPlay') }]
            : []),
        { icon: <ThumbnailsIcon />, name: tc('togglePageThumbnails'), description: t('controls.thumbnails') },
        ...(showFullscreen
          ? [{ icon: <FullscreenIcon size={18} strokeWidth={1.6} />, name: tc('toggleFullscreen'), description: t('controls.fullscreen') }]
          : []),
        { icon: <CopyLinkIcon />, name: tc('copyLink'), description: t('controls.copyLink') },
        ...(showDownload
          ? [{ icon: <DownloadIcon size={18} strokeWidth={1.6} />, name: tc('downloadAlbum'), description: t('controls.download') }]
          : []),
        {
          icon: <span className="text-xs font-medium uppercase">{locale}</span>,
          name: tg('switchTo', { language: tg(`names.${nextLocale}`) }),
          description: t('controls.language'),
        },
      ],
    },
    ...(showPages
      ? [
          {
            heading: t('pages.heading'),
            items: [
              { icon: <ChevronLeftIcon />, name: tn('previousPage'), description: t('pages.previous') },
              { icon: <ChevronRightIcon />, name: tn('nextPage'), description: t('pages.next') },
              ...(showDots
                ? [{ icon: <span className="text-[11px] font-medium tabular-nums">1/5</span>, name: t('pages.dots'), description: t('pages.dotsHint') }]
                : []),
            ],
          },
        ]
      : []),
    {
      heading: t('narrow.heading'),
      only: 'narrow',
      items: [{ icon: <MoreIcon />, name: tc('more'), description: t('narrow.more') }],
    },
    {
      heading: t('keyboard.heading'),
      only: 'hover',
      items: [
        { keys: ['←', '→'], name: t('keyboard.arrows') },
        { keys: ['Home', 'End'], name: t('keyboard.homeEnd') },
        { keys: ['Space'], name: t('keyboard.space') },
        ...(showFullscreen ? [{ keys: ['F'], name: t('keyboard.fullscreen') }] : []),
        ...(showDownload ? [{ keys: ['D'], name: t('keyboard.download') }] : []),
        { keys: ['Esc'], name: t('keyboard.escape') },
      ],
    },
  ]

  return (
    <Legend
      id={id}
      title={tt('title')}
      sections={sections}
      panelRef={panelRef}
      onClose={onClose}
      className={className}
    />
  )
}

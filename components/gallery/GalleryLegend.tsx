// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useSyncExternalStore, type RefObject } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Legend, { type LegendSection } from '@/components/ui/Legend'
import {
  ArchiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CommentIcon,
  DislikeIcon,
  DownloadIcon,
  FullscreenIcon,
  LikeIcon,
  PhotoIcon,
  SelectIcon,
  SlideshowIcon,
  UndoIcon,
} from '@/components/ui/icons'
import { isFullscreenSupported } from '@/lib/fullscreen'
import { locales, type Locale } from '@/lib/locales'

export default function GalleryLegend({
  id,
  panelRef,
  onClose,
  className,
  hasShowcase,
  hasArchive,
  feedbackEnabled,
}: {
  id: string
  panelRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  className: string
  hasShowcase: boolean
  hasArchive: boolean
  feedbackEnabled: boolean
}) {
  const t = useTranslations('gallery.legend')
  const tb = useTranslations('gallery.toolbar')
  const tf = useTranslations('gallery.feedback')
  const tl = useTranslations('lightbox')
  const tg = useTranslations('language')
  const tt = useTranslations('legend')
  const locale = useLocale()
  const fullscreenSupported = useSyncExternalStore(
    () => () => {},
    () => isFullscreenSupported(),
    () => false,
  )
  const nextLocale = locales[(locales.indexOf(locale as Locale) + 1) % locales.length]

  const sections: LegendSection[] = [
    {
      heading: t('header.heading'),
      items: [
        ...(hasShowcase
          ? [{ icon: <SlideshowIcon size={20} />, name: tb('viewShowcase'), description: t('header.viewShowcase') }]
          : []),
        { icon: <SelectIcon size={20} />, name: tb('select'), description: t('header.select') },
        ...(hasArchive
          ? [{ icon: <ArchiveIcon size={20} />, name: tb('downloadZip'), description: t('header.downloadZip') }]
          : []),
        {
          icon: <span className="text-xs font-medium uppercase">{locale}</span>,
          name: tg('switchTo', { language: tg(`names.${nextLocale}`) }),
          description: t('header.language'),
        },
      ],
    },
    {
      heading: t('selecting.heading'),
      items: [
        { icon: <SelectIcon size={20} />, name: t('selecting.pick'), description: t('selecting.pickHint') },
        { icon: <CloseIcon size={18} />, name: tb('cancel'), description: t('selecting.cancel') },
        { icon: <DownloadIcon />, name: tb('download'), description: t('selecting.download') },
      ],
    },
    {
      heading: t('viewer.heading'),
      items: [
        { icon: <PhotoIcon />, name: t('viewer.open'), description: t('viewer.openHint') },
        { icon: <ChevronLeftIcon />, name: tl('previous'), description: t('viewer.previous') },
        { icon: <ChevronRightIcon />, name: tl('next'), description: t('viewer.next') },
        { icon: <DownloadIcon />, name: tl('download'), description: t('viewer.download') },
        ...(fullscreenSupported
          ? [{ icon: <FullscreenIcon />, name: tl('enterFullscreen'), description: t('viewer.fullscreen') }]
          : []),
        { icon: <CloseIcon />, name: tl('close'), description: t('viewer.close') },
      ],
    },
    {
      heading: t('gestures.heading'),
      only: 'touch',
      items: [
        { name: t('gestures.swipeSideways'), description: t('gestures.swipeSidewaysHint') },
        { name: t('gestures.swipeUp'), description: t('gestures.swipeUpHint') },
        { name: t('gestures.swipeDown'), description: t('gestures.swipeDownHint') },
        { name: t('gestures.zoom'), description: t('gestures.zoomHint') },
      ],
    },
    ...(feedbackEnabled
      ? [
          {
            heading: t('feedback.heading'),
            items: [
              { icon: <LikeIcon />, name: tf('like.action'), description: t('feedback.like') },
              { icon: <DislikeIcon />, name: tf('dislike.action'), description: t('feedback.dislike') },
              { icon: <CommentIcon />, name: tf('comment.action'), description: t('feedback.comment') },
              { icon: <UndoIcon />, name: tf('undo'), description: t('feedback.undo') },
            ],
          },
        ]
      : []),
    ...(hasShowcase || hasArchive
      ? [
          {
            heading: t('footer.heading'),
            items: [{ name: t('footer.name'), description: t('footer.description') }],
          },
        ]
      : []),
    {
      heading: t('keyboard.heading'),
      only: 'hover',
      items: [
        { keys: ['S'], name: t('keyboard.select') },
        ...(hasArchive ? [{ keys: ['Z'], name: t('keyboard.archive') }] : []),
        { keys: ['D'], name: t('keyboard.download') },
        { keys: ['Enter'], name: t('keyboard.open') },
        { keys: ['Space'], name: t('keyboard.space') },
        { keys: ['←', '→'], name: t('keyboard.arrows') },
        { keys: ['Home', 'End'], name: t('keyboard.homeEnd') },
        ...(fullscreenSupported ? [{ keys: ['F'], name: t('keyboard.fullscreen') }] : []),
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

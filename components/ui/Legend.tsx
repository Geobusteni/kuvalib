// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useId, type ReactNode, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { CloseIcon, HelpIcon } from './icons'

export interface LegendItem {
  /** The same icon component the real button uses. */
  icon?: ReactNode
  /** Keyboard shortcuts, shown as key caps instead of an icon. */
  keys?: string[]
  name: string
  description?: string
}

export interface LegendSection {
  heading: string
  items: LegendItem[]
  /** Show only where the device can hover (keyboard shortcuts), only where it cannot (touch gestures), or only below the md breakpoint. */
  only?: 'hover' | 'touch' | 'narrow'
}

/** The "?" button that opens a Legend. Sized and coloured by the surface that places it. */
export function LegendButton({
  open,
  controls,
  onClick,
  buttonRef,
  className,
  iconSize,
  iconStrokeWidth,
}: {
  open: boolean
  controls: string
  onClick: () => void
  buttonRef: RefObject<HTMLButtonElement | null>
  className: string
  iconSize?: number
  iconStrokeWidth?: number
}) {
  const t = useTranslations('legend')
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={t('open')}
      aria-expanded={open}
      aria-controls={controls}
      aria-haspopup="dialog"
      onClick={onClick}
      className={className}
    >
      <HelpIcon size={iconSize} strokeWidth={iconStrokeWidth} />
    </button>
  )
}

const onlyClass = {
  hover: 'hidden [@media(hover:hover)]:block',
  touch: '[@media(hover:hover)]:hidden',
  narrow: 'md:hidden',
}

/**
 * A non-modal panel explaining a screen's icon-only actions. Placement (under
 * the bar, right-aligned, sticky under a header) is the caller's `className`;
 * the surface, scrolling and keyboard handling live here. Keys pressed inside
 * are kept from the page's own window-level shortcuts.
 */
export default function Legend({
  id,
  title,
  sections,
  panelRef,
  onClose,
  className,
}: {
  id: string
  title: string
  sections: LegendSection[]
  panelRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  className: string
}) {
  const t = useTranslations('legend')
  const titleId = useId()

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null
        if (next && !e.currentTarget.contains(next)) onClose()
      }}
      className={`pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-black/85 text-zinc-100 shadow-xl ring-1 ring-white/15 backdrop-blur-sm focus:outline-none focus-visible:outline-none! ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 py-1 pl-4 pr-1">
        <h2 id={titleId} className="text-sm font-semibold">
          {title}
        </h2>
        <button
          type="button"
          aria-label={t('close')}
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {sections.map((section) => (
          <section key={section.heading} className={`mt-3 first:mt-0 ${section.only ? onlyClass[section.only] : ''}`}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{section.heading}</h3>
            <ul className="mt-1 divide-y divide-white/10">
              {section.items.map((item) => (
                <li key={item.name} className="flex items-start gap-3 py-2">
                  {item.icon && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                      {item.icon}
                    </span>
                  )}
                  {item.keys && (
                    <span className="flex min-w-14 shrink-0 flex-wrap gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-xs font-medium text-white ring-1 ring-white/15"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug text-zinc-100">{item.name}</span>
                    {item.description && (
                      <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{item.description}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

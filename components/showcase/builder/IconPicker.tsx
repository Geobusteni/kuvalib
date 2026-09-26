// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useErrorMessage } from '@/hooks/useErrorMessage'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { customIconId, lucideIconId, parseIconId } from '@/lib/icons/ids'
import { ICON_CATEGORIES, LUCIDE_META, type IconCategory } from '@/lib/icons/lucide-meta'
import { ShowcaseIcon } from '../Icon'
import { useIconManager } from '../icons-context'
import { AddIconForm } from './AddIconForm'

type Filter = 'all' | 'mine' | IconCategory
type View = 'browse' | 'add'

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const prettyName = (name: string) => name.replace(/-/g, ' ')

const BUILT_IN_INDEX = Object.entries(LUCIDE_META).map(([name, meta]) => ({
  name,
  category: meta.c,
  haystack: fold(`${prettyName(name)} ${meta.t}`),
}))

const chip = (active: boolean) =>
  `min-h-11 shrink-0 rounded-full border px-3 text-xs font-medium ${
    active
      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
      : 'border-zinc-300 dark:border-zinc-700'
  }`

/** Button that shows the current icon and opens the picker. `onChange(undefined)` means "no icon". */
export function IconPicker({
  value,
  onChange,
  allowNone = false,
  className,
}: {
  value: string | undefined
  onChange: (icon: string | undefined) => void
  allowNone?: boolean
  className?: string
}) {
  const t = useTranslations('showcaseBuilder.iconPicker')
  const manager = useIconManager()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const ref = parseIconId(value)
  const currentName = ref
    ? ref.kind === 'lucide'
      ? prettyName(ref.key)
      : (manager?.icons.find((i) => i.id === ref.key)?.name ?? '')
    : ''

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700'
        }
      >
        {ref ? <ShowcaseIcon icon={value} size={20} /> : null}
        <span>{currentName ? `${t('trigger')}: ${currentName}` : t('trigger')}</span>
      </button>
      {open &&
        createPortal(
          <IconPickerDialog
            value={value}
            allowNone={allowNone}
            onPick={(icon) => {
              onChange(icon)
              close()
            }}
            onClose={close}
          />,
          document.body,
        )}
    </>
  )
}

function IconPickerDialog({
  value,
  allowNone,
  onPick,
  onClose,
}: {
  value: string | undefined
  allowNone: boolean
  onPick: (icon: string | undefined) => void
  onClose: () => void
}) {
  const t = useTranslations('showcaseBuilder.iconPicker')
  const errorMessage = useErrorMessage()
  const manager = useIconManager()
  const dialogRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const trapFocus = useFocusTrap(dialogRef)
  const [view, setView] = useState<View>('browse')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const scrollY = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = scrollY
    }
  }, [])

  const words = fold(query).split(/\s+/).filter(Boolean)
  const cells = useMemo(() => {
    if (filter === 'mine') {
      return (manager?.icons ?? [])
        .filter((i) => words.every((w) => fold(i.name).includes(w)))
        .map((i) => ({ key: customIconId(i.id), label: i.name, customId: i.id }))
    }
    return BUILT_IN_INDEX.filter(
      (i) => (filter === 'all' || i.category === filter) && words.every((w) => i.haystack.includes(w)),
    ).map((i) => ({ key: lucideIconId(i.name), label: prettyName(i.name), customId: null as string | null }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, manager?.icons])

  const showCustomToo = filter === 'all' && words.length > 0 && manager
  const customMatches = showCustomToo
    ? manager.icons
        .filter((i) => words.every((w) => fold(i.name).includes(w)))
        .map((i) => ({ key: customIconId(i.id), label: i.name, customId: i.id }))
    : []
  const all = [...customMatches, ...cells]
  const rovingKey = all.some((c) => c.key === focusKey)
    ? focusKey
    : all.some((c) => c.key === value)
      ? value
      : (all[0]?.key ?? null)

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const nav = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!nav.includes(e.key) || !gridRef.current) return
    const items = Array.from(gridRef.current.querySelectorAll<HTMLElement>('[data-icon-cell]'))
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (index === -1) return
    const columns = items.filter((el) => el.offsetTop === items[0].offsetTop).length || 1
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    }
    let target = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : index + step[e.key]
    if (target < 0 || target >= items.length) target = e.key === 'ArrowDown' ? items.length - 1 : index
    e.preventDefault()
    items[target].focus()
  }

  const remove = async (id: string) => {
    setDeleteError(null)
    const res = await fetch(`/api/icons/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setDeleteError(errorMessage(await res.json().catch(() => null)))
      return
    }
    setConfirmId(null)
    await manager?.reload()
    dialogRef.current?.focus()
  }

  const filters: Filter[] = ['all', ...ICON_CATEGORIES, ...(manager ? (['mine'] as const) : [])]

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            if (view === 'add') setView('browse')
            else if (confirmId) setConfirmId(null)
            else onClose()
            return
          }
          trapFocus(e)
        }}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-3 overflow-hidden rounded-t-xl bg-white p-4 text-zinc-900 shadow-xl outline-none sm:rounded-xl dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{view === 'add' ? t('addTitle') : t('title')}</h2>
          <button
            type="button"
            aria-label={t('close')}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        {view === 'add' ? (
          <div className="overflow-y-auto">
            <AddIconForm
              onCancel={() => setView('browse')}
              onDone={() => {
                setFilter('mine')
                setQuery('')
                setView('browse')
              }}
            />
          </div>
        ) : (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('search')}
              placeholder={t('searchPlaceholder')}
              className="h-11 w-full shrink-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />

            <div role="group" aria-label={t('categoryFilter')} className="flex shrink-0 gap-1.5 overflow-x-auto pb-1">
              {filters.map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={chip(filter === f)}>
                  {t(`categories.${f}`)}
                </button>
              ))}
            </div>

            <p role="status" className="shrink-0 text-xs text-zinc-500">
              {all.length === 0 ? t('noResults') : t('results', { count: all.length })}
            </p>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {allowNone && (
                <button
                  type="button"
                  aria-pressed={!value}
                  onClick={() => onPick(undefined)}
                  className={`mb-2 ${chip(!value)} w-full`}
                >
                  {t('none')}
                </button>
              )}

              {filter === 'mine' && (
                <div className="mb-2 flex flex-col gap-2">
                  {manager?.canManage ? (
                    <button type="button" onClick={() => setView('add')} className={`${chip(false)} w-full`}>
                      {t('add')}
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-500">{t('mineReadOnly')}</p>
                  )}
                  {all.length === 0 && !words.length && <p className="text-sm text-zinc-500">{t('mineEmpty')}</p>}
                  {deleteError && (
                    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                      {deleteError}
                    </p>
                  )}
                </div>
              )}

              <div
                ref={gridRef}
                role="group"
                aria-label={t('title')}
                onKeyDown={onGridKeyDown}
                className={
                  filter === 'mine'
                    ? 'flex flex-col gap-1'
                    : 'grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1'
                }
              >
                {all.map((c) => {
                  const selected = c.key === value
                  const cell = (
                    <button
                      key={c.key}
                      type="button"
                      data-icon-cell
                      aria-label={c.label}
                      aria-pressed={selected}
                      tabIndex={c.key === rovingKey ? 0 : -1}
                      onFocus={() => setFocusKey(c.key)}
                      onClick={() => onPick(c.key)}
                      className={`flex min-h-11 min-w-11 items-center gap-3 rounded-lg border ${
                        filter === 'mine' ? 'flex-1 px-3' : 'justify-center'
                      } ${
                        selected
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <ShowcaseIcon icon={c.key} size={22} />
                      {filter === 'mine' && <span className="truncate text-sm">{c.label}</span>}
                    </button>
                  )
                  if (filter !== 'mine' || !c.customId) return cell
                  const id = c.customId
                  return (
                    <div key={c.key} className="flex items-center gap-1">
                      {confirmId === id ? (
                        <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
                          <span className="flex-1">{t('deleteConfirm', { name: c.label })}</span>
                          <button type="button" data-icon-cell onClick={() => void remove(id)} className={chip(true)}>
                            {t('deleteYes')}
                          </button>
                          <button type="button" onClick={() => setConfirmId(null)} className={chip(false)}>
                            {t('deleteNo')}
                          </button>
                        </div>
                      ) : (
                        <>
                          {cell}
                          {manager?.canManage && (
                            <button
                              type="button"
                              aria-label={t('delete', { name: c.label })}
                              onClick={() => {
                                setDeleteError(null)
                                setConfirmId(id)
                              }}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                              <ShowcaseIcon icon="lucide:trash" size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

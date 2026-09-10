// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useShowcaseStore } from '../store'
import { useBuilder } from './useBuilder'

export function PageRail() {
  const pages = useShowcaseStore((s) => s.pages)
  const currentPageId = useShowcaseStore((s) => s.currentPageId)
  const { switchPage, addPage, deletePage } = useBuilder()

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-zinc-500">Pages</span>
      <ol className="flex flex-col gap-1.5">
        {pages.map((page, i) => {
          const active = page.id === currentPageId
          return (
            <li key={page.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => switchPage(page.id)}
                aria-current={active ? 'true' : undefined}
                className={`flex aspect-[16/10] flex-1 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                }`}
              >
                {i + 1}
              </button>
              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={() => deletePage(page.id)}
                  aria-label={`Delete page ${i + 1}`}
                  className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-950/40"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 5h12M8 5V3.5h4V5M5.5 5l1 11h7l1-11" />
                  </svg>
                </button>
              )}
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        onClick={addPage}
        className="rounded-md border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
      >
        + Add page
      </button>
    </div>
  )
}

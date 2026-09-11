// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { create } from 'zustand'
import type {
  ShowcaseAnimation,
  ShowcaseBg,
  ShowcaseEventType,
} from '@/lib/generated/prisma/client'
import {
  DEFAULT_COLOR_PRESETS,
  DEFAULT_PAGE_SETTINGS,
  HEADING_SIZE_DEFAULTS,
  TEXT_SIZE_DEFAULTS,
  type HeadingLevel,
  type PageSettings,
  type TextSizePreset,
} from '@/lib/showcase-blocks'
import { emptyCanvas } from './craft-bridge'

/**
 * Album-level state that lives outside Craft.js's per-frame editor. The active
 * page's block tree is owned by Craft; every other page is kept here as a
 * serialized snapshot string and swapped into the editor on page change. Each
 * page's own appearance (background/border) is plain state here too — Craft
 * only ever sees the block tree.
 */

export interface AlbumSettings {
  title: string
  eventDate: string | null
  eventType: ShowcaseEventType
  albumBg: ShowcaseBg
  animationStyle: ShowcaseAnimation
  autoplay: boolean
  autoplaySeconds: number
  playlistLoop: boolean
  headingSizes: Partial<Record<HeadingLevel, number>>
  textSizes: Partial<Record<TextSizePreset, number>>
  headingFont: string | null
  textFont: string | null
  colorPresets: string[]
  dotsEnabled: boolean
  dotColorActive: string | null
  dotColorInactive: string | null
  customCss: string
}

export interface EditorPage {
  id: string
  /** Craft serialized tree (`query.serialize()` output). Always populated. */
  snapshot: string
  settings: PageSettings
}

export const EMPTY_PAGE_SNAPSHOT = JSON.stringify(emptyCanvas())

export interface TrackMeta {
  id: string
  originalName: string
  size: number
}

export type BuilderView = 'build' | 'preview'

interface ShowcaseStore {
  projectId: string
  showcaseId: string
  settings: AlbumSettings
  pages: EditorPage[]
  currentPageId: string
  tracks: TrackMeta[]
  view: BuilderView
  dirty: boolean
  saving: boolean
  lastSavedAt: number | null

  init: (payload: {
    projectId: string
    showcaseId: string
    settings: AlbumSettings
    pages: EditorPage[]
    tracks: TrackMeta[]
  }) => void

  setView: (view: BuilderView) => void
  setSettings: (patch: Partial<AlbumSettings>) => void
  markDirty: () => void
  setTracks: (tracks: TrackMeta[]) => void

  setCurrentPage: (id: string) => void
  addPage: () => string
  deletePage: (id: string) => void
  saveSnapshot: (id: string, snapshot: string) => void
  setPageSettings: (id: string, patch: Partial<PageSettings>) => void

  markSaved: () => void
  setSaving: (saving: boolean) => void
}

export function makePageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p_${Math.random().toString(36).slice(2)}`
}

export const useShowcaseStore = create<ShowcaseStore>((set, get) => ({
  projectId: '',
  showcaseId: '',
  settings: {
    title: '',
    eventDate: null,
    eventType: 'GENERIC',
    albumBg: 'NEUTRAL',
    animationStyle: 'TURN',
    autoplay: true,
    autoplaySeconds: 5,
    playlistLoop: true,
    headingSizes: { ...HEADING_SIZE_DEFAULTS },
    textSizes: { ...TEXT_SIZE_DEFAULTS },
    headingFont: null,
    textFont: null,
    colorPresets: [...DEFAULT_COLOR_PRESETS],
    dotsEnabled: true,
    dotColorActive: null,
    dotColorInactive: null,
    customCss: '',
  },
  pages: [],
  currentPageId: '',
  tracks: [],
  view: 'build',
  dirty: false,
  saving: false,
  lastSavedAt: null,

  init: ({ projectId, showcaseId, settings, pages, tracks }) => {
    const safePages = pages.length
      ? pages
      : [{ id: makePageId(), snapshot: EMPTY_PAGE_SNAPSHOT, settings: { ...DEFAULT_PAGE_SETTINGS } }]
    set({
      projectId,
      showcaseId,
      settings,
      tracks,
      pages: safePages,
      currentPageId: safePages[0].id,
      view: 'build',
      dirty: false,
      saving: false,
      lastSavedAt: null,
    })
  },

  setView: (view) => set({ view }),
  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch }, dirty: true })),
  markDirty: () => set({ dirty: true }),
  setTracks: (tracks) => set({ tracks }),

  setCurrentPage: (id) => set({ currentPageId: id }),

  addPage: () => {
    const id = makePageId()
    set((s) => ({
      pages: [...s.pages, { id, snapshot: EMPTY_PAGE_SNAPSHOT, settings: { ...DEFAULT_PAGE_SETTINGS } }],
      currentPageId: id,
      dirty: true,
    }))
    return id
  },

  deletePage: (id) => {
    const { pages } = get()
    if (pages.length <= 1) return
    const index = pages.findIndex((p) => p.id === id)
    const remaining = pages.filter((p) => p.id !== id)
    set({
      pages: remaining,
      currentPageId: remaining[Math.max(0, index - 1)].id,
      dirty: true,
    })
  },

  saveSnapshot: (id, snapshot) =>
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, snapshot } : p)),
    })),

  setPageSettings: (id, patch) =>
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, settings: { ...p.settings, ...patch } } : p)),
      dirty: true,
    })),

  markSaved: () => set({ dirty: false, saving: false, lastSavedAt: Date.now() }),
  setSaving: (saving) => set({ saving }),
}))

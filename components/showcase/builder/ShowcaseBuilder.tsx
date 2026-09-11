// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { Editor } from '@craftjs/core'
import { useEffect, useState } from 'react'
import type { Block, PageSettings } from '@/lib/showcase-blocks'
import { blocksToSerialized } from '../craft-bridge'
import { PhotosProvider, type ShowcasePhoto } from '../photos-context'
import { useShowcaseStore, type AlbumSettings } from '../store'
import { showcaseResolver } from './blocks'
import { BuilderProvider, useBuilder } from './useBuilder'
import { Canvas } from './Canvas'
import { PageRail } from './PageRail'
import { SettingsPanel } from './SettingsPanel'
import { AddBlockMenu } from './AddBlockMenu'
import { AlbumSettingsDialog } from './AlbumSettingsDialog'
import { ShowcaseViewer } from '../viewer/ShowcaseViewer'

export interface ShowcaseBuilderProps {
  projectId: string
  showcaseId: string
  settings: AlbumSettings
  pages: { id: string; blocks: Block[]; settings: PageSettings }[]
  tracks: { id: string; originalName: string; size: number }[]
  photos: ShowcasePhoto[]
  galleryHref: string
  shareUrl: string
  downloadEnabled: boolean
}

export function ShowcaseBuilder(props: ShowcaseBuilderProps) {
  const markDirty = useShowcaseStore((s) => s.markDirty)

  // Seed the album store on mount. The canvas, page rail and panel all tolerate
  // an unseeded store for the one frame before this runs; `<Frame>` is keyed by
  // page id so page switches remount it from the store.
  useEffect(() => {
    useShowcaseStore.getState().init({
      projectId: props.projectId,
      showcaseId: props.showcaseId,
      settings: props.settings,
      pages: props.pages.map((p) => ({
        id: p.id,
        snapshot: JSON.stringify(blocksToSerialized(p.blocks)),
        settings: p.settings,
      })),
      tracks: props.tracks,
    })
    // Re-seed only if the showcase identity itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.showcaseId])

  return (
    <Editor
      resolver={showcaseResolver}
      // Craft fires this mid-commit; defer so we never setState during render.
      onNodesChange={() => Promise.resolve().then(markDirty)}
    >
      <BuilderProvider>
        <BuilderShell
          photos={props.photos}
          galleryHref={props.galleryHref}
          shareUrl={props.shareUrl}
          downloadEnabled={props.downloadEnabled}
        />
      </BuilderProvider>
    </Editor>
  )
}

function BuilderShell({
  photos,
  galleryHref,
  shareUrl,
  downloadEnabled,
}: {
  photos: ShowcasePhoto[]
  galleryHref: string
  shareUrl: string
  downloadEnabled: boolean
}) {
  const view = useShowcaseStore((s) => s.view)
  const setView = useShowcaseStore((s) => s.setView)
  const projectId = useShowcaseStore((s) => s.projectId)
  const settings = useShowcaseStore((s) => s.settings)
  const tracks = useShowcaseStore((s) => s.tracks)
  const dirty = useShowcaseStore((s) => s.dirty)
  const saving = useShowcaseStore((s) => s.saving)
  const lastSavedAt = useShowcaseStore((s) => s.lastSavedAt)
  const { save, getDeck } = useBuilder()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <PhotosProvider photos={photos}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <a href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            ← Project
          </a>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Album settings
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : lastSavedAt ? 'Saved' : ''}
          </span>
          <div className="flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
            {(['build', 'preview'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`px-3 py-1.5 text-sm font-medium capitalize ${
                  view === v
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:disabled:hover:bg-zinc-100"
          >
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {view === 'build' ? (
        <div className="mt-4 grid grid-cols-[96px_minmax(0,1fr)_260px] gap-4">
          <PageRail />
          <div className="flex flex-col gap-3">
            <AddBlockMenu />
            <Canvas />
          </div>
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <SettingsPanel />
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl">
          <ShowcaseViewer
            projectId={projectId}
            pages={getDeck()}
            photos={photos}
            settings={settings}
            trackIds={tracks.map((t) => t.id)}
            galleryHref={galleryHref}
            shareUrl={shareUrl}
            downloadEnabled={downloadEnabled}
            backHref={undefined}
          />
        </div>
      )}

      {settingsOpen && <AlbumSettingsDialog onClose={() => setSettingsOpen(false)} />}
    </PhotosProvider>
  )
}

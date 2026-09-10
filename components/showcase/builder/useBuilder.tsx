// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEditor, Element } from '@craftjs/core'
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'
import {
  arrangeGroupChildren,
  buildCoverComposite,
  makeBlock,
  type ArrangeMode,
  type Block,
  type BlockType,
} from '@/lib/showcase-blocks'
import {
  ButtonBlock,
  GroupBlock,
  ImageBlock,
  TextBlock,
  TitleBlock,
} from './blocks'
import { serializedToNested } from '../craft-bridge'
import { useShowcaseStore } from '../store'

/**
 * Builder operations that need Craft's `query`/`actions` together with the album
 * store: switching pages (serialise the outgoing one first), inserting blocks,
 * the Cover shortcut, group arrangement, and the debounced autosave.
 */

const COMPONENT_FOR: Record<BlockType, React.ElementType> = {
  image: ImageBlock,
  title: TitleBlock,
  text: TextBlock,
  button: ButtonBlock,
  group: GroupBlock,
}

interface BuilderApi {
  switchPage: (pageId: string) => void
  addPage: () => void
  deletePage: (pageId: string) => void
  addBlock: (type: BlockType) => void
  addCover: () => void
  addGroupChild: (groupNodeId: string, type: BlockType) => void
  arrangeGroup: (groupNodeId: string, mode: ArrangeMode) => void
  save: () => Promise<void>
  /** The whole deck as nested blocks — current page from the live editor. */
  getDeck: () => { id: string; blocks: Block[] }[]
}

const BuilderContext = createContext<BuilderApi | null>(null)

export function useBuilder(): BuilderApi {
  const ctx = useContext(BuilderContext)
  if (!ctx) throw new Error('useBuilder must be used within <BuilderProvider>')
  return ctx
}

export function BuilderProvider({ children }: { children: ReactNode }) {
  const { query, actions } = useEditor()

  const projectId = useShowcaseStore((s) => s.projectId)
  const currentPageId = useShowcaseStore((s) => s.currentPageId)
  const saveSnapshot = useShowcaseStore((s) => s.saveSnapshot)
  const setCurrentPage = useShowcaseStore((s) => s.setCurrentPage)
  const storeAddPage = useShowcaseStore((s) => s.addPage)
  const storeDeletePage = useShowcaseStore((s) => s.deletePage)
  const markDirty = useShowcaseStore((s) => s.markDirty)
  const setSaving = useShowcaseStore((s) => s.setSaving)
  const markSaved = useShowcaseStore((s) => s.markSaved)

  const persistCurrent = useCallback(() => {
    try {
      saveSnapshot(currentPageId, query.serialize())
    } catch {
      /* editor not ready yet */
    }
  }, [currentPageId, query, saveSnapshot])

  const switchPage = useCallback(
    (pageId: string) => {
      if (pageId === currentPageId) return
      persistCurrent()
      setCurrentPage(pageId)
    },
    [currentPageId, persistCurrent, setCurrentPage],
  )

  const addPage = useCallback(() => {
    persistCurrent()
    storeAddPage()
  }, [persistCurrent, storeAddPage])

  const deletePage = useCallback(
    (pageId: string) => {
      if (pageId === currentPageId) persistCurrent()
      storeDeletePage(pageId)
    },
    [currentPageId, persistCurrent, storeDeletePage],
  )

  const insert = useCallback(
    (block: Block, parentGroupId: string | null): string => {
      const Component = COMPONENT_FOR[block.type]
      const tree = query
        .parseReactElement(<Element is={Component} block={block} parentGroupId={parentGroupId} />)
        .toNodeTree()
      actions.addNodeTree(tree, 'ROOT')
      return tree.rootNodeId
    },
    [actions, query],
  )

  const addBlock = useCallback(
    (type: BlockType) => {
      const id = insert(makeBlock(type), null)
      actions.selectNode(id)
      markDirty()
    },
    [actions, insert, markDirty],
  )

  const addCover = useCallback(() => {
    const { title, eventDate } = useShowcaseStore.getState().settings
    const [image, group] = buildCoverComposite(title, eventDate ?? '')
    insert({ ...image }, null)
    const groupNodeId = insert({ ...group, children: undefined }, null)
    for (const child of group.children ?? []) insert(child, groupNodeId)
    actions.selectNode(groupNodeId)
    markDirty()
  }, [actions, insert, markDirty])

  const addGroupChild = useCallback(
    (groupNodeId: string, type: BlockType) => {
      const groupNode = query.node(groupNodeId).get()
      const groupBlock = groupNode?.data.props.block as Block | undefined
      if (!groupBlock) return
      const child = makeBlock(type, {
        x: groupBlock.x + 4,
        y: groupBlock.y + 4,
        w: Math.max(10, groupBlock.w - 8),
        h: Math.min(14, groupBlock.h / 3),
      })
      const childId = insert(child, groupNodeId)
      actions.selectNode(childId)
      markDirty()
    },
    [actions, insert, markDirty, query],
  )

  const arrangeGroup = useCallback(
    (groupNodeId: string, mode: ArrangeMode) => {
      const root = query.node('ROOT').get()
      const groupNode = query.node(groupNodeId).get()
      const groupBlock = groupNode?.data.props.block as Block | undefined
      if (!groupBlock) return

      const childNodeIds = root.data.nodes.filter(
        (nid) => query.node(nid).get().data.props.parentGroupId === groupNodeId,
      )
      const children: Block[] = childNodeIds.map(
        (nid) => query.node(nid).get().data.props.block as Block,
      )
      const arranged = arrangeGroupChildren({ ...groupBlock, children }, mode)
      arranged.forEach((childBlock, i) => {
        const nid = childNodeIds[i]
        actions.setProp(nid, (props: { block: Block }) => {
          props.block = { ...props.block, ...childBlock }
        })
      })
      markDirty()
    },
    [actions, markDirty, query],
  )

  const lastSavedBody = useRef<string | null>(null)

  const save = useCallback(async () => {
    const state = useShowcaseStore.getState()
    let currentSnapshot: string
    try {
      currentSnapshot = query.serialize()
    } catch {
      return
    }
    saveSnapshot(state.currentPageId, currentSnapshot)

    const pages = state.pages.map((page) => ({
      blocks:
        page.id === state.currentPageId
          ? serializedToNested(currentSnapshot)
          : serializedToNested(page.snapshot),
    }))
    const body = JSON.stringify({ pages })

    // Craft's onNodesChange also fires on selection; skip a redundant PUT.
    if (body === lastSavedBody.current) {
      markSaved()
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/showcase/pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (res.ok) {
        lastSavedBody.current = body
        markSaved()
      } else {
        setSaving(false)
      }
    } catch {
      setSaving(false)
    }
  }, [markSaved, projectId, query, saveSnapshot, setSaving])

  // Debounced autosave whenever the deck is dirty.
  const dirty = useShowcaseStore((s) => s.dirty)
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => void saveRef.current(), 1200)
    return () => clearTimeout(t)
  }, [dirty])

  const getDeck = useCallback((): { id: string; blocks: Block[] }[] => {
    const state = useShowcaseStore.getState()
    let currentSnapshot: string | null = null
    try {
      currentSnapshot = query.serialize()
    } catch {
      /* editor not ready */
    }
    return state.pages.map((page) => ({
      id: page.id,
      blocks: serializedToNested(
        page.id === state.currentPageId && currentSnapshot ? currentSnapshot : page.snapshot,
      ),
    }))
  }, [query])

  const api: BuilderApi = {
    switchPage,
    addPage,
    deletePage,
    addBlock,
    addCover,
    addGroupChild,
    arrangeGroup,
    save,
    getDeck,
  }

  return <BuilderContext.Provider value={api}>{children}</BuilderContext.Provider>
}

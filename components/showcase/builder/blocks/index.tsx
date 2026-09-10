// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEditor, useNode, type UserComponent } from '@craftjs/core'
import type { ReactNode } from 'react'
import type { Block } from '@/lib/showcase-blocks'
import { BlockContent } from '../../BlockContent'
import { usePhoto } from '../../photos-context'
import { BlockShell } from './BlockShell'

/**
 * Craft.js user components — one per block type, plus the canvas root. They are
 * intentionally thin: `BlockShell` owns drag/resize/selection and `BlockContent`
 * owns the visual, both shared with the viewer.
 */

function useBlock(): Block {
  const { block } = useNode((node) => ({ block: node.data.props.block as Block }))
  return block
}

export const CanvasRoot: UserComponent<{ children?: ReactNode }> = ({ children }) => {
  const {
    connectors: { connect },
  } = useNode()
  const { actions } = useEditor()
  return (
    <div
      ref={(dom) => {
        if (dom) connect(dom)
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) actions.selectNode()
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {children}
    </div>
  )
}
CanvasRoot.craft = {
  displayName: 'CanvasRoot',
  rules: {
    canMoveIn: () => true,
    canMoveOut: () => true,
    canDrag: () => false,
  },
}

export const ImageBlock: UserComponent = () => {
  const block = useBlock()
  const photo = usePhoto(block.photoId)
  return (
    <BlockShell>
      <BlockContent block={block} photo={photo} editable />
    </BlockShell>
  )
}
ImageBlock.craft = { displayName: 'ImageBlock', rules: { canDrag: () => true } }

export const TitleBlock: UserComponent = () => {
  const block = useBlock()
  return (
    <BlockShell>
      <BlockContent block={block} editable />
    </BlockShell>
  )
}
TitleBlock.craft = { displayName: 'TitleBlock', rules: { canDrag: () => true } }

export const TextBlock: UserComponent = () => {
  const block = useBlock()
  return (
    <BlockShell>
      <BlockContent block={block} editable />
    </BlockShell>
  )
}
TextBlock.craft = { displayName: 'TextBlock', rules: { canDrag: () => true } }

export const ButtonBlock: UserComponent = () => {
  const block = useBlock()
  return (
    <BlockShell>
      <BlockContent block={block} editable />
    </BlockShell>
  )
}
ButtonBlock.craft = { displayName: 'ButtonBlock', rules: { canDrag: () => true } }

export const GroupBlock: UserComponent = () => {
  const { id } = useNode()
  const { isActive } = useEditor((state) => ({ isActive: state.events.selected.has(id) }))
  // Children render as separate flat siblings; the box itself is all that lives here.
  return (
    <BlockShell>
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          fontSize: 10,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--sc-text-muted)',
          pointerEvents: 'none',
          opacity: isActive ? 0.9 : 0.4,
        }}
      >
        Group
      </span>
    </BlockShell>
  )
}
GroupBlock.craft = { displayName: 'GroupBlock', rules: { canDrag: () => true } }

export const showcaseResolver = {
  CanvasRoot,
  ImageBlock,
  TitleBlock,
  TextBlock,
  ButtonBlock,
  GroupBlock,
}

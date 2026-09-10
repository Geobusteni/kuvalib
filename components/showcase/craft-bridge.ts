// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { SerializedNodes } from '@craftjs/core'
import {
  flattenBlocks,
  nestFlatBlocks,
  type Block,
  type BlockType,
  type FlatBlock,
} from '@/lib/showcase-blocks'

/**
 * Craft.js keeps a flat node tree: every block — groups and their children
 * alike — is a direct child of ROOT, and a child's group membership is the
 * `parentGroupId` prop, not DOM nesting (the strategy the design handoff calls
 * for). This module converts between that serialized tree and the nested
 * `Block[]` shape stored in the database.
 */

export const ROOT_NODE_ID = 'ROOT'

export const RESOLVED_NAME: Record<BlockType, string> = {
  image: 'ImageBlock',
  title: 'TitleBlock',
  text: 'TextBlock',
  button: 'ButtonBlock',
  group: 'GroupBlock',
}

const RESOLVED_TO_TYPE: Record<string, BlockType> = Object.fromEntries(
  Object.entries(RESOLVED_NAME).map(([type, name]) => [name, type as BlockType]),
) as Record<string, BlockType>

interface NodeProps {
  block: Block
  parentGroupId: string | null
}

function rootNode(childIds: string[]): SerializedNodes[string] {
  return {
    type: { resolvedName: 'CanvasRoot' },
    isCanvas: true,
    props: {},
    displayName: 'CanvasRoot',
    custom: {},
    parent: null,
    hidden: false,
    nodes: childIds,
    linkedNodes: {},
  }
}

function blockNode(block: Block, parentGroupId: string | null): SerializedNodes[string] {
  const props: NodeProps = { block, parentGroupId }
  return {
    type: { resolvedName: RESOLVED_NAME[block.type] },
    isCanvas: false,
    props,
    displayName: RESOLVED_NAME[block.type],
    custom: {},
    parent: ROOT_NODE_ID,
    hidden: false,
    nodes: [],
    linkedNodes: {},
  }
}

/** An empty canvas — a page with no blocks yet. */
export function emptyCanvas(): SerializedNodes {
  return { [ROOT_NODE_ID]: rootNode([]) }
}

/** Nested `Block[]` (from the DB) → Craft serialized tree for `<Frame data>`. */
export function blocksToSerialized(blocks: Block[]): SerializedNodes {
  const flat = flattenBlocks(blocks)
  const nodes: SerializedNodes = {}
  const childIds: string[] = []
  for (const { block, parentGroupId } of flat) {
    // A group child stripped of the `children` array it never carries.
    const clean = block.type === 'group' ? block : { ...block, children: undefined }
    nodes[block.id] = blockNode(clean as Block, parentGroupId)
    childIds.push(block.id)
  }
  nodes[ROOT_NODE_ID] = rootNode(childIds)
  return nodes
}

/** Craft serialized tree → the flat working list. */
export function serializedToFlat(data: SerializedNodes | string): FlatBlock[] {
  const tree: SerializedNodes = typeof data === 'string' ? JSON.parse(data) : data
  const root = tree[ROOT_NODE_ID]
  if (!root) return []
  const out: FlatBlock[] = []
  for (const id of root.nodes) {
    const node = tree[id]
    if (!node) continue
    const props = (node.props ?? {}) as Partial<NodeProps>
    const raw = props.block
    if (!raw) continue
    const resolvedName =
      typeof node.type === 'object' && node.type ? node.type.resolvedName : String(node.type)
    const type = RESOLVED_TO_TYPE[resolvedName] ?? raw.type
    out.push({
      block: { ...raw, id, type },
      parentGroupId: props.parentGroupId ?? null,
    })
  }
  return out
}

/** Craft serialized tree → nested `Block[]` for saving to the database. */
export function serializedToNested(data: SerializedNodes | string): Block[] {
  return nestFlatBlocks(serializedToFlat(data))
}

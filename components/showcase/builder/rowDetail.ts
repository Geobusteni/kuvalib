// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { parseIconId } from '@/lib/icons/ids'
import type { Block } from '@/lib/showcase-blocks'

/** A built-in icon's readable name; '' for a custom one, whose name lives in the builder's icon list, not on the block. */
export function builtInIconName(icon: string | undefined): string {
  const ref = parseIconId(icon)
  return ref?.kind === 'lucide' ? ref.key.replace(/-/g, ' ') : ''
}

/** A short label for a tree row beyond the block type — whatever text the block
 *  itself carries, so two Text blocks aren't indistinguishable in the list. */
export function rowDetail(block: Block): string {
  if (block.type === 'title' || block.type === 'text') return block.text ?? ''
  if (block.type === 'button') return block.label ?? ''
  if (block.type === 'icon') return builtInIconName(block.icon)
  return ''
}

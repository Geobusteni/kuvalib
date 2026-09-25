// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import type { Block } from '@/lib/showcase-blocks'

/** A short label for a tree row beyond the block type — whatever text the block
 *  itself carries, so two Text blocks aren't indistinguishable in the list. */
export function rowDetail(block: Block): string {
  if (block.type === 'title' || block.type === 'text') return block.text ?? ''
  if (block.type === 'button') return block.label ?? ''
  return ''
}

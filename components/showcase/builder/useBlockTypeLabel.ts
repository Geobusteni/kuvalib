// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { useTranslations } from 'next-intl'
import type { BlockType } from '@/lib/showcase-blocks'

export function useBlockTypeLabel(): (type: BlockType) => string {
  const t = useTranslations('showcaseBuilder.blockTypes')
  return (type) => t(type)
}

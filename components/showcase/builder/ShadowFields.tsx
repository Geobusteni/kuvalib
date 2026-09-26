// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useTranslations } from 'next-intl'
import type { Block } from '@/lib/showcase-blocks'
import { useShowcaseStore } from '../store'
import { PresetSwatchRow } from './PresetSwatchRow'

export type ShadowValue = Pick<
  Block,
  'shadow' | 'shadowColor' | 'shadowAlpha' | 'shadowOffsetX' | 'shadowOffsetY' | 'shadowSpread'
>

/** The box-shadow controls a Group and a Button share. Blur is the on/off
 *  switch; the rest only show once it is above 0. */
export function ShadowFields({
  value,
  onChange,
}: {
  value: ShadowValue
  onChange: (patch: Partial<ShadowValue>) => void
}) {
  const t = useTranslations('showcaseBuilder.settingsPanel')
  const colorPresets = useShowcaseStore((s) => s.settings.colorPresets)
  const blur = value.shadow ?? 0
  const offsetY = value.shadowOffsetY ?? Math.round(blur / 2)
  return (
    <>
      <label className="text-[11px] text-zinc-400">
        {t('shadowBlur', { value: blur })}
        <input
          type="range"
          min={0}
          max={40}
          value={blur}
          onChange={(e) => onChange({ shadow: parseInt(e.target.value, 10) })}
          className="w-full"
        />
      </label>
      {blur > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-zinc-400">
              {t('offsetX', { value: value.shadowOffsetX ?? 0 })}
              <input
                type="range"
                min={-40}
                max={40}
                value={value.shadowOffsetX ?? 0}
                onChange={(e) => onChange({ shadowOffsetX: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </label>
            <label className="text-[11px] text-zinc-400">
              {t('offsetY', { value: offsetY })}
              <input
                type="range"
                min={-40}
                max={40}
                value={offsetY}
                onChange={(e) => onChange({ shadowOffsetY: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </label>
          </div>
          <label className="text-[11px] text-zinc-400">
            {t('spread', { value: value.shadowSpread ?? 0 })}
            <input
              type="range"
              min={-20}
              max={20}
              value={value.shadowSpread ?? 0}
              onChange={(e) => onChange({ shadowSpread: parseInt(e.target.value, 10) })}
              className="w-full"
            />
          </label>
          <div className="flex flex-col gap-1">
            <input
              type="color"
              value={value.shadowColor ?? '#000000'}
              onChange={(e) => onChange({ shadowColor: e.target.value })}
              className="h-8 w-full cursor-pointer rounded"
            />
            <PresetSwatchRow presets={colorPresets} onPick={(hex) => onChange({ shadowColor: hex })} />
            <label className="text-[11px] text-zinc-400">
              {t('opacity', { value: value.shadowAlpha ?? 100 })}
              <input
                type="range"
                min={0}
                max={100}
                value={value.shadowAlpha ?? 100}
                onChange={(e) => onChange({ shadowAlpha: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </label>
          </div>
        </>
      )}
    </>
  )
}

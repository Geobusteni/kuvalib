// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEditor } from '@craftjs/core'
import { useTranslations } from 'next-intl'
import {
  clamp,
  type Block,
  type BlockAlign,
  type BlockBg,
  type BlockRadius,
  type BlockTextColor,
  type BorderStyle,
  type ButtonLinkType,
  type ButtonStyle,
  type HeadingLevel,
  type KenBurns,
  type PageSettings,
  type TextSizePreset,
} from '@/lib/showcase-blocks'
import { useShowcaseStore } from '../store'
import { usePhotos } from '../photos-context'
import { useBuilder } from './useBuilder'
import { PresetSwatchRow } from './PresetSwatchRow'
import { useBlockTypeLabel } from './useBlockTypeLabel'

const RADII: BlockRadius[] = ['none', 'md', 'pill']
const BG_SWATCHES: BlockBg[] = ['none', 'surface', 'deep', 'accentTint', 'accentSolid', 'custom', 'gradient']
const TEXT_SWATCHES: BlockTextColor[] = ['default', 'accent', 'muted', 'custom']
const ALIGNS: BlockAlign[] = ['left', 'center', 'right']
const LINK_TYPES: ButtonLinkType[] = ['custom', 'zip', 'gallery']
const HEADING_LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6]
const TEXT_SIZES: TextSizePreset[] = ['small', 'normal', 'medium', 'large', 'huge']
const BORDER_STYLES: BorderStyle[] = ['none', 'solid', 'dashed', 'dotted']
const KEN_BURNS_STYLES: KenBurns[] = ['none', 'zoom-in', 'slide-left', 'slide-right', 'slide-up', 'slide-down']
const BUTTON_STYLES: ButtonStyle[] = ['primary', 'secondary']
const ARRANGE_KEY = {
  'align-left': 'alignLeft',
  'align-center': 'alignCenter',
  'align-right': 'alignRight',
  'align-top': 'alignTop',
  'align-middle': 'alignMiddle',
  'align-bottom': 'alignBottom',
} as const

/** Turns a list of stored values into `{ value, label }` options, labelled from
 *  `showcaseBuilder.options.<group>.<value>`. */
function useOptions() {
  const t = useTranslations('showcaseBuilder.options')
  return <T extends string>(group: string, values: T[]) =>
    values.map((value) => ({ value, label: t(`${group}.${value}` as never) }))
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
      {label}
      {children}
    </label>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const inputClass =
  'h-8 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

/** A number input that never fights what you're typing: it passes the raw
 *  value straight through (so typing "1" then "0" isn't clamped to the
 *  minimum after the first keystroke) and just turns the border red while
 *  the value is out of range, rather than silently rewriting it. Whatever
 *  you leave it at is clamped for real when the block is saved. Inline
 *  style, not a competing Tailwind class, so it reliably wins over the
 *  base border colour regardless of utility-class cascade order. */
function NumberField({
  value,
  onChange,
  min,
  max,
  placeholder,
  className = inputClass,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  min: number
  max: number
  placeholder?: string
  className?: string
}) {
  const t = useTranslations('showcaseBuilder.settingsPanel')
  const outOfRange = value !== undefined && (value < min || value > max)
  return (
    <input
      type="number"
      className={className}
      style={outOfRange ? { borderColor: '#ef4444' } : undefined}
      placeholder={placeholder}
      title={outOfRange ? t('outOfRange', { min, max, value: clamp(value, min, max) }) : undefined}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') { onChange(undefined); return }
        const n = parseInt(raw, 10)
        if (!Number.isNaN(n)) onChange(n)
      }}
    />
  )
}

// A thin rainbow ring around a solid centre — the "custom" swatch previews
// its actual configured colour (so you know what you picked) but a plain
// solid dot alone reads as just another preset, especially when that colour
// happens to be black. The ring is what says "this one opens a picker."
const RAINBOW_RING = 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'
function customSwatchBackground(hex: string): string {
  return `radial-gradient(circle, ${hex} 55%, transparent 58%), ${RAINBOW_RING}`
}

/** Mirrors bgSwatchStyle for the text-colour swatches — 'custom' previews the
 *  block's own textColorCustom instead of a generic placeholder. */
function textSwatchStyle(key: BlockTextColor, custom: string | undefined): React.CSSProperties {
  if (key === 'custom') return { background: customSwatchBackground(custom || '#e9e9ed') }
  if (key === 'accent') return { background: 'var(--sc-accent)' }
  if (key === 'muted') return { background: 'var(--sc-text-muted)' }
  return { background: '#e9e9ed' }
}

/** A swatch button shows the actual colour that option currently holds — the
 *  custom/gradient slots reflect this value's own bgCustom/bgGradient* fields
 *  rather than a generic placeholder, so the swatch always previews what
 *  picking it would look like. */
function bgSwatchStyle(
  key: BlockBg,
  value: { bgCustom?: string; bgGradientFrom?: string; bgGradientTo?: string; bgGradientAngle?: number },
): React.CSSProperties {
  if (key === 'custom') {
    return { background: customSwatchBackground(value.bgCustom || '#1a1a1a') }
  }
  if (key === 'gradient') {
    return {
      background: `linear-gradient(${value.bgGradientAngle ?? 135}deg, ${value.bgGradientFrom || '#000000'}, ${value.bgGradientTo || '#ffffff'})`,
    }
  }
  if (key === 'none') {
    return { background: 'repeating-linear-gradient(45deg,#eee,#eee 4px,#fff 4px,#fff 8px)' }
  }
  return { background: `var(--sc-${key === 'accentTint' ? 'accent-tint' : key === 'accentSolid' ? 'accent' : key})` }
}

/** The bg/bgCustom/bgGradient* fields are identical on a Block and a
 *  PageSettings — one small editor covers both. */
function BackgroundField<T extends { bg: BlockBg; bgCustom?: string; bgCustomAlpha?: number; bgGradientFrom?: string; bgGradientTo?: string; bgGradientAngle?: number }>({
  value,
  onChange,
  swatches = BG_SWATCHES,
}: {
  value: T
  onChange: (patch: Partial<T>) => void
  swatches?: BlockBg[]
}) {
  const t = useTranslations('showcaseBuilder.settingsPanel')
  const tOpt = useTranslations('showcaseBuilder.options')
  const colorPresets = useShowcaseStore((s) => s.settings.colorPresets)
  return (
    <>
      <Field label={t('background')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {swatches.map((key) => (
              <button
                key={key}
                type="button"
                title={tOpt(`bgSwatch.${key}`)}
                aria-label={tOpt(`bgSwatch.${key}`)}
                aria-pressed={(value.bg ?? 'none') === key}
                onClick={() => onChange({ bg: key } as Partial<T>)}
                className="h-6 w-6 rounded-full border-2"
                style={{
                  borderColor: (value.bg ?? 'none') === key ? 'var(--sc-accent, #6366f1)' : 'transparent',
                  ...bgSwatchStyle(key, value),
                }}
              />
            ))}
          </div>
          {value.bg !== 'none' && (
            <button
              type="button"
              onClick={() => onChange({ bg: 'none' } as Partial<T>)}
              className="shrink-0 text-[11px] text-zinc-400 underline"
            >
              {t('reset')}
            </button>
          )}
        </div>
      </Field>
      {value.bg === 'custom' && (
        <div className="flex flex-col gap-1">
          <input
            type="color"
            value={value.bgCustom ?? '#1a1a1a'}
            onChange={(e) => onChange({ bg: 'custom', bgCustom: e.target.value } as Partial<T>)}
            className="h-8 w-full cursor-pointer rounded"
          />
          <PresetSwatchRow presets={colorPresets} onPick={(hex) => onChange({ bg: 'custom', bgCustom: hex } as Partial<T>)} />
          <label className="text-[11px] text-zinc-400">
            {t('opacity', { value: value.bgCustomAlpha ?? 100 })}
            <input
              type="range"
              min={0}
              max={100}
              value={value.bgCustomAlpha ?? 100}
              onChange={(e) => onChange({ bg: 'custom', bgCustomAlpha: parseInt(e.target.value, 10) } as Partial<T>)}
              className="w-full"
            />
          </label>
        </div>
      )}
      {value.bg === 'gradient' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-[11px] text-zinc-400">
              {t('from')}
              <input
                type="color"
                value={value.bgGradientFrom ?? '#000000'}
                onChange={(e) => onChange({ bg: 'gradient', bgGradientFrom: e.target.value } as Partial<T>)}
                className="h-8 w-full cursor-pointer rounded"
              />
              <PresetSwatchRow presets={colorPresets} onPick={(hex) => onChange({ bg: 'gradient', bgGradientFrom: hex } as Partial<T>)} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-[11px] text-zinc-400">
              {t('to')}
              <input
                type="color"
                value={value.bgGradientTo ?? '#ffffff'}
                onChange={(e) => onChange({ bg: 'gradient', bgGradientTo: e.target.value } as Partial<T>)}
                className="h-8 w-full cursor-pointer rounded"
              />
              <PresetSwatchRow presets={colorPresets} onPick={(hex) => onChange({ bg: 'gradient', bgGradientTo: hex } as Partial<T>)} />
            </label>
          </div>
          <label className="text-[11px] text-zinc-400">
            {t('angle', { value: value.bgGradientAngle ?? 135 })}
            <input
              type="range"
              min={0}
              max={360}
              value={value.bgGradientAngle ?? 135}
              onChange={(e) => onChange({ bg: 'gradient', bgGradientAngle: parseInt(e.target.value, 10) } as Partial<T>)}
              className="w-full"
            />
          </label>
        </div>
      )}
    </>
  )
}

/** Border style/width/colour — shared by an Image block and a page/slide. */
function BorderField<T extends { borderStyle?: BorderStyle; borderWidth?: number; borderColor?: string }>({
  value,
  onChange,
}: {
  value: T
  onChange: (patch: Partial<T>) => void
}) {
  const t = useTranslations('showcaseBuilder.settingsPanel')
  const options = useOptions()
  const colorPresets = useShowcaseStore((s) => s.settings.colorPresets)
  return (
    <>
      <Field label={t('border')}>
        <Segmented
          options={options('borderStyle', BORDER_STYLES)}
          value={value.borderStyle ?? 'none'}
          onChange={(v) => onChange({ borderStyle: v } as Partial<T>)}
        />
      </Field>
      {(value.borderStyle ?? 'none') !== 'none' && (
        <div className="flex gap-2">
          <Field label={t('widthPx')}>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={10}
                value={Math.min(value.borderWidth ?? 1, 10)}
                onChange={(e) => onChange({ borderWidth: parseInt(e.target.value, 10) } as Partial<T>)}
                className="w-16"
              />
              <NumberField
                value={value.borderWidth}
                onChange={(v) => onChange({ borderWidth: v ?? 0 } as Partial<T>)}
                min={0}
                max={20}
                className={`${inputClass} w-16`}
              />
            </div>
          </Field>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            {t('colour')}
            <input
              type="color"
              value={value.borderColor ?? '#ffffff'}
              onChange={(e) => onChange({ borderColor: e.target.value } as Partial<T>)}
              className="h-8 w-full cursor-pointer rounded"
            />
            <PresetSwatchRow presets={colorPresets} onPick={(hex) => onChange({ borderColor: hex } as Partial<T>)} />
          </label>
        </div>
      )}
    </>
  )
}

function PageSettingsPanel() {
  const t = useTranslations('showcaseBuilder.settingsPanel')
  const currentPageId = useShowcaseStore((s) => s.currentPageId)
  const page = useShowcaseStore((s) => s.pages.find((p) => p.id === s.currentPageId))
  const setPageSettings = useShowcaseStore((s) => s.setPageSettings)

  if (!page) return null
  const settings = page.settings
  const patch = (p: Partial<PageSettings>) => setPageSettings(currentPageId, p)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        {t('pageHint')}
      </p>
      <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t('thisPage')}
      </span>
      <BackgroundField value={settings} onChange={patch} />
      <BorderField value={settings} onChange={patch} />
    </div>
  )
}

export function SettingsPanel() {
  const t = useTranslations('showcaseBuilder.settingsPanel')
  const options = useOptions()
  const tOpt = useTranslations('showcaseBuilder.options')
  const blockTypeLabel = useBlockTypeLabel()
  const photos = usePhotos()
  const { arrangeGroup, addGroupChild } = useBuilder()
  const markDirty = useShowcaseStore((s) => s.markDirty)
  const autoplay = useShowcaseStore((s) => s.settings.autoplay)
  const autoplaySeconds = useShowcaseStore((s) => s.settings.autoplaySeconds)
  const colorPresets = useShowcaseStore((s) => s.settings.colorPresets)

  const { selectedId, block, parentGroupId, actions, query } = useEditor((state) => {
    const id = Array.from(state.events.selected)[0] ?? null
    const node = id ? state.nodes[id] : null
    return {
      selectedId: id as string | null,
      block: node ? (node.data.props.block as Block) : null,
      parentGroupId: node ? ((node.data.props.parentGroupId ?? null) as string | null) : null,
    }
  })

  if (!selectedId || !block) return <PageSettingsPanel />

  const update = (patch: Partial<Block>) => {
    actions.setProp(selectedId, (props: { block: Block }) => {
      props.block = { ...props.block, ...patch }
    })
    markDirty()
  }

  // Paint order in both the builder canvas and the viewer follows the flat node
  // order (the viewer keeps a group's children right after the group, so a child
  // moved to the front/back of the whole list still ends up front/back *within*
  // its group). So "bring to front" is append, "send to back" is prepend.
  const moveWithinBand = (toFront: boolean) => {
    const count = query.node('ROOT').get().data.nodes.length
    actions.move(selectedId, 'ROOT', toFront ? count : 0)
    markDirty()
  }

  const deleteSelected = () => {
    if (block.type === 'group') {
      const rootNodes = query.node('ROOT').get().data.nodes
      const childIds = rootNodes.filter(
        (nid) => query.node(nid).get().data.props.parentGroupId === selectedId,
      )
      childIds.forEach((nid) => actions.delete(nid))
    }
    actions.delete(selectedId)
    markDirty()
  }

  const parentGroupBlock =
    parentGroupId != null
      ? (query.node(parentGroupId).get()?.data.props.block as Block | undefined)
      : undefined

  const isImage = block.type === 'image'
  const isTitle = block.type === 'title'
  const isText = block.type === 'text'
  const isButton = block.type === 'button'
  const isGroup = block.type === 'group'
  const isTextLike = isTitle || isText

  // Headline: level + optional custom size + solid text colour only — no
  // corners, no background (the title/text/button blocks own colour, a group
  // owns background — a headline is just text).
  const showCorners = isText || isButton || isGroup
  const showBackground = isText || isButton || isGroup
  const showTextColor = isText || isButton
  // Title has its own dedicated (text-colour-only) section further down.
  const hasSharedAppearance = showCorners || showBackground || showTextColor || isGroup

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {blockTypeLabel(block.type)}
          {parentGroupId ? t('inGroup') : ''}
        </span>
        <button
          type="button"
          onClick={deleteSelected}
          aria-label={t('deleteBlock')}
          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-950/40"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 5h12M8 5V3.5h4V5M5.5 5l1 11h7l1-11" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => moveWithinBand(true)} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {t('bringToFront')}
        </button>
        <button type="button" onClick={() => moveWithinBand(false)} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {t('sendToBack')}
        </button>
      </div>

      {parentGroupBlock && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">{t('alignInGroup')}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => update({ x: parentGroupBlock.x + 2 })} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">{t('alignLeft')}</button>
            <button type="button" onClick={() => update({ x: parentGroupBlock.x + (parentGroupBlock.w - block.w) / 2 })} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">{t('alignCenter')}</button>
            <button type="button" onClick={() => update({ x: parentGroupBlock.x + parentGroupBlock.w - block.w - 2 })} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">{t('alignRight')}</button>
          </div>
          <p className="text-[11px] text-zinc-400">{t('detachHint')}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {(['x', 'y', 'w', 'h'] as const).map((axis) => (
          <Field key={axis} label={t(`axis.${axis}`)}>
            <input
              type="number"
              className={inputClass}
              value={Math.round(block[axis])}
              onChange={(e) => update({ [axis]: clamp(parseFloat(e.target.value) || 0, 0, 100) })}
            />
          </Field>
        ))}
      </div>

      {isImage && (
        <Field label={t('photo')}>
          <div className="grid max-h-52 grid-cols-4 gap-1.5 overflow-y-auto">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                title={photo.originalName}
                onClick={() => update({ photoId: photo.id })}
                className={`overflow-hidden rounded border-2 ${
                  block.photoId === photo.id ? 'border-zinc-900 dark:border-zinc-100' : 'border-transparent'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumbSm} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
            {photos.length === 0 && (
              <p className="col-span-4 text-xs text-zinc-500">{t('uploadFirst')}</p>
            )}
          </div>
        </Field>
      )}

      {isTextLike && (
        <>
          <Field label={t('content')}>
            <textarea
              className="min-h-16 rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={block.text ?? ''}
              onChange={(e) => update({ text: e.target.value })}
            />
          </Field>
          <Field label={t('align')}>
            <Segmented
              options={options('align', ALIGNS)}
              value={block.align ?? 'left'}
              onChange={(v) => update({ align: v })}
            />
          </Field>
          <Field label={t('style')}>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => update({ bold: !block.bold })}
                aria-pressed={!!block.bold}
                aria-label={t('bold')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border font-bold ${
                  block.bold
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => update({ italic: !block.italic })}
                aria-pressed={!!block.italic}
                aria-label={t('italic')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border italic ${
                  block.italic
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                }`}
              >
                I
              </button>
              <button
                type="button"
                onClick={() => update({ underline: !block.underline })}
                aria-pressed={!!block.underline}
                aria-label={t('underline')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border underline ${
                  block.underline
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                }`}
              >
                U
              </button>
            </div>
          </Field>
        </>
      )}

      {isTitle && (
        <>
          <Field label={t('level')}>
            <Segmented
              options={HEADING_LEVELS.map((l) => ({ value: String(l), label: tOpt('headingLevel', { level: l }) }))}
              value={String(block.level ?? 2)}
              onChange={(v) => update({ level: Number(v) as HeadingLevel })}
            />
          </Field>
          <Field label={t('customSizeHeading')}>
            <NumberField
              value={block.fontSize}
              onChange={(v) => update({ fontSize: v })}
              min={8}
              max={200}
              placeholder={t('albumDefault')}
            />
          </Field>
        </>
      )}

      {isText && (
        <>
          <Field label={t('size')}>
            <Segmented options={options('textSize', TEXT_SIZES)} value={block.textSize ?? 'normal'} onChange={(v) => update({ textSize: v })} />
          </Field>
          <Field label={t('customSizePreset')}>
            <NumberField
              value={block.fontSize}
              onChange={(v) => update({ fontSize: v })}
              min={8}
              max={200}
              placeholder={t('presetDefault')}
            />
          </Field>
        </>
      )}

      {isButton && (
        <>
          <Field label={t('label')}>
            <input className={inputClass} value={block.label ?? ''} onChange={(e) => update({ label: e.target.value })} />
          </Field>
          <Field label={t('link')}>
            <Segmented
              options={options('linkType', LINK_TYPES)}
              value={block.linkType ?? 'custom'}
              onChange={(v) => update({ linkType: v })}
            />
          </Field>
          {(block.linkType ?? 'custom') === 'custom' && (
            <input
              className={inputClass}
              placeholder={t('urlPlaceholder')}
              value={block.link ?? ''}
              onChange={(e) => update({ link: e.target.value })}
            />
          )}
          {block.linkType === 'zip' && (
            <p className="text-[11px] text-zinc-400">{t('zipHint')}</p>
          )}
          {block.linkType === 'gallery' && (
            <p className="text-[11px] text-zinc-400">{t('galleryHint')}</p>
          )}
          <Field label={t('style')}>
            <Segmented
              options={options('buttonStyle', BUTTON_STYLES)}
              value={block.style ?? 'primary'}
              onChange={(v) => update({ style: v })}
            />
          </Field>
          <BorderField value={block} onChange={update} />
        </>
      )}

      {isImage && (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('appearance')}</span>
          <Field label={t('corners')}>
            <Segmented options={options('radius', RADII)} value={block.radius ?? 'none'} onChange={(v) => update({ radius: v })} />
          </Field>
          <BorderField value={block} onChange={update} />

          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('kenBurns')}</span>
          <Field label={t('effect')}>
            <Segmented
              options={options('kenBurns', KEN_BURNS_STYLES)}
              value={block.kenBurns ?? 'none'}
              onChange={(v) => update({ kenBurns: v })}
            />
          </Field>
          {(block.kenBurns ?? 'none') !== 'none' && (
            <label className="text-[11px] text-zinc-400">
              {t('speed', { value: block.kenBurnsSpeed ?? 8 })}
              <input
                type="range"
                min={2}
                max={autoplay ? Math.max(2, autoplaySeconds) : 30}
                value={Math.min(block.kenBurnsSpeed ?? 8, autoplay ? Math.max(2, autoplaySeconds) : 30)}
                onChange={(e) => update({ kenBurnsSpeed: parseInt(e.target.value, 10) })}
                className="w-full"
              />
              {autoplay && <span className="mt-0.5 block">{t('cappedToAutoplay', { seconds: autoplaySeconds })}</span>}
            </label>
          )}
        </>
      )}

      {hasSharedAppearance && !isImage && (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('appearance')}</span>

          {showCorners && (
            <Field label={t('corners')}>
              <Segmented options={options('radius', RADII)} value={block.radius ?? 'none'} onChange={(v) => update({ radius: v })} />
            </Field>
          )}

          {showBackground && <BackgroundField value={block} onChange={update} />}

          {isGroup && (
            <>
              <label className="text-[11px] text-zinc-400">
                {t('blur', { value: block.blur ?? 0 })}
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={block.blur ?? 0}
                  onChange={(e) => update({ blur: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
              <label className="text-[11px] text-zinc-400">
                {t('shadowBlur', { value: block.shadow ?? 0 })}
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={block.shadow ?? 0}
                  onChange={(e) => update({ shadow: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
              {(block.shadow ?? 0) > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-zinc-400">
                      {t('offsetX', { value: block.shadowOffsetX ?? 0 })}
                      <input
                        type="range"
                        min={-40}
                        max={40}
                        value={block.shadowOffsetX ?? 0}
                        onChange={(e) => update({ shadowOffsetX: parseInt(e.target.value, 10) })}
                        className="w-full"
                      />
                    </label>
                    <label className="text-[11px] text-zinc-400">
                      {t('offsetY', { value: block.shadowOffsetY ?? Math.round((block.shadow ?? 0) / 2) })}
                      <input
                        type="range"
                        min={-40}
                        max={40}
                        value={block.shadowOffsetY ?? Math.round((block.shadow ?? 0) / 2)}
                        onChange={(e) => update({ shadowOffsetY: parseInt(e.target.value, 10) })}
                        className="w-full"
                      />
                    </label>
                  </div>
                  <label className="text-[11px] text-zinc-400">
                    {t('spread', { value: block.shadowSpread ?? 0 })}
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      value={block.shadowSpread ?? 0}
                      onChange={(e) => update({ shadowSpread: parseInt(e.target.value, 10) })}
                      className="w-full"
                    />
                  </label>
                  <div className="flex flex-col gap-1">
                    <input
                      type="color"
                      value={block.shadowColor ?? '#000000'}
                      onChange={(e) => update({ shadowColor: e.target.value })}
                      className="h-8 w-full cursor-pointer rounded"
                    />
                    <PresetSwatchRow presets={colorPresets} onPick={(hex) => update({ shadowColor: hex })} />
                  </div>
                </>
              )}
            </>
          )}

          {showTextColor && (
            <Field label={t('textColour')}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_SWATCHES.map((key) => (
                    <button
                      key={key}
                      type="button"
                      title={tOpt(`textSwatch.${key}`)}
                      aria-label={tOpt(`textSwatch.${key}`)}
                      onClick={() => update({ textColor: key })}
                      className="h-6 w-6 rounded-full border-2"
                      style={{
                        borderColor: (block.textColor ?? 'default') === key ? 'var(--sc-accent, #6366f1)' : 'transparent',
                        ...textSwatchStyle(key, block.textColorCustom),
                      }}
                    />
                  ))}
                </div>
                {(block.textColor ?? 'default') !== 'default' && (
                  <button
                    type="button"
                    onClick={() => update({ textColor: 'default' })}
                    className="shrink-0 text-[11px] text-zinc-400 underline"
                  >
                    {t('reset')}
                  </button>
                )}
              </div>
            </Field>
          )}
          {showTextColor && block.textColor === 'custom' && (
            <div className="flex flex-col gap-1">
              <input
                type="color"
                value={block.textColorCustom ?? '#e9e9ed'}
                onChange={(e) => update({ textColor: 'custom', textColorCustom: e.target.value })}
                className="h-8 w-full cursor-pointer rounded"
              />
              <PresetSwatchRow presets={colorPresets} onPick={(hex) => update({ textColor: 'custom', textColorCustom: hex })} />
              <label className="text-[11px] text-zinc-400">
                {t('opacity', { value: block.textColorCustomAlpha ?? 100 })}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={block.textColorCustomAlpha ?? 100}
                  onChange={(e) => update({ textColorCustomAlpha: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
            </div>
          )}
        </>
      )}

      {isTitle && (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('textColour')}</span>
          <p className="text-[11px] text-zinc-400">{t('titleSolidHint')}</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {TEXT_SWATCHES.map((key) => (
                <button
                  key={key}
                  type="button"
                  title={tOpt(`textSwatch.${key}`)}
                  aria-label={tOpt(`textSwatch.${key}`)}
                  onClick={() => update({ textColor: key })}
                  className="h-6 w-6 rounded-full border-2"
                  style={{
                    borderColor: (block.textColor ?? 'default') === key ? 'var(--sc-accent, #6366f1)' : 'transparent',
                    ...textSwatchStyle(key, block.textColorCustom),
                  }}
                />
              ))}
            </div>
            {(block.textColor ?? 'default') !== 'default' && (
              <button
                type="button"
                onClick={() => update({ textColor: 'default' })}
                className="shrink-0 text-[11px] text-zinc-400 underline"
              >
                {t('reset')}
              </button>
            )}
          </div>
          {block.textColor === 'custom' && (
            <div className="flex flex-col gap-1">
              <input
                type="color"
                value={block.textColorCustom ?? '#e9e9ed'}
                onChange={(e) => update({ textColor: 'custom', textColorCustom: e.target.value })}
                className="h-8 w-full cursor-pointer rounded"
              />
              <PresetSwatchRow presets={colorPresets} onPick={(hex) => update({ textColor: 'custom', textColorCustom: hex })} />
            </div>
          )}
        </>
      )}

      {isGroup && (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('arrangeChildren')}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => arrangeGroup(selectedId, 'stack-v')} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">{t('stackDown')}</button>
            <button type="button" onClick={() => arrangeGroup(selectedId, 'stack-h')} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">{t('stackRight')}</button>
          </div>
          <div className="flex gap-2">
            {(['align-left', 'align-center', 'align-right'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => arrangeGroup(selectedId, mode)} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {t(ARRANGE_KEY[mode])}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['align-top', 'align-middle', 'align-bottom'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => arrangeGroup(selectedId, mode)} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {t(ARRANGE_KEY[mode])}
              </button>
            ))}
          </div>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-medium text-zinc-500">{t('addInside')}</span>
          <div className="flex flex-wrap gap-2">
            {(['title', 'text', 'button'] as const).map((type) => (
              <button key={type} type="button" onClick={() => addGroupChild(selectedId, type)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {t('addChild', { type: blockTypeLabel(type) })}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

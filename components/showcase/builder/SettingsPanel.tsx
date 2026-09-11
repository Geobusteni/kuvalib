// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEditor } from '@craftjs/core'
import {
  BLOCK_TYPE_LABELS,
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

const RADII: { value: BlockRadius; label: string }[] = [
  { value: 'none', label: 'Square' },
  { value: 'md', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
]
const BG_SWATCHES: BlockBg[] = ['none', 'surface', 'deep', 'accentTint', 'accentSolid', 'custom', 'gradient']
const TEXT_SWATCHES: BlockTextColor[] = ['default', 'accent', 'muted', 'custom']
const ALIGNS: BlockAlign[] = ['left', 'center', 'right']
const LINK_TYPES: { value: ButtonLinkType; label: string }[] = [
  { value: 'custom', label: 'Custom URL' },
  { value: 'zip', label: 'ZIP archive' },
  { value: 'gallery', label: 'Back to gallery' },
]
const HEADING_LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6]
const TEXT_SIZES: { value: TextSizePreset; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'huge', label: 'Huge' },
]
const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
]
const KEN_BURNS_STYLES: { value: KenBurns; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'zoom-in', label: 'Zoom in' },
  { value: 'slide-left', label: 'Slide left' },
  { value: 'slide-right', label: 'Slide right' },
  { value: 'slide-up', label: 'Slide up' },
  { value: 'slide-down', label: 'Slide down' },
]

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

/** Mirrors bgSwatchStyle for the text-colour swatches — 'custom' previews the
 *  block's own textColorCustom instead of a generic placeholder. */
function textSwatchStyle(key: BlockTextColor, custom: string | undefined): React.CSSProperties {
  if (key === 'custom') return { background: custom || '#e9e9ed' }
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
    return { background: value.bgCustom || '#1a1a1a' }
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
  const colorPresets = useShowcaseStore((s) => s.settings.colorPresets)
  return (
    <>
      <Field label="Background">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {swatches.map((key) => (
              <button
                key={key}
                type="button"
                title={key}
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
              Reset
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
            Opacity {value.bgCustomAlpha ?? 100}%
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
              From
              <input
                type="color"
                value={value.bgGradientFrom ?? '#000000'}
                onChange={(e) => onChange({ bg: 'gradient', bgGradientFrom: e.target.value } as Partial<T>)}
                className="h-8 w-full cursor-pointer rounded"
              />
              <PresetSwatchRow presets={colorPresets} onPick={(hex) => onChange({ bg: 'gradient', bgGradientFrom: hex } as Partial<T>)} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-[11px] text-zinc-400">
              To
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
            Angle {value.bgGradientAngle ?? 135}°
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
  const colorPresets = useShowcaseStore((s) => s.settings.colorPresets)
  return (
    <>
      <Field label="Border">
        <Segmented
          options={BORDER_STYLES}
          value={value.borderStyle ?? 'none'}
          onChange={(v) => onChange({ borderStyle: v } as Partial<T>)}
        />
      </Field>
      {(value.borderStyle ?? 'none') !== 'none' && (
        <div className="flex gap-2">
          <Field label="Width (px)">
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={value.borderWidth ?? 1}
              onChange={(e) => onChange({ borderWidth: clamp(parseInt(e.target.value, 10) || 1, 1, 20) } as Partial<T>)}
            />
          </Field>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            Colour
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
  const currentPageId = useShowcaseStore((s) => s.currentPageId)
  const page = useShowcaseStore((s) => s.pages.find((p) => p.id === s.currentPageId))
  const setPageSettings = useShowcaseStore((s) => s.setPageSettings)

  if (!page) return null
  const settings = page.settings
  const patch = (p: Partial<PageSettings>) => setPageSettings(currentPageId, p)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Select a block on the canvas to edit it. Drag to move it; drag a corner to resize.
        These settings apply to the current page when nothing is selected.
      </p>
      <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        This page
      </span>
      <BackgroundField value={settings} onChange={patch} />
      <BorderField value={settings} onChange={patch} />
    </div>
  )
}

export function SettingsPanel() {
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
          {BLOCK_TYPE_LABELS[block.type]}
          {parentGroupId ? ' · in group' : ''}
        </span>
        <button
          type="button"
          onClick={deleteSelected}
          aria-label="Delete block"
          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-950/40"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 5h12M8 5V3.5h4V5M5.5 5l1 11h7l1-11" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => moveWithinBand(true)} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
          Bring to front
        </button>
        <button type="button" onClick={() => moveWithinBand(false)} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
          Send to back
        </button>
      </div>

      {parentGroupBlock && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Align in group</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => update({ x: parentGroupBlock.x + 2 })} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Left</button>
            <button type="button" onClick={() => update({ x: parentGroupBlock.x + (parentGroupBlock.w - block.w) / 2 })} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Center</button>
            <button type="button" onClick={() => update({ x: parentGroupBlock.x + parentGroupBlock.w - block.w - 2 })} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Right</button>
          </div>
          <p className="text-[11px] text-zinc-400">Drag it out of the group box to detach it.</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {(['x', 'y', 'w', 'h'] as const).map((axis) => (
          <Field key={axis} label={axis.toUpperCase() + ' %'}>
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
        <Field label="Photo">
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
              <p className="col-span-4 text-xs text-zinc-500">Upload photos to the project first.</p>
            )}
          </div>
        </Field>
      )}

      {isTextLike && (
        <>
          <Field label="Content">
            <textarea
              className="min-h-16 rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={block.text ?? ''}
              onChange={(e) => update({ text: e.target.value })}
            />
          </Field>
          <Field label="Align">
            <Segmented
              options={ALIGNS.map((a) => ({ value: a, label: a[0].toUpperCase() + a.slice(1) }))}
              value={block.align ?? 'left'}
              onChange={(v) => update({ align: v })}
            />
          </Field>
        </>
      )}

      {isTitle && (
        <>
          <Field label="Level">
            <Segmented
              options={HEADING_LEVELS.map((l) => ({ value: String(l), label: `H${l}` }))}
              value={String(block.level ?? 2)}
              onChange={(v) => update({ level: Number(v) as HeadingLevel })}
            />
          </Field>
          <Field label="Custom size (px) — overrides the level default">
            <input
              type="number"
              min={8}
              max={200}
              className={inputClass}
              placeholder="Album default"
              value={block.fontSize ?? ''}
              onChange={(e) => {
                const v = e.target.value
                update({ fontSize: v === '' ? undefined : clamp(parseInt(v, 10) || 16, 8, 200) })
              }}
            />
          </Field>
        </>
      )}

      {isText && (
        <>
          <Field label="Size">
            <Segmented options={TEXT_SIZES} value={block.textSize ?? 'normal'} onChange={(v) => update({ textSize: v })} />
          </Field>
          <Field label="Custom size (px) — overrides the preset">
            <input
              type="number"
              min={8}
              max={200}
              className={inputClass}
              placeholder="Preset default"
              value={block.fontSize ?? ''}
              onChange={(e) => {
                const v = e.target.value
                update({ fontSize: v === '' ? undefined : clamp(parseInt(v, 10) || 15, 8, 200) })
              }}
            />
          </Field>
        </>
      )}

      {isButton && (
        <>
          <Field label="Label">
            <input className={inputClass} value={block.label ?? ''} onChange={(e) => update({ label: e.target.value })} />
          </Field>
          <Field label="Link">
            <Segmented
              options={LINK_TYPES}
              value={block.linkType ?? 'custom'}
              onChange={(v) => update({ linkType: v })}
            />
          </Field>
          {(block.linkType ?? 'custom') === 'custom' && (
            <input
              className={inputClass}
              placeholder="https://…"
              value={block.link ?? ''}
              onChange={(e) => update({ link: e.target.value })}
            />
          )}
          {block.linkType === 'zip' && (
            <p className="text-[11px] text-zinc-400">Opens the download dialog (ZIP of originals), if downloads are enabled for the project.</p>
          )}
          {block.linkType === 'gallery' && (
            <p className="text-[11px] text-zinc-400">Links to the full gallery this showcase was built from.</p>
          )}
          <Field label="Style">
            <Segmented
              options={[
                { value: 'primary', label: 'Primary' },
                { value: 'secondary', label: 'Secondary' },
              ] as { value: ButtonStyle; label: string }[]}
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
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Appearance</span>
          <Field label="Corners">
            <Segmented options={RADII} value={block.radius ?? 'none'} onChange={(v) => update({ radius: v })} />
          </Field>
          <BorderField value={block} onChange={update} />

          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ken Burns</span>
          <Field label="Effect">
            <Segmented
              options={KEN_BURNS_STYLES}
              value={block.kenBurns ?? 'none'}
              onChange={(v) => update({ kenBurns: v })}
            />
          </Field>
          {(block.kenBurns ?? 'none') !== 'none' && (
            <label className="text-[11px] text-zinc-400">
              Speed — {block.kenBurnsSpeed ?? 8}s
              <input
                type="range"
                min={2}
                max={autoplay ? Math.max(2, autoplaySeconds) : 30}
                value={Math.min(block.kenBurnsSpeed ?? 8, autoplay ? Math.max(2, autoplaySeconds) : 30)}
                onChange={(e) => update({ kenBurnsSpeed: parseInt(e.target.value, 10) })}
                className="w-full"
              />
              {autoplay && <span className="mt-0.5 block">Capped to the {autoplaySeconds}s autoplay interval.</span>}
            </label>
          )}
        </>
      )}

      {hasSharedAppearance && !isImage && (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Appearance</span>

          {showCorners && (
            <Field label="Corners">
              <Segmented options={RADII} value={block.radius ?? 'none'} onChange={(v) => update({ radius: v })} />
            </Field>
          )}

          {showBackground && <BackgroundField value={block} onChange={update} />}

          {isGroup && (
            <label className="text-[11px] text-zinc-400">
              Blur (glass effect) — {block.blur ?? 0}px
              <input
                type="range"
                min={0}
                max={40}
                value={block.blur ?? 0}
                onChange={(e) => update({ blur: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </label>
          )}

          {showTextColor && (
            <Field label="Text colour">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_SWATCHES.map((key) => (
                    <button
                      key={key}
                      type="button"
                      title={key}
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
                    Reset
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
                Opacity {block.textColorCustomAlpha ?? 100}%
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
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Text colour</span>
          <p className="text-[11px] text-zinc-400">Headline text is always solid — no transparency.</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {TEXT_SWATCHES.map((key) => (
                <button
                  key={key}
                  type="button"
                  title={key}
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
                Reset
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
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Arrange children</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => arrangeGroup(selectedId, 'stack-v')} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Stack ↓</button>
            <button type="button" onClick={() => arrangeGroup(selectedId, 'stack-h')} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Stack →</button>
          </div>
          <div className="flex gap-2">
            {(['align-left', 'align-center', 'align-right'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => arrangeGroup(selectedId, mode)} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs capitalize hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {mode.replace('align-', '')}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['align-top', 'align-middle', 'align-bottom'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => arrangeGroup(selectedId, mode)} className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs capitalize hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {mode.replace('align-', '')}
              </button>
            ))}
          </div>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-medium text-zinc-500">Add inside this group</span>
          <div className="flex flex-wrap gap-2">
            {(['title', 'text', 'button'] as const).map((type) => (
              <button key={type} type="button" onClick={() => addGroupChild(selectedId, type)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium capitalize hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                + {BLOCK_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

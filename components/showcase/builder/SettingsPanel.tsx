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
  type ButtonLinkType,
  type ButtonStyle,
} from '@/lib/showcase-blocks'
import { useShowcaseStore } from '../store'
import { usePhotos } from '../photos-context'
import { useBuilder } from './useBuilder'

const RADII: { value: BlockRadius; label: string }[] = [
  { value: 'none', label: 'Square' },
  { value: 'md', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
]
const BG_SWATCHES: BlockBg[] = ['none', 'surface', 'deep', 'accentTint', 'accentSolid', 'custom']
const TEXT_SWATCHES: BlockTextColor[] = ['default', 'accent', 'muted', 'custom']
const ALIGNS: BlockAlign[] = ['left', 'center', 'right']
const LINK_TYPES: { value: ButtonLinkType; label: string }[] = [
  { value: 'custom', label: 'Custom URL' },
  { value: 'zip', label: 'ZIP archive' },
  { value: 'gallery', label: 'Back to gallery' },
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
    <div className="flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
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

export function SettingsPanel() {
  const photos = usePhotos()
  const { arrangeGroup, addGroupChild } = useBuilder()
  const markDirty = useShowcaseStore((s) => s.markDirty)

  const { selectedId, block, parentGroupId, actions, query } = useEditor((state) => {
    const id = Array.from(state.events.selected)[0] ?? null
    const node = id ? state.nodes[id] : null
    return {
      selectedId: id as string | null,
      block: node ? (node.data.props.block as Block) : null,
      parentGroupId: node ? ((node.data.props.parentGroupId ?? null) as string | null) : null,
    }
  })

  if (!selectedId || !block) {
    return (
      <p className="text-sm text-zinc-500">
        Select a block on the canvas to edit it. Drag to move it; drag a corner to resize.
      </p>
    )
  }

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

  const isTextLike = block.type === 'title' || block.type === 'text'
  const isButton = block.type === 'button'
  const isGroup = block.type === 'group'
  const hasAppearance = ['title', 'text', 'button', 'group'].includes(block.type)
  const hasTextColor = ['title', 'text', 'button'].includes(block.type)

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

      {block.type === 'image' && (
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
        </>
      )}

      {hasAppearance && (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Appearance</span>
          <Field label="Corners">
            <Segmented options={RADII} value={block.radius ?? 'none'} onChange={(v) => update({ radius: v })} />
          </Field>
          <Field label="Background">
            <div className="flex flex-wrap gap-1.5">
              {BG_SWATCHES.map((key) => (
                <button
                  key={key}
                  type="button"
                  title={key}
                  onClick={() => update({ bg: key })}
                  className="h-6 w-6 rounded-full border-2"
                  style={{
                    borderColor: (block.bg ?? 'none') === key ? 'var(--sc-accent, #6366f1)' : 'transparent',
                    background:
                      key === 'custom'
                        ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'
                        : key === 'none'
                          ? 'repeating-linear-gradient(45deg,#eee,#eee 4px,#fff 4px,#fff 8px)'
                          : `var(--sc-${key === 'accentTint' ? 'accent-tint' : key === 'accentSolid' ? 'accent' : key})`,
                  }}
                />
              ))}
            </div>
          </Field>
          {block.bg === 'custom' && (
            <div className="flex flex-col gap-1">
              <input
                type="color"
                value={block.bgCustom ?? '#1a1a1a'}
                onChange={(e) => update({ bg: 'custom', bgCustom: e.target.value })}
                className="h-8 w-full cursor-pointer rounded"
              />
              <label className="text-[11px] text-zinc-400">
                Opacity {block.bgCustomAlpha ?? 100}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={block.bgCustomAlpha ?? 100}
                  onChange={(e) => update({ bg: 'custom', bgCustomAlpha: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
            </div>
          )}
          {hasTextColor && (
            <Field label="Text colour">
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
                      background:
                        key === 'custom'
                          ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'
                          : key === 'accent'
                            ? 'var(--sc-accent)'
                            : key === 'muted'
                              ? 'var(--sc-text-muted)'
                              : '#e9e9ed',
                    }}
                  />
                ))}
              </div>
            </Field>
          )}
          {block.textColor === 'custom' && (
            <div className="flex flex-col gap-1">
              <input
                type="color"
                value={block.textColorCustom ?? '#e9e9ed'}
                onChange={(e) => update({ textColor: 'custom', textColorCustom: e.target.value })}
                className="h-8 w-full cursor-pointer rounded"
              />
              <label className="text-[11px] text-zinc-400">
                Opacity {block.textColorCustomAlpha ?? 100}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={block.textColorCustomAlpha ?? 100}
                  onChange={(e) => update({ textColor: 'custom', textColorCustomAlpha: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
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
                + {type}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

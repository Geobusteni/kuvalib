// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

/**
 * The admin's own colour palette (Album settings), offered as one-click
 * swatches next to every custom-colour `<input type="color">` in the
 * builder — picking a preset is faster than the native colour picker, and
 * keeps a showcase's colours consistent without reopening it each time.
 */
export function PresetSwatchRow({
  presets,
  onPick,
}: {
  presets: string[]
  onPick: (hex: string) => void
}) {
  if (presets.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 pt-0.5">
      {presets.map((hex) => (
        <button
          key={hex}
          type="button"
          title={hex}
          onClick={() => onPick(hex)}
          className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20"
          style={{ background: hex }}
        />
      ))}
    </div>
  )
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

/** The single-button language switcher, coloured for the dark controls pill.
 *  Placed by `ViewerControls`, whose Space/Enter guard keeps a press on this
 *  button from also reaching the viewer's window-level Space = play/pause. */
export function ViewerLanguage({ className }: { className: string }) {
  return <LanguageSwitcher compact className={className} />
}

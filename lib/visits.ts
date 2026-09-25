// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { headers } from 'next/headers'
import { incrementVisit } from '@/lib/projects'

// A server action (e.g. switching language) or client-side refresh re-renders the page;
// only a real page load counts as a visit.
export async function recordVisit(projectId: string) {
  const h = await headers()
  if (h.get('next-action') || h.get('rsc')) return
  await incrementVisit(projectId)
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/**
 * `Content-Disposition: attachment` for a name that may hold any Unicode. Header values
 * must be Latin-1, so `filename` is an ASCII fallback and `filename*` (RFC 5987) carries
 * the real name.
 */
export function attachment(name: string, fallback = 'download'): string {
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, '').trim() || fallback
  const ascii = clean.replace(/[^\x20-\x7e]|["\;]/g, '_')
  const encoded = encodeURIComponent(clean).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

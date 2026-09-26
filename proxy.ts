// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { NextResponse, type NextRequest } from 'next/server'

// Server components cannot see the request path, and i18n/request.ts needs it to apply a
// project's forced language on /g/[id] and /s/[id] only. The matcher keeps this off every
// other route (API, assets, admin).
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-kuvalib-path', request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/g/:path*', '/s/:path*'],
}

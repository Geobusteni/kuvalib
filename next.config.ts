// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Production is deployed as the self-contained `.next/standalone` bundle
  // (server.js + traced node_modules), assembled by .github/workflows/build.yml
  // and run by scripts/kuvalib.service. See DEPLOYMENT.md.
  output: 'standalone',
}

export default nextConfig

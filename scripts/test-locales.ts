// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import assert from 'node:assert/strict'
import { resolveLocale } from '../lib/locales'

const cases: [[string | undefined, string | undefined], string][] = [
  [['ro', 'en-US'], 'ro'],
  [['xx', 'ro'], 'ro'],
  [[undefined, undefined], 'en'],
  [[undefined, 'ro-RO,ro;q=0.9,en;q=0.8'], 'ro'],
  [[undefined, 'en-GB,en;q=0.9,ro;q=0.8'], 'en'],
  [[undefined, 'fr;q=0.9, ro;q=0.5'], 'ro'],
  [[undefined, 'ro;q=0, en'], 'en'],
  [[undefined, 'de-DE,fr'], 'en'],
  [[undefined, '*'], 'en'],
  [[undefined, 'RO'], 'ro'],
  [['../etc', 'ro'], 'ro'],
]
for (const [args, expected] of cases) {
  assert.equal(resolveLocale(args[0], args[1]), expected, JSON.stringify(args))
}
console.log(`resolveLocale ok (${cases.length} cases)`)

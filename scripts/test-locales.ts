// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import assert from 'node:assert/strict'
import { parsePublicPath, resolveLocale } from '../lib/locales'

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

// [cookie, acceptLanguage, projectDefault] -> locale
const withDefault: [[string | undefined, string | undefined, string | null | undefined], string][] = [
  [['en', 'ro', 'ro'], 'en'], // visitor's choice beats the project default
  [['ro', 'en', 'en'], 'ro'],
  [[undefined, 'en', 'ro'], 'ro'], // project default beats the browser
  [[undefined, 'ro', 'en'], 'en'],
  [[undefined, undefined, 'ro'], 'ro'],
  [[undefined, 'ro', null], 'ro'], // automatic: browser language
  [[undefined, 'ro', undefined], 'ro'],
  [[undefined, 'ro', 'fr'], 'ro'], // invalid default ignored
  [[undefined, undefined, 'fr'], 'en'],
  [['xx', 'en', 'ro'], 'ro'], // invalid cookie ignored, default applies
  [['xx', undefined, 'yy'], 'en'],
]
for (const [args, expected] of withDefault) {
  assert.equal(resolveLocale(...args), expected, JSON.stringify(args))
}
console.log(`resolveLocale with project default ok (${withDefault.length} cases)`)

const paths: [string | null | undefined, ReturnType<typeof parsePublicPath>][] = [
  ['/g/abc123', { kind: 'g', id: 'abc123' }],
  ['/s/abc123/', { kind: 's', id: 'abc123' }],
  ['/g/abc123/extra', { kind: 'g', id: 'abc123' }],
  ['/projects/abc', null],
  ['/g/', null],
  ['/g/a%20b', null],
  ['/gx/abc', null],
  [null, null],
]
for (const [path, expected] of paths) {
  assert.deepEqual(parsePublicPath(path), expected, String(path))
}
console.log(`parsePublicPath ok (${paths.length} cases)`)

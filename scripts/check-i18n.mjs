// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { readFileSync } from 'node:fs'

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

const load = (name) =>
  new Set(keys(JSON.parse(readFileSync(new URL(`../messages/${name}.json`, import.meta.url), 'utf8'))))
const en = load('en')
const ro = load('ro')

const missingInRo = [...en].filter((k) => !ro.has(k))
const missingInEn = [...ro].filter((k) => !en.has(k))

if (missingInRo.length || missingInEn.length) {
  for (const k of missingInRo) console.error(`missing in ro.json: ${k}`)
  for (const k of missingInEn) console.error(`missing in en.json: ${k}`)
  process.exit(1)
}
console.log(`i18n ok: ${en.size} keys in en and ro`)

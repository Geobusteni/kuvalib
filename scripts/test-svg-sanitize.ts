// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import assert from 'node:assert/strict'
import { sanitizeSvg, SvgSanitizeError, SVG_MAX_BYTES } from '../lib/svg-sanitize'
import { LUCIDE_PATHS } from '../lib/icons/lucide-paths'

const wrap = (inner: string, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${attrs}>${inner}</svg>`

const valid: [string, string][] = [
  ['lucide heart', `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />\n</svg>`],
  ['feather', `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`.replace(' class="feather feather-star"', '')],
  ['heroicons outline', `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5" /></svg>`],
  ['heroicons solid', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75z" clip-rule="evenodd" /></svg>`],
  ['xml prolog + unit root size', `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px"><g transform="translate(2 2) rotate(45 12 12)"><circle cx="12" cy="12" r="10" fill="#ff0000"/><rect x="1" y="1" width="4" height="4" rx="1" stroke="rgb(0,0,0)"/></g></svg>`],
  ['single quotes, ellipse line polyline', wrap(`<ellipse cx='12' cy='12' rx='5' ry='3'/><line x1="0" y1="0" x2="5" y2="5"/><polyline points="0,0 5,5"/>`)],
  ['BOM', '﻿' + wrap('<path d="M0 0L5 5"/>')],
]
for (const [name, svg] of valid) {
  const out = sanitizeSvg(svg)
  assert.equal(sanitizeSvg(out.svg).svg, out.svg, `${name}: not idempotent`)
  assert.match(out.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-0-9. ]+"/, name)
  assert.doesNotMatch(out.svg, /width="24|#ff0000|rgb\(/, `${name}: colour or root size survived`)
}
assert.equal(sanitizeSvg(valid[4][1]).viewBox, '0 0 24 24')
assert.match(sanitizeSvg(valid[4][1]).inner, /fill="currentColor"/)
assert.equal(sanitizeSvg(wrap('<path d="M0 0" fill="none"/>')).inner, '<path d="M0 0" fill="none"/>')

let checked = 0
for (const [name, inner] of Object.entries(LUCIDE_PATHS)) {
  const out = sanitizeSvg(wrap(inner, ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'))
  assert.equal(out.inner, inner, `lucide ${name} changed by the sanitiser`)
  checked++
}

const rejected: [string, string, string?][] = [
  ['script element', wrap('<script>alert(1)</script>'), 'svg_forbidden_element'],
  ['script no close', wrap('<script src="x"/>'), 'svg_forbidden_element'],
  ['onload root', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" onload="alert(1)"><path d="M0 0"/></svg>`, 'svg_forbidden_attribute'],
  ['onclick path', wrap('<path d="M0 0" onclick="alert(1)"/>'), 'svg_forbidden_attribute'],
  ['javascript href', wrap('<a href="javascript:alert(1)"><path d="M0 0"/></a>'), 'svg_forbidden_element'],
  ['href on path', wrap('<path d="M0 0" href="javascript:alert(1)"/>'), 'svg_forbidden_attribute'],
  ['xlink:href', wrap('<path d="M0 0" xlink:href="data:image/svg+xml;base64,AAAA"/>'), 'svg_forbidden_attribute'],
  ['xmlns:xlink', `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1 1"><path d="M0 0"/></svg>`, 'svg_forbidden_attribute'],
  ['use', wrap('<use href="#a"/>'), 'svg_forbidden_element'],
  ['image', wrap('<image href="https://evil.example/x.png"/>'), 'svg_forbidden_element'],
  ['foreignObject', wrap('<foreignObject><div>x</div></foreignObject>'), 'svg_forbidden_element'],
  ['nested svg', wrap('<svg><path d="M0 0"/></svg>'), 'svg_forbidden_element'],
  ['style element', wrap('<style>path{fill:url(https://evil.example)}</style>'), 'svg_forbidden_element'],
  ['style attribute', wrap('<path d="M0 0" style="fill:url(#a)"/>'), 'svg_forbidden_attribute'],
  ['animate', wrap('<path d="M0 0"><animate attributeName="d" values="x"/></path>'), 'svg_forbidden_element'],
  ['set', wrap('<set attributeName="onload" to="alert(1)"/>'), 'svg_forbidden_element'],
  ['filter', wrap('<filter id="f"/>'), 'svg_forbidden_element'],
  ['defs', wrap('<defs><linearGradient id="a"/></defs>'), 'svg_forbidden_element'],
  ['fill url', wrap('<path d="M0 0" fill="url(#a)"/>'), 'svg_invalid_value'],
  ['fill url external', wrap('<path d="M0 0" fill="url(https://evil.example/a.svg#b)"/>'), 'svg_invalid_value'],
  ['fill javascript', wrap('<path d="M0 0" fill="javascript:alert(1)"/>'), 'svg_invalid_value'],
  ['fill data', wrap('<path d="M0 0" fill="data:text/html,x"/>'), 'svg_invalid_value'],
  ['fill inherit', wrap('<path d="M0 0" fill="inherit"/>'), 'svg_invalid_value'],
  ['comment', wrap('<!-- hi --><path d="M0 0"/>'), 'svg_forbidden_markup'],
  ['comment with script', wrap('<!--><script>alert(1)</script>--><path d="M0 0"/>'), 'svg_forbidden_markup'],
  ['CDATA', wrap('<![CDATA[<script>alert(1)</script>]]>'), 'svg_forbidden_markup'],
  ['DOCTYPE XXE', `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${wrap('<path d="M0 0"/>')}`, 'svg_forbidden_markup'],
  ['DOCTYPE inside prolog', `<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">${wrap('<path d="M0 0"/>')}`, 'svg_forbidden_markup'],
  ['processing instruction', wrap('<?php echo 1 ?><path d="M0 0"/>'), 'svg_forbidden_markup'],
  ['stylesheet PI', `<?xml-stylesheet href="evil.css"?>${wrap('<path d="M0 0"/>')}`, 'svg_forbidden_markup'],
  ['entity in text', wrap('&lt;script&gt;<path d="M0 0"/>'), 'svg_forbidden_markup'],
  ['entity in value', wrap('<path d="M0 0&#x20;" />'), 'svg_invalid_value'],
  ['text node', wrap('hello<path d="M0 0"/>'), 'svg_invalid'],
  ['title element', wrap('<title>x</title><path d="M0 0"/>'), 'svg_forbidden_element'],
  ['path data junk', wrap('<path d="M0 0 url(#a)"/>'), 'svg_invalid_value'],
  ['path data quote', wrap(`<path d='M0 0"onload="x'/>`), 'svg_invalid_value'],
  ['huge path', wrap(`<path d="${'M0 0L1 1'.repeat(1300)}"/>`), 'svg_invalid_value'],
  ['oversize document', wrap(`<path d="${'M0 0L1 1'.repeat(3000)}"/>`), 'svg_too_large'],
  ['huge value under cap', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="${'1 '.repeat(5100)}"/></svg>`, 'svg_invalid_value'],
  ['transform skew', wrap('<path d="M0 0" transform="skewX(10)"/>'), 'svg_invalid_value'],
  ['transform url', wrap('<path d="M0 0" transform="translate(url(#a))"/>'), 'svg_invalid_value'],
  ['transform junk suffix', wrap('<path d="M0 0" transform="translate(1 2)alert(1)"/>'), 'svg_invalid_value'],
  ['transform arg count', wrap('<path d="M0 0" transform="matrix(1 2 3)"/>'), 'svg_invalid_value'],
  ['number junk', wrap('<circle cx="1" cy="1" r="calc(1px)"/>'), 'svg_invalid_value'],
  ['opacity range', wrap('<path d="M0 0" opacity="2"/>'), 'svg_invalid_value'],
  ['id attribute', wrap('<path id="a" d="M0 0"/>'), 'svg_forbidden_attribute'],
  ['class attribute', wrap('<path class="a" d="M0 0"/>'), 'svg_forbidden_attribute'],
  ['data attribute', wrap('<path data-x="1" d="M0 0"/>'), 'svg_forbidden_attribute'],
  ['constructor attribute', wrap('<path constructor="x" d="M0 0"/>'), 'svg_forbidden_attribute'],
  ['__proto__ attribute', wrap('<path __proto__="x" d="M0 0"/>'), 'svg_forbidden_attribute'],
  ['duplicate attribute', wrap('<path d="M0 0" d="M1 1"/>'), 'svg_invalid'],
  ['attribute without value', wrap('<path d="M0 0" hidden/>'), 'svg_invalid_value'],
  ['unquoted value', wrap('<path d=M0/>'), 'svg_invalid_value'],
  ['missing space between attrs', wrap('<path d="M0 0"fill="none"/>'), 'svg_invalid'],
  ['xmlns on child', wrap('<path xmlns="http://www.w3.org/2000/svg" d="M0 0"/>'), 'svg_forbidden_attribute'],
  ['wrong xmlns', `<svg xmlns="http://www.w3.org/1999/xhtml" viewBox="0 0 1 1"><path d="M0 0"/></svg>`, 'svg_invalid_value'],
  ['uppercase element', wrap('<PATH d="M0 0"/>'), 'svg_forbidden_element'],
  ['SVG uppercase root', '<SVG viewBox="0 0 1 1"><path d="M0 0"/></SVG>', 'svg_forbidden_element'],
  ['html root', '<html><body></body></html>', 'svg_forbidden_element'],
  ['not svg at all', 'hello world', 'svg_invalid'],
  ['unclosed', wrap('<g><path d="M0 0"/>').replace('</svg>', ''), 'svg_invalid'],
  ['mismatched close', wrap('<g><path d="M0 0"/></path></g>'), 'svg_invalid'],
  ['content after root', wrap('<path d="M0 0"/>') + '<script>alert(1)</script>', 'svg_invalid'],
  ['two roots', wrap('<path d="M0 0"/>') + wrap('<path d="M0 0"/>'), 'svg_invalid'],
  ['close before open', '</svg>' + wrap('<path d="M0 0"/>'), 'svg_invalid'],
  ['unicode fullwidth <', wrap('＜script＞alert(1)＜/script＞'), 'svg_invalid_characters'],
  ['zero width in name', wrap('<pa​th d="M0 0"/>'), 'svg_invalid_characters'],
  ['bidi override', wrap('<path d="M0 0" fill="‮red"/>'), 'svg_invalid_characters'],
  ['null byte', wrap('<path d="M0 0"/>\0'), 'svg_invalid_characters'],
  ['emoji in value', wrap('<path d="M0 0" fill="😀"/>'), 'svg_invalid_characters'],
  ['no viewBox no size', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>', 'svg_no_viewbox'],
  ['percent size', '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M0 0"/></svg>', 'svg_no_viewbox'],
  ['bad viewBox', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 0"><path d="M0 0"/></svg>', 'svg_invalid_value'],
  ['viewBox junk', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24 9"><path d="M0 0"/></svg>', 'svg_invalid_value'],
  ['x on root', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" x="5"><path d="M0 0"/></svg>', 'svg_forbidden_attribute'],
  ['empty svg', wrap(''), 'svg_empty'],
  ['empty input', '', 'svg_empty'],
  ['whitespace input', '  \n ', 'svg_empty'],
  ['too many elements', wrap('<path d="M0 0"/>'.repeat(201)), 'svg_too_complex'],
  ['too deep', wrap('<g>'.repeat(9) + '<path d="M0 0"/>' + '</g>'.repeat(9)), 'svg_too_complex'],
  ['non-string', undefined as unknown as string, 'svg_invalid'],
]
for (const [name, svg, code] of rejected) {
  try {
    const out = sanitizeSvg(svg)
    assert.fail(`${name}: accepted -> ${out.svg.slice(0, 120)}`)
  } catch (e) {
    if (!(e instanceof SvgSanitizeError)) throw e
    if (code) assert.equal(e.code, code, `${name}: got ${e.code}`)
  }
}

const atLimit = wrap(`<path d="${'M0 0'.padEnd(6500, ' ')}"/>`.repeat(3))
assert.ok(atLimit.length < SVG_MAX_BYTES)
sanitizeSvg(atLimit)
assert.throws(() => sanitizeSvg(atLimit + ' '.repeat(SVG_MAX_BYTES)), /svg_too_large/)

console.log(`svg sanitiser ok (${valid.length} valid samples, ${checked} lucide icons, ${rejected.length} hostile cases)`)

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/**
 * A strict, dependency-free sanitiser for admin-supplied SVG icons.
 *
 * It is an allowlist parser, not a filter: the input is tokenised, every
 * element and attribute must be on the list with a value that matches a narrow
 * grammar, and anything else is rejected with a coded error — nothing is
 * silently repaired. The output is re-serialised from the parsed values, never
 * copied from the input, so it cannot carry anything the parser did not
 * understand. Pure (no I/O), so it runs on the server (write + read) and in the
 * browser (render) alike.
 */

export const SVG_MAX_BYTES = 20 * 1024

export type SvgErrorCode =
  | 'svg_empty'
  | 'svg_too_large'
  | 'svg_invalid'
  | 'svg_invalid_characters'
  | 'svg_forbidden_markup'
  | 'svg_forbidden_element'
  | 'svg_forbidden_attribute'
  | 'svg_invalid_value'
  | 'svg_too_complex'
  | 'svg_no_viewbox'

export class SvgSanitizeError extends Error {
  readonly code: SvgErrorCode
  /** The offending element or attribute name, already reduced to a safe charset. */
  readonly detail?: string
  constructor(code: SvgErrorCode, detail?: string) {
    super(code)
    this.code = code
    this.detail = detail ? detail.replace(/[^A-Za-z0-9:_.-]/g, '').slice(0, 32) || undefined : undefined
  }
}

export interface SanitizedSvg {
  /** The complete normalised markup, `<svg xmlns viewBox …>…</svg>`. */
  svg: string
  viewBox: string
  /** The root's presentation attributes (kebab-case names), already validated. */
  attrs: Record<string, string>
  /** Everything between the root's tags. Safe to hand to dangerouslySetInnerHTML. */
  inner: string
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const MAX_ELEMENTS = 200
const MAX_DEPTH = 8
const MAX_VALUE_LENGTH = 10000

const ELEMENTS = new Set(['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'])

const NUM = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`
const LENGTH = new RegExp(`^${NUM}(?:px|%)?$`)
const PLAIN_NUMBER = new RegExp(`^${NUM}$`)
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]*$/
const POINTS = /^[0-9eE+\-.,\s]+$/
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert'])

/** Presentation attributes: allowed on every element, hoisted on the root. */
const PRESENTATION_ORDER = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'fill-rule',
  'clip-rule',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
] as const

const LENGTH_ATTRS = new Set(['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height'])

function fail(code: SvgErrorCode, detail?: string): never {
  throw new SvgSanitizeError(code, detail)
}

function isNumber(s: string): boolean {
  return PLAIN_NUMBER.test(s) && Number.isFinite(Number(s)) && Math.abs(Number(s)) <= 1e6
}

function paint(value: string, name: string): string {
  const v = value.trim()
  if (v === 'none' || v === 'currentColor') return v
  if (v === 'transparent') return 'none'
  const solid =
    /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ||
    /^(?:rgb|hsl)a?\([0-9.%,\s/]{1,40}\)$/.test(v) ||
    (/^[A-Za-z]{3,20}$/.test(v) && !CSS_WIDE_KEYWORDS.has(v.toLowerCase()))
  if (!solid) fail('svg_invalid_value', name)
  return 'currentColor'
}

function transform(value: string): string {
  const parts: string[] = []
  const fn = /\s*(translate|rotate|scale|matrix)\s*\(([^()]*)\)\s*,?/y
  let pos = 0
  const v = value.trim()
  while (pos < v.length) {
    fn.lastIndex = pos
    const m = fn.exec(v)
    if (!m) fail('svg_invalid_value', 'transform')
    const args = m[2].trim().split(/[\s,]+/)
    const counts: Record<string, number[]> = {
      translate: [1, 2],
      rotate: [1, 3],
      scale: [1, 2],
      matrix: [6],
    }
    if (!args.every(isNumber) || !counts[m[1]].includes(args.length)) fail('svg_invalid_value', 'transform')
    parts.push(`${m[1]}(${args.join(' ')})`)
    pos = fn.lastIndex
  }
  if (parts.length === 0 || parts.length > 8) fail('svg_invalid_value', 'transform')
  return parts.join(' ')
}

function enumeration(name: string, allowed: string[]) {
  return (v: string) => {
    const t = v.trim()
    if (!allowed.includes(t)) fail('svg_invalid_value', name)
    return t
  }
}

function unitInterval(name: string) {
  return (v: string) => {
    const t = v.trim()
    if (!isNumber(t) || Number(t) < 0 || Number(t) > 1) fail('svg_invalid_value', name)
    return t
  }
}

const VALIDATORS: Record<string, (v: string) => string> = {
  d: (v) => {
    if (!PATH_DATA.test(v) || v.length > MAX_VALUE_LENGTH) fail('svg_invalid_value', 'd')
    return v.replace(/\s+/g, ' ').trim()
  },
  points: (v) => {
    if (!POINTS.test(v) || v.length > MAX_VALUE_LENGTH) fail('svg_invalid_value', 'points')
    return v.replace(/\s+/g, ' ').trim()
  },
  transform,
  fill: (v) => paint(v, 'fill'),
  stroke: (v) => paint(v, 'stroke'),
  'stroke-width': (v) => {
    const t = v.trim()
    if (!LENGTH.test(t) || t.endsWith('%') || Number(parseFloat(t)) < 0) fail('svg_invalid_value', 'stroke-width')
    return t
  },
  'stroke-linecap': enumeration('stroke-linecap', ['butt', 'round', 'square']),
  'stroke-linejoin': enumeration('stroke-linejoin', ['miter', 'round', 'bevel']),
  'stroke-miterlimit': (v) => {
    const t = v.trim()
    if (!isNumber(t) || Number(t) < 1) fail('svg_invalid_value', 'stroke-miterlimit')
    return t
  },
  'fill-rule': enumeration('fill-rule', ['nonzero', 'evenodd']),
  'clip-rule': enumeration('clip-rule', ['nonzero', 'evenodd']),
  opacity: unitInterval('opacity'),
  'fill-opacity': unitInterval('fill-opacity'),
  'stroke-opacity': unitInterval('stroke-opacity'),
}

function validateAttribute(name: string, value: string): string {
  if (LENGTH_ATTRS.has(name)) {
    const t = value.trim()
    if (!LENGTH.test(t) || Math.abs(parseFloat(t)) > 1e6) fail('svg_invalid_value', name)
    return t
  }
  if (!Object.hasOwn(VALIDATORS, name)) fail('svg_forbidden_attribute', name)
  return VALIDATORS[name](value)
}

interface RawNode {
  name: string
  attrs: [string, string][]
  children: RawNode[]
}

function tokenise(source: string): RawNode {
  const src = source
  let pos = 0
  let elementCount = 0
  const stack: RawNode[] = []
  let root: RawNode | null = null

  const skipSpace = () => {
    while (pos < src.length && /\s/.test(src[pos])) pos++
  }

  while (pos < src.length) {
    if (src[pos] !== '<') {
      const next = src.indexOf('<', pos)
      const text = src.slice(pos, next === -1 ? src.length : next)
      if (text.trim() !== '') fail(text.includes('&') ? 'svg_forbidden_markup' : 'svg_invalid')
      pos = next === -1 ? src.length : next
      continue
    }

    const after = src[pos + 1]
    if (after === '/') {
      const end = src.indexOf('>', pos)
      if (end === -1) fail('svg_invalid')
      const name = src.slice(pos + 2, end).trim()
      const open = stack.pop()
      if (!open || open.name !== name) fail('svg_invalid')
      pos = end + 1
      if (stack.length === 0) {
        if (src.slice(pos).trim() !== '') fail('svg_invalid')
        pos = src.length
      }
      continue
    }
    if (after === undefined || !/[A-Za-z]/.test(after)) fail('svg_forbidden_markup')

    pos++
    const nameStart = pos
    while (pos < src.length && !/[\s/>]/.test(src[pos])) pos++
    const name = src.slice(nameStart, pos)
    if (root === null ? name !== 'svg' : !ELEMENTS.has(name)) fail('svg_forbidden_element', name)
    if (++elementCount > MAX_ELEMENTS + 1) fail('svg_too_complex')

    const node: RawNode = { name, attrs: [], children: [] }
    let selfClosing = false
    for (;;) {
      const before = pos
      skipSpace()
      if (pos >= src.length) fail('svg_invalid')
      if (src[pos] === '>') {
        pos++
        break
      }
      if (src[pos] === '/' && src[pos + 1] === '>') {
        selfClosing = true
        pos += 2
        break
      }
      if (pos === before) fail('svg_invalid')
      const attrStart = pos
      while (pos < src.length && !/[\s=/>"'<]/.test(src[pos])) pos++
      const attrName = src.slice(attrStart, pos)
      if (!attrName) fail('svg_invalid')
      skipSpace()
      if (src[pos] !== '=') fail('svg_invalid_value', attrName)
      pos++
      skipSpace()
      const quote = src[pos]
      if (quote !== '"' && quote !== "'") fail('svg_invalid_value', attrName)
      const close = src.indexOf(quote, pos + 1)
      if (close === -1) fail('svg_invalid')
      const value = src.slice(pos + 1, close)
      pos = close + 1
      if (/[<&"'`]/.test(value)) fail('svg_invalid_value', attrName)
      if (node.attrs.some(([n]) => n === attrName)) fail('svg_invalid', attrName)
      node.attrs.push([attrName, value])
    }

    if (root === null) root = node
    else {
      const parent = stack[stack.length - 1]
      if (!parent) fail('svg_invalid')
      parent.children.push(node)
    }
    if (!selfClosing) {
      stack.push(node)
      if (stack.length > MAX_DEPTH) fail('svg_too_complex')
    } else if (stack.length === 0) {
      pos = src.length
    }
  }

  if (!root || stack.length > 0) fail('svg_invalid')
  return root
}

function serialise(node: RawNode): string {
  const attrs = node.attrs.map(([n, v]) => {
    const value = validateAttribute(n, v)
    if (!/^[A-Za-z0-9 .,+\-()%]*$/.test(value)) fail('svg_invalid_value', n)
    return ` ${n}="${value}"`
  })
  const open = `<${node.name}${attrs.join('')}`
  if (node.children.length === 0) return `${open}/>`
  return `${open}>${node.children.map(serialise).join('')}</${node.name}>`
}

function rootFrame(attrs: [string, string][]): {
  viewBox: string
  presentation: Record<string, string>
} {
  const seen = new Map<string, string>()
  for (const [name, value] of attrs) {
    if (name === 'xmlns') {
      if (value !== SVG_NS) fail('svg_invalid_value', 'xmlns')
    } else if (name === 'version') {
      if (value !== '1.0' && value !== '1.1') fail('svg_invalid_value', 'version')
    } else if (
      name === 'viewBox' ||
      name === 'width' ||
      name === 'height' ||
      (PRESENTATION_ORDER as readonly string[]).includes(name)
    ) {
      seen.set(name, name === 'viewBox' ? value : validateAttribute(name, value))
    } else {
      fail('svg_forbidden_attribute', name)
    }
  }

  let viewBox = seen.get('viewBox')
  if (viewBox !== undefined) {
    const parts = viewBox.trim().split(/[\s,]+/)
    if (parts.length !== 4 || !parts.every(isNumber)) fail('svg_invalid_value', 'viewBox')
    if (Number(parts[2]) <= 0 || Number(parts[3]) <= 0) fail('svg_invalid_value', 'viewBox')
    viewBox = parts.join(' ')
  } else {
    const w = seen.get('width')
    const h = seen.get('height')
    if (!w || !h || w.endsWith('%') || h.endsWith('%')) fail('svg_no_viewbox')
    const wn = parseFloat(w)
    const hn = parseFloat(h)
    if (!(wn > 0) || !(hn > 0)) fail('svg_no_viewbox')
    viewBox = `0 0 ${wn} ${hn}`
  }

  const presentation: Record<string, string> = {}
  for (const name of PRESENTATION_ORDER) {
    const v = seen.get(name)
    if (v !== undefined) presentation[name] = v
  }
  presentation.fill ??= 'currentColor'
  return { viewBox, presentation }
}

export function sanitizeSvg(input: string): SanitizedSvg {
  if (typeof input !== 'string') fail('svg_invalid')
  let source = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  if (source.length > SVG_MAX_BYTES) fail('svg_too_large')
  if (/[^\t\n\r\x20-\x7e]/.test(source)) fail('svg_invalid_characters')
  source = source.replace(/^\s*<\?xml\s+version="1\.[01]"(?:\s+encoding="(?:UTF-8|utf-8)")?(?:\s+standalone="(?:yes|no)")?\s*\?>/, '')
  source = source.trim()
  if (source === '') fail('svg_empty')

  const root = tokenise(source)
  if (root.children.length === 0) fail('svg_empty')

  const { viewBox, presentation } = rootFrame(root.attrs)
  const inner = root.children.map(serialise).join('')
  const attrs = Object.fromEntries(Object.entries(presentation))
  const attrText = Object.entries(attrs)
    .map(([n, v]) => ` ${n}="${v}"`)
    .join('')
  return {
    svg: `<svg xmlns="${SVG_NS}" viewBox="${viewBox}"${attrText}>${inner}</svg>`,
    viewBox,
    attrs,
    inner,
  }
}

const cache = new Map<string, SanitizedSvg | null>()

/** Re-sanitises stored markup before it is rendered; null when it no longer passes. */
export function safeSvg(stored: string): SanitizedSvg | null {
  const hit = cache.get(stored)
  if (hit !== undefined) return hit
  let result: SanitizedSvg | null
  try {
    result = sanitizeSvg(stored)
  } catch {
    result = null
  }
  if (cache.size > 300) cache.clear()
  cache.set(stored, result)
  return result
}

// Guards the country flags repaired for hairline seams (scripts/flags/seams.mjs
// finds them by rendering). Where two shapes only meet edge to edge, each edge
// is anti-aliased on its own and whatever lies under them shows through as a
// thin line at fractional device pixel ratios (2.625× phones). The repaired
// files paint a field that covers the whole flag first, and every visible edge
// of a stripe, band, canton or triangle has the same colour underneath on both
// sides (or its own colour), so there is nothing to show through.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'flags')

// Every flag repaired in this pass. Vanuatu is drawn with clipped strokes, so
// it has its own check below.
const FIXED = [
  'ae', 'af', 'ag', 'am', 'at', 'be', 'bg', 'bj', 'bm', 'bs', 'ca', 'cf', 'ci', 'cl', 'cm', 'cz', 'de', 'dm',
  'dz', 'eac', 'ee', 'eg', 'fj', 'gb-wls', 'gd', 'gm', 'gn', 'gr', 'gw', 'id', 'in', 'iq', 'jo', 'km', 'kw',
  'lb', 'lc', 'li', 'lu', 'mc', 'mg', 'mh', 'ml', 'mu', 'mx', 'my', 'mz', 'nf', 'nl', 'nu', 'pg', 'ph', 'pt',
  'py', 'ro', 'ru', 'sd', 'si', 'sl', 'sm', 'sn', 'ss', 'sx', 'td', 'tg', 'tv', 'ug', 'um', 'us', 'va', 'za', 'zm',
]

// ── A small reader for the flat shapes of a flag SVG ──────────────────────────
const NAMED = { red: '#ff0000', white: '#ffffff', black: '#000000', gray: '#808080' }
const colour = c => {
  c = (c ?? '#000').trim().toLowerCase()
  if (NAMED[c]) return NAMED[c]
  return /^#[0-9a-f]{3}$/.test(c) ? '#' + [...c.slice(1)].map(h => h + h).join('') : c
}
const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]
function transformOf(t) {
  let m = [1, 0, 0, 1, 0, 0]
  for (const [, fn, args] of (t ?? '').matchAll(/(\w+)\(([^)]*)\)/g)) {
    const n = args.split(/[\s,]+/).filter(Boolean).map(Number)
    if (fn === 'translate') m = mul(m, [1, 0, 0, 1, n[0], n[1] ?? 0])
    else if (fn === 'scale') m = mul(m, [n[0], 0, 0, n[1] ?? n[0], 0, 0])
    else if (fn === 'matrix') m = mul(m, n)
    else return null // rotations and skews only appear on emblems
  }
  return m
}
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
const attrs = s => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(a => [a[1], a[2]]))

/** Straight-edged subpaths of a path, or null when it has curves or arcs. */
function polygonsOf(d) {
  if (/[CcSsQqTtAa]/.test(d)) return null
  const toks = d.match(/[MmLlHhVvZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const subs = []
  let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = '', i = 0
  const num = () => Number(toks[i++])
  while (i < toks.length) {
    if (/[a-z]/i.test(toks[i])) cmd = toks[i++]
    const rel = cmd === cmd.toLowerCase()
    switch (cmd.toUpperCase()) {
      case 'M': x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); sx = x; sy = y; cur = [[x, y]]; subs.push(cur); cmd = rel ? 'l' : 'L'; break
      case 'L': x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); cur.push([x, y]); break
      case 'H': x = (rel ? x : 0) + num(); cur.push([x, y]); break
      case 'V': y = (rel ? y : 0) + num(); cur.push([x, y]); break
      case 'Z': x = sx; y = sy; cmd = ''; break
      default: return null
    }
  }
  return subs
}

/** The flag's flat shapes in paint order, in the 640×480 frame: [{fill, rule, polys, open}]. */
export function flatShapes(svg) {
  const out = []
  const stack = [{ m: [1, 0, 0, 1, 0, 0], rule: 'nonzero', hidden: false }]
  for (const [, close, tag, rest, self] of svg.matchAll(/<(\/?)(\w+)([^>]*?)(\/?)>/g)) {
    const top = stack[stack.length - 1]
    if (close) { if (tag !== 'path' && tag !== 'rect') stack.pop(); continue }
    const a = attrs(rest)
    const t = a.transform ? transformOf(a.transform) : [1, 0, 0, 1, 0, 0]
    const ctx = {
      m: t ? mul(top.m, t) : top.m, rule: a['fill-rule'] ?? top.rule,
      hidden: top.hidden || !t || ['defs', 'clipPath', 'marker', 'mask', 'pattern', 'symbol'].includes(tag),
      fill: a.fill ?? top.fill,
    }
    if (tag === 'path' || tag === 'rect') {
      if (ctx.hidden || a.stroke && a.stroke !== 'none' && (a.fill === 'none' || !a.fill)) {
        // Stripes drawn as thick strokes along straight lines (United States).
        const w = Number(a['stroke-width'] ?? 0), subs = a.d && polygonsOf(a.d)
        if (ctx.hidden || !w || !subs) continue
        const polys = []
        for (const s of subs) for (let k = 1; k < s.length; k++) {
          const [p, q] = [s[k - 1], s[k]]
          if (p[1] === q[1]) polys.push([[p[0], p[1] - w / 2], [q[0], p[1] - w / 2], [q[0], p[1] + w / 2], [p[0], p[1] + w / 2]])
          else if (p[0] === q[0]) polys.push([[p[0] - w / 2, p[1]], [p[0] + w / 2, p[1]], [p[0] + w / 2, q[1]], [p[0] - w / 2, q[1]]])
        }
        if (polys.length) out.push({ fill: colour(a.stroke), rule: 'nonzero', polys: polys.map(pl => pl.map(pt => apply(ctx.m, pt))) })
        continue
      }
      if (ctx.fill === 'none' || a.rx || a.ry) continue
      const subs = tag === 'rect'
        ? [[[+a.x || 0, +a.y || 0], [(+a.x || 0) + +a.width, +a.y || 0], [(+a.x || 0) + +a.width, (+a.y || 0) + +a.height], [+a.x || 0, (+a.y || 0) + +a.height]]]
        : polygonsOf(a.d ?? '')
      if (subs) out.push({ fill: colour(ctx.fill), rule: ctx.rule, polys: subs.filter(s => s.length > 2).map(s => s.map(pt => apply(ctx.m, pt))) })
      continue
    }
    if (!self) stack.push(ctx)
  }
  return out
}

function inside(shape, [x, y]) {
  let wind = 0, cross = 0
  for (const poly of shape.polys) for (let k = 0; k < poly.length; k++) {
    const [ax, ay] = poly[k], [bx, by] = poly[(k + 1) % poly.length]
    if ((ay <= y) !== (by <= y)) {
      const xi = ax + ((y - ay) * (bx - ax)) / (by - ay)
      if (xi > x) { cross++; wind += by > ay ? 1 : -1 }
    }
  }
  return shape.rule === 'evenodd' ? cross % 2 === 1 : wind !== 0
}

const bbox = s => {
  const pts = s.polys.flat()
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

/**
 * Visible edges of the flag's structure (shapes at least a fifth of the flag
 * across: stripes, bands, cantons, crosses, triangles; emblems are skipped)
 * whose two sides have different colours underneath. Each edge is sampled 1
 * unit either side; junctions and slivers thinner than 3 units are skipped.
 */
export function seamEdges(svg, E = 1) {
  const shapes = flatShapes(svg).filter(s => {
    const [x0, y0, x1, y1] = bbox(s)
    return s.polys.length && (x1 - x0 >= 128 || y1 - y0 >= 96)
  })
  const inFlag = ([x, y]) => x > 2 * E && y > 2 * E && x < 640 - 2 * E && y < 480 - 2 * E
  const under = (i, p) => { for (let k = i - 1; k >= 0; k--) if (inside(shapes[k], p)) return shapes[k].fill; return null }
  const bad = []
  shapes.forEach((s, i) => {
    for (const poly of s.polys) for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (len < 10 * E) continue
      const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len, nx = -ty, ny = tx
      for (let d = 5 * E; d <= len - 5 * E; d += Math.max(E, len / 200)) {
        const at = (u, v) => [a[0] + tx * u + nx * v, a[1] + ty * u + ny * v]
        const sgn = inside(s, at(d, E)) ? 1 : inside(s, at(d, -E)) ? -1 : 0
        if (!sgn) continue
        const pin = at(d, sgn * E), pout = at(d, -sgn * E)
        if (inside(s, pout) || !inside(s, at(d, 3 * sgn * E)) || inside(s, at(d, -3 * sgn * E))) continue
        if (!inFlag(pin) || !inFlag(pout)) continue
        if (shapes.slice(i + 1).some(t => inside(t, pin) || inside(t, pout))) continue
        const u = under(i, pin), o = under(i, pout)
        // A colour change along the edge (a junction) isn't judged.
        if (under(i, at(d - 4 * E, sgn * E)) !== u || under(i, at(d + 4 * E, sgn * E)) !== u ||
          under(i, at(d - 4 * E, -sgn * E)) !== o || under(i, at(d + 4 * E, -sgn * E)) !== o) continue
        if (u !== o && u !== s.fill) bad.push({ shape: i, fill: s.fill, at: pin.map(v => +v.toFixed(1)), under: u, outside: o })
      }
    }
  })
  return bad
}

const read = c => readFileSync(path.join(DIR, c + '.svg'), 'utf8')
// Forgeries of repaired flags (Flag Forgery, Spot the Error) must be just as
// clean, or a seam would give the fake away.
const FAKES = ['ca', 'de', 'dz', 'gr', 'in', 'mx']
const readFake = c => readFileSync(path.join(DIR, '..', 'fakes', c + '.svg'), 'utf8')

test('each repaired flag paints a field over the whole flag first', () => {
  for (const c of [...FIXED, 'vu']) {
    const [first] = flatShapes(read(c))
    assert.ok(first, `${c}: no flat shape`)
    for (let x = 1; x < 640; x += 638 / 8) for (let y = 1; y < 480; y += 478 / 8)
      assert.ok(inside(first, [x, y]), `${c}: the first shape (${first.fill}) leaves ${x.toFixed(0)},${y.toFixed(0)} bare`)
  }
})

test('no repaired flag has an edge with a different colour underneath on each side', () => {
  for (const c of FIXED) {
    const bad = seamEdges(read(c))
    assert.equal(bad.length, 0, `${c}: ${bad.length} seam samples, e.g. ${JSON.stringify(bad[0])}`)
  }
})

test('the check catches the abutting stripes it guards against', () => {
  const abut = '<svg viewBox="0 0 640 480"><path fill="#ae1c28" d="M0 0h640v160H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><path fill="#21468b" d="M0 320h640v160H0z"/></svg>'
  assert.ok(seamEdges(abut).length > 0, 'stripes that only meet')
  const onField = '<svg viewBox="0 0 640 480"><path fill="#ae1c28" d="M0 0h640v480H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><path fill="#21468b" d="M0 320h640v160H0z"/></svg>'
  assert.ok(seamEdges(onField).some(b => b.under === '#ae1c28'), 'two stripes that meet on top of a third colour')
  const fixed = '<svg viewBox="0 0 640 480"><path fill="#ae1c28" d="M0 0h640v480H0z"/><path fill="#fff" d="M0 160h640v320H0z"/><path fill="#21468b" d="M0 320h640v160H0z"/></svg>'
  assert.equal(seamEdges(fixed).length, 0)
})

test('the forgeries of repaired flags are just as clean', () => {
  for (const c of FAKES) {
    const svg = readFake(c), [first] = flatShapes(svg)
    for (let x = 1; x < 640; x += 638 / 8) for (let y = 1; y < 480; y += 478 / 8)
      assert.ok(inside(first, [x, y]), `fake ${c}: the first shape leaves ${x.toFixed(0)},${y.toFixed(0)} bare`)
    const bad = seamEdges(svg)
    assert.equal(bad.length, 0, `fake ${c}: ${bad.length} seam samples, e.g. ${JSON.stringify(bad[0])}`)
  }
})

test('Vanuatu keeps its yellow band clipped inside the black edge of the Y', () => {
  const s = read('vu')
  assert.match(s, /<clipPath id="vu-c">/)
  assert.match(s, /<path d="m0 0 420 195h480v85H420L0 475"\/>\s*<path fill="none" stroke="#fdce12" stroke-width="110" clip-path="url\(#vu-c\)"/)
  assert.match(s, /stroke="#000" stroke-width="60"/)
})

test('no shape-rendering tricks on the repaired flags', () => {
  for (const c of [...FIXED, 'vu']) assert.doesNotMatch(read(c), /shape-rendering/, c)
})

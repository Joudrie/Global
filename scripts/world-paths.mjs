// Country outlines from @svg-maps/world, made small for phones at build time.
// The package is 1.2 MB (381 KB gzipped) and every map screen used to load all
// of it, at a precision no screen can show.
//
// Each point keeps only the detail that can show where the app draws it. A
// "frame" is the width in map units that a screen fits into at most ~1000
// device px:
//   - Progress Map: the whole 1010×666 world.
//   - Geography quiz outline (CountryOutline) and game posters: the country's
//     own box (+ padding).
//   - Border Map: a primary country's box ×2.9, for the primary and its
//     neighbours, only near the primary (the rest is off screen).
//   - GamePoster BordersScene: Spain, Portugal and France in a 44-unit view.
// A point's smallest frame F sets its error budget, F/3000 (a third of a
// device pixel): the ring is simplified (Douglas–Peucker) to F/6000, then each
// point is snapped to the coarsest 1-, 2- or 5×10^n grid within F/3000 and
// written as a compact relative move. Rings that would vanish keep a finer
// grid, so even a speck of an island still draws.
//
// The Vite plugin below serves the result as virtual modules:
//   virtual:world-coarse    the Progress Map's whole-world paths (one chunk)
//   virtual:world-outlines  { WORLD_VIEWBOX, OUTLINES: id → () => import(that country) }
// and GamePoster's few shapes are copied into src/data/posterShapes.ts:
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/world-paths.mjs
// (scripts/bundle.test.mjs fails when that copy is stale).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neighborsOf, countriesWithBorders } from '../src/data/borders.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const K = 3000 // frame / K = the largest error allowed
const D = 6 // finest grid: 10^-D map units (the package itself uses 10^-5)

/** The package ships ESM in a .js file without "type": "module"; read it as data. */
export function readWorld() {
  const text = fs.readFileSync(path.join(ROOT, 'node_modules/@svg-maps/world/index.js'), 'utf8')
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
}

/** Absolute rings. The map only uses relative moveto (implicit lineto) and closepath. */
function parseRings(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g)
  const isCmd = t => /^[a-zA-Z]$/.test(t)
  const rings = []
  let cx = 0, cy = 0, ring = null, i = 0
  while (i < tokens.length) {
    const t = tokens[i++]
    if (t === 'z') { if (ring) { rings.push(ring); [cx, cy] = ring[0]; ring = null } continue }
    if (t !== 'm') throw new Error(`unexpected path command ${t}`)
    ring = []
    while (i < tokens.length && !isCmd(tokens[i])) {
      cx += +tokens[i++]; cy += +tokens[i++]
      ring.push([cx, cy])
    }
  }
  if (ring) rings.push(ring)
  return rings
}

function bbox(rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of rings) for (const [x, y] of r) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  return { x0, y0, x1, y1, size: Math.max(x1 - x0, y1 - y0) }
}

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

/** Douglas–Peucker on an open polyline of [x, y, frame]; a span may drop
 *  points only within the tightest budget of the points it spans. */
function douglasPeucker(pts) {
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    let max = 0, at = -1, f = Math.min(pts[a][2], pts[b][2])
    for (let k = a + 1; k < b; k++) {
      f = Math.min(f, pts[k][2])
      const dist = segDist(pts[k], pts[a], pts[b])
      if (dist > max) { max = dist; at = k }
    }
    if (at >= 0 && max > f / (2 * K)) { keep[at] = 1; stack.push([a, at], [at, b]) }
  }
  return pts.filter((_, k) => keep[k])
}

/** A closed ring, simplified: split at the point farthest from the start.
 *  Never fewer than 3 points, so a ring always keeps an area. */
function simplifyRing(ring) {
  if (ring.length < 4) return ring
  let far = 0, max = -1
  for (let k = 1; k < ring.length; k++) {
    const dist = Math.hypot(ring[k][0] - ring[0][0], ring[k][1] - ring[0][1])
    if (dist > max) { max = dist; far = k }
  }
  const a = douglasPeucker(ring.slice(0, far + 1))
  const b = douglasPeucker([...ring.slice(far), ring[0]])
  const out = [...a, ...b.slice(1, -1)]
  if (out.length >= 3) return out
  let third = -1
  max = -1
  ring.forEach((p, k) => {
    const dist = segDist(p, ring[0], ring[far])
    if (k !== 0 && k !== far && dist > max) { max = dist; third = k }
  })
  return [0, far, third].sort((x, y) => x - y).map(k => ring[k])
}

/** Integer n in units of 10^-D, shortest SVG spelling ("-.12", "3.4", "7"). */
function fmt(n) {
  let s = String(Math.abs(n)).padStart(D + 1, '0')
  s = (s.slice(0, -D) + '.' + s.slice(-D)).replace(/\.?0+$/, '').replace(/^0(?=\.)/, '')
  return (n < 0 ? '-' : '') + (s || '0')
}

/** v on the coarsest 1-, 2- or 5×10^n grid within budget, in units of 10^-D. */
function snap(v, budget) {
  const dec = Math.min(D, Math.max(0, Math.ceil(-Math.log10(budget))))
  const m = [5, 2, 1].find(m => m * 10 ** -dec <= budget) ?? 1
  const step = m * 10 ** (D - dec)
  return Math.round(v * 10 ** D / step) * step
}

/** Snapped distinct points of a simplified ring; finer if it would collapse. */
function snapRing(pts) {
  for (let fine = 1; fine <= 10 ** D; fine *= 10) {
    const out = []
    for (const [x, y, f] of pts) {
      const p = [snap(x, f / K / fine), snap(y, f / K / fine)]
      const last = out.at(-1)
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p)
    }
    while (out.length > 1 && out[0][0] === out.at(-1)[0] && out[0][1] === out.at(-1)[1]) out.pop()
    if (out.length >= 3) return out
  }
  return []
}

/** Rings of [x, y, frame] → compact path: "m" + relative pairs + "z" per ring. */
function encode(rings) {
  let out = '', px = 0, py = 0, prev = ''
  const num = n => {
    const s = fmt(n)
    // A separator is needed unless a sign or a second "." starts the number.
    out += prev === '' || s[0] === '-' || (s[0] === '.' && prev.includes('.')) ? s : ' ' + s
    prev = s
  }
  for (const ring of rings) {
    const pts = snapRing(simplifyRing(ring))
    if (!pts.length) continue
    out += 'm'; prev = ''
    for (const [x, y] of pts) { num(x - px); num(y - py); px = x; py = y }
    out += 'z'; prev = ''
    ;[px, py] = pts[0]
  }
  return out
}

/** { viewBox, coarse, detail }: [id, path][] in the package's order (the
 *  Progress Map draws in it). coarse is for the whole world only; detail is
 *  for every place a country is drawn (see the top of this file). */
export function buildWorldPaths() {
  const world = readWorld()
  const rings = new Map(world.locations.map(l => [l.id, parseRings(l.path)]))
  const box = new Map([...rings].map(([id, r]) => [id, bbox(r)]))
  const [, , vw, vh] = world.viewBox.split(' ').map(Number)
  const whole = Math.max(vw, vh)

  // Frames each country is drawn in: { f, near?: [cx, cy, half] } (near = only around there).
  const frames = new Map(world.locations.map(l => [l.id, [{ f: whole }]]))
  const add = (id, frame) => frames.get(id)?.push(frame)
  for (const [id, b] of box) add(id, { f: b.size * 1.2 }) // CountryOutline (+8% a side), posters (+9%)
  const has = c => rings.has(c.toLowerCase())
  for (const p of countriesWithBorders(2)) {
    const near = neighborsOf(p).filter(has)
    if (!has(p) || near.length < 2) continue // BorderMapScreen's ELIGIBLE
    const b = box.get(p.toLowerCase())
    const f = b.size * 2.9 // BorderMapScreen pads 0.95 × the box on each side
    // A wide screen shows more than the square frame: cover 3 frames around it.
    const at = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, f * 1.5]
    for (const c of [p, ...near]) add(c.toLowerCase(), { f, near: at })
  }
  for (const id of ['es', 'pt', 'fr']) add(id, { f: 44 }) // GamePoster BordersScene viewBox

  const frameAt = (id, x, y) => {
    let f = Infinity
    for (const { f: g, near: n } of frames.get(id)) {
      if (!n || (Math.abs(x - n[0]) <= n[2] && Math.abs(y - n[1]) <= n[2])) f = Math.min(f, g)
    }
    return f
  }
  const coarse = world.locations.map(l => [l.id, encode(rings.get(l.id).map(r => r.map(([x, y]) => [x, y, whole])))])
  const detail = world.locations.map(l =>
    [l.id, encode(rings.get(l.id).map(r => r.map(([x, y]) => [x, y, frameAt(l.id, x, y)])))])
  return { viewBox: world.viewBox, coarse, detail }
}

/** Vite plugin: the virtual modules listed at the top of this file. */
export function worldMapPlugin() {
  const PREFIX = 'virtual:world-'
  let built
  return {
    name: 'world-map',
    resolveId(id) { return id.startsWith(PREFIX) ? '\0' + id : undefined },
    load(id) {
      if (!id.startsWith('\0' + PREFIX)) return
      const { viewBox, coarse, detail } = (built ??= buildWorldPaths())
      const name = id.slice(1 + PREFIX.length)
      const vb = `export const WORLD_VIEWBOX = ${JSON.stringify(viewBox)}\n`
      if (name === 'coarse') return `${vb}export const WORLD_COARSE = ${JSON.stringify(coarse)}\n`
      if (name === 'outlines') {
        return `${vb}export const OUTLINES = {\n${detail.map(([c]) =>
          `  ${JSON.stringify(c)}: () => import(${JSON.stringify(`${PREFIX}outline/${c}`)}),`).join('\n')}\n}\n`
      }
      const one = name.startsWith('outline/') && detail.find(([c]) => c === name.slice('outline/'.length))
      if (one) return `export default ${JSON.stringify(one[1])}\n`
      this.error(`unknown module ${id.slice(1)}`)
    },
  }
}

export const POSTER_FILE = path.join(ROOT, 'src/data/posterShapes.ts')
const POSTER_BLOCK = /(export const POSTER_SHAPES: Record<string, string> = \{\n)([\s\S]*?)(\n\})/

/** posterShapes.ts with its POSTER_SHAPES copied from the detail paths. */
export function posterFile(detail) {
  const text = fs.readFileSync(POSTER_FILE, 'utf8')
  const ids = [...text.match(POSTER_BLOCK)[2].matchAll(/^ {2}([a-z-]+):/gm)].map(m => m[1])
  const paths = new Map(detail)
  return text.replace(POSTER_BLOCK, (_, a, __, c) => a + ids.map(id => `  ${id}: ${JSON.stringify(paths.get(id))},`).join('\n') + c)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = posterFile(buildWorldPaths().detail)
  fs.writeFileSync(POSTER_FILE, text)
  console.log(`updated ${path.relative(ROOT, POSTER_FILE)} (${(text.length / 1024).toFixed(0)} KB)`)
}

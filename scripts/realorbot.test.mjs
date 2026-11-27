// Checks for Real or Bot's flag pools (src/data/botFlags.ts).
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const B = await import(path.join(ROOT, 'src/data/botFlags.ts'))
const { FLAGS } = await import(path.join(ROOT, 'src/data/flags.ts'))
const { FLAG_ATTRIBS } = await import(path.join(ROOT, 'src/data/flagAttribs.ts'))

test('bot pool is large and has no duplicates', () => {
  assert.equal(B.BOT_FLAGS.length, B.BOT_COUNT + B.STUDIO_BOT_COUNT)
  assert.ok(B.BOT_FLAGS.length >= 1400)
  assert.equal(new Set(B.BOT_FLAGS).size, B.BOT_FLAGS.length)
  for (const s of B.BOT_FLAGS) assert.match(s, /^data:image\/svg\+xml;utf8,/)
})

test('no bot flag matches a real flag signature', () => {
  for (const e of B.BOT_ENTRIES) for (const s of e.sig) assert.ok(!B.REAL_SIGS.has(s), `bot flag copies a real design: ${s}`)
})

test('bot pool mixes many layouts', () => {
  const kinds = new Set(B.BOT_ENTRIES.flatMap(e => e.sig.map(s => s.split(':')[0])))
  assert.ok(kinds.size >= 18, `only ${kinds.size} layout kinds`)
})

test('the pool is deterministic across loads', async () => {
  const again = await import(path.join(ROOT, 'src/data/botFlags.ts') + '?again')
  assert.deepEqual(again.BOT_FLAGS.slice(0, 50), B.BOT_FLAGS.slice(0, 50))
})

test('real pool leaves out every coat-of-arms flag', () => {
  const codes = new Set(FLAGS.map(f => f.code))
  for (const c of [...B.REAL_EXCLUDED, ...B.REAL_RARE]) assert.ok(codes.has(c), `unknown code ${c}`)
  const inPool = new Set(B.REAL_POOL.map(p => p.flag.code))
  // Costa Rica and Peru are hosted as their plain civil flags (no arms).
  const civil = new Set(['CR', 'PE'])
  for (const [code, a] of Object.entries(FLAG_ATTRIBS)) {
    if (a.emblem && codes.has(code) && !civil.has(code)) assert.ok(!inPool.has(code) || B.REAL_RARE.includes(code), `${code} has an emblem but is in full rotation`)
  }
  assert.ok(B.REAL_POOL.length >= 120)
})

test('pickRealFlag never returns an excluded flag', () => {
  let i = 0
  const rand = () => ((i++ * 0.6180339887) % 1)
  for (let n = 0; n < 2000; n++) assert.ok(!B.REAL_EXCLUDED.includes(B.pickRealFlag(rand).code))
})

// ── Fakes are drawn as clean single shapes ──────────────────────────────────
// A fake drawn as overlapping or abutting rectangles showed its seams (a
// hairline where two bars meet), which gave it away. botFlags.ts draws each
// base as: a field covering the flag, then one path per colour, layered, with
// no two shapes sharing an edge inside the flag. These checks read the SVG.

const { LAYOUTS, drawnSvg, newDesign, randomDesign } = await import(path.join(ROOT, 'src/utils/flagStudio.ts'))
const { seededRandom } = await import(path.join(ROOT, 'src/utils/prng.ts'))

const svgOf = src => decodeURIComponent(src.replace(/^data:image\/svg\+xml;utf8,/, ''))

/** The base shapes of a bot flag (before its charges), with the flag's size. */
function baseOf(svg) {
  const nested = /<svg[^>]*><svg[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*>([\s\S]*?)<\/svg>/.exec(svg)
  if (nested) return { W: +nested[1], H: +nested[2], body: nested[3], studio: true }
  const m = /^<svg[^>]*viewBox='0 0 ([\d.]+) ([\d.]+)'[^>]*>([\s\S]*?)(<g>[\s\S]*<\/g>)?<\/svg>$/.exec(svg)
  assert.ok(m, 'unexpected bot SVG: ' + svg.slice(0, 120))
  return { W: +m[1], H: +m[2], body: m[3], studio: false }
}

function shapesOf(body) {
  const out = []
  for (const [, tag, attrs] of body.matchAll(/<(\w+) ([^>]*?)\/>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/([\w-]+)=["']([^"']*)["']/g)].map(x => [x[1], x[2]]))
    out.push({ tag, fill: a.fill.toLowerCase(), d: a.d, a })
  }
  return out
}

/** A path's subpaths as point lists; `curved` marks edges drawn with arcs. */
function subpaths(d) {
  const toks = d.match(/[MHVLAZ]|-?\d*\.?\d+(?:e-?\d+)?/g)
  const subs = []
  let cur = null, x = 0, y = 0, i = 0, cmd = ''
  const n = () => Number(toks[i++])
  while (i < toks.length) {
    if (/[MHVLAZ]/.test(toks[i])) cmd = toks[i++]
    if (cmd === 'M') { x = n(); y = n(); cur = { pts: [[x, y]], curved: [], hv: [] }; subs.push(cur); cmd = 'L' }
    else if (cmd === 'H') { x = n(); cur.hv.push(x); cur.pts.push([x, y]); cur.curved.push(false) }
    else if (cmd === 'V') { y = n(); cur.hv.push(y); cur.pts.push([x, y]); cur.curved.push(false) }
    else if (cmd === 'L') { x = n(); y = n(); cur.pts.push([x, y]); cur.curved.push(false) }
    else if (cmd === 'A') { i += 5; x = n(); y = n(); cur.pts.push([x, y]); cur.curved.push(true) }
    else if (cmd === 'Z') { cmd = '' }
  }
  return subs
}

/** Straight edges of a shape, closing edge included. */
function edgesOf(s) {
  if (s.tag !== 'path') return [] // circles have no straight edges
  const out = []
  for (const sp of subpaths(s.d)) {
    const p = sp.pts
    for (let k = 0; k < p.length; k++) {
      const curved = k < p.length - 1 ? sp.curved[k] : false
      const a = p[k], b = p[(k + 1) % p.length]
      if (!curved && (a[0] !== b[0] || a[1] !== b[1])) out.push([a, b])
    }
  }
  return out
}

/** Two straight edges on one line that overlap for some length. */
function shareEdge([p, q], [r, s]) {
  const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy)
  const off = ([x, y]) => Math.abs((x - p[0]) * dy - (y - p[1]) * dx) / L
  if (off(r) > 1e-6 || off(s) > 1e-6) return false
  const t = ([x, y]) => ((x - p[0]) * dx + (y - p[1]) * dy) / L
  const lo = Math.max(0, Math.min(t(r), t(s))), hi = Math.min(L, Math.max(t(r), t(s)))
  return hi - lo > 1e-6
}

const onBorder = ([a, b], W, H) => (a[0] === b[0] && (a[0] === 0 || a[0] === W)) || (a[1] === b[1] && (a[1] === 0 || a[1] === H))

test('every fake: a full field, one path per colour, no two shapes sharing an edge', () => {
  for (const [i, src] of B.BOT_FLAGS.entries()) {
    const svg = svgOf(src)
    const { W, H, body, studio } = baseOf(svg)
    const shapes = shapesOf(body)
    const where = `bot #${i} ${B.BOT_ENTRIES[i].sig.join(',')}`
    assert.ok(shapes.length >= 1, where)
    assert.ok(shapes.every(s => s.tag === 'path' || s.tag === 'circle'), `${where}: a rect or polygon in the base`)
    assert.equal(shapes[0].d, `M0 0H${W}V${H}H0Z`, `${where}: the first shape must cover the whole flag`)
    const fills = shapes.map(s => s.fill)
    // Two layouts can bring a colour back as a separate region that never
    // touches the first: a hoist-rays wedge inside the next one, a canton cross
    // in the field's colour inside the canton. Never twice in a row.
    if (/^(rays|tonga):/.test(B.BOT_ENTRIES[i].sig[0])) fills.slice(1).forEach((f, k) => assert.notEqual(f, fills[k], where))
    else assert.equal(new Set(fills).size, fills.length, `${where}: a colour drawn as more than one shape`)
    const edges = shapes.map(s => edgesOf(s).filter(e => !onBorder(e, W, H)))
    for (let a = 0; a < shapes.length; a++) for (let b = a + 1; b < shapes.length; b++) {
      for (const e of edges[a]) for (const f of edges[b]) assert.ok(!shareEdge(e, f), `${where}: shapes ${a} and ${b} share an edge ${JSON.stringify(e)}`)
    }
    // The classic fakes keep straight edges on the 0.2 grid (whole pixels on the card).
    if (!studio) for (const s of shapes) if (s.d) for (const sp of subpaths(s.d)) for (const v of sp.hv) assert.ok(Math.abs(v * 5 - Math.round(v * 5)) < 1e-9, `${where}: ${v} is off the grid`)
  }
})

test('crosses and saltires are one outline each; a fimbriation sits under its cross', () => {
  let crosses = 0, fimbriated = 0, saltires = 0
  for (const [i, e] of B.BOT_ENTRIES.entries()) {
    const kind = e.sig[0].split(':')[0]
    if (!['nordic', 'cross', 'saltire', 'saltire4', 'tonga'].includes(kind)) continue
    const { body } = baseOf(svgOf(e.src))
    const shapes = shapesOf(body)
    const where = `bot #${i} ${e.sig[0]}`
    const outlines = s => subpaths(s.d).filter(sp => !sp.curved.some(Boolean))
    if (kind === 'nordic' || kind === 'cross' || kind === 'tonga') {
      const arms = shapes.slice(kind === 'tonga' ? 2 : 1)
      assert.ok(arms.length === 1 || arms.length === 2, `${where}: ${arms.length} cross shapes`)
      for (const s of arms) {
        const o = outlines(s)
        assert.equal(o.length, 1, `${where}: the cross is ${o.length} outlines`)
        assert.equal(o[0].pts.length, 12, `${where}: a cross outline has 12 corners`)
        crosses++
      }
      if (arms.length === 2) { // a wide cross under a narrow one, centred on it
        const [outer, inner] = arms.map(s => outlines(s)[0].pts)
        const box = p => [Math.min(...p.map(q => q[0])), Math.max(...p.map(q => q[0])), Math.min(...p.map(q => q[1])), Math.max(...p.map(q => q[1]))]
        const upright = p => [p[0][0], p[1][0]], bar = p => [p[2][1], p[4][1]]
        assert.ok(upright(outer)[0] < upright(inner)[0] && upright(inner)[1] < upright(outer)[1], `${where}: inner upright outside the fimbriation`)
        assert.ok(bar(outer)[0] < bar(inner)[0] && bar(inner)[1] < bar(outer)[1], `${where}: inner bar outside the fimbriation`)
        assert.deepEqual(box(outer), box(inner), `${where}: both crosses run edge to edge`)
        fimbriated++
      }
    } else {
      const s = shapes[shapes.length - 1]
      const o = outlines(s)
      assert.equal(o.length, 1, `${where}: the saltire is ${o.length} outlines`)
      assert.equal(o[0].pts.length, 16, `${where}: a saltire outline has 16 corners`)
      saltires++
    }
  }
  assert.ok(crosses >= 100 && fimbriated >= 15 && saltires >= 50, `checked ${crosses} crosses, ${fimbriated} fimbriated, ${saltires} saltires`)
})

test('every Flag Studio layout the Random button uses is redrawn cleanly', () => {
  // botFlags.ts reads Flag Studio's own SVG for each layout. If a layout's
  // structure changes there, cleanStudioSvg returns null and those fakes drop
  // out of the pool; this says which one to update instead.
  for (const l of LAYOUTS.filter(x => !x.stripes && x.id !== 'plain')) {
    const d = newDesign(`layout:${l.id}`, 'Test')
    const out = B.cleanStudioSvg(d, drawnSvg(d))
    assert.ok(out, `cleanStudioSvg can't redraw Flag Studio's "${l.id}" layout`)
    assert.ok(!/<rect|<polygon/.test(baseOf(out).body), `${l.id}: rectangles or polygons left in the base`)
  }
  for (let i = 0; i < 40; i++) {
    const d = randomDesign([], seededRandom('studiotest-' + i))
    if (d.base !== 'stripes') continue
    assert.ok(B.cleanStudioSvg(d, drawnSvg(d)), 'stripes')
  }
  assert.equal(B.cleanStudioSvg(newDesign('flag:fr', 'x'), '<svg></svg>'), null)
})

test('Real or Bot keeps its best streak, synced with the higher one winning', async () => {
  const fs = await import('node:fs')
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/RealOrBotScreen.tsx'), 'utf8')
  assert.match(screen, /BEST_KEY = "globalio_realorbot_best"/)
  assert.match(screen, /saveBest\(ns\)/, 'a new best is saved as the streak grows')
  const { mergeSnapshots, ruleFor } = await import(path.join(ROOT, 'src/utils/mergeProgress.ts'))
  assert.equal(ruleFor('globalio_realorbot_best').rule, 'max')
  assert.equal(mergeSnapshots({ globalio_realorbot_best: '7' }, { globalio_realorbot_best: '12' }).globalio_realorbot_best, '12')
  assert.equal(mergeSnapshots({ globalio_realorbot_best: '12' }, { globalio_realorbot_best: '7' }).globalio_realorbot_best, '12')
})

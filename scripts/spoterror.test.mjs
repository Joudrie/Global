// Spot the Error (src/utils/spotError.ts): every round shows a real flag with
// exactly one error, and the place you tap to find it is a fair, finger-sized
// region inside the flag. The plain flags the easiest tier paints over must
// be exactly what their real artwork shows, so a flag is never mislabelled.
// Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const S = await import(path.join(ROOT, 'src/utils/spotError.ts'))
const { FAKE_FLAGS } = await import(path.join(ROOT, 'src/data/fakeFlags.ts'))
const { PLAIN_FLAGS } = await import(path.join(ROOT, 'src/data/plainFlags.ts'))
const { FLAGS } = await import(path.join(ROOT, 'src/data/flags.ts'))
const { colorName } = await import(path.join(ROOT, 'src/utils/color.ts'))
const { ruleFor } = await import(path.join(ROOT, 'src/utils/mergeProgress.ts'))

const KINDS = new Set(['colour', 'count', 'position', 'turned', 'mirrored', 'missing', 'shape', 'swapped'])
const NAME = Object.fromEntries(FLAGS.map(f => [f.code.toLowerCase(), f.name]))
const served = src => fs.existsSync(path.join(ROOT, 'public', src))

// A small seeded generator, so a failure can be replayed.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A tap that misses every hit box (plus slack), or null if there is none. */
function missPoint(hits) {
  for (let y = 4; y < 480; y += 8) for (let x = 4; x < 640; x += 8) if (!S.isHit({ hits }, x, y)) return [x, y]
  return null
}

/** The checks every round must pass. */
function assertRound(r, where) {
  assert.ok(KINDS.has(r.kind), `${where}: kind ${r.kind}`)
  assert.ok([1, 2, 3].includes(r.level), `${where}: level ${r.level}`)
  assert.equal(r.name, NAME[r.code], `${where}: name`)
  assert.ok(served(r.src), `${where}: ${r.src} missing`)
  assert.equal(r.real, `/flags/${r.code}.svg`, `${where}: real`)
  assert.ok(served(r.real), `${where}: ${r.real} missing`)
  assert.ok(r.reason.length > 10, `${where}: reason`)
  // a valid hit region: inside the flag, finger-sized, a fair share of it
  assert.ok(S.fairHits(r.hits), `${where}: unfair hit region ${JSON.stringify(r.hits)} (covers ${S.coverage(r.hits).toFixed(2)})`)
  for (const h of r.hits) assert.ok(S.isHit(r, h.x + h.w / 2, h.y + h.h / 2), `${where}: the middle of a hit box misses`)
  assert.ok(missPoint(r.hits), `${where}: no tap can miss`)
  // exactly one error
  if (r.kind === 'colour' && r.paint) {
    const f = PLAIN_FLAGS.find(p => p.code === r.code)
    assert.ok(f, `${where}: painted round for a flag that isn't plain`)
    assert.equal(r.src, r.real, `${where}: a painted round paints over the real flag`)
    const [wrong, ...above] = r.paint
    const changed = f.parts.filter(p => p.boxes === wrong.boxes)
    assert.equal(changed.length, 1, `${where}: paints one part`)
    assert.deepEqual(r.hits, wrong.boxes, `${where}: the tap target is the painted part`)
    assert.notEqual(colorName(wrong.color), changed[0].word ?? colorName(changed[0].color), `${where}: painted its own colour`)
    for (const p of above) assert.ok(f.parts.some(q => q.boxes === p.boxes && q.color === p.color), `${where}: a part above is redrawn in a wrong colour`)
  } else {
    assert.equal(r.paint, undefined, `${where}: a fake is never painted over`)
    const fakes = FAKE_FLAGS.filter(f => f.src === r.src)
    assert.equal(fakes.length, 1, `${where}: one fake per round`)
    assert.equal(fakes[0].code, r.code)
    assert.deepEqual(r.hits, fakes[0].spot.hits)
  }
}

test('the pool mixes many kinds of error at every level', () => {
  const fakes = S.SOURCES.filter(s => s.key.startsWith('fake:'))
  assert.ok(fakes.length >= 20, `only ${fakes.length} fakes`)
  assert.ok(S.SOURCES.length - fakes.length >= 25, 'too few plain flags')
  assert.ok(new Set(S.SOURCES.map(s => s.kind)).size >= 7)
  for (const level of [1, 2, 3]) {
    const at = S.SOURCES.filter(s => s.level === level)
    assert.ok(at.length >= 5, `level ${level}: ${at.length} sources`)
    assert.ok(new Set(at.map(s => s.kind)).size >= 3, `level ${level}: too few kinds`)
  }
  assert.equal(new Set(S.SOURCES.map(s => s.key)).size, S.SOURCES.length, 'duplicate source')
})

test('every fake with a spot is a fair round', () => {
  for (const f of FAKE_FLAGS.filter(f => f.spot)) assertRound(S.fakeRound(f), f.code)
})

test('every painted part, in every wrong colour, is a fair round with one error', () => {
  let n = 0
  for (const f of PLAIN_FLAGS) {
    const parts = S.paintableParts(f), colours = S.wrongColours(f)
    assert.ok(parts.length > 0 && colours.length > 0, `${f.code}: nothing to paint`)
    for (const i of parts) for (const c of colours) { assertRound(S.paintRound(f, i, c), `${f.code} ${f.parts[i].label} ${c}`); n++ }
  }
  assert.ok(n > 300, `only ${n} painted rounds`)
})

test('dealt rounds: one error, a valid hit region, no country back too soon, the kinds mixed', () => {
  const rand = mulberry32(7)
  const deal = S.makeDealer(rand)
  const codes = [], kinds = []
  const levels = { low: [], high: [] }
  for (let i = 0; i < 3000; i++) {
    const streak = i % 12
    const r = deal(streak)
    assertRound(r, `deal ${i} (${r.id})`)
    codes.push(r.code); kinds.push(r.kind)
    if (streak < 2) levels.low.push(r.level)
    if (streak >= 7) levels.high.push(r.level)
  }
  for (let i = 1; i < codes.length; i++) {
    assert.ok(!codes.slice(Math.max(0, i - S.RECENT), i).includes(codes[i]), `deal ${i}: ${codes[i]} came back within ${S.RECENT}`)
    assert.notEqual(kinds[i], kinds[i - 1], `deal ${i}: two ${kinds[i]} errors in a row`)
  }
  // Easy at the start; mostly harder once the streak is long.
  assert.ok(!levels.low.includes(3), 'a hard round at streak 0–1')
  const share = (xs, l) => xs.filter(x => x === l).length / xs.length
  assert.ok(share(levels.low, 1) > 0.6, `streak 0–1: ${share(levels.low, 1)} easy`)
  assert.ok(share(levels.high, 1) < 0.2 && share(levels.high, 3) > 0.3, 'long streaks stay easy')
  // Over a long run every source comes up.
  const seen = new Set(codes)
  for (const s of S.SOURCES) assert.ok(seen.has(s.code), `${s.key} never dealt`)
})

test('taps: inside a box (or its ellipse) with slack, never far outside', () => {
  const box = { x: 100, y: 100, w: 100, h: 100 }
  assert.ok(S.inBox(box, 150, 150))
  assert.ok(S.inBox(box, 100 - S.TAP_SLACK, 150))
  assert.ok(!S.inBox(box, 100 - S.TAP_SLACK - 1, 150))
  const disc = { ...box, round: true }
  assert.ok(S.inBox(disc, 150, 100 - S.TAP_SLACK + 1))
  assert.ok(!S.inBox(disc, 100, 100), 'the corner of a round box is outside it')
  assert.equal(S.coverage([{ x: 0, y: 0, w: 640, h: 160 }]), 1 / 3)
})

// ── The plain flags match their artwork ─────────────────────────────────────

const NAMED = { red: '#ff0000', gold: '#ffd700', white: '#ffffff', black: '#000000' }
const norm = c => {
  c = c.toLowerCase()
  if (NAMED[c]) return NAMED[c]
  if (/^#[0-9a-f]{3}$/.test(c)) return '#' + [...c.slice(1)].map(d => d + d).join('')
  return c
}

/** The filled polygons of a path made only of straight lines. */
function polygons(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g)
  const polys = []
  let cmd = '', x = 0, y = 0, poly = null, i = 0
  const num = () => Number(tokens[i++])
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    if (!/^[MmLlHhVvZz]$/.test(cmd)) throw new Error(`unsupported path command ${cmd}`)
    if (cmd === 'Z' || cmd === 'z') { if (poly) [x, y] = poly[0]; poly = null; continue }
    if (cmd === 'M' || cmd === 'm') {
      const nx = num(), ny = num()
      x = cmd === 'm' ? x + nx : nx; y = cmd === 'm' ? y + ny : ny
      poly = [[x, y]]; polys.push(poly)
      cmd = cmd === 'm' ? 'l' : 'L'
      continue
    }
    if (cmd === 'L') { x = num(); y = num() } else if (cmd === 'l') { x += num(); y += num() }
    else if (cmd === 'H') x = num(); else if (cmd === 'h') x += num()
    else if (cmd === 'V') y = num(); else if (cmd === 'v') y += num()
    poly.push([x, y])
  }
  return polys
}

const insidePoly = (polys, px, py) => {
  let n = 0
  for (const p of polys) for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
    const [xa, ya] = p[a], [xb, yb] = p[b]
    if ((ya > py) !== (yb > py) && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) n++
  }
  return n % 2 === 1
}

/** The real artwork as filled shapes in paint order. Anything but plain
 *  straight-edged paths (a transform, clip, <use>, curve…) fails: such a flag
 *  has more on it than stripes and doesn't belong in the plain list. */
function realShapes(code) {
  const svg = fs.readFileSync(path.join(ROOT, 'public/flags', `${code}.svg`), 'utf8')
  const shapes = [], fills = [null]
  for (const [, close, tag, attrs] of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)\/?>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))
    if (tag === 'svg') continue
    if (a.transform || a['clip-path'] || a.mask || a.stroke) throw new Error(`${code}: <${tag}> has ${Object.keys(a).join(', ')}`)
    if (tag === 'g') { if (close) fills.pop(); else fills.push(a.fill ?? fills[fills.length - 1]); continue }
    if (tag !== 'path') throw new Error(`${code}: unsupported <${tag}>`)
    shapes.push({ fill: norm(a.fill ?? fills[fills.length - 1]), polys: polygons(a.d) })
  }
  return shapes
}

test('every plain flag is exactly its artwork, part for part', () => {
  for (const f of PLAIN_FLAGS) {
    const shapes = realShapes(f.code)
    const edges = f.parts.flatMap(p => p.boxes.flatMap(b => [['x', b.x], ['x', b.x + b.w], ['y', b.y], ['y', b.y + b.h]]))
    const nearEdge = (x, y) => edges.some(([axis, v]) => Math.abs((axis === 'x' ? x : y) - v) < 1.5)
    let checked = 0
    for (let y = 2; y < 480; y += 4) for (let x = 2; x < 640; x += 4) {
      if (nearEdge(x, y)) continue
      const real = shapes.findLast(s => insidePoly(s.polys, x, y))?.fill
      const model = f.parts.findLast(p => p.boxes.some(b => S.inBox(b, x, y, 0)))?.color
      assert.equal(model && norm(model), real, `${f.code} at (${x}, ${y})`)
      checked++
    }
    assert.ok(checked > 15000, `${f.code}: only ${checked} points checked`)
    assert.equal(f.name, NAME[f.code], `${f.code}: name`)
  }
  assert.equal(new Set(PLAIN_FLAGS.map(f => f.code)).size, PLAIN_FLAGS.length, 'duplicate plain flag')
})

test('the best streak is kept by the best-score merge rule', () => {
  assert.equal(ruleFor('globalio_spoterror_best')?.rule, 'max')
})

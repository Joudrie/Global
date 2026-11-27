// Sketch the Flag's paint bucket: the scanline flood fill (src/utils/floodFill.ts),
// run on plain RGBA byte arrays the way the screen runs it on ImageData.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { floodRuns, paintRuns, runsArea, FILL_TOLERANCE } = await import(path.join(ROOT, 'src/utils/floodFill.ts'))

const WHITE = [255, 255, 255], BLACK = [0, 0, 0], RED = [200, 16, 46], BLUE = [0, 85, 164]

function canvas(w, h, rgb = WHITE) {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < d.length; i += 4) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255 }
  return { w, h, d }
}
const set = (c, x, y, rgb) => { const i = (y * c.w + x) * 4; c.d[i] = rgb[0]; c.d[i + 1] = rgb[1]; c.d[i + 2] = rgb[2] }
const at = (c, x, y) => { const i = (y * c.w + x) * 4; return [c.d[i], c.d[i + 1], c.d[i + 2]] }
/** A square outline `t` px thick from (a, a) to (b, b) inclusive. */
function box(c, a, b, t, rgb = BLACK) {
  for (let y = a; y <= b; y++) for (let x = a; x <= b; x++) {
    if (x < a + t || x > b - t || y < a + t || y > b - t) set(c, x, y, rgb)
  }
}
function fill(c, x, y, rgb, ...rest) {
  const runs = floodRuns(c.d, c.w, c.h, x, y, rgb, ...rest)
  if (runs) paintRuns(c.d, c.w, runs, rgb)
  return runs
}

test('fills an enclosed region and stops at its edge, growing 1px into it', () => {
  const c = canvas(20, 20)
  box(c, 4, 15, 2) // border rows/cols 4-5 and 14-15; inside 6..13
  const runs = fill(c, 10, 10, RED)
  assert.ok(runs)
  for (let y = 6; y <= 13; y++) for (let x = 6; x <= 13; x++) assert.deepEqual(at(c, x, y), RED, `inside ${x},${y}`)
  // One pixel into the border is painted (no gap line); the outer border pixel is not.
  assert.deepEqual(at(c, 5, 10), RED)
  assert.deepEqual(at(c, 14, 10), RED)
  assert.deepEqual(at(c, 5, 5), RED, 'the inner corner grows diagonally too')
  assert.deepEqual(at(c, 4, 10), BLACK)
  assert.deepEqual(at(c, 15, 10), BLACK)
  // Outside is untouched.
  assert.deepEqual(at(c, 0, 0), WHITE)
  assert.deepEqual(at(c, 18, 10), WHITE)
  assert.equal(runsArea(runs), 10 * 10, 'inside 8×8 plus the 1px ring')
})

test('a tap outside the box fills around it and leaves the inside alone', () => {
  const c = canvas(20, 20)
  box(c, 4, 15, 2)
  fill(c, 0, 0, BLUE)
  assert.deepEqual(at(c, 0, 0), BLUE)
  assert.deepEqual(at(c, 19, 19), BLUE)
  assert.deepEqual(at(c, 4, 10), BLUE, 'outer border pixel taken by the 1px grow')
  assert.deepEqual(at(c, 5, 10), BLACK)
  assert.deepEqual(at(c, 10, 10), WHITE)
})

test('tolerance takes in anti-aliased edge pixels, so no halo is left', () => {
  const c = canvas(30, 10)
  // A red stroke at x = 20..22 with a soft anti-aliased edge on its left:
  // x = 18 is 20% red over white, x = 19 is 60% red.
  const mix = a => WHITE.map((w, i) => Math.round(w * (1 - a) + RED[i] * a))
  for (let y = 0; y < 10; y++) {
    set(c, 18, y, mix(0.2)); set(c, 19, y, mix(0.6))
    for (let x = 20; x <= 22; x++) set(c, x, y, RED)
  }
  fill(c, 2, 5, BLUE)
  assert.deepEqual(at(c, 18, 5), BLUE, 'faint edge pixel joins the fill')
  assert.deepEqual(at(c, 19, 5), BLUE, 'the next one is covered by the 1px grow')
  assert.deepEqual(at(c, 20, 5), RED, 'the stroke itself stays')
  assert.deepEqual(at(c, 25, 5), WHITE, 'the far side of the stroke is not reached')
  // With no tolerance and no grow the faint pixels would stay: that's the halo.
  const d = canvas(30, 10)
  for (let y = 0; y < 10; y++) { set(d, 18, y, mix(0.2)); set(d, 19, y, mix(0.6)); for (let x = 20; x <= 22; x++) set(d, x, y, RED) }
  fill(d, 2, 5, BLUE, 0, 0)
  assert.deepEqual(at(d, 18, 5), mix(0.2))
  assert.ok(FILL_TOLERANCE > 0 && FILL_TOLERANCE < 128)
})

test('a tap on a blank canvas fills the whole canvas', () => {
  const c = canvas(37, 23)
  const runs = fill(c, 11, 7, RED)
  assert.equal(runsArea(runs), 37 * 23)
  assert.equal(runs.length / 3, 23, 'one run per row')
  for (let y = 0; y < 23; y++) for (let x = 0; x < 37; x++) assert.deepEqual(at(c, x, y), RED)
})

test('the fill follows winding shapes (rows above and below are seeded)', () => {
  // A U-shaped wall: the fill has to go down one side and up the other.
  const c = canvas(12, 12)
  for (let y = 0; y <= 8; y++) set(c, 6, y, BLACK)
  fill(c, 1, 1, RED, FILL_TOLERANCE, 0)
  assert.deepEqual(at(c, 10, 1), RED, 'reached round the bottom of the wall')
  assert.deepEqual(at(c, 6, 4), BLACK)
})

test('nothing to do: same colour, or off the canvas', () => {
  const c = canvas(10, 10, RED)
  assert.equal(floodRuns(c.d, c.w, c.h, 5, 5, RED), null)
  const b = canvas(10, 10)
  assert.equal(floodRuns(b.d, b.w, b.h, -1, 5, RED), null)
  assert.equal(floodRuns(b.d, b.w, b.h, 10, 5, RED), null)
  assert.equal(floodRuns(b.d, b.w, b.h, 5, 10, RED), null)
})

test('fast enough for a 3x phone canvas (900×600)', () => {
  const c = canvas(900, 600)
  box(c, 150, 449, 24)
  floodRuns(c.d, c.w, c.h, 1, 1, RED) // warm up
  const t0 = performance.now()
  const runs = floodRuns(c.d, c.w, c.h, 1, 1, RED)
  const outside = performance.now() - t0
  const blank = canvas(900, 600)
  const t1 = performance.now()
  const all = floodRuns(blank.d, blank.w, blank.h, 450, 300, RED)
  const whole = performance.now() - t1
  assert.equal(runsArea(all), 900 * 600)
  assert.ok(runsArea(runs) > 0)
  // Generous bound for slow test machines; a desktop does this in ~10 ms.
  assert.ok(whole < 150 && outside < 150, `fill took ${whole.toFixed(1)} / ${outside.toFixed(1)} ms`)
})

// Checks for Flag Studio's design logic (src/utils/flagStudio.ts).
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const S = await import(path.join(ROOT, 'src/utils/flagStudio.ts'))

const crest = [
  { id: 'sh', kind: 'shield', x: 500, y: 333, size: 300, rot: 0, color: '#ffffff' },
  { id: 'cr', kind: 'crown', x: 500, y: 150, size: 186, rot: 0, color: '#fcd116' },
  { id: 'sc', kind: 'scroll', x: 500, y: 520, size: 405, rot: 0, color: '#ffffff' },
]

test('a shorter flag shrinks a crest evenly and keeps it on the flag', () => {
  const out = S.refitOverlays(crest, 667, 500)
  const k = 500 / 667
  for (const [a, b] of crest.map((o, i) => [o, out[i]])) {
    assert.ok(b.y >= 0 && b.y <= 500, `${b.kind} off the flag at y=${b.y}`)
    assert.ok(Math.abs(b.size - a.size * k) <= 1, `${b.kind} size ${b.size}`)
  }
  // The gaps between the pieces shrink by the same factor as the pieces.
  assert.ok(Math.abs((out[0].y - out[1].y) - (crest[0].y - crest[1].y) * k) < 1e-6)
  assert.ok(Math.abs((out[2].y - out[0].y) - (crest[2].y - crest[0].y) * k) < 1e-6)
})

test('a taller flag keeps a crest as it is, centred', () => {
  const out = S.refitOverlays(crest, 667, 1000)
  for (const [a, b] of crest.map((o, i) => [o, out[i]])) {
    assert.equal(b.size, a.size)
    assert.equal(b.x, a.x)
    assert.ok(Math.abs((b.y - 500) - (a.y - 333.5)) < 1e-6)
  }
})

test('full-width symbols keep spanning the flag', () => {
  const [o] = S.refitOverlays([{ id: 's', kind: 'stripe', x: 500, y: 333, size: 1000, rot: 0, color: '#ffffff' }], 667, 500)
  assert.equal(o.size, 1000)
  assert.equal(o.x, 500)
})

test('share links round-trip, and a broken one is rejected', () => {
  const d = { ...S.newDesign('layout:nordic', 'Testland'), motto: 'Onward', overlays: [crest[0]] }
  const back = S.decodeDesign(S.encodeDesign(d))
  assert.equal(back.name, 'Testland')
  assert.equal(back.motto, 'Onward')
  assert.equal(back.base, 'layout:nordic')
  assert.equal(back.overlays[0].kind, 'shield')
  assert.equal(S.decodeDesign('garbage'), null)
  assert.equal(S.decodeDesign(''), null)
})

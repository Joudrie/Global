// Flag Studio colour mixing: "this flag in that flag's colours".
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { mixPlans, mixColor } = await import(path.join(ROOT, 'src/utils/flagStudio.ts'))
const { FLAG_PALETTES } = await import(path.join(ROOT, 'src/data/flagPalettes.ts'))
const { FLAGS } = await import(path.join(ROOT, 'src/data/flags.ts'))
const pal = c => FLAG_PALETTES[c].map(([h]) => h)

test('every country has a palette, largest colour first', () => {
  for (const f of FLAGS) {
    const p = FLAG_PALETTES[f.code]
    assert.ok(p?.length, f.code)
    for (let i = 1; i < p.length; i++) assert.ok(p[i - 1][1] >= p[i][1], f.code)
  }
})

test('Saudi Arabia + Ireland keeps the green and writes in orange', () => {
  const [plan] = mixPlans(pal('SA'), pal('IE'))
  assert.equal(plan[0], '#169b62')
  assert.equal(plan[1], '#ff883e')
})

test('Sweden + Poland is white and red', () => {
  const [plan] = mixPlans(pal('SE'), pal('PL'))
  assert.deepEqual(plan, ['#ffffff', '#dc143c'])
})

test('plans are distinct, never a no-op, and cover every colour of a 3-colour donor', () => {
  const plans = mixPlans(pal('US'), pal('IE'))
  assert.ok(plans.length >= 5)
  assert.equal(new Set(plans.map(p => p.join())).size, plans.length)
  for (const p of plans) assert.ok(p.some((c, j) => c !== pal('US')[j]))
})

test('a colour off the main palette (a crest detail) is left alone', () => {
  const [plan] = mixPlans(pal('ES'), pal('IE'))
  assert.equal(mixColor('#ad1519', pal('ES'), plan), plan[0])
  assert.equal(mixColor('#058e6e', pal('ES'), plan), undefined)
})

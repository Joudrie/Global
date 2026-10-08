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

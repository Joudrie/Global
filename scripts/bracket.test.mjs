// Flag Bracket: the sets a bracket can mix, and how a bracket is drawn.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const B = await import(path.join(ROOT, 'src/utils/bracket.ts'))
const { ruleFor } = await import(path.join(ROOT, 'src/utils/mergeProgress.ts'))
const { REGIONS } = await import(path.join(ROOT, 'src/data/flags.ts'))

// A fixed sequence, so a failing draw can be replayed.
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

test('each extra set shows the number of flags it brings', async () => {
  for (const s of B.EXTRA_SETS) {
    const flags = await B.loadSet(s.id)
    assert.equal(s.count, flags.length, `${s.id}: set count to ${flags.length} in src/utils/bracket.ts`)
    assert.equal(new Set(flags.map(f => f.key)).size, flags.length, `${s.id}: one entrant per image`)
    for (const f of flags) {
      assert.ok(f.flagUrl && f.name, `${s.id}: ${f.name} has a name and an image`)
      assert.equal(f.set, s.id)
    }
  }
})

test('a flag in two sets plays once', async () => {
  await B.loadSet('separatist'); await B.loadSet('states')
  const { flags, waiting } = B.buildPool(['separatist', 'states'])
  assert.deepEqual(waiting, [])
  assert.equal(new Set(flags.map(f => f.key)).size, flags.length)
  assert.ok(flags.length < B.setCount('separatist') + B.setCount('states'), 'Texas, California… are in both')
  assert.equal(flags.filter(f => f.flagUrl === '/flags/wm/flag-of-texas.svg').length, 1)
})

test('Asia + Europe + Pride makes one bracket with all three in it', async () => {
  await B.loadSet('pride')
  const { flags } = B.buildPool(['Asia', 'Europe', 'pride'])
  assert.equal(flags.length, B.setCount('Asia') + B.setCount('Europe') + B.setCount('pride'))
  for (let seed = 1; seed < 40; seed++) {
    const field = B.drawField(flags, 16, seeded(seed))
    assert.equal(field.length, 16)
    assert.equal(new Set(field.map(f => f.key)).size, 16)
    const per = s => field.filter(f => f.set === s).length
    for (const s of ['Asia', 'Europe', 'pride']) assert.ok(per(s) >= 5 && per(s) <= 6, `${s}: ${per(s)} of 16`)
  }
})

test('a small set gets its share beside a big one; a set too small gives the rest away', async () => {
  await B.loadSet('provinces'); await B.loadSet('signal')
  const big = B.buildPool(['Oceania', 'provinces']).flags
  assert.equal(B.drawField(big, 16, seeded(3)).filter(f => f.set === 'Oceania').length, 8)
  const pool = B.buildPool(['signal', 'provinces']).flags
  const field = B.drawField(pool, 64, seeded(5))
  assert.equal(field.length, 64)
  assert.equal(field.filter(f => f.set === 'signal').length, B.setCount('signal'))
  assert.equal(B.drawField(pool, 'all', seeded(7)).length, pool.length)
})

test('the bracket size fits the pool', () => {
  assert.equal(B.fitSize(16, 200), 16)
  assert.equal(B.fitSize(64, 64), 64)
  assert.equal(B.fitSize(32, 14), 8)
  assert.equal(B.fitSize(64, 40), 32)
  assert.equal(B.fitSize('all', 14), 'all')
  assert.equal(B.fitSize(8, 5), 'all')
})

test('the last choice is read back safely and kept per device', () => {
  assert.deepEqual(B.readPrefs(null), { sets: [...REGIONS], size: 16 })
  assert.deepEqual(B.readPrefs('nope'), B.DEFAULT_PREFS)
  assert.deepEqual(B.readPrefs('{"sets":["pride","Asia","Atlantis",4],"size":32}'), { sets: ['Asia', 'pride'], size: 32 })
  assert.deepEqual(B.readPrefs('{"sets":[],"size":"all"}'), { sets: [...REGIONS], size: 'all' })
  assert.deepEqual(B.readPrefs('{"sets":["Asia"],"size":12}'), { sets: ['Asia'], size: 16 })
  assert.equal(ruleFor(B.PREFS_KEY)?.rule, 'device')
})

test('the header names the mix', () => {
  assert.equal(B.selectionLabel([...REGIONS]), 'World')
  assert.equal(B.selectionLabel(['Asia']), 'Asia')
  assert.equal(B.selectionLabel(['Asia', 'Europe']), 'Europe + Asia')
  assert.equal(B.selectionLabel([...REGIONS, 'pride']), 'World + Pride')
  assert.equal(B.selectionLabel(['pride', 'Asia', 'Europe']), 'Europe + Asia + Pride')
  assert.equal(B.selectionLabel(['pride', 'Asia', 'Europe', 'signal']), 'Europe + Asia + 2 more')
})

test('the closed drop-down says what is on', () => {
  assert.equal(B.extrasSummary(['Asia', 'pride']), 'Pride & LGBTQ+')
  assert.equal(B.extrasSummary(['micronations', 'pride']), 'Pride, Micronations')
  assert.equal(B.extrasSummary(B.EXTRA_SETS.map(s => s.id).filter(id => id !== 'pride')), 'Peoples, Separatist, Civic and 7 more')
})

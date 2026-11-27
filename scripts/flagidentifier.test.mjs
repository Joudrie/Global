// Flag Identifier: the data (src/data/flagIdentify.ts), the ranking
// (src/utils/flagIdentify.ts) and how the tool is wired into the site.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const { FLAGS } = await src('data/flags.ts')
const { IDENTIFY_FLAGS } = await src('data/flagIdentify.ts')
const U = await src('utils/flagIdentify.ts')
const { REGISTRY, GAMES, GAME_COUNT } = await src('ui/registry.ts')
const { CHANGELOG } = await src('data/changelog.ts')
const build = await import(path.join(ROOT, 'scripts/flag-identifier/build.mjs'))

const BY = new Map(IDENTIFY_FLAGS.map(e => [e.code, e]))
const rank = answers => U.rankFlags(IDENTIFY_FLAGS, answers)
const ask = ({ layouts = [], colors = [], details = [], none = false }) => ({ layouts, colors, details, noDetails: none })
const position = (answers, code) => rank(answers).findIndex(m => m.entry.code === code) + 1

// Flags the questions can't tell apart: same layout, same colours, same kind
// of symbol. Each group is a well-known look-alike set.
const LOOKALIKES = [
  ['RO', 'TD'], ['ID', 'MC', 'PL'], ['NL', 'RU'], ['BG', 'HU'], ['CI', 'IE'], ['IS', 'NO'],
  ['CM', 'SN'], ['GN', 'ML'], ['LR', 'US'], ['AU', 'NZ'], ['CN', 'VN'], ['CR', 'TH'],
  ['KW', 'PS', 'SD'],   // pan-Arab colours with a hoist triangle
  ['AZ', 'UZ'],         // light blue, white, green and red with a crescent and stars
  ['FM', 'SO'],         // white star(s) on light blue
  ['HN', 'IL'],         // blue, white, blue with star(s)
  ['KG', 'MK'],         // a yellow sun on red
]
const sameGroup = (a, b) => a === b || LOOKALIKES.some(g => g.includes(a) && g.includes(b))

test('src/data/flagIdentify.ts is up to date with scripts/flag-identifier/checked.mjs', () => {
  assert.ok(read('src/data/flagIdentify.ts') === build.render(),
    'run: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/flag-identifier/build.mjs')
})

test('every country flag is described, with a category, and only known words', () => {
  assert.deepEqual(IDENTIFY_FLAGS.map(e => e.code), FLAGS.map(f => f.code))
  const layouts = new Set(U.LAYOUTS.map(l => l.id)), colours = new Set(U.COLOURS.map(c => c.id)), details = new Set(U.DETAILS.map(d => d.id))
  for (const e of IDENTIFY_FLAGS) {
    assert.equal(e.category, 'country', e.code)
    assert.ok(U.IDENTIFY_CATEGORIES.some(c => c.id === e.category))
    assert.ok(e.layouts.length && e.layouts.every(l => layouts.has(l)), e.code)
    assert.ok(e.colors.length && e.colors.every(s => s.split('|').every(c => colours.has(c))), e.code)
    assert.ok(e.minorColors.every(c => colours.has(c)), e.code)
    assert.ok([...e.details, ...e.minorDetails].every(d => details.has(d)), e.code)
  }
  for (const l of U.LAYOUTS) assert.ok(IDENTIFY_FLAGS.some(e => e.layouts.includes(l.id)), `no flag has ${l.id}`)
  for (const d of U.DETAILS) assert.ok(IDENTIFY_FLAGS.some(e => e.details.includes(d.id)), `no flag has ${d.id}`)
})

test('colours are the words people use', () => {
  const has = (code, c) => BY.get(code).colors.some(s => s.split('|').includes(c))
  assert.ok(has('AR', 'lightblue') && !has('AR', 'blue'))
  for (const c of ['LK', 'LV', 'QA']) assert.ok(has(c, 'maroon') && !has(c, 'red'), c)
  for (const c of ['IN', 'IE', 'CI', 'NE', 'BT', 'AM']) assert.ok(has(c, 'orange'), c)
  for (const c of ['SO', 'FM', 'PW', 'BW', 'KZ', 'UZ', 'AZ', 'GT', 'FJ']) assert.ok(has(c, 'lightblue'), c)
  for (const c of ['FR', 'US', 'GB', 'NL', 'AU']) assert.ok(has(c, 'blue') && !has(c, 'lightblue'), c)
})

test('every flag described in full comes first, tied only with true look-alikes', () => {
  for (const e of IDENTIFY_FLAGS) {
    const list = rank(U.describe(e, true))
    const me = list.find(m => m.entry.code === e.code)
    assert.equal(me.diff, 0, e.code)
    const first = list[0]
    assert.ok(me.diff === first.diff && me.extras === first.extras, `${e.code}: ${first.entry.code} ranks above it`)
    const tied = list.filter(m => m.diff === me.diff && m.extras === me.extras).map(m => m.entry.code)
    for (const c of tied) assert.ok(sameGroup(e.code, c), `${e.code} ties with ${c}`)
  }
})

test('described without its small details, a flag still fits and is in the top 5', () => {
  for (const e of IDENTIFY_FLAGS) {
    const a = U.describe(e, false)
    assert.equal(U.scoreFlag(e, a).diff, 0, e.code)
    assert.ok(position(a, e.code) <= 5, `${e.code} is #${position(a, e.code)}`)
  }
})

// How a person might describe each one, from memory.
const SPOT = {
  PH: { layouts: ['hoist', 'hstripes'], colors: ['blue', 'red', 'white', 'yellow'], details: ['sun', 'star'] },
  JP: { layouts: ['disc'], colors: ['white', 'red'], none: true },
  BR: { layouts: ['diamond'], colors: ['green', 'yellow', 'blue'], details: ['star'] },
  NP: { layouts: ['shape'], colors: ['red', 'blue', 'white'], details: ['sun', 'crescent'] },
  CA: { layouts: ['vstripes'], colors: ['red', 'white'], details: ['plant'] },
  LK: { layouts: ['border'], colors: ['maroon', 'yellow', 'orange', 'green'], details: ['animal', 'weapon'] },
  KE: { layouts: ['hstripes'], colors: ['black', 'red', 'green', 'white'], details: ['emblem', 'weapon'] },
  BT: { layouts: ['diagonal'], colors: ['yellow', 'orange', 'white'], details: ['animal'] },
  MZ: { layouts: ['hoist', 'hstripes'], colors: ['green', 'black', 'yellow', 'red', 'white'], details: ['star', 'weapon'] },
  CY: { layouts: ['plain'], colors: ['white', 'orange'], details: ['map', 'plant'] },
}

test('spot checks: each flag described from memory ranks first', () => {
  for (const [code, d] of Object.entries(SPOT)) {
    const list = rank(ask(d))
    assert.equal(list[0].entry.code, code, `${code}: got ${list.slice(0, 3).map(m => m.entry.code)}`)
    assert.equal(list[0].diff, 0, code)
  }
  // The owner's example, one step at a time: the shape alone already narrows it.
  const shape = rank(ask({ layouts: ['hoist', 'hstripes'] })).filter(m => m.diff === 0).map(m => m.entry.code)
  assert.ok(shape.includes('PH') && shape.length < 25)
  // Remembered as "blue" rather than light blue, Argentina is listed right
  // after Uruguay (blue and white with a sun), as close.
  const ar = rank(ask({ layouts: ['hstripes'], colors: ['blue', 'white', 'yellow'], details: ['sun'] }))
  assert.deepEqual(ar.slice(0, 2).map(m => [m.entry.code, m.diff]), [['UY', 0], ['AR', 0.5]])
})

test('one wrong colour still keeps the right flag in the top 5', () => {
  const wrong = e => U.COLOURS.map(c => c.id).filter(c => !e.colors.some(s => s.split('|').includes(c)) && !e.minorColors.includes(c))
  // An extra colour that isn't there, for every flag: it's always still listed
  // as close, and in the top 5 unless the wrong colour turns the description
  // into other flags (Austria with green is Hungary's colours) that fit as
  // well or better.
  let tries = 0, below = 0
  for (const e of IDENTIFY_FLAGS) {
    const a = U.describe(e, true)
    for (const c of wrong(e)) {
      const list = rank({ ...a, colors: [...a.colors, c] })
      const p = list.findIndex(m => m.entry.code === e.code) + 1, me = list[p - 1]
      tries++
      assert.ok(me.diff <= U.CLOSE, `${e.code} + ${c}`)
      if (p <= 5) continue
      below++
      assert.ok(list.slice(0, 5).every(m => m.diff < me.diff || (m.diff === me.diff && m.extras <= me.extras)), `${e.code} + ${c}: #${p}`)
    }
  }
  assert.ok(below / tries < 0.02, `${below} of ${tries} below the top 5`)
  // One of its colours swapped for another, for the spot checks.
  for (const [code, d] of Object.entries(SPOT)) {
    const e = BY.get(code)
    for (const drop of d.colors) for (const c of wrong(e)) {
      const p = position(ask({ ...d, colors: [...d.colors.filter(x => x !== drop), c] }), code)
      assert.ok(p <= 5, `${code} with ${c} for ${drop}: #${p}`)
    }
  }
})

test('nothing answered fits every flag; "not sure" changes nothing', () => {
  const list = rank(U.NO_ANSWERS)
  assert.equal(list.length, FLAGS.length)
  assert.ok(list.every(m => m.diff === 0))
  assert.ok(!U.hasAnswers(U.NO_ANSWERS))
})

test('"None" ignores details that are the layout itself', () => {
  const none = ask({ layouts: ['nordic'], colors: ['red', 'white'], none: true })
  assert.equal(rank(none)[0].entry.code, 'DK')
  assert.equal(U.scoreFlag(BY.get('CH'), ask({ colors: ['red', 'white'], none: true })).diff, 0)
  assert.equal(U.scoreFlag(BY.get('CA'), ask({ colors: ['red', 'white'], none: true })).diff, 1)
})

test('Flag Identifier is a tool next to Flag Studio, and the game count stays 57', () => {
  const ids = REGISTRY.map(e => e.id)
  assert.equal(ids[ids.indexOf('flagstudio') + 1], 'flagidentifier')
  const e = REGISTRY.find(x => x.id === 'flagidentifier')
  assert.equal(e.title, 'Flag Identifier')
  assert.equal(e.subtitle, 'Describe a flag, find it')
  assert.equal(e.group, REGISTRY.find(x => x.id === 'flagstudio').group)
  assert.equal(e.tab, 'play')
  assert.ok(e.tool && !e.sandbox && !e.featured)
  assert.ok(!GAMES.includes(e))
  assert.equal(GAME_COUNT, 57)
  assert.match(read('src/App.tsx'), /screen === "flagidentifier"/)
  assert.match(read('src/components/icons.tsx'), /flagidentifier: \w+/)
  assert.match(read('src/components/GamePoster.tsx'), /case "flagidentifier":/)
  assert.match(read('scripts/prerender.mjs'), /emit\('\/flag-identifier\/'/)
  assert.match(read('scripts/test-site.mjs'), /\|flag-identifier\|/)
  assert.ok(CHANGELOG.some(c => c.date === '2026-11-24' && c.title === 'New: Flag Identifier'))
})

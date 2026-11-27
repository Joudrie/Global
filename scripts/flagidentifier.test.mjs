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

// The country tests rank the countries alone, as the tool did before it took
// other kinds of flag; the tests further down rank every flag.
const COUNTRIES = IDENTIFY_FLAGS.filter(e => e.category === 'country')
const BY = new Map(IDENTIFY_FLAGS.map(e => [e.code, e]))
const rank = answers => U.rankFlags(COUNTRIES, answers)
const rankAll = answers => U.rankFlags(IDENTIFY_FLAGS, answers)
const ask = ({ kind = null, layouts = [], colors = [], details = [], none = false }) => ({ kind, layouts, colors, details, noDetails: none })
const position = (answers, code) => rank(answers).findIndex(m => m.entry.code === code) + 1
const positionAll = (answers, code) => rankAll(answers).findIndex(m => m.entry.code === code) + 1

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
  assert.deepEqual(COUNTRIES.map(e => e.code), FLAGS.map(f => f.code))
  const layouts = new Set(U.LAYOUTS.map(l => l.id)), colours = new Set(U.COLOURS.map(c => c.id)), details = new Set(U.DETAILS.map(d => d.id))
  const kinds = new Set(U.IDENTIFY_CATEGORIES.map(c => c.id))
  for (const e of IDENTIFY_FLAGS) {
    assert.ok(kinds.has(e.category), e.code)
    assert.ok((e.also ?? []).every(k => kinds.has(k) && k !== e.category), e.code)
    assert.ok(e.label, e.code)
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
  for (const e of COUNTRIES) {
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
  for (const e of COUNTRIES) {
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
  for (const e of COUNTRIES) {
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
  const list = rankAll(U.NO_ANSWERS)
  assert.equal(list.length, IDENTIFY_FLAGS.length)
  assert.ok(list.every(m => m.diff === 0))
  assert.ok(!U.hasAnswers(U.NO_ANSWERS))
  // Countries first, then the other kinds in order.
  const order = U.IDENTIFY_CATEGORIES.map(c => c.id)
  assert.ok(list.every((m, i) => !i || order.indexOf(list[i - 1].entry.category) <= order.indexOf(m.entry.category)))
})

test('"None" ignores details that are the layout itself', () => {
  const none = ask({ layouts: ['nordic'], colors: ['red', 'white'], none: true })
  assert.equal(rank(none)[0].entry.code, 'DK')
  assert.equal(U.scoreFlag(BY.get('CH'), ask({ colors: ['red', 'white'], none: true })).diff, 0)
  assert.equal(U.scoreFlag(BY.get('CA'), ask({ colors: ['red', 'white'], none: true })).diff, 1)
})

test('Flag Identifier is a tool next to Flag Studio, and the game count stays 56', () => {
  const ids = REGISTRY.map(e => e.id)
  assert.equal(ids[ids.indexOf('flagstudio') + 1], 'flagidentifier')
  const e = REGISTRY.find(x => x.id === 'flagidentifier')
  assert.equal(e.title, 'Flag Identifier')
  assert.equal(e.subtitle, 'Describe a flag, find it')
  assert.equal(e.group, REGISTRY.find(x => x.id === 'flagstudio').group)
  assert.equal(e.tab, 'play')
  assert.ok(e.tool && !e.sandbox && !e.featured)
  assert.ok(!GAMES.includes(e))
  assert.equal(GAME_COUNT, 56)
  assert.match(read('src/App.tsx'), /screen === "flagidentifier"/)
  assert.match(read('src/components/icons.tsx'), /flagidentifier: \w+/)
  assert.match(read('src/components/GamePoster.tsx'), /case "flagidentifier":/)
  assert.match(read('scripts/prerender.mjs'), /emit\('\/flag-identifier\/'/)
  assert.match(read('scripts/test-site.mjs'), /\|flag-identifier\|/)
  assert.ok(CHANGELOG.some(c => c.date === '2026-11-24' && c.title === 'New: Flag Identifier'))
})

// ── Every kind of flag ──────────────────────────────────────────────────────

test('flags beyond the countries: each has its own image, a label, and no flag is in twice', () => {
  const others = IDENTIFY_FLAGS.filter(e => e.category !== 'country')
  assert.ok(others.length >= 400, `${others.length}`)
  for (const kind of ['region', 'city', 'identity', 'movement', 'organization']) {
    assert.ok(others.some(e => e.category === kind), `no ${kind} flags`)
  }
  for (const e of others) {
    assert.ok(e.img && (e.img.startsWith('/') || e.img.startsWith('https://')), e.code)
    if (e.img.startsWith('/')) assert.ok(fs.existsSync(path.join(ROOT, 'public', e.img)), `${e.code}: ${e.img} is missing`)
    assert.ok(!FLAGS.some(f => f.code === e.code), `${e.code} looks like a country code`)
  }
  for (const field of ['code', 'img']) {
    const values = IDENTIFY_FLAGS.map(e => e[field]).filter(Boolean)
    assert.equal(new Set(values).size, values.length, `a ${field} twice`)
  }
  // Pages linked from the results exist on the identity pages.
  for (const e of others.filter(x => x.href)) assert.match(e.href, /^\/identity\/[a-z-]+\/#[a-z0-9-]+$/, e.code)
  // The well-known ones are in, under the kind people would give them.
  const kindOf = code => BY.get(code)?.category
  assert.equal(kindOf('us-tx'), 'region')
  assert.equal(kindOf('ca-qc'), 'region')
  assert.equal(kindOf('city-boston'), 'city')
  assert.equal(kindOf('flag-pride-6'), 'identity')
  assert.equal(kindOf('flag-estelada-blava'), 'movement')
  assert.equal(kindOf('flag-united-nations'), 'organization')
  assert.equal(BY.get('city-boston').label, 'US city, MA')
  assert.equal(BY.get('es-ct').label, 'Region of Spain')
  assert.equal(BY.get('flag-pride-trans').label, 'Pride')
  assert.ok(U.isKind(BY.get('flag-scotland'), 'country'), 'Scotland also counts as a country')
})

test('every flag described in full fits, and only true twins tie with it', () => {
  // Twins: flags these words can't tell apart (Hesse is red over white like
  // Monaco). Few enough that the picture on each row settles it.
  let twins = 0
  for (const e of IDENTIFY_FLAGS) {
    const list = rankAll(U.describe(e, true))
    const me = list.find(m => m.entry.code === e.code)
    assert.equal(me.diff, 0, e.code)
    assert.equal(me.extras, 0, e.code)
    if (list.filter(m => m.diff === 0 && m.extras === 0).length > 1) twins++
  }
  assert.ok(twins / IDENTIFY_FLAGS.length < 0.2, `${twins} of ${IDENTIFY_FLAGS.length} have a twin`)
})

test('Boston: a seal in a circle in the middle counts as the circle, and Boston fits', () => {
  // The owner's case: blue, a coat of arms in the centre, picked "circle in the middle".
  const boston = ask({ layouts: ['disc'], colors: ['blue', 'white'], details: ['emblem'] })
  const me = rankAll(boston).find(m => m.entry.code === 'city-boston')
  assert.equal(me.diff, 0)
  assert.ok(positionAll(boston, 'city-boston') <= 15, `#${positionAll(boston, 'city-boston')}`)
  // Saying it's a city puts it in the top 5, with its gold ring the top 3
  // (Anchorage, a blue and white circle on yellow, fits that too).
  const top = (d, n) => rankAll(d).slice(0, n).map(m => m.entry.code)
  assert.ok(top({ ...boston, kind: 'city' }, 5).includes('city-boston'), top({ ...boston, kind: 'city' }, 5).join())
  assert.ok(top({ ...boston, colors: ['blue', 'white', 'yellow'], kind: 'city' }, 3).includes('city-boston'))
  // Seals in a round frame across the data are "disc" too.
  for (const code of ['us-ks', 'us-va', 'us-nh', 'city-los-angeles', 'city-nyc', 'PY', 'BZ']) {
    assert.ok(BY.get(code).layouts.includes('disc'), code)
  }
  // Palau is still the answer for a plain disc on light blue.
  assert.equal(rankAll(ask({ layouts: ['disc'], colors: ['lightblue', 'yellow'], none: true }))[0].entry.code, 'PW')
})

test('Catalonia: red and yellow stripes', () => {
  const stripes = ask({ layouts: ['hstripes'], colors: ['red', 'yellow'] })
  assert.equal(rankAll(stripes).find(m => m.entry.code === 'es-ct').diff, 0)
  assert.ok(positionAll(stripes, 'es-ct') <= 3, `#${positionAll(stripes, 'es-ct')}`)
  // Many stripes, or "a region", and it's first.
  assert.equal(rankAll({ ...stripes, details: ['manystripes'] })[0].entry.code, 'es-ct')
  assert.equal(rankAll({ ...stripes, kind: 'region' })[0].entry.code, 'es-ct')
  // The independence flag with the star and triangle is a movement, found as one.
  const estelada = ask({ kind: 'movement', layouts: ['hstripes', 'hoist'], colors: ['red', 'yellow', 'blue', 'white'], details: ['star'] })
  assert.equal(rankAll(estelada)[0].entry.code, 'flag-estelada-blava')
})

test('pride flags: the trans and rainbow flags from their colours', () => {
  // Light blue, pink and white stripes are also Espírito Santo's (Brazil),
  // which has writing on it: with "None", or "a pride flag", it's the trans flag.
  const trans = ask({ layouts: ['hstripes'], colors: ['lightblue', 'pink', 'white'] })
  assert.deepEqual(rankAll(trans).slice(0, 2).map(m => m.entry.code).sort(), ['br-es', 'flag-pride-trans'])
  assert.equal(rankAll({ ...trans, noDetails: true })[0].entry.code, 'flag-pride-trans')
  assert.equal(rankAll({ ...trans, kind: 'identity' })[0].entry.code, 'flag-pride-trans')
  const rainbow = ask({ layouts: ['hstripes'], colors: ['red', 'orange', 'yellow', 'green', 'blue', 'purple'], none: true })
  assert.equal(rankAll(rainbow)[0].entry.code, 'flag-pride-6')
  // The 8-stripe flag's pink and turquoise aren't covered by the red and blue picked.
  assert.ok(rankAll(rainbow).find(m => m.entry.code === 'flag-pride-8').diff >= 1)
  // "A pride flag, but which one": stripes and the kind narrow it to pride flags.
  const pride = rankAll(ask({ kind: 'identity', layouts: ['hstripes'], colors: ['pink', 'purple', 'blue'] }))
  assert.equal(pride[0].entry.code, 'flag-pride-bi')
})

test('a country still tops a classic country description, whatever else is in', () => {
  const classic = {
    FR: { layouts: ['vstripes'], colors: ['blue', 'white', 'red'], none: true },
    JP: { layouts: ['disc'], colors: ['white', 'red'], none: true },
    CA: { layouts: ['vstripes'], colors: ['red', 'white'], details: ['plant'] },
    BR: { layouts: ['diamond'], colors: ['green', 'yellow', 'blue'], details: ['star'] },
    DE: { layouts: ['hstripes'], colors: ['black', 'red', 'yellow'], none: true },
    TR: { layouts: ['plain'], colors: ['red', 'white'], details: ['crescent', 'star'] },
    ...SPOT,
  }
  for (const [code, d] of Object.entries(classic)) {
    const list = rankAll(ask(d))
    assert.equal(list[0].entry.code, code, `${code}: got ${list.slice(0, 3).map(m => m.entry.code)}`)
  }
})

test('picking a kind boosts that kind and hides nothing', () => {
  const d = ask({ layouts: ['hstripes'], colors: ['red', 'white'], none: true })
  const all = rankAll(d), asRegion = rankAll({ ...d, kind: 'region' })
  assert.equal(asRegion.length, all.length)
  assert.deepEqual(new Set(asRegion.map(m => m.entry.code)), new Set(all.map(m => m.entry.code)))
  // Same scores; only the order changes: that kind first.
  for (const m of asRegion) assert.equal(m.diff, all.find(x => x.entry.code === m.entry.code).diff)
  const firstOther = asRegion.findIndex(m => !U.isKind(m.entry, 'region'))
  assert.ok(firstOther > 0 && asRegion.slice(firstOther).every(m => !U.isKind(m.entry, 'region')))
  assert.equal(all[0].entry.category, 'country')   // Austria
  assert.equal(asRegion[0].entry.category, 'region')
  // A flag that also counts as a kind is boosted with it: Scotland for "country".
  const saltire = ask({ kind: 'country', layouts: ['saltire'], colors: ['blue', 'white'], none: true })
  assert.equal(rankAll(saltire)[0].entry.code, 'flag-scotland')
})

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
  const files = build.render()
  assert.deepEqual(Object.keys(files).map(f => path.relative(ROOT, f)).sort(), ['src/data/flagIdentify.ts', 'src/data/flagIdentifyCountries.ts'])
  assert.ok(Object.entries(files).every(([f, text]) => fs.readFileSync(f, 'utf8') === text),
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
  for (const e of others.filter(x => x.href)) assert.match(e.href, /^\/(identity|historical)\/[a-z-]+\/#[a-z0-9-]+$|^\/flags\/[a-z]{2}\/$/, e.code)
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
  // Monaco; Poland's flag was also the Duchy of Warsaw's). Within one kind of
  // flag they are few enough that the picture on each row settles it. Former
  // flags are often variants of one another (the colonial blue ensigns with a
  // badge, the Soviet republics, Mexico's eagles), so up to half may have one;
  // regional flags come in families of one design with different arms (Estonia's
  // white-over-green counties, San Marino's castles, Andorra's parishes), and
  // many peoples fly a tricolour that differs from another only in the order
  // of its stripes, which these words don't record.
  for (const e of IDENTIFY_FLAGS) {
    const me = U.scoreFlag(e, U.describe(e, true))
    assert.equal(me.diff, 0, e.code)
    assert.equal(me.extras, 0, e.code)
  }
  for (const { id: kind } of U.IDENTIFY_CATEGORIES) {
    const pool = IDENTIFY_FLAGS.filter(e => e.category === kind)
    const twins = pool.filter(e => U.rankFlags(pool, U.describe(e, true)).filter(m => m.diff === 0 && m.extras === 0).length > 1).length
    const most = { historical: 0.5, region: 0.3, identity: 0.3 }[kind] ?? 0.25
    assert.ok(twins / pool.length < most, `${kind}: ${twins} of ${pool.length} have a twin`)
  }
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

test('historical flags: the Soviet Union from a plain description, and the kind boosts them', () => {
  const ussr = ask({ layouts: ['plain'], colors: ['red', 'yellow'], details: ['star', 'emblem'] })
  assert.equal(rankAll(ussr)[0].entry.code, 'hist-soviet-union')
  assert.equal(BY.get('hist-soviet-union').category, 'historical')
  assert.match(BY.get('hist-soviet-union').label, /^Historical, 1922/)
  assert.match(BY.get('hist-soviet-union').href, /^\/historical\/europe\/#soviet-union$/)
  // Without the emblem it's China's colours: China first, the USSR still close.
  const plain = rankAll(ask({ layouts: ['plain'], colors: ['red', 'yellow'], details: ['star'] }))
  assert.equal(plain[0].entry.code, 'CN')
  assert.ok(plain.find(m => m.entry.code === 'hist-soviet-union').diff <= U.CLOSE)
  // "Historical" puts East Germany above Germany for black, red and gold with arms.
  const gdr = ask({ kind: 'historical', layouts: ['hstripes'], colors: ['black', 'red', 'yellow'], details: ['emblem'] })
  assert.equal(rankAll(gdr)[0].entry.code, 'hist-east-germany')
  assert.ok(U.IDENTIFY_CATEGORIES.some(c => c.id === 'historical'))
  assert.ok(IDENTIFY_FLAGS.filter(e => e.category === 'historical').length >= 150)
})

test('Japanese prefectures and other new regions are found', () => {
  // Tokyo: a white emblem on purple.
  const tokyo = rankAll(ask({ kind: 'region', layouts: ['plain'], colors: ['purple', 'white'], details: ['emblem'] }))
  assert.ok(tokyo.slice(0, 4).some(m => m.entry.code === 'jp-13'), tokyo.slice(0, 4).map(m => m.entry.code).join())
  assert.equal(BY.get('jp-13').label, 'Prefecture of Japan')
  // Ehime: green and orange stripes with a flower.
  assert.equal(rankAll(ask({ layouts: ['hstripes'], colors: ['green', 'orange', 'white'], details: ['plant'] }))[0].entry.code, 'jp-38')
  for (const code of ['ar-x', 'ru-ta', 'ru-spb', 'gb-zet']) assert.ok(BY.has(code), code)
})

test('new detail words: fleur-de-lis, key, anchor, hand, heart, checkerboard', () => {
  for (const id of ['fleur', 'key', 'anchor', 'hand', 'heart', 'checkers']) {
    assert.ok(U.DETAILS.some(d => d.id === id), id)
    assert.ok(IDENTIFY_FLAGS.filter(e => e.details.includes(id)).length >= 3, `${id} has fewer than 3 flags`)
  }
  assert.match(read('src/components/FlagIdentifierScreen.tsx'), /fleur: FleurDeLis, key: Key, anchor: Anchor, hand: Hand, heart: Heart, checkers: Grid3x3/)
  // Quebec: white cross on blue with fleurs-de-lis.
  assert.equal(rankAll(ask({ layouts: ['cross'], colors: ['blue', 'white'], details: ['fleur'] }))[0].entry.code, 'ca-qc')
  // Croatia's checkerboard is a small part of its arms: picking it costs nothing.
  assert.equal(U.scoreFlag(BY.get('HR'), ask({ colors: ['red', 'white', 'blue'], details: ['checkers'] })).diff, 0)
  // Saint Petersburg: an anchor on red.
  assert.equal(rankAll(ask({ layouts: ['plain'], colors: ['red', 'white'], details: ['anchor'] }))[0].entry.code, 'ru-spb')
  // Zaire: a hand with a torch in a yellow disc on green.
  assert.equal(rankAll(ask({ layouts: ['disc'], colors: ['green', 'yellow'], details: ['hand'] }))[0].entry.code, 'hist-zaire')
})

test('the count says how much of the Codex it searches, never "all"', async () => {
  const screen = read('src/components/FlagIdentifierScreen.tsx')
  assert.match(screen, /const CODEX_TOTAL = "5,000\+"/)
  assert.match(screen, /of the Codex's \$\{CODEX_TOTAL\} flags so far/)
  assert.doesNotMatch(screen, /Search(ing)? all \$\{TOTAL\}|All \$\{TOTAL\} flags fit/)
  // "5,000+" stays true of the Mega Codex, and the identifier is a part of it.
  const { ALL_FLAGS_AZ } = await src('data/megaCodex.ts')
  assert.ok(ALL_FLAGS_AZ.length >= 5000, `${ALL_FLAGS_AZ.length}`)
  assert.ok(IDENTIFY_FLAGS.length < ALL_FLAGS_AZ.length)
})

test('the rest of the Codex: most of its flags are searchable, each described from its image', async () => {
  const { ALL_FLAGS_AZ } = await src('data/megaCodex.ts')
  const imgs = new Set([...IDENTIFY_FLAGS.map(e => e.img).filter(Boolean), ...FLAGS.map(f => f.flagUrl)])
  const names = new Set(IDENTIFY_FLAGS.map(e => e.name.toLowerCase()))
  const covered = ALL_FLAGS_AZ.filter(f => imgs.has(f.url) || names.has(f.title.toLowerCase())).length
  assert.ok(IDENTIFY_FLAGS.length >= 3500, `${IDENTIFY_FLAGS.length}`)
  assert.ok(covered / ALL_FLAGS_AZ.length >= 0.8, `${covered} of ${ALL_FLAGS_AZ.length}`)
  // Newly searchable: Gibraltar (a castle and a key, filed under the territory,
  // not its people), a Kenyan county, a people's flag and a former state. A
  // people's flag that is another flag already in under a different name
  // (the Māori flag, Mapuche) is in once, not twice.
  assert.equal(IDENTIFY_FLAGS.filter(e => /^M[aā]ori/.test(e.name)).length, 1)
  const gib = rankAll(ask({ layouts: ['hstripes'], colors: ['white', 'red'], details: ['building', 'key'] }))
  assert.equal(gib[0].entry.name, 'Gibraltar')
  assert.equal(gib[0].entry.label, 'British Overseas Territory')
  const nakuru = rankAll(ask({ kind: 'region', layouts: ['hstripes', 'disc'], colors: ['blue', 'yellow', 'green', 'white'], details: ['animal'] }))
  assert.equal(nakuru[0].entry.code, 'ke-nakuru')
  assert.equal(BY.get('ke-nakuru').label, 'County of Kenya')
  const hausa = IDENTIFY_FLAGS.find(e => e.name === 'Hausa people')
  assert.equal(hausa?.label, 'People, Africa')
  assert.equal(rankAll(ask({ kind: 'identity', layouts: ['hstripes', 'disc'], colors: ['blue', 'white'], details: ['animal'] }))[0].entry.name, 'Lango people')
  assert.ok(IDENTIFY_FLAGS.some(e => e.label === 'Former state'))
})

test("Europe's city flags: named as the Codex names them, and found from a description", async () => {
  const { EUROPE_CITY_FLAGS } = await src('data/cityFlags.ts')
  const { ALL_FLAGS_AZ } = await src('data/megaCodex.ts')
  const cities = IDENTIFY_FLAGS.filter(e => e.code.startsWith('wcity-'))
  assert.ok(cities.length >= 350, `${cities.length}`)
  const title = new Map(ALL_FLAGS_AZ.map(f => [f.url, f.title]))
  for (const e of cities) {
    assert.equal(e.category, 'city', e.code)
    const c = EUROPE_CITY_FLAGS.find(x => `wcity-${x.id}` === e.code && x.flagUrl === e.img)
    assert.ok(c, e.code)
    // The Codex's own title; a city it doesn't list by name (Pleven, the same
    // flag as its region; Brest in France beside Brest in Belarus) keeps the
    // city's name, with its country when another flag has that name.
    assert.ok([title.get(e.img), c.name].includes(e.name) || e.name.startsWith(`${c.name} (`), e.code)
    assert.match(e.label, /^(Capital|City) of /, e.code)
  }
  // A city named like a region already in is "X (city)", never a second "X".
  const others = new Set(IDENTIFY_FLAGS.filter(e => !e.code.startsWith('wcity-')).map(e => e.name.toLowerCase()))
  const cityNames = cities.map(e => e.name.toLowerCase())
  assert.equal(new Set(cityNames).size, cityNames.length, 'two cities share a name')
  for (const e of cities) assert.ok(!others.has(e.name.toLowerCase()), `${e.code}: ${e.name} is another flag's name`)
  assert.equal(BY.get('wcity-fr-brest').name, 'Brest (France)')
  assert.equal(BY.get('wcity-at-salzburg').name, 'Salzburg (city)')   // the state of Salzburg is in too
  // Amsterdam: red, black and red with three white saltires on the black.
  const ams = rankAll(ask({ layouts: ['hstripes'], colors: ['red', 'black', 'white'], details: ['cross'] }))
  assert.equal(ams[0].entry.code, 'wcity-nl-amsterdam')
  assert.equal(ams[0].entry.label, 'Capital of the Netherlands')
  assert.equal(rankAll(ask({ kind: 'city', layouts: ['hstripes'], colors: ['red', 'black', 'white'] }))[0].entry.code, 'wcity-nl-amsterdam')
  // Saint Petersburg's anchors stay the federal city's: one entry, not two.
  assert.equal(IDENTIFY_FLAGS.filter(e => /^Saint Petersburg/.test(e.name)).length, 1)
  // Gibraltar-style castles and keys: Angers, red and blue halves with a key and fleurs-de-lis.
  assert.equal(rankAll(ask({ layouts: ['vstripes', 'split'], colors: ['red', 'blue'], details: ['key', 'fleur'] }))[0].entry.code, 'wcity-fr-angers')
})

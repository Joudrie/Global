// Countries Abroad: the answer matcher and its alternatives, countries that
// must never count for each other, the "spelled like the English" rule, the
// generated names, their tiers and values, round building, scoring, the Latin
// spellings and the iOS-safe answer box.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { FLAGS } = await src('data/flags.ts')
const { NAMES, LANGUAGES, NON_LATIN_LANGS } = await src('data/countriesAbroad.ts')
const NATIVE = await src('data/nativeNames.ts')
const { foldName, squash, editDistance, roundPoints, gameState, TIERS, TARGET, STRIKES, MAX_ROUNDS } = await src('utils/abroad.ts')
const {
  COUNTRIES, COUNTRY_ALIASES, acceptedAnswers, judgeCountry, isCountry, looksLikeCountry, pickCountryRounds, countryChoices,
  countryHint, countryRounds, GUESS_FIELD, COUNTRIES_ABROAD_SAMPLES,
} = await src('utils/countryNames.ts')
const { REGISTRY, GAME_COUNT } = await src('ui/registry.ts')
const R = await import(path.join(ROOT, 'scripts/cities-abroad/romanise.mjs'))

const LIST = Object.values(COUNTRIES)
const byName = name => LIST.find(c => c.country === name) ?? assert.fail(`no country ${name}`)
const right = (country, typed) => judgeCountry(byName(country), typed, 'Xyzzy').correct
const named = (country, name) => NAMES.find(n => COUNTRIES[n.country].country === country && n.name === name)
const rng = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// ── Answers ───────────────────────────────────────────────────────────────

test('every country in FLAGS is a possible answer, under the site\'s English name', () => {
  assert.equal(LIST.length, 197)
  for (const f of FLAGS) {
    assert.ok(COUNTRIES[f.code], f.code)
    assert.equal(COUNTRIES[f.code].region, f.region)
    if (f.code !== 'AE') assert.equal(COUNTRIES[f.code].country, f.name)
  }
  assert.equal(COUNTRIES.AE.country, 'United Arab Emirates')
  assert.ok(right('United Arab Emirates', 'UAE'))
  for (const code of Object.keys(COUNTRY_ALIASES)) assert.ok(COUNTRIES[code], code)
})

test('common English alternatives count', () => {
  const pairs = [
    ['Czech Republic', 'Czechia'], ['Czech Republic', 'czech republic'], ['Netherlands', 'Holland'], ['Netherlands', 'The Netherlands'],
    ['United Kingdom', 'UK'], ['United Kingdom', 'Britain'], ['United Kingdom', 'Great Britain'], ['United Kingdom', 'U.K.'],
    ['United States', 'USA'], ['United States', 'US'], ['United States', 'America'], ['United States', 'United States of America'],
    ["Côte d'Ivoire", 'Ivory Coast'], ["Côte d'Ivoire", "Cote d'Ivoire"], ["Côte d'Ivoire", 'cote divoire'], ['Myanmar', 'Burma'],
    ['Eswatini', 'Swaziland'], ['Timor-Leste', 'East Timor'], ['Timor-Leste', 'Timor Leste'], ['Turkey', 'Türkiye'], ['Turkey', 'Turkiye'],
    ['Cape Verde', 'Cabo Verde'], ['DR Congo', 'DRC'], ['DR Congo', 'Democratic Republic of the Congo'], ['DR Congo', 'Congo-Kinshasa'],
    ['Republic of the Congo', 'Republic of Congo'], ['Republic of the Congo', 'Congo-Brazzaville'], ['North Macedonia', 'Macedonia'],
    ['Vatican City', 'Vatican'], ['Vatican City', 'Holy See'], ['Bosnia and Herzegovina', 'Bosnia'], ['Bosnia and Herzegovina', 'Bosnia & Herzegovina'],
    ['South Korea', 'Republic of Korea'], ['North Korea', 'DPRK'], ['Vietnam', 'Viet Nam'], ['Laos', 'Lao'], ['Russia', 'Russian Federation'],
    ['Saint Kitts and Nevis', 'St Kitts and Nevis'], ['Saint Lucia', 'St. Lucia'], ['Gambia', 'The Gambia'], ['Bahamas', 'the bahamas'],
    ['Palestine', 'State of Palestine'], ['China', "People's Republic of China"], ['Taiwan', 'Republic of China'],
  ]
  for (const [c, typed] of pairs) assert.ok(right(c, typed), `${typed} for ${c}`)
})

test('a name in another language, or one that fits two countries, is never an answer', () => {
  assert.equal(right('Germany', 'Deutschland'), false)
  assert.equal(right('Germany', 'Allemagne'), false)
  assert.equal(right('Finland', 'Suomi'), false)
  assert.equal(right('New Zealand', 'Aotearoa'), false)
  for (const c of ['Republic of the Congo', 'DR Congo']) {
    const v = judgeCountry(byName(c), 'Congo', 'Kongo')
    assert.ok(!v.correct && v.vague, c)
    assert.ok(judgeCountry(byName(c), 'Kongo', 'Xyzzy').vague, c)
  }
  for (const c of ['South Korea', 'North Korea']) {
    const v = judgeCountry(byName(c), 'Korea', 'Xyzzy')
    assert.ok(!v.correct && v.vague, c)
  }
})

// Countries a slip could mix up: neither ever counts for the other, and a
// typo counts only when it is nearer the answer than the other country.
const CONFUSABLE = [
  ['Republic of the Congo', 'DR Congo'], ['South Korea', 'North Korea'], ['Guinea', 'Guinea-Bissau'], ['Guinea', 'Equatorial Guinea'],
  ['Guinea-Bissau', 'Equatorial Guinea'], ['Guinea', 'Papua New Guinea'], ['Niger', 'Nigeria'], ['Dominica', 'Dominican Republic'],
  ['Sudan', 'South Sudan'], ['Austria', 'Australia'], ['Iran', 'Iraq'], ['Slovenia', 'Slovakia'], ['Gambia', 'Zambia'],
  ['Iceland', 'Ireland'], ['Libya', 'Liberia'], ['Mauritania', 'Mauritius'], ['Mali', 'Malawi'], ['Latvia', 'Lithuania'],
  ['Switzerland', 'Eswatini'], ['Monaco', 'Morocco'], ['Samoa', 'Somalia'], ['Oman', 'Yemen'], ['Armenia', 'Albania'],
]
const slips = s => {
  const out = new Set()
  for (let i = 0; i < s.length; i++) {
    out.add(s.slice(0, i) + s.slice(i + 1))
    if (i < s.length - 1) out.add(s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2))
    for (const ch of 'aeiou') out.add(s.slice(0, i) + ch + s.slice(i + 1))
  }
  return [...out]
}
test('confusable countries never accept each other, even through a typo', () => {
  for (const [a, b] of CONFUSABLE) {
    for (const [x, y] of [[a, b], [b, a]]) {
      const X = byName(x), Y = byName(y)
      for (const typed of [Y.country, ...(COUNTRY_ALIASES[Y.id] ?? [])]) assert.equal(judgeCountry(X, typed, 'Xyzzy').correct, false, `${typed} for ${x}`)
      for (const typed of slips(Y.country)) {
        if (!judgeCountry(X, typed, 'Xyzzy').correct) continue
        const toX = Math.min(...[...acceptedAnswers(X)].map(f => editDistance(foldName(typed), f)))
        const toY = Math.min(...[...acceptedAnswers(Y)].map(f => editDistance(foldName(typed), f)))
        assert.ok(toX < toY, `${typed} (a slip for ${y}) counted for ${x}`)
      }
    }
  }
  // The other way round, a slip for the answer still counts.
  for (const [c, typed] of [['Nigeria', 'Nigerai'], ['Australia', 'Austrailia'], ['Slovakia', 'Slovakai'], ['Guinea-Bissau', 'Guinea Bisau'],
    ['Dominican Republic', 'Dominican Repulic'], ['Switzerland', 'Swizerland'], ['Equatorial Guinea', 'Equatorial Guiena']]) {
    const v = judgeCountry(byName(c), typed, 'Xyzzy')
    assert.ok(v.correct && v.misspelt, `${typed} for ${c}`)
  }
})

test('typos say how the country is spelled; near misses say so', () => {
  for (const [c, typed] of [['Germany', 'Germnay'], ['Netherlands', 'Netherland'], ['Philippines', 'Phillipines'], ['Kazakhstan', 'Kazakstan']]) {
    const v = judgeCountry(byName(c), typed, 'Xyzzy')
    assert.ok(v.correct && v.misspelt, `${typed} for ${c}`)
  }
  assert.ok(!judgeCountry(byName('Germany'), 'germany', 'Xyzzy').misspelt)
  const near = judgeCountry(byName('Kyrgyzstan'), 'Krgzsn', 'Xyzzy')
  assert.ok(!near.correct && near.near)
  assert.equal(judgeCountry(byName('Germany'), 'France', 'Xyzzy').near, false)
  // Copying the card is never right.
  assert.equal(judgeCountry(byName('Finland'), 'Suomi', 'Suomi').correct, false)
})

// ── Never a free round ────────────────────────────────────────────────────

const MUST_KEEP = [
  ['Allemagne', 'Germany'], ['Niemcy', 'Germany'], ['Saksa', 'Germany'], ['Tyskland', 'Germany'], ['Németország', 'Germany'],
  ['Almanya', 'Germany'], ['Vokietija', 'Germany'], ['Giappone', 'Japan'], ['Китай', 'China'], ['Kreikka', 'Greece'],
  ['Yunanistan', 'Greece'], ['Görögország', 'Greece'], ['Paesi Bassi', 'Netherlands'], ['Nizozemsko', 'Netherlands'],
  ['Sveitsi', 'Switzerland'], ['Ruotsi', 'Sweden'], ['Venäjä', 'Russia'], ['Viro', 'Estonia'], ['Baltkrievija', 'Belarus'],
]
const MUST_DROP = [
  ['Italia', 'Italy'], ['Canadá', 'Canada'], ['Brasil', 'Brazil'], ['Japón', 'Japan'], ['Rusia', 'Russia'], ['Kanada', 'Canada'],
  ['Mexiko', 'Mexico'], ['Austrália', 'Australia'], ['Indien', 'India'], ['Kenia', 'Kenya'], ['Peru', 'Peru'], ['Irlanda', 'Ireland'],
  ['Marokko', 'Morocco'], ['Egipto', 'Egypt'], ['Chile', 'Chile'],
  // Holding the answer, or reading as one of two countries.
  ['Îles Marshall', 'Marshall Islands'], ['Marshallinseln', 'Marshall Islands'], ['Bosna i Hercegovina', 'Bosnia and Herzegovina'],
  ['Santa Lucía', 'Saint Lucia'], ['Vatikanstadt', 'Vatican City'], ['Kongo', 'Republic of the Congo'], ['Corea', 'South Korea'],
]
const shownOf = n => n.roman ?? n.name

test('a name spelled the same or nearly the same as the English is never shown', () => {
  for (const [name, c] of MUST_DROP) assert.ok(looksLikeCountry(byName(c), name), `${name} should be dropped for ${c}`)
  for (const [name, c] of MUST_KEEP) {
    const shown = name === 'Китай' ? R.romaniseRussian(name) : name
    assert.equal(looksLikeCountry(byName(c), shown), false, `${name} should be kept for ${c}`)
  }
})

test("the brief's names are in the game, and the look-alikes aren't", () => {
  for (const [name, c] of MUST_KEEP) assert.ok(named(c, name), `${name} (${c}) is missing`)
  assert.equal(named('China', 'Китай').roman, 'Kitay')
  for (const [name, c] of MUST_DROP) assert.ok(!named(c, name), `${name} (${c}) is in the game`)
})

test('no name is, nearly spells or holds its answer, and copying it is never right', () => {
  for (const n of NAMES) {
    const c = COUNTRIES[n.country]
    assert.equal(looksLikeCountry(c, shownOf(n)), false, `${n.name} for ${c.country}`)
    assert.equal(isCountry(c, n.name), false, `${n.name} for ${c.country}`)
    assert.equal(judgeCountry(c, shownOf(n), shownOf(n)).correct, false, `${shownOf(n)} for ${c.country}`)
    assert.equal(judgeCountry(c, n.name, shownOf(n)).correct, false, `${n.name} for ${c.country}`)
  }
})

test("no name is another country's English name", () => {
  const english = new Map()
  for (const c of LIST) for (const a of [c.country, ...(COUNTRY_ALIASES[c.id] ?? [])]) english.set(squash(a), c.id)
  for (const n of NAMES) {
    const owner = english.get(squash(shownOf(n)))
    assert.ok(!owner || owner === n.country, `${n.name} (${COUNTRIES[n.country].country}) is ${owner}`)
  }
})

test("a country's own languages are left out: those names are Native Names'", () => {
  const own = { DE: ['de'], AT: ['de'], CH: ['de', 'fr', 'it', 'rm'], BE: ['nl', 'fr', 'de'], LU: ['lb', 'fr', 'de'], FI: ['fi', 'sv'],
    ES: ['es', 'ca', 'gl', 'eu'], GB: ['cy', 'ga', 'gd'], IE: ['ga'], NO: ['nb', 'nn'], RU: ['ru'], GR: ['el'], CY: ['el', 'tr'], JP: ['ja'],
    KR: ['ko'], KP: ['ko'], NZ: ['mi'], ZA: ['af', 'xh', 'zu'], BA: ['bs', 'hr', 'sr'], ME: ['sr', 'hr', 'bs', 'sq'], RS: ['sr'] }
  for (const n of NAMES) for (const l of n.langs) assert.ok(!(own[n.country] ?? []).includes(l), `${n.name} is ${n.country}'s own (${l})`)
  for (const name of ['Deutschland', 'Österreich', 'Suomi', 'Sverige', 'Norge', 'Polska', 'Česko', 'Slovensko', 'Hrvatska', 'Srbija', 'Eesti'])
    assert.ok(!NAMES.some(n => n.name === name), `${name} is a native name`)
  // Nor a country's own name as a neighbour spells it.
  for (const nat of NATIVE.NAMES)
    for (const n of NAMES) if (n.country === nat.country) assert.notEqual(squash(shownOf(n)), squash(nat.roman ?? nat.name), `${n.name} for ${n.country}`)
})

// ── Data ──────────────────────────────────────────────────────────────────

test('names are unique and their languages are known', () => {
  const keys = NAMES.map(n => `${n.country}|${n.name}|${n.roman ?? ''}`)
  assert.equal(new Set(keys).size, keys.length)
  for (const n of NAMES) {
    assert.ok(COUNTRIES[n.country], n.country)
    assert.ok(n.langs.length > 0, n.name)
    for (const l of n.langs) assert.ok(LANGUAGES[l], `${n.name}: ${l}`)
    assert.equal(new Set(n.langs).size, n.langs.length, n.name)
    assert.ok([10, 20, 30].includes(n.value), `${n.name}: ${n.value}`)
    assert.ok(n.rank >= 0 && n.rank <= 1, `${n.name}: ${n.rank}`)
  }
  assert.ok(NAMES.length >= 1500, `${NAMES.length} names`)
  assert.ok(new Set(NAMES.map(n => n.country)).size >= 170)
  assert.ok(Object.keys(LANGUAGES).length >= 50)
})

test('every non-Latin name carries its rule-made Latin spelling and is hard; Latin names carry none', () => {
  for (const n of NAMES) {
    if (n.langs.some(l => NON_LATIN_LANGS.has(l))) {
      assert.ok(n.roman && /^[\p{Script=Latin}\s'’\-.]+$/u.test(n.roman), `${n.name} → ${n.roman}`)
      assert.ok(n.langs.every(l => NON_LATIN_LANGS.has(l)), n.name)
      assert.equal(R.ROMANISERS[n.langs[0]](n.name), n.roman, `${n.name} [${n.langs}]`)
      assert.equal(n.tier, 'hard', n.name)
    } else {
      assert.equal(n.roman, undefined, n.name)
      assert.match(n.name, /^[\p{Script=Latin}\s'’ʻʼ\-–.,·()]+$/u, n.name)
    }
  }
})

test('every tier can run full, varied games, and the button samples sit in their tier', () => {
  for (const t of TIERS) {
    const pool = NAMES.filter(n => n.tier === t)
    assert.ok(new Set(pool.map(n => n.country)).size >= 40, `${t}: too few countries`)
    assert.ok(new Set(pool.map(n => n.langs[0])).size >= 8, `${t}: too few languages`)
    const s = COUNTRIES_ABROAD_SAMPLES[t]
    const sample = NAMES.find(n => n.name === s.name)
    assert.equal(sample?.tier, t, `${t} sample ${s.name}`)
    assert.ok(sample.langs.includes(s.lang))
  }
  for (const [name, c] of [['Saksa', 'Germany'], ['Ruotsi', 'Sweden'], ['Viro', 'Estonia'], ['Németország', 'Germany']]) {
    assert.equal(named(c, name).tier, 'hard', name)
    assert.equal(named(c, name).value, 30, name)
  }
})

// ── Rounds ────────────────────────────────────────────────────────────────

test('a game has twelve different countries, languages spread out, gentlest first', () => {
  for (const t of TIERS) {
    for (let seed = 1; seed <= 40; seed++) {
      const rounds = pickCountryRounds(NAMES, t, rng(seed))
      assert.equal(rounds.length, MAX_ROUNDS)
      assert.equal(new Set(rounds.map(r => r.country.id)).size, MAX_ROUNDS, `${t} ${seed}`)
      assert.ok(rounds.every(r => r.entry.tier === t))
      const perLang = {}
      for (const r of rounds) perLang[r.entry.langs[0]] = (perLang[r.entry.langs[0]] ?? 0) + 1
      assert.ok(Math.max(...Object.values(perLang)) <= 2, `${t} ${seed}: ${JSON.stringify(perLang)}`)
      for (let i = 1; i < rounds.length; i++) assert.ok(rounds[i - 1].entry.rank <= rounds[i].entry.rank, `${t} ${seed}: order`)
      if (t === 'hard') assert.ok(rounds.filter(r => r.entry.roman).length <= 5, `${t} ${seed}: too many other scripts`)
    }
  }
})

test('the screen gets rounds that judge, hint and list the region', () => {
  const { field, rounds } = countryRounds(NAMES)
  assert.equal(field, GUESS_FIELD)
  const r = rounds('medium', rng(3))[0]
  assert.equal(r.answer, COUNTRIES[r.entry.country].country)
  assert.equal(r.where, COUNTRIES[r.entry.country].region)
  assert.ok(r.judge(r.answer).correct)
  assert.ok(r.isRight(r.answer))
  assert.equal(r.choices.filter(c => r.isRight(c)).length, 1)
})

test('four choices: four different countries, one right, mostly from the same region', () => {
  const r = rng(7)
  let sameRegion = 0, wrong = 0
  for (const n of NAMES) {
    const c = COUNTRIES[n.country]
    const choices = countryChoices(n, c, r)
    assert.equal(choices.length, 4, n.name)
    assert.equal(new Set(choices.map(foldName)).size, 4, n.name)
    assert.equal(choices.filter(x => isCountry(c, x)).length, 1, `${n.name}: ${choices}`)
    for (const x of choices.filter(x => !isCountry(c, x))) { wrong++; if (byName(x).region === c.region) sameRegion++ }
  }
  assert.ok(sameRegion / wrong >= 0.8, `${sameRegion} of ${wrong} distractors in the same region`)
})

test('scoring and game end follow Cities Abroad: value doubled for typing, halved by a hint; ten right or three strikes', () => {
  assert.equal(TARGET, 10)
  assert.equal(STRIKES, 3)
  assert.equal(roundPoints(30, 'type', true, false), 60)
  assert.equal(roundPoints(30, 'type', true, true), 30)
  assert.equal(roundPoints(20, 'choice', true, true), 10)
  assert.equal(roundPoints(20, 'type', false, false), 0)
  const ok = { correct: true }, no = { correct: false }
  assert.equal(gameState(Array(10).fill(ok)), 'won')
  assert.equal(gameState([no, ok, no, no]), 'out')
  assert.equal(gameState([...Array(9).fill(ok), no, no]), 'playing')
})

test('the hint gives the region and the first letter, never the answer', () => {
  assert.equal(countryHint(byName('Germany')), 'A country in Europe, starting with G')
  assert.equal(countryHint(byName('Jordan')), 'A country in the Middle East, starting with J')
  assert.equal(countryHint(byName('Peru')), 'A country in the Americas, starting with P')
  for (const c of LIST) assert.ok(!foldName(countryHint(c)).includes(foldName(c.country)), c.country)
})

// ── The answer box and the shelf ──────────────────────────────────────────

test('the answer box never mentions a name, so iOS offers no contact AutoFill', () => {
  for (const [k, v] of Object.entries(GUESS_FIELD)) assert.doesNotMatch(String(v), /name/i, `${k}: ${v}`)
  assert.equal(GUESS_FIELD.placeholder, 'Country in English')
  assert.equal(GUESS_FIELD.autoComplete, 'off')
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/AbroadScreen.tsx'), 'utf8')
  const inputs = [...screen.matchAll(/<input\b[\s\S]*?\/>/g)].map(m => m[0])
  assert.equal(inputs.length, 2)
  for (const tag of inputs) assert.doesNotMatch(tag.replace(/className="[^"]*"/g, '').replace(/style=\{\{[\s\S]*?\}\}/g, ''), /name/i, tag)
  for (const f of ['CountriesAbroadScreen.tsx', 'NativeNamesScreen.tsx']) {
    const text = fs.readFileSync(path.join(ROOT, 'src/components', f), 'utf8')
    assert.doesNotMatch(text, /<input\b/, `${f} has its own input`)
  }
})

test('both new games sit next to Cities Abroad on the Sharp Recall shelf, and every count says 55', () => {
  const ids = REGISTRY.map(e => e.id)
  const i = ids.indexOf('citiesabroad')
  assert.deepEqual(ids.slice(i, i + 3), ['citiesabroad', 'countriesabroad', 'nativenames'])
  for (const id of ['countriesabroad', 'nativenames']) {
    const e = REGISTRY.find(x => x.id === id)
    assert.equal(e.group, 'Sharp Recall')
    assert.equal(e.tab, 'play')
    assert.ok(!e.sandbox)
  }
  assert.equal(GAME_COUNT, 55)
  const prerender = fs.readFileSync(path.join(ROOT, 'scripts/prerender.mjs'), 'utf8')
  assert.match(prerender, /countriesabroad: '/)
  assert.match(prerender, /nativenames: '/)
  const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8')
  assert.match(app, /screen === "countriesabroad"/)
  assert.match(app, /screen === "nativenames"/)
})

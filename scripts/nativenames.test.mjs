// Native Names: the owner's names and tiers, the "spelled like the English"
// rule on native names, one name per official language, a Latin spelling for
// every other script, full games in every tier, choices, scoring and the hint.
// (The answer matcher and the answer box are shared with Countries Abroad and
// tested there.)
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { NAMES, LANGUAGES, NON_LATIN_LANGS } = await src('data/nativeNames.ts')
const ABROAD = await src('data/countriesAbroad.ts')
const { foldName, roundPoints, gameState, TIERS, MAX_ROUNDS } = await src('utils/abroad.ts')
const {
  COUNTRIES, judgeCountry, isCountry, looksLikeNative, pickCountryRounds, countryChoices, countryHint, countryRounds,
  NATIVE_NAMES_SAMPLES,
} = await src('utils/countryNames.ts')
const R = await import(path.join(ROOT, 'scripts/cities-abroad/romanise.mjs'))
const T = await import(path.join(ROOT, 'scripts/country-names/native-table.mjs'))

const LIST = Object.values(COUNTRIES)
const byName = name => LIST.find(c => c.country === name) ?? assert.fail(`no country ${name}`)
const find = (country, name) => NAMES.find(n => COUNTRIES[n.country].country === country && (n.name === name || n.roman === name))
const rng = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const shownOf = n => n.roman ?? n.name

// The owner's list: [country, name as written, Latin spelling for other scripts].
const MUST_KEEP = [
  ['Germany', 'Deutschland'], ['Finland', 'Suomi'], ['Hungary', 'Magyarország'], ['Croatia', 'Hrvatska'], ['Albania', 'Shqipëria'],
  ['Poland', 'Polska'], ['Czech Republic', 'Česko'], ['Austria', 'Österreich'], ['Sweden', 'Sverige'], ['Norway', 'Norge'],
  ['Estonia', 'Eesti'], ['Lithuania', 'Lietuva'], ['Montenegro', 'Crna Gora'], ['Slovakia', 'Slovensko'],
  ['Ireland', 'Éire'], ['Greece', 'Ελλάδα', 'Ellada'], ['Russia', 'Россия', 'Rossiya'], ['Georgia', 'საქართველო', 'Sakartvelo'],
  ['Armenia', 'Հայաստան', 'Hayastan'], ['Japan', '日本', 'Nihon'], ['China', '中国', 'Zhongguo'], ['South Korea', '한국', 'Hanguk'],
  ['North Korea', '조선', 'Joseon'], ['India', 'भारत', 'Bharat'], ['Egypt', 'مصر', 'Misr'], ['Morocco', 'المغرب', 'al-Maghrib'],
  ['Thailand', 'ประเทศไทย', 'Prathet Thai'], ['Cambodia', 'កម្ពុជា', 'Kampuchea'],
  ['Bhutan', 'འབྲུག་ཡུལ་', 'Druk Yul'], ['New Zealand', 'Aotearoa'], ['Philippines', 'Pilipinas'], ['Haiti', 'Ayiti'],
  ['Ethiopia', 'ኢትዮጵያ', "Ityop'iya"], ['Somalia', 'Soomaaliya'], ['Mongolia', 'Монгол Улс', 'Mongol Uls'],
  ['Switzerland', 'Schweiz'], ['Switzerland', 'Suisse'], ['Switzerland', 'Svizzera'], ['Switzerland', 'Svizra'],
  ['Belgium', 'Belgique'], ['Belgium', 'Belgien'], ['Luxembourg', 'Lëtzebuerg'], ['Netherlands', 'Nederland'],
]
// Spelled like the English: [country, name as shown (its Latin spelling for other scripts)].
const MUST_DROP = [
  ['Latvia', 'Latvija'], ['Belgium', 'België'], ['Israel', "Yisra'el"],
  ['Italy', 'Italia'], ['France', 'France'], ['Portugal', 'Portugal'], ['Brazil', 'Brasil'], ['Mexico', 'México'], ['Turkey', 'Türkiye'],
  ['Iran', 'Iran'], ['Nepal', 'Nepal'], ['Canada', 'Canada'], ['Vietnam', 'Việt Nam'], ['Laos', 'Lao'], ['Ukraine', 'Ukraina'],
  ['Azerbaijan', 'Azərbaycan'], ['Bulgaria', 'Balgariya'], ['Slovenia', 'Slovenija'], ['Moldova', 'Moldova'], ['Iraq', 'al-Iraq'],
  ['Sudan', 'as-Sudan'], ['Kuwait', 'al-Kuwayt'], ['Bosnia and Herzegovina', 'Bosna i Hercegovina'], ['North Macedonia', 'Makedonija'],
  ['Vatican City', 'Città del Vaticano'], ['Eswatini', 'Umbuso weSwatini'],
]

test("the owner's names are in the game, with their Latin spellings", () => {
  for (const [country, name, roman] of MUST_KEEP) {
    const n = find(country, name)
    assert.ok(n, `${name} (${country}) is missing`)
    if (roman) assert.equal(n.roman, roman, name)
    else assert.equal(n.roman, undefined, name)
  }
})

test('a native name spelled the same or nearly the same as the English is never shown', () => {
  for (const [country, shown] of MUST_DROP) {
    assert.ok(looksLikeNative(byName(country), shown), `${shown} should be dropped for ${country}`)
    assert.ok(!NAMES.some(n => n.country === byName(country).id && foldName(shownOf(n)) === foldName(shown)), `${shown} is in the game`)
  }
  // Close in sound but not in spelling: kept.
  for (const [country, shown] of [['Poland', 'Polska'], ['Russia', 'Rossiya'], ['Somalia', 'Soomaaliya'], ['Philippines', 'Pilipinas'],
    ['Haiti', 'Ayiti'], ['Ethiopia', "Ityop'iya"], ['Spain', 'España'], ['Netherlands', 'Nederland'], ['Belgium', 'Belgien']])
    assert.equal(looksLikeNative(byName(country), shown), false, `${shown} should be kept for ${country}`)
})

test('only the few names kept on purpose fail the look-alike test, and they are easy', () => {
  const kept = NAMES.filter(n => looksLikeNative(COUNTRIES[n.country], shownOf(n)))
  for (const n of kept) {
    assert.ok(T.KEEP_CLOSE.has(`${n.country}:${n.name}`), `${n.name} (${n.country}) looks like its answer`)
    assert.equal(n.tier, 'easy', n.name)
    assert.equal(n.value, 10, n.name)
  }
  assert.deepEqual(kept.map(n => n.roman ?? n.name).sort(), ['Belgique', 'Mongol Uls'].sort())
  for (const n of NAMES) {
    assert.equal(isCountry(COUNTRIES[n.country], n.name), false, n.name)
    assert.equal(judgeCountry(COUNTRIES[n.country], shownOf(n), shownOf(n)).correct, false, n.name)
  }
})

test('one name per official language, and only national ones', () => {
  const seen = new Set()
  for (const n of NAMES) for (const l of n.langs) {
    const k = `${n.country}:${l}`
    assert.ok(!seen.has(k), `two names for ${k}`)
    seen.add(k)
    assert.ok(LANGUAGES[l], `${n.name}: ${l}`)
  }
  const langsOf = code => NAMES.filter(n => n.country === code).flatMap(n => n.langs).sort()
  assert.deepEqual(langsOf('CH'), ['de', 'fr', 'it', 'rm'])
  assert.deepEqual(langsOf('BE'), ['de', 'fr'])     // Dutch "België" is one letter or so from Belgium
  assert.deepEqual(langsOf('ES'), ['es'])           // Catalan, Galician and Basque are regional
  assert.deepEqual(langsOf('SE'), ['sv'])           // Finnish is a minority language there
  assert.deepEqual(langsOf('NO'), ['nb', 'nn'])
  assert.ok(!NAMES.some(n => n.country === 'GB'))   // English, so spelled like the English
  assert.equal(LANGUAGES.tl, 'Filipino')
  assert.equal(LANGUAGES.cnr, 'Montenegrin')
})

test('every name in another script has a Latin spelling: by rule where one exists, else from the checked table', () => {
  const RULE = new Set(['ru', 'uk', 'be', 'bg', 'sr', 'mk', 'el', 'ka', 'hy', 'ko', 'mn'])
  for (const n of NAMES) {
    const latin = /^[\p{Script=Latin}\p{M}\s'’ʻʼ\-–.,·()]+$/u.test(n.name)
    if (latin) { assert.equal(n.roman, undefined, n.name); continue }
    assert.ok(n.roman && /^[\p{Script=Latin}\s'’\-.]+$/u.test(n.roman), `${n.name} has no Latin spelling`)
    assert.ok(n.langs.every(l => NON_LATIN_LANGS.has(l)), n.name)
    const lang = n.langs[0]
    const table = T.NATIVE_ROMAN[`${n.country}:${lang}`]
    if (table) {
      assert.equal(table.text, n.name, `${n.country}:${lang} table`)
      assert.equal(table.roman, n.roman, n.name)
    } else {
      assert.ok(RULE.has(lang), `${n.name} [${lang}]: no rule and no table entry`)
      assert.equal(R.ROMANISERS[lang](n.name), n.roman, n.name)
    }
  }
  assert.equal(R.romaniseMongolian('Монгол Улс'), 'Mongol Uls')
  assert.equal(R.romaniseMongolian('Улаанбаатар'), 'Ulaanbaatar')
  assert.equal(R.romaniseMongolian('Өвөрхангай'), 'Övörkhangai')
})

test("Native Names and Countries Abroad never show the same name for a country", () => {
  for (const n of NAMES) for (const a of ABROAD.NAMES) if (a.country === n.country)
    assert.notEqual(foldName(a.roman ?? a.name) || a.name, foldName(shownOf(n)) || n.name, `${n.name} (${n.country}) is in both`)
})

// ── Tiers ─────────────────────────────────────────────────────────────────

const TIER_OF = {
  easy: ['Deutschland', 'Polska', 'Sverige', 'Norge', 'Nederland', 'España'],
  medium: ['Suomi', 'Hrvatska', 'Österreich', 'Eesti', 'Éire', 'Crna Gora', 'Nihon', 'Zhongguo', 'Rossiya', 'Ellada'],
  hard: ['Magyarország', 'Shqipëria', 'Sakartvelo', 'Hayastan', 'Druk Yul', "Ityop'iya", 'Prathet Thai', 'Kampuchea', 'Misr', 'Aotearoa', 'Joseon', 'Hanguk'],
}
test("the owner's tiers, worth 10, 20 and 30", () => {
  for (const [tier, list] of Object.entries(TIER_OF)) for (const name of list) {
    const n = NAMES.find(x => x.name === name || x.roman === name)
    assert.ok(n, name)
    assert.equal(n.tier, tier, name)
  }
  for (const n of NAMES) assert.equal(n.value, { easy: 10, medium: 20, hard: 30 }[n.tier], n.name)
  for (const t of TIERS) {
    const s = NATIVE_NAMES_SAMPLES[t]
    const sample = NAMES.find(n => n.name === s.name)
    assert.equal(sample?.tier, t, `${t} sample ${s.name}`)
    assert.ok(sample.langs.includes(s.lang))
  }
})

test('every tier runs a full game: twelve different countries, never a repeat, gentlest first', () => {
  for (const t of TIERS) {
    const pool = NAMES.filter(n => n.tier === t)
    assert.ok(new Set(pool.map(n => n.country)).size >= 18, `${t}: ${new Set(pool.map(n => n.country)).size} countries`)
    for (let seed = 1; seed <= 60; seed++) {
      const rounds = pickCountryRounds(NAMES, t, rng(seed), { maxOtherScript: Infinity })
      assert.equal(rounds.length, MAX_ROUNDS, `${t} ${seed}`)
      assert.equal(new Set(rounds.map(r => r.country.id)).size, MAX_ROUNDS, `${t} ${seed}`)
      assert.ok(rounds.every(r => r.entry.tier === t))
      for (let i = 1; i < rounds.length; i++) assert.ok(rounds[i - 1].entry.rank <= rounds[i].entry.rank, `${t} ${seed}: order`)
    }
  }
})

test('games vary: forty games of a tier see most of its countries', () => {
  for (const t of TIERS) {
    const seen = new Set()
    for (let seed = 1; seed <= 40; seed++) for (const r of pickCountryRounds(NAMES, t, rng(seed), { maxOtherScript: Infinity })) seen.add(r.country.id)
    const pool = new Set(NAMES.filter(n => n.tier === t).map(n => n.country))
    assert.ok(seen.size >= pool.size * 0.8, `${t}: ${seen.size} of ${pool.size}`)
  }
})

test('four choices: four different countries, exactly one right', () => {
  const r = rng(11)
  for (const n of NAMES) {
    const c = COUNTRIES[n.country]
    const choices = countryChoices(n, c, r)
    assert.equal(new Set(choices.map(foldName)).size, 4, n.name)
    assert.equal(choices.filter(x => isCountry(c, x)).length, 1, `${n.name}: ${choices}`)
  }
})

test('rounds for the screen: hint, region, scoring', () => {
  const { rounds } = countryRounds(NAMES, { maxOtherScript: Infinity })
  for (const r of rounds('hard', rng(5))) {
    assert.equal(r.hint, countryHint(COUNTRIES[r.entry.country]))
    assert.match(r.hint, /^A country in .+, starting with [A-Z]$/)
    assert.ok(r.judge(r.answer).correct)
  }
  assert.equal(roundPoints(30, 'type', true, true), 30)
  assert.equal(gameState([{ correct: false }, { correct: false }, { correct: false }]), 'out')
})

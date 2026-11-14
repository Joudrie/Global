// Cities Abroad: the answer matcher, the "spelled like the English" rule, the
// generated names and their tiers and values, round building, scoring, the
// Latin spellings and the iOS-safe answer box.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { FLAGS } = await src('data/flags.ts')
const { CAPITALS } = await src('data/capitals.ts')
const { NO_CAPITAL_TILE } = await src('utils/connectionsTiles.ts')
const { ABROAD_CITIES, ABROAD_NAMES, ABROAD_LANGUAGES, NON_LATIN_LANGS } = await src('data/citiesAbroad.ts')
const {
  foldName, acceptedAnswers, looksLikeAnswer, judgeAnswer, isCity, slugOf, pickRounds, choicesFor, roundPoints, gameState,
  hintFor, listLanguages, typoAllowance, TIERS, TIER_SAMPLES, TARGET, STRIKES, MAX_ROUNDS, GUESS_FIELD,
} = await src('utils/citiesAbroad.ts')
const R = await import(path.join(ROOT, 'scripts/cities-abroad/romanise.mjs'))

const CITY_LIST = Object.values(ABROAD_CITIES)
// A city by English name, from the data or made up for the matcher tests.
const city = name => CITY_LIST.find(c => c.city === name) ?? { id: slugOf(name), city: name }
const right = (name, typed) => acceptedAnswers(city(name)).has(foldName(typed))
const judge = (name, typed, shown = 'Xyzzy') => judgeAnswer(city(name), typed, shown, CITY_LIST)
const named = (cityName, name) => ABROAD_NAMES.find(n => ABROAD_CITIES[n.city].city === cityName && n.name === name)

// A seeded generator so the round tests are repeatable.
const rng = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// ── Matching ──────────────────────────────────────────────────────────────

test('typed answers ignore case, accents, punctuation, hyphens, "the" and "city"', () => {
  assert.ok(right('Warsaw', '  WARSAW '))
  assert.ok(right('Reykjavik', 'Reykjavík'))
  assert.ok(right('Kraków', 'krakow'))
  assert.ok(right('Gothenburg', 'gothenburg'))
  assert.ok(right('Port-au-Prince', 'port au prince'))
  assert.ok(right('Kuwait City', 'Kuwait'))
  assert.ok(right('The Hague', 'the hague'))
  assert.ok(right('Saint Petersburg', 'St. Petersburg'))
  assert.ok(right('Saint Petersburg', 'st petersburg'))
})

test('common English alternatives count', () => {
  const pairs = [
    ['Thessaloniki', 'Saloniki'], ['Thessaloniki', 'Salonica'], ['Saint Petersburg', 'Petersburg'], ['Kyiv', 'Kiev'],
    ['Beijing', 'Peking'], ['Mumbai', 'Bombay'], ['Kolkata', 'Calcutta'], ['Chennai', 'Madras'], ['Ho Chi Minh City', 'Saigon'],
    ['Yangon', 'Rangoon'], ['The Hague', 'Hague'], ['Washington, D.C.', 'Washington'], ['Washington, D.C.', 'DC'],
    ['New York', 'NYC'], ['New York', 'New York City'], ['Los Angeles', 'LA'], ['Mexico City', 'Mexico'], ['Mexico City', 'Mexico City'],
  ]
  for (const [c, typed] of pairs) assert.ok(right(c, typed), `${typed} for ${c}`)
})

test('wrong answers stay wrong', () => {
  assert.equal(right('Warsaw', ''), false)
  assert.equal(right('Warsaw', 'Varsovia'), false)
  assert.equal(right('Vienna', 'Wien'), false)
  assert.equal(right('New Delhi', 'Delhi'), false)
  assert.equal(right('Munich', 'München'), false)   // a name in another language is never an answer
  assert.equal(judge('Geneva', 'Genoa').correct, false)
})

// ── Never a free round ────────────────────────────────────────────────────

const MUST_DROP = [
  ['Havanna', 'Havana'], ['Berlino', 'Berlin'], ['Roma', 'Rome'], ['Lisboa', 'Lisbon'], ['Kopenhagen', 'Copenhagen'],
  ['Singapur', 'Singapore'], ['Parijs', 'Paris'], ['Prag', 'Prague'], ['Neu-Delhi', 'New Delhi'], ['Taipé', 'Taipei'],
  ['Riyad', 'Riyadh'], ['Kairo', 'Cairo'], ['Bukarest', 'Bucharest'], ['Tokio', 'Tokyo'], ['Seúl', 'Seoul'],
  ['Kiew', 'Kyiv'], ['Amsterdã', 'Amsterdam'],
]
const MUST_KEEP = [
  ['Wien', 'Vienna'], ['Moskau', 'Moscow'], ['Londres', 'London'], ['Varsovia', 'Warsaw'], ['Monaco di Baviera', 'Munich'],
  ['Selanik', 'Thessaloniki'], ['Benetke', 'Venice'], ['Kaupmannahöfn', 'Copenhagen'], ['iKapa', 'Cape Town'],
  ['Pietari', 'Saint Petersburg'], ['Bécs', 'Vienna'], ['Dunaj', 'Vienna'], ['Lontoo', 'London'], ['Tukholma', 'Stockholm'],
  ['Kööpenhamina', 'Copenhagen'], ['Mailand', 'Milan'], ['Lipsia', 'Leipzig'],
]

test('a name spelled the same or nearly the same as the English is never shown', () => {
  for (const [name, english] of MUST_DROP) assert.ok(looksLikeAnswer(city(english), name), `${name} should be dropped for ${english}`)
  for (const [name, english] of MUST_KEEP) assert.equal(looksLikeAnswer(city(english), name), false, `${name} should be kept for ${english}`)
})

test('the names from the brief are in the game', () => {
  for (const [name, english] of MUST_KEEP) assert.ok(named(english, name), `${name} (${english}) is missing`)
  for (const [name, english] of MUST_DROP) assert.ok(!named(english, name), `${name} (${english}) is in the game`)
})

test('no name is, contains, nearly spells or copies into an answer', () => {
  for (const n of ABROAD_NAMES) {
    const c = ABROAD_CITIES[n.city]
    const shown = n.roman ?? n.name
    assert.equal(looksLikeAnswer(c, shown), false, `${n.name} for ${c.city}`)
    assert.equal(isCity(c, n.name), false, `${n.name} for ${c.city}`)
    // Typing what the card says is never right.
    assert.equal(judgeAnswer(c, shown, shown, CITY_LIST).correct, false, `${shown} for ${c.city}`)
    assert.equal(judgeAnswer(c, n.name, shown, CITY_LIST).correct, false, `${n.name} for ${c.city}`)
  }
})

test("no name is another place's English name", () => {
  const english = new Map()
  const add = (n, owner) => { if (n) english.set(foldName(n), [...(english.get(foldName(n)) ?? []), owner]) }
  for (const c of CAPITALS) { add(c.capital, c.code); add(c.country, c.code) }
  for (const f of FLAGS) add(f.name, f.code)
  for (const c of CITY_LIST) add(c.city, c.id)
  for (const n of ABROAD_NAMES) {
    const c = ABROAD_CITIES[n.city]
    const owners = english.get(foldName(n.roman ?? n.name))
    assert.ok(!owners || owners.includes(c.id) || owners.includes(c.code), `${n.name} (${c.city}) is ${owners}`)
  }
})

// ── Forgiving spelling ────────────────────────────────────────────────────

test('typos scaled to length count, and say how the city is spelled', () => {
  assert.deepEqual([3, 4, 5, 6, 9, 10, 15].map(typoAllowance), [0, 1, 1, 2, 2, 3, 3])
  for (const [c, typed] of [['Thessaloniki', 'Thesaloniki'], ['Thessaloniki', 'Thessalonki'], ['Copenhagen', 'Copenhagan'],
    ['Saint Petersburg', 'Saint Petersberg'], ['Munich', 'Munnich'], ['Vienna', 'Viena'], ['Rome', 'Roem'], ['Bucharest', 'Bucarest']]) {
    const v = judge(c, typed)
    assert.ok(v.correct && v.misspelt, `${typed} for ${c}`)
  }
  const exact = judge('Vienna', 'vienna')
  assert.ok(exact.correct && !exact.misspelt)
})

test('a typo that is as close to another city, or copies the card, does not count', () => {
  assert.equal(judge('Munich', 'Munik').correct, false)          // as close to Tunis
  assert.equal(judge('Geneva', 'Genoa').correct, false)          // Genoa is a city in the game
  assert.equal(judge('Genoa', 'Geneva').correct, false)
  assert.equal(judge('London', 'Lontoo', 'Lontoo').correct, false) // the Finnish name on the card
  assert.equal(judge('London', 'Londoo', 'Lontoo').correct, false) // as close to the card as to London
  assert.equal(judge('Vienna', 'Wien', 'Wien').correct, false)
  assert.equal(judge('Bern', 'Bonn').correct, false)
})

test('close but wrong is a near miss; far off is just wrong', () => {
  const near = judge('Copenhagen', 'Kopnhagn')
  assert.ok(!near.correct || near.misspelt)
  const v = judge('Munich', 'Mnchn')
  assert.equal(v.correct, false)
  assert.equal(v.near, true)
  assert.equal(judge('Munich', 'Paris').near, false)
  assert.equal(judge('Geneva', 'Genoa').near, false)              // another real city, not a slip
  assert.equal(judge('London', 'Lontoo', 'Lontoo').near, false)   // the card itself
})

// ── Data ──────────────────────────────────────────────────────────────────

test('every city has its country from FLAGS; capitals match capitals.ts; split and disputed capitals are not capitals', () => {
  const flag = new Map(FLAGS.map(f => [f.code, f]))
  for (const c of CITY_LIST) {
    assert.equal(c.id, slugOf(c.city), c.city)
    if (c.code === '') {
      assert.match(c.country, / \/ /, `${c.city}: a disputed city names both countries`)
      assert.equal(c.capital, false, c.city)
      continue
    }
    assert.ok(flag.has(c.code), `${c.city}: ${c.code}`)
    assert.equal(c.country, flag.get(c.code).name, c.city)
    assert.equal(c.region, flag.get(c.code).region, c.city)
    if (c.capital) {
      const base = CAPITALS.find(x => x.code === c.code)
      assert.equal(foldName(c.city), foldName(base.capital), c.city)
      assert.ok(!NO_CAPITAL_TILE.has(c.code), `${c.city} is a split or disputed capital`)
    }
  }
  for (const n of ABROAD_NAMES) assert.ok(ABROAD_CITIES[n.city], `${n.name}: no city ${n.city}`)
  assert.equal(new Set(CITY_LIST.map(c => foldName(c.city))).size, CITY_LIST.length, 'two cities share an English name')
})

test('the brief\'s famous cities are in, capitals and not', () => {
  for (const c of ['New York', 'Istanbul', 'Saint Petersburg', 'Munich', 'Venice', 'Milan', 'Florence', 'Naples', 'Cologne',
    'Thessaloniki', 'Cape Town', 'Johannesburg', 'Geneva', 'Zurich', 'Antwerp', 'The Hague', 'Kraków', 'Lviv', 'Seville',
    'Marseille', 'Nice', 'Hamburg', 'Nuremberg', 'Leipzig', 'Alexandria', 'Jerusalem', 'Mecca', 'Shanghai', 'Hong Kong',
    'Sydney', 'Los Angeles', 'Chicago', 'New Orleans', 'Montreal', 'São Paulo']) {
    assert.ok(CITY_LIST.some(x => x.city === c), `${c} is missing`)
  }
  assert.ok(CITY_LIST.length >= 300 && CITY_LIST.length <= 500, `${CITY_LIST.length} cities`)
  assert.ok(CITY_LIST.filter(c => !c.capital).length >= 150)
})

test('names are unique and their languages are known', () => {
  const keys = ABROAD_NAMES.map(n => `${n.city}|${n.name}|${n.roman ?? ''}`)
  assert.equal(new Set(keys).size, keys.length)
  for (const n of ABROAD_NAMES) {
    assert.ok(n.langs.length > 0, n.name)
    for (const l of n.langs) assert.ok(ABROAD_LANGUAGES[l], `${n.name}: ${l}`)
    assert.equal(new Set(n.langs).size, n.langs.length, n.name)
    assert.ok([10, 20, 30].includes(n.value), `${n.name}: ${n.value}`)
    assert.ok(n.rank >= 0 && n.rank <= 1, `${n.name}: ${n.rank}`)
  }
  assert.ok(Object.keys(ABROAD_LANGUAGES).length >= 40)
})

test('non-Latin names carry a Latin spelling and are hard; Latin names carry none', () => {
  for (const n of ABROAD_NAMES) {
    if (n.langs.some(l => NON_LATIN_LANGS.has(l))) {
      assert.ok(n.roman && /^[\p{Script=Latin}\s'’\-.]+$/u.test(n.roman), `${n.name} → ${n.roman}`)
      assert.ok(n.langs.every(l => NON_LATIN_LANGS.has(l)), n.name)
      assert.equal(n.tier, 'hard', n.name)
    } else {
      assert.equal(n.roman, undefined, n.name)
      assert.match(n.name, /^[\p{Script=Latin}\s'’ʻʼ\-–.,·()]+$/u, n.name)
    }
  }
})

test('every tier has a varied pool, and the brief\'s examples sit where it put them', () => {
  for (const t of TIERS) {
    const pool = ABROAD_NAMES.filter(n => n.tier === t)
    assert.ok(pool.length >= 100, `${t}: ${pool.length} names`)
    assert.ok(new Set(pool.map(n => n.city)).size >= 60, `${t}: too few cities`)
    assert.ok(new Set(pool.map(n => n.langs[0])).size >= 8, `${t}: too few languages`)
    const sample = named(null, TIER_SAMPLES[t].name) ?? ABROAD_NAMES.find(n => n.name === TIER_SAMPLES[t].name)
    assert.equal(sample?.tier, t, `${t} sample ${TIER_SAMPLES[t].name}`)
    assert.ok(sample.langs.includes(TIER_SAMPLES[t].lang))
  }
  const tier = (c, name) => named(c, name)?.tier
  for (const [name, c] of [['Wien', 'Vienna'], ['Moskau', 'Moscow'], ['Londres', 'London']]) assert.equal(tier(c, name), 'easy', name)
  for (const [name, c] of [['Varsovia', 'Warsaw'], ['Monaco di Baviera', 'Munich'], ['Venedig', 'Venice'], ['Mailand', 'Milan']]) assert.equal(tier(c, name), 'medium', name)
  for (const [name, c] of [['Benetke', 'Venice'], ['Selanik', 'Thessaloniki'], ['Kaupmannahöfn', 'Copenhagen'], ['iKapa', 'Cape Town'],
    ['Pietari', 'Saint Petersburg'], ['Bécs', 'Vienna'], ['Москва', 'Moscow']]) assert.equal(tier(c, name), 'hard', name)
})

test('odder names are worth more', () => {
  for (const [name, c] of [['Kaupmannahöfn', 'Copenhagen'], ['iKapa', 'Cape Town'], ['Pietari', 'Saint Petersburg'], ['Bécs', 'Vienna']]) {
    assert.equal(named(c, name).value, 30, name)
  }
  for (const [name, c] of [['Wien', 'Vienna'], ['Londres', 'London']]) assert.equal(named(c, name).value, 10, name)
  for (const t of TIERS) {
    const values = new Set(ABROAD_NAMES.filter(n => n.tier === t).map(n => n.value))
    assert.ok(values.has(10) && values.has(20), `${t}: ${[...values]}`)
  }
})

// ── Rounds ────────────────────────────────────────────────────────────────

test('a game has twelve different cities, languages spread out, gentlest first', () => {
  assert.equal(MAX_ROUNDS, 12)
  for (const t of TIERS) {
    for (let seed = 1; seed <= 40; seed++) {
      const rounds = pickRounds(ABROAD_NAMES, ABROAD_CITIES, t, rng(seed))
      assert.equal(rounds.length, MAX_ROUNDS)
      assert.equal(new Set(rounds.map(r => r.city.id)).size, MAX_ROUNDS, `${t} ${seed}`)
      assert.ok(rounds.every(r => r.entry.tier === t))
      const perLang = {}
      for (const r of rounds) perLang[r.entry.langs[0]] = (perLang[r.entry.langs[0]] ?? 0) + 1
      assert.ok(Math.max(...Object.values(perLang)) <= 2, `${t} ${seed}: ${JSON.stringify(perLang)}`)
      for (let i = 1; i < rounds.length; i++) assert.ok(rounds[i - 1].entry.rank <= rounds[i].entry.rank, `${t} ${seed}: order`)
      if (t === 'hard') assert.ok(rounds.filter(r => r.entry.roman).length <= 5, `${t} ${seed}: too many other scripts`)
    }
  }
})

test('games vary: forty games of a tier see most of its cities', () => {
  for (const t of TIERS) {
    const seen = new Set()
    for (let seed = 1; seed <= 40; seed++) for (const r of pickRounds(ABROAD_NAMES, ABROAD_CITIES, t, rng(seed))) seen.add(r.city.id)
    const pool = new Set(ABROAD_NAMES.filter(n => n.tier === t).map(n => n.city))
    assert.ok(seen.size >= Math.min(60, pool.size * 0.5), `${t}: ${seen.size} of ${pool.size}`)
  }
})

test('four choices: four different cities, exactly one right', () => {
  const r = rng(7)
  for (const n of ABROAD_NAMES) {
    const c = ABROAD_CITIES[n.city]
    const choices = choicesFor(n, c, CITY_LIST, r)
    assert.equal(choices.length, 4, n.name)
    assert.equal(new Set(choices.map(foldName)).size, 4, n.name)
    assert.equal(choices.filter(x => isCity(c, x)).length, 1, `${n.name}: ${choices}`)
  }
})

test('scoring: the value, doubled for typing, halved by a hint', () => {
  assert.equal(roundPoints(10, 'type', true, false), 20)
  assert.equal(roundPoints(30, 'type', true, false), 60)
  assert.equal(roundPoints(30, 'type', true, true), 30)
  assert.equal(roundPoints(20, 'choice', true, false), 20)
  assert.equal(roundPoints(20, 'choice', true, true), 10)
  assert.equal(roundPoints(30, 'type', false, false), 0)
})

test('ten right wins, three strikes ends it', () => {
  const ok = { correct: true }, no = { correct: false }
  assert.equal(TARGET, 10)
  assert.equal(STRIKES, 3)
  assert.equal(gameState([]), 'playing')
  assert.equal(gameState(Array(9).fill(ok)), 'playing')
  assert.equal(gameState(Array(10).fill(ok)), 'won')
  assert.equal(gameState([...Array(9).fill(ok), no, no, ok]), 'won')
  assert.equal(gameState([no, ok, no]), 'playing')
  assert.equal(gameState([no, ok, no, no]), 'out')
  assert.equal(gameState([...Array(9).fill(ok), no, no, no]), 'out')
})

test('the hint never spells out the answer', () => {
  for (const c of CITY_LIST) {
    const h = hintFor(c)
    assert.ok(!foldName(h).includes(foldName(c.city)) || foldName(c.city).length < 3, `${c.city}: ${h}`)
  }
  assert.equal(hintFor(city('Warsaw')), 'The capital of Poland')
  assert.equal(hintFor(city('Munich')), 'A city in Germany')
  assert.match(hintFor(city('Kuwait City')), /^A capital in Middle East, starting with K$/)
  assert.match(hintFor(city('Jerusalem')), /^A city in Middle East, starting with J$/)
})

test('language lists read naturally', () => {
  const names = { es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German' }
  assert.equal(listLanguages(['es'], names), 'Spanish')
  assert.equal(listLanguages(['es', 'fr'], names), 'Spanish and French')
  assert.equal(listLanguages(['es', 'fr', 'pt'], names), 'Spanish, French and Portuguese')
  assert.equal(listLanguages(['es', 'fr', 'pt', 'it', 'de'], names, 3), 'Spanish, French, Portuguese and 2 more')
})

// ── Latin spellings ───────────────────────────────────────────────────────

test('Latin spellings follow each language\'s standard system', () => {
  const cases = {
    romaniseRussian: [['Москва', 'Moskva'], ['Ереван', 'Yerevan'], ['Кишинёв', 'Kishinyov'], ['Пхеньян', 'Pkhenyan']],
    romaniseUkrainian: [['Київ', 'Kyiv'], ['Відень', 'Viden'], ['Єреван', 'Yerevan'], ['Згурівка', 'Zghurivka']],
    romaniseBelarusian: [['Масква', 'Maskva'], ['Вільня', 'Vilnya'], ['Еўропа', 'Yewropa'], ['Лёндан', 'Lyondan']],
    romaniseBulgarian: [['София', 'Sofia'], ['Солун', 'Solun'], ['Щутгарт', 'Shtutgart'], ['Букурещ', 'Bukuresht']],
    romaniseSerbian: [['Беч', 'Beč'], ['Љубљана', 'Ljubljana'], ['Ђенова', 'Đenova'], ['Џакарта', 'Džakarta']],
    romaniseMacedonian: [['Ѓенова', 'Ǵenova'], ['Ќустендил', 'Ḱustendil'], ['Ѕвездан', 'Dzvezdan']],
    romaniseGreek: [['Αθήνα', 'Athina'], ['Βαρσοβία', 'Varsovia'], ['Μπακού', 'Bakou'], ['Ριάντ', 'Riad'], ['Σεντ Τζονς', 'Sent Tzons'], ['Ευρώπη', 'Evropi']],
    romaniseGeorgian: [['თბილისი', 'Tbilisi'], ['ქუთაისი', 'Kutaisi'], ['სტამბოლი', 'Stamboli'], ['წყალტუბო', 'Tsqaltubo']],
    romaniseArmenian: [['Երևան', 'Yerevan'], ['Մոսկվա', 'Moskva'], ['Վենետիկ', 'Venetik'], ['Ոսկե', 'Voske']],
    // Revised Romanization with its sound changes: ㄹㄹ is ll, ㄴㄹ is ll, ㅇ + ㄹ is n, ㄱ + ㅁ is ngm, liaison.
    romaniseKorean: [['모스크바', 'Moseukeuba'], ['베를린', 'Bereullin'], ['신라', 'Silla'], ['종로', 'Jongno'], ['백마', 'Baengma'], ['독일', 'Dogil'], ['평양', 'Pyeongyang']],
    romaniseJapanese: [['ウィーン', 'Wīn'], ['ニューヨーク', 'Nyūyōku'], ['ピョンヤン', "Pyon'yan"], ['ミュンヘン', 'Myunhen'], ['カップ', 'Kappu'], ['ヴェネツィア', 'Venetsia']],
  }
  for (const [fn, pairs] of Object.entries(cases)) for (const [a, b] of pairs) assert.equal(R[fn](a), b, `${fn}(${a})`)
  assert.ok(R.isKatakana('ウィーン') && !R.isKatakana('東京'))
  for (const n of ABROAD_NAMES.filter(x => x.roman)) assert.equal(R.ROMANISERS[n.langs[0]](n.name), n.roman, `${n.name} [${n.langs}]`)
})

// ── The answer box ────────────────────────────────────────────────────────

test('the answer box never mentions a name, so iOS offers no contact AutoFill', () => {
  for (const [k, v] of Object.entries(GUESS_FIELD)) assert.doesNotMatch(String(v), /name/i, `${k}: ${v}`)
  assert.equal(GUESS_FIELD.autoComplete, 'off')
  assert.equal(GUESS_FIELD.autoCorrect, 'off')
  assert.equal(GUESS_FIELD.spellCheck, false)
  // Every <input> on the screen (the answer box and the keyboard stand-in),
  // read from the source: no attribute mentions a name, and none has one.
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/CitiesAbroadScreen.tsx'), 'utf8')
  const inputs = [...screen.matchAll(/<input\b[\s\S]*?\/>/g)].map(m => m[0])
  assert.equal(inputs.length, 2)
  for (const tag of inputs) {
    const attrs = tag.replace(/className="[^"]*"/g, '').replace(/style=\{\{[\s\S]*?\}\}/g, '')
    assert.doesNotMatch(attrs, /name/i, tag)
    assert.match(attrs, /autoComplete=/, tag)
  }
  const labels = [...screen.matchAll(/<label\b[\s\S]*?<\/label>/g)].map(m => m[0])
  for (const l of labels) assert.doesNotMatch(l, /name/i, l)
})

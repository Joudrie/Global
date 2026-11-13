// Capitals Abroad: the answer matcher, the generated names and their tiers,
// round building, scoring and the Cyrillic and Greek spellings.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { FLAGS } = await src('data/flags.ts')
const { CAPITALS } = await src('data/capitals.ts')
const { NO_CAPITAL_TILE } = await src('utils/connectionsTiles.ts')
const { ABROAD_CAPITALS, ABROAD_NAMES, ABROAD_LANGUAGES, NON_LATIN_LANGS } = await src('data/capitalsAbroad.ts')
const { foldName, isCorrectAnswer, isNearMiss, acceptedAnswers, pickRounds, choicesFor, roundPoints, maxScore, hintFor, listLanguages, TIERS, ROUNDS } = await src('utils/capitalsAbroad.ts')
const { romaniseRussian, romaniseUkrainian, romaniseGreek } = await import(path.join(ROOT, 'scripts/capitals-abroad/romanise.mjs'))

const cap = code => ABROAD_CAPITALS[code] ?? (() => { const c = CAPITALS.find(x => x.code === code); return { code, capital: c.capital } })()
const right = (code, typed) => isCorrectAnswer(cap(code), typed)

// A seeded generator so the round tests are repeatable.
const rng = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

test('typed answers ignore case, accents, punctuation, hyphens and "city"', () => {
  assert.ok(right('PL', 'warsaw'))
  assert.ok(right('PL', '  WARSAW '))
  assert.ok(right('IS', 'Reykjavik'))
  assert.ok(right('IS', 'Reykjavík'))
  assert.ok(right('CO', 'bogota'))
  assert.ok(right('CM', 'Yaounde'))
  assert.ok(right('TD', 'Ndjamena'))
  assert.ok(right('TD', "N’Djamena"))
  assert.ok(right('HT', 'port au prince'))
  assert.ok(right('TT', 'Port-of-Spain'))
  assert.ok(right('KW', 'Kuwait'))
  assert.ok(right('KW', 'kuwait city'))
  assert.ok(right('VA', 'Vatican'))
  assert.ok(right('LU', 'Luxembourg'))
  assert.ok(right('AG', "St. John's"))
  assert.ok(right('AG', 'saint johns'))
  assert.ok(right('GD', "St George's"))
  assert.ok(right('YE', "Sana'a"))
  assert.ok(right('TO', 'Nuku’alofa'))
})

test('common English alternatives count', () => {
  assert.ok(right('US', 'Washington'))
  assert.ok(right('US', 'Washington DC'))
  assert.ok(right('US', 'washington, d.c.'))
  assert.ok(right('UA', 'Kyiv'))
  assert.ok(right('UA', 'Kiev'))
  assert.ok(right('MX', 'Mexico City'))
  assert.ok(right('MX', 'Mexico'))
  assert.ok(right('MN', 'Ulan Bator'))
  assert.ok(right('NP', 'Katmandu'))
  assert.ok(right('MM', 'Nay Pyi Taw'))
})

test('wrong answers stay wrong', () => {
  assert.equal(right('PL', ''), false)
  assert.equal(right('PL', 'Varsovia'), false)
  assert.equal(right('CN', 'Peking'), false)       // the old English name is a round, not an answer
  assert.equal(right('IN', 'Delhi'), false)        // New Delhi is the capital
  assert.equal(right('UA', 'Kiew'), false)
  assert.equal(right('AT', 'Wien'), false)
  assert.equal(right('IT', 'Roma'), false)
  assert.equal(right('ZA', 'Kiev'), false)
})

test('a letter or two off is a near miss, still wrong', () => {
  assert.ok(isNearMiss(cap('DK'), 'Copenhagan'))
  assert.ok(isNearMiss(cap('DK'), 'Kopenhagen'))
  assert.ok(isNearMiss(cap('BF'), 'Ouagadougo'))
  assert.equal(isNearMiss(cap('DK'), 'Copenhagen'), false)
  assert.equal(isNearMiss(cap('IT'), 'Paris'), false)
  assert.equal(isNearMiss(cap('IT'), 'Rom'), false)     // too short to call
})

// ── Data ──────────────────────────────────────────────────────────────────

test('every name belongs to a country in FLAGS with its capitals.ts capital', () => {
  const flagName = new Map(FLAGS.map(f => [f.code, f.name]))
  for (const c of Object.values(ABROAD_CAPITALS)) {
    assert.equal(c.country, flagName.get(c.code), c.code)
    const base = CAPITALS.find(x => x.code === c.code)
    assert.ok(base, `${c.code} is not in capitals.ts`)
    assert.equal(foldName(c.capital), foldName(base.capital), c.code)
    assert.equal(c.region, base.region, c.code)
  }
  for (const n of ABROAD_NAMES) assert.ok(ABROAD_CAPITALS[n.code], `${n.code} ${n.name} has no capital`)
})

test('split and disputed capitals are left out', () => {
  for (const code of NO_CAPITAL_TILE) assert.ok(!ABROAD_CAPITALS[code], code)
  for (const code of ['GQ', 'NR']) assert.ok(!ABROAD_CAPITALS[code], code)
})

test('no free rounds: no name is, contains or spells out an accepted answer', () => {
  for (const n of ABROAD_NAMES) {
    const c = ABROAD_CAPITALS[n.code]
    const shown = n.roman ?? n.name
    assert.equal(isCorrectAnswer(c, n.name), false, `${n.code} ${n.name}`)
    assert.equal(isCorrectAnswer(c, shown), false, `${n.code} ${shown}`)
    assert.notEqual(foldName(shown), foldName(c.capital), `${n.code} ${shown}`)
  }
})

test('no name is another country\'s or capital\'s English name', () => {
  const english = new Map()
  for (const c of [...CAPITALS, ...FLAGS.map(f => ({ code: f.code, country: f.name }))]) for (const n of [c.capital, c.country]) {
    if (n) english.set(foldName(n), [...(english.get(foldName(n)) ?? []), c.code])
  }
  for (const n of ABROAD_NAMES) {
    const owners = english.get(foldName(n.roman ?? n.name))
    assert.ok(!owners || owners.includes(n.code), `${n.code} ${n.name} is ${owners}`)
  }
  assert.ok(!ABROAD_NAMES.some(n => n.code === 'SS' && n.name === 'Cuba'))
  assert.ok(!ABROAD_NAMES.some(n => n.code === 'AG' && n.name === 'São João'))
})

test('names are unique and their languages are known', () => {
  const keys = ABROAD_NAMES.map(n => `${n.code}|${n.name}|${n.roman ?? ''}`)
  assert.equal(new Set(keys).size, keys.length)
  for (const n of ABROAD_NAMES) {
    assert.ok(n.langs.length > 0, n.name)
    for (const l of n.langs) assert.ok(ABROAD_LANGUAGES[l], `${n.name}: ${l}`)
    assert.equal(new Set(n.langs).size, n.langs.length, n.name)
  }
})

test('non-Latin names carry a Latin spelling and are hard; Latin names carry none', () => {
  for (const n of ABROAD_NAMES) {
    const nonLatin = n.langs.some(l => NON_LATIN_LANGS.has(l))
    if (nonLatin) {
      assert.ok(n.roman && /^[\p{Script=Latin}\s'’\-.]+$/u.test(n.roman), `${n.name} → ${n.roman}`)
      assert.ok(n.langs.every(l => NON_LATIN_LANGS.has(l)), n.name)
      assert.equal(n.tier, 'hard', n.name)
    } else {
      assert.equal(n.roman, undefined, n.name)
      assert.match(n.name, /^[\p{Script=Latin}\s'’\-.·]+$/u, n.name)
    }
  }
})

test('every tier has a healthy pool, and the brief\'s examples sit where it put them', () => {
  for (const t of TIERS) {
    const pool = ABROAD_NAMES.filter(n => n.tier === t)
    assert.ok(pool.length >= 100, `${t}: ${pool.length} names`)
    assert.ok(new Set(pool.map(n => n.code)).size >= 50, `${t}: too few capitals`)
  }
  const tier = (code, name) => ABROAD_NAMES.find(n => n.code === code && n.name === name)?.tier
  assert.equal(tier('IT', 'Roma'), 'easy')
  assert.equal(tier('PT', 'Lisboa'), 'easy')
  assert.equal(tier('GR', 'Atenas'), 'easy')
  assert.equal(tier('GB', 'Londres'), 'medium')
  assert.equal(tier('AT', 'Viena'), 'medium')
  assert.equal(tier('CN', 'Pekín'), 'medium')
  assert.equal(tier('DE', 'Berlino'), 'easy')
  assert.equal(tier('RU', 'Moskau'), 'medium')
  assert.equal(tier('PL', 'Varsovia'), 'hard')
  assert.equal(tier('RU', 'Москва'), 'hard')
})

// ── Rounds ────────────────────────────────────────────────────────────────

test('a game is ten different capitals with languages spread out', () => {
  for (const t of TIERS) {
    for (let seed = 1; seed <= 40; seed++) {
      const rounds = pickRounds(ABROAD_NAMES, ABROAD_CAPITALS, t, rng(seed))
      assert.equal(rounds.length, ROUNDS)
      assert.equal(new Set(rounds.map(r => r.capital.code)).size, ROUNDS, `${t} ${seed}`)
      assert.ok(rounds.every(r => r.entry.tier === t))
      const perLang = {}
      for (const r of rounds) perLang[r.entry.langs[0]] = (perLang[r.entry.langs[0]] ?? 0) + 1
      assert.ok(Math.max(...Object.values(perLang)) <= 2, `${t} ${seed}: ${JSON.stringify(perLang)}`)
    }
  }
})

test('four choices: four different capitals, exactly one right', () => {
  const all = Object.values(ABROAD_CAPITALS)
  const r = rng(7)
  for (const n of ABROAD_NAMES) {
    const c = ABROAD_CAPITALS[n.code]
    const choices = choicesFor(n, c, all, r)
    assert.equal(choices.length, 4, n.name)
    assert.equal(new Set(choices.map(foldName)).size, 4, n.name)
    assert.equal(choices.filter(x => isCorrectAnswer(c, x)).length, 1, `${n.name}: ${choices}`)
  }
})

test('scoring: typing doubles, a hint halves', () => {
  assert.equal(roundPoints('type', true, false), 20)
  assert.equal(roundPoints('type', true, true), 10)
  assert.equal(roundPoints('choice', true, false), 10)
  assert.equal(roundPoints('choice', true, true), 5)
  assert.equal(roundPoints('type', false, false), 0)
  assert.equal(maxScore('type'), 2 * maxScore('choice'))
})

test('the hint never spells out the answer', () => {
  for (const c of Object.values(ABROAD_CAPITALS)) {
    const h = hintFor(c)
    const words = foldName(c.capital)
    assert.ok(!foldName(h).includes(words) || words.length < 3, `${c.code}: ${h}`)
  }
  assert.equal(hintFor(ABROAD_CAPITALS.PL), 'The capital of Poland')
  assert.match(hintFor(ABROAD_CAPITALS.SG), /^A capital in Asia, starting with S$/)
})

test('language lists read naturally', () => {
  const names = { es: 'Spanish', fr: 'French', pt: 'Portuguese' }
  assert.equal(listLanguages(['es'], names), 'Spanish')
  assert.equal(listLanguages(['es', 'fr'], names), 'Spanish and French')
  assert.equal(listLanguages(['es', 'fr', 'pt'], names), 'Spanish, French and Portuguese')
})

// ── Latin spellings ───────────────────────────────────────────────────────

test('Russian (BGN/PCGN), Ukrainian (2010 national) and Greek (ELOT 743 with b/d/g) spellings', () => {
  assert.equal(romaniseRussian('Москва'), 'Moskva')
  assert.equal(romaniseRussian('Ереван'), 'Yerevan')
  assert.equal(romaniseRussian('Кишинёв'), 'Kishinyov')
  assert.equal(romaniseRussian('Нью-Дели'), 'Nyu-Deli')
  assert.equal(romaniseRussian('Пхеньян'), 'Pkhenyan')
  assert.equal(romaniseUkrainian('Київ'), 'Kyiv')
  assert.equal(romaniseUkrainian('Прага'), 'Praha')
  assert.equal(romaniseUkrainian('Єреван'), 'Yerevan')
  assert.equal(romaniseUkrainian('Відень'), 'Viden')
  assert.equal(romaniseUkrainian('Згурівка'), 'Zghurivka')
  assert.equal(romaniseGreek('Αθήνα'), 'Athina')
  assert.equal(romaniseGreek('Βαρσοβία'), 'Varsovia')
  assert.equal(romaniseGreek('Λευκωσία'), 'Lefkosia')
  assert.equal(romaniseGreek('Ευρώπη'), 'Evropi')
  assert.equal(romaniseGreek('Ταΐφ'), 'Taif')
  assert.equal(romaniseGreek('Ουάσινγκτον'), 'Ouasington')
  // μπ, ντ, γκ: b, d, g at the start of a word or after a consonant, mb, nd, ng after a vowel.
  assert.equal(romaniseGreek('Μπακού'), 'Bakou')
  assert.equal(romaniseGreek('Ντάκα'), 'Daka')
  assert.equal(romaniseGreek('Γκιτέγκα'), 'Gitenga')
  assert.equal(romaniseGreek('Μπανγκόκ'), 'Bangok')
  assert.equal(romaniseGreek('Άμπου Ντάμπι'), 'Ambou Dambi')
  // Final ντ: "nt" in Saint, "d" elsewhere.
  assert.equal(romaniseGreek('Σεντ Τζονς'), 'Sent Tzons')
  assert.equal(romaniseGreek('Σαιντ Τζόρτζις'), 'Saint Tzortzis')
  assert.equal(romaniseGreek('Ριάντ'), 'Riad')
  for (const n of ABROAD_NAMES.filter(x => x.roman)) {
    const fn = { ru: romaniseRussian, uk: romaniseUkrainian, el: romaniseGreek }[n.langs[0]]
    assert.equal(fn(n.name), n.roman, `${n.name} [${n.langs}]`)
  }
})

test('acceptedAnswers folds every spelling the same way', () => {
  assert.deepEqual([...acceptedAnswers({ code: 'US', capital: 'Washington, D.C.' })].sort(), ['washington', 'washingtondc'])
})

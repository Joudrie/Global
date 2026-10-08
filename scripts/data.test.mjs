// Fact checks for game data that QA once found wrong: flag attributes (Flag
// DNA, Flagle, Describe It, Higher or Lower), Symbol Hunt symbols and decoys,
// Flag Families and Odd One Out rounds, and a few text facts.
// Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { FLAGS } = await src('data/flags.ts')
const { FLAG_ATTRIBS, STRIPES_V } = await src('data/flagAttribs.ts')
const { FACTS, OFFICIAL } = await src('data/countryFacts.ts')
const { SYMBOLS, SAFE_DECOY_IDS } = await src('data/flagSymbols.ts')
const { OTHER_IDENTITY_FLAGS } = await src('data/identityFlags.ts')

const flag = code => FLAGS.find(f => f.code === code)
const attr = code => FLAG_ATTRIBS[code]
const codes = s => s.trim().split(/\s+/)
const symbol = id => SYMBOLS.find(s => s.id === id)

// Game logic that lives inside a React screen: cut the plain part out of the
// .tsx (from one marker up to another), strip the types with the TypeScript
// compiler and run it with the data it reads passed in.
const ts = createRequire(import.meta.url)('typescript')
function screenLogic(file, from, to, deps, names) {
  const text = fs.readFileSync(path.join(ROOT, 'src/components', file), 'utf8')
  const a = text.indexOf(from), b = text.indexOf(to, a)
  assert.ok(a >= 0 && b > a, `${file}: markers "${from}" / "${to}" not found`)
  const js = ts.transpileModule(text.slice(a, b), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(deps), `${js}\nreturn { ${names.join(', ')} }`)(...Object.values(deps))
}

// ── Flag attributes ───────────────────────────────────────────────────────

test('every flag has attributes', () => {
  assert.deepEqual(Object.keys(FLAG_ATTRIBS).sort(), FLAGS.map(f => f.code).sort())
})

test('vertical stripes: only flags with vertical bands', () => {
  // Horizontal bands, a diagonal, or (Georgia) no stripes at all.
  for (const c of codes('MC AO DJ EG GA IN GE CO CR EC VE TJ CD CG MZ BI')) assert.ok(!STRIPES_V.has(c), c)
  assert.equal(attr('GE').stripes, false)
  for (const c of FACTS.verticalTricolour.yes) assert.ok(STRIPES_V.has(c), `${c} is a vertical tricolour`)
  for (const c of codes('MD MN BB VC MT VA PT DZ PK')) assert.ok(STRIPES_V.has(c), c)
  // Peru is vertical red-white-red, not horizontal.
  assert.ok(STRIPES_V.has('PE'))
  assert.equal(attr('PE').stripes, false)
  // Only these really have both: a vertical band beside or across horizontal ones.
  const both = [...STRIPES_V].filter(c => attr(c).stripes).sort()
  assert.deepEqual(both, codes('AE BJ CF GW MG OM').sort())
})

test('horizontal stripes', () => {
  for (const c of codes('LY MZ CZ JO PS PH CL KH KP RW SZ SS ST DJ KM CV VU')) assert.equal(attr(c).stripes, true, c)
  for (const c of codes('PE BN TZ NA GE')) assert.equal(attr(c).stripes, false, c)
})

test('stars: a sun is not a star', () => {
  for (const c of codes('BJ MW NA AR UY MK TW KZ KG RW AG KI')) assert.equal(attr(c).star, false, c)
  for (const c of codes('DM LY DZ TJ SI PY GQ')) assert.equal(attr(c).star, true, c)
  // Agrees with the hand-checked list in countryFacts.ts.
  const { yes, maybe } = FACTS.flagStar
  for (const c of yes) assert.equal(attr(c).star, true, `${c} has a star`)
  for (const f of FLAGS) if (attr(f.code).star) assert.ok(yes.includes(f.code) || maybe.includes(f.code), `${f.code} has no star`)
})

test('crescents', () => {
  for (const c of codes('KZ TJ SA AF')) assert.equal(attr(c).crescent, false, c)
  assert.equal(attr('LY').crescent, true)
  const { yes, maybe } = FACTS.flagCrescent
  for (const c of yes) assert.equal(attr(c).crescent, true, `${c} has a crescent`)
  for (const f of FLAGS) if (attr(f.code).crescent) assert.ok(yes.includes(f.code) || maybe.includes(f.code), `${f.code} has no crescent`)
})

test('crosses, and Tuvalu\'s Union Jack', () => {
  const { yes, maybe } = FACTS.flagCross
  for (const c of yes) assert.equal(attr(c).cross, true, `${c} has a cross`)
  for (const f of FLAGS) if (attr(f.code).cross) assert.ok(yes.includes(f.code) || maybe.includes(f.code), `${f.code} has no cross`)
  for (const c of codes('blue yellow red white')) assert.ok(attr('TV').colors.includes(c), `Tuvalu has ${c}`)
})

test('emblems and colours match the flag as drawn', () => {
  // public/flags draws the civil flags of Peru, Costa Rica and Venezuela: no coat of arms.
  for (const c of codes('PE CR VE')) assert.equal(attr(c).emblem, false, c)
  for (const c of codes('TM UZ BN')) assert.ok(attr(c).colors.includes('red'), `${c} has red`)
  for (const c of codes('LS SZ BB')) assert.ok(attr(c).colors.includes('black'), `${c} has black`)
})

// ── Symbol Hunt ───────────────────────────────────────────────────────────

test('Symbol Hunt symbols list every flag that clearly has them', () => {
  for (const c of codes('NA EC BO')) assert.ok(symbol('sun').codes.has(c), `sun: ${c}`)
  for (const c of FACTS.flagSun.yes) assert.ok(symbol('sun').codes.has(c), `sun: ${c}`)
  for (const c of codes('VU GD HT FJ LK GT BO EC SV DO PY TM')) assert.ok(symbol('plant').codes.has(c), `plant: ${c}`)
  for (const c of FACTS.flagPlant.yes) assert.ok(symbol('plant').codes.has(c), `plant: ${c}`)
  for (const c of codes('EC BO')) assert.ok(symbol('bird').codes.has(c), `bird: ${c}`)
  for (const c of FACTS.flagWeapon.yes) assert.ok(symbol('weapon').codes.has(c), `weapon: ${c}`)
  assert.ok(symbol('cross').codes.has('TV'))
  for (const s of SYMBOLS) {
    assert.ok(s.codes.size >= 5, s.id)
    for (const c of s.also) assert.ok(!s.codes.has(c), `${s.id}: ${c} is both a pick and arguable`)
  }
})

test('Symbol Hunt decoys exist and have a flag', () => {
  assert.ok(SAFE_DECOY_IDS.length >= 20)
  for (const id of SAFE_DECOY_IDS) {
    const f = OTHER_IDENTITY_FLAGS.find(x => x.id === id)
    assert.ok(f && !f.noFlag && f.flagUrl, id)
  }
  // Ones that carry a hunt symbol must never be decoys.
  for (const id of codes('scotland england red-cross quebec faroe red-crescent trnc sadr kurdistan tibet sikh nordic-council cascadia hispanidad')) {
    assert.ok(!SAFE_DECOY_IDS.includes(id), id)
  }
})

// ── Flag Families ─────────────────────────────────────────────────────────

const FF = screenLogic('FlagFamiliesScreen.tsx', 'const FAMILY_DEFS', 'const TOTAL_ROUNDS',
  { FLAGS, FLAG_ATTRIBS }, ['FAMILY_DEFS', 'heldBack', 'tryPair', 'buildRounds'])
const family = id => FF.FAMILY_DEFS.find(d => d.id === id)

test('Flag Families lists', () => {
  const all = new Set(FLAGS.map(f => f.code))
  for (const d of FF.FAMILY_DEFS) {
    for (const c of [...d.codes, ...(d.maybe ?? [])]) assert.ok(all.has(c), `${d.id}: ${c} is not a flag`)
    for (const c of d.maybe ?? []) assert.ok(!d.codes.includes(c), `${d.id}: ${c} is a code and a maybe`)
  }
  const has = (id, c) => family(id).codes.includes(c) || (family(id).maybe ?? []).includes(c)
  assert.ok(family('red-white').codes.includes('LV'))
  assert.ok(!family('south-cross').codes.includes('SB')) // five stars, not the Southern Cross
  assert.ok(!family('yellow-dom').codes.includes('VE')) // three equal bands
  assert.ok(family('one-star').codes.includes('SS'))
  for (const c of family('pan-arab').codes) assert.ok(family('has-black').codes.includes(c), `${c} has black`)
  // Every flag whose colours fit a palette rule is a member or a maybe.
  const exactly = (cols, a) => a.colors.length === cols.length && cols.every(c => a.colors.includes(c))
  for (const f of FLAGS) {
    const a = attr(f.code)
    if (a.colors.includes('black')) assert.ok(has('has-black', f.code), `has-black: ${f.code}`)
    if (exactly(['red', 'white'], a)) assert.ok(has('red-white', f.code), `red-white: ${f.code}`)
    if (exactly(['blue', 'white'], a)) assert.ok(has('blue-white', f.code), `blue-white: ${f.code}`)
    if (['red', 'white', 'blue'].every(c => a.colors.includes(c))) assert.ok(has('rwb', f.code), `rwb: ${f.code}`)
  }
})

test('Flag Families rounds have one right sort', () => {
  const defs = FF.FAMILY_DEFS
  let pairs = 0
  for (const A of defs) for (const B of defs) {
    if (A === B) continue
    const r = FF.tryPair(A, B)
    if (!r) continue
    pairs++
    const notA = FF.heldBack(A, B), notB = FF.heldBack(B, A)
    for (const { flag: f, family: side } of r.flags) {
      const [mine, other, held] = side === 'A' ? [A, B, notB] : [B, A, notA]
      assert.ok(mine.codes.includes(f.code), `${f.code} is not ${mine.id}`)
      assert.ok(!other.codes.includes(f.code) && !(other.maybe ?? []).includes(f.code), `${f.code} could be ${other.id}`)
      assert.ok(!held.has(f.code), `${f.code} held back by ${other.id}`)
    }
  }
  assert.ok(pairs >= 500, `only ${pairs} family pairs make a round`)
  for (let i = 0; i < 200; i++) assert.equal(FF.buildRounds(5).length, 5)
})

// ── Odd One Out ───────────────────────────────────────────────────────────

const OOO = screenLogic('OddOneOutScreen.tsx', 'const FEATURES', 'const TOTAL_ROUNDS',
  { FLAGS, FLAG_ATTRIBS, FACTS, OFFICIAL, ACCENT: { play: '' } }, ['CATEGORIES', 'buildRounds'])

test('Odd One Out: the odd one never belongs, and answers spread out', () => {
  const count = {}
  let rounds = 0
  for (let g = 0; g < 1000; g++) {
    const game = OOO.buildRounds(5)
    assert.equal(game.length, 5)
    const odds = game.map(r => r.flags[r.oddIndex].code)
    assert.equal(new Set(odds).size, 5, `an answer repeats in one game: ${odds}`)
    for (const r of game) {
      const cat = OOO.CATEGORIES.find(c => c.question === r.question)
      const odd = r.flags[r.oddIndex].code
      assert.ok(!cat.codes.has(odd) && !cat.unsure.has(odd), `${cat.id}: ${odd} is the odd one`)
      for (const f of r.flags) if (f.code !== odd) assert.ok(cat.codes.has(f.code) && !cat.unsure.has(f.code), `${cat.id}: ${f.code}`)
      count[odd] = (count[odd] ?? 0) + 1
      rounds++
    }
  }
  const [top, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
  assert.ok(n / rounds < 0.06, `${top} is the answer in ${(100 * n / rounds).toFixed(1)}% of rounds`)
})

test('Odd One Out lists and wording', () => {
  const cat = id => OOO.CATEGORIES.find(c => c.id === id)
  assert.deepEqual([...cat('english').codes].sort(), [...OFFICIAL.en.yes].sort())
  for (const c of codes('CY ET')) assert.ok(!cat('english').codes.has(c), c)
  for (const c of codes('AD TD ET XK LA MK RS SM VA')) assert.ok(cat('landlocked').codes.has(c), c)
  assert.ok(!cat('landlocked').codes.has('MR')) // Atlantic coast
  for (const c of codes('AZ KZ TM')) assert.ok(cat('landlocked').unsure.has(c), c) // Caspian
  for (const c of codes('BH TW')) assert.ok(cat('island').codes.has(c), c)
  for (const c of codes('AD AG BS BZ BT KH GD KN LC VC PG SB TO TV VA')) assert.ok(cat('monarchy').codes.has(c), c)
  for (const c of codes('BB TT')) assert.ok(!cat('monarchy').codes.has(c), c) // republics
  for (const c of codes('SI BA MC PS')) assert.ok(cat('mediterr').codes.has(c), c)
  assert.ok(cat('nato').codes.has('SE'))
  const qs = OOO.CATEGORIES.map(c => c.question).join('\n')
  assert.match(qs, /NOT from the Americas\?/)
  assert.match(qs, /NOT from the Middle East\?/)
  assert.ok(OOO.CATEGORIES.some(c => c.themeLabel === 'European flags'))
  // The Middle East is in Asia: none of its flags can be the "not from Asia" answer.
  for (const c of codes('SA IR IL')) assert.ok(cat('region-Asia').codes.has(c), c)
})

// ── Text facts and other data ─────────────────────────────────────────────

test('flag tips and fun facts', () => {
  assert.match(flag('TR').distinguishingTip, /white disc/)
  assert.match(flag('CY').funFact, /Kosovo/)
  assert.match(flag('LI').funFact, /Uzbekistan/)
  assert.match(flag('MZ').funFact, /assault rifle/)
  assert.match(flag('KZ').distinguishingTip, /in the centre/)
  assert.doesNotMatch(flag('HR').funFact, /more than any other/)
  assert.match(flag('SM').distinguishingTip, /white-over-light blue/)
  assert.match(flag('CL').distinguishingTip, /white-over-red/)
  assert.match(flag('DM').funFact, /Nicaragua/)
  assert.doesNotMatch(flag('LB').funFact, /only flag/)
})

test('Crimea and Sevastopol are listed under Ukraine only', async () => {
  const { CHALLENGE_CONTINENTS } = await src('data/challenges.ts')
  const countries = CHALLENGE_CONTINENTS.flatMap(c => c.countries)
  const names = code => countries.find(c => c.code === code).subRegions.map(s => s.name)
  for (const n of ['Crimea', 'Sevastopol']) {
    assert.ok(names('UA').includes(n), `Ukraine: ${n}`)
    assert.ok(!names('RU').includes(n), `Russia: ${n}`)
  }
  const ru = countries.find(c => c.code === 'RU')
  assert.equal(parseInt(ru.subTitle), ru.subRegions.length)
})

test('capital quiz never offers a real capital as a wrong answer', async () => {
  const { CITIES } = await src('data/cities.ts')
  for (const c of ['Cape Town', 'Bloemfontein', 'Pretoria']) assert.ok(!CITIES.ZA.includes(c), c)
})

test('language samples are all different', async () => {
  const { LANGUAGES } = await src('data/languages.ts')
  const seen = new Map()
  for (const l of LANGUAGES) {
    assert.ok(!seen.has(l.sample), `${l.code} has the same sample as ${seen.get(l.sample)}`)
    seen.set(l.sample, l.code)
  }
})

test('ethnic flag names', async () => {
  const { ETHNIC_FLAGS } = await src('data/ethnicFlags.ts')
  const names = ETHNIC_FLAGS.flatMap(r => r.groups.flatMap(g => g.items.map(i => i.name)))
  assert.ok(names.includes('British subjects'))
  assert.ok(!names.some(n => /subjecters/.test(n)))
})

// Game logic that decides right and wrong answers.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { FLAGS } = await src('data/flags.ts')
const { CODEX } = await src('data/codex.ts')
const { matchNames, pickOnEnter } = await src('utils/pickOnEnter.ts')
const { timelineFlags, timelineScore } = await src('utils/timeline.ts')

const enter = typed => pickOnEnter(matchNames(FLAGS, typed, 6), typed)?.code

test('typed answers know other names and ignore accents', () => {
  assert.equal(enter('UK'), 'GB')
  assert.equal(enter('usa'), 'US')
  assert.equal(enter('us'), 'US')
  assert.equal(enter('Ivory Coast'), 'CI')
  assert.equal(enter("Cote d'Ivoire"), 'CI')
  assert.equal(enter('Côte d’Ivoire'), 'CI')
  assert.equal(enter('holland'), 'NL')
  assert.equal(enter('Burma'), 'MM')
  assert.equal(enter('Czechia'), 'CZ')
  assert.equal(enter('sao tome and principe'), 'ST')
  assert.equal(enter('Niger'), 'NE')
})

test('Enter never submits a partial match it had to guess', () => {
  assert.equal(enter('ukr'), 'UA')           // the only match
  assert.equal(enter('guinea'), 'GN')        // exact beats Guinea-Bissau, Papua New Guinea
  assert.equal(enter('sudan'), 'SD')
  assert.equal(enter('kor'), undefined)      // North and South Korea
  assert.equal(enter('s'), undefined)
})

test('a code or alias puts its country first in the list', () => {
  assert.equal(matchNames(FLAGS, 'in')[0].code, 'IN')
  assert.equal(matchNames(FLAGS, 'us')[0].code, 'US')
})

test('every timeline answer key runs oldest to newest with distinct pictures', () => {
  for (const [code, e] of Object.entries(CODEX)) {
    const chrono = timelineFlags(e.flagHistory)
    for (let i = 1; i < chrono.length; i++) assert.ok(chrono[i - 1].fromYear <= chrono[i].fromYear, `${code} ${i}`)
    assert.equal(new Set(chrono.map(h => h.flagUrl)).size, chrono.length, code)
  }
})

test('timeline: true order scores full marks, same-year flags either way round', () => {
  const lb = timelineFlags(CODEX.LB.flagHistory)
  assert.equal(timelineScore(lb, lb), lb.length)
  const a = { fromYear: 1870, toYear: 1885, flagUrl: 'a', label: '', note: '' }
  const b = { fromYear: 1870, toYear: 1999, flagUrl: 'b', label: '', note: '' }
  const c = { fromYear: 1999, toYear: null, flagUrl: 'c', label: '', note: '' }
  assert.equal(timelineScore([a, b, c], [b, a, c]), 3)
  assert.equal(timelineScore([a, b, c], [c, a, b]), 1)
})

// Province Roulette and Subdivision Stumper (src/utils/subdivisionQuiz.ts).
const SQ = await src('utils/subdivisionQuiz.ts')
const { SUB_FLAGS } = await src('data/subdivisions.ts')
const { seededRandom } = await src('utils/prng.ts')

test('Name it: four different names, all from the answer\'s country, never its twin', () => {
  const rng = seededRandom('names')
  const byName = new Map()
  for (const s of SUB_FLAGS) byName.set(`${s.countryCode}|${s.name}`, s)
  for (const target of SQ.NAMEABLE_FLAGS) {
    for (let i = 0; i < 3; i++) {
      const choices = SQ.nameChoices(target, rng)
      assert.equal(choices.length, 4, target.code)
      assert.equal(new Set(choices).size, 4, target.code)
      assert.ok(choices.includes(target.name), target.code)
      for (const c of choices) {
        const s = byName.get(`${target.countryCode}|${c}`)
        assert.ok(s, `${target.code}: ${c} is not from ${target.countryName}`)
        if (c !== target.name) assert.notEqual(s.flagUrl, target.flagUrl, `${target.code}: ${c} flies the same flag`)
      }
    }
  }
})

test('Whose is it?: four different countries, the answer among them', () => {
  const rng = seededRandom('countries')
  for (const target of SUB_FLAGS) {
    const choices = SQ.countryChoices(target, rng)
    assert.equal(choices.length, 4, target.code)
    assert.equal(new Set(choices).size, 4, target.code)
    assert.ok(choices.includes(target.countryName), target.code)
  }
})

test('every pickable pool has enough flags and round-trips through its saved key', () => {
  assert.ok(SQ.NAMEABLE_COUNTRIES.length >= 80, `only ${SQ.NAMEABLE_COUNTRIES.length} countries`)
  for (const c of SQ.NAMEABLE_COUNTRIES) {
    const pool = SQ.poolFromKey(c.code)
    assert.equal(pool?.kind, 'country', c.code)
    const flags = SQ.poolFlags(pool)
    assert.equal(flags.length, c.total, c.code)
    assert.ok(new Set(flags.map(s => s.flagUrl)).size >= SQ.MIN_NAME_FLAGS, c.code)
  }
  for (const c of SQ.PICK_CONTINENTS) {
    const pool = SQ.poolFromKey(c.id)
    if (!c.wholeContinent) { assert.equal(pool, null, c.id); continue }
    assert.equal(SQ.poolKey(pool), c.id)
    assert.equal(SQ.poolFlags(pool).length, c.total, c.id)
  }
  assert.equal(SQ.poolFromKey('world'), SQ.WORLD)
  assert.equal(SQ.poolFromKey('nowhere'), null)
  assert.equal(SQ.poolFromKey(undefined), null)
})

test('Roulette traces a spin down from where it started', () => {
  const rng = seededRandom('spin')
  const us = SQ.poolFromKey('US'), europe = SQ.poolFromKey('europe')
  const tx = SUB_FLAGS.find(s => s.code === 'us-tx')
  assert.deepEqual(SQ.spinSteps(SQ.WORLD, tx, rng).map(s => [s.kind, s.answer]), [['continent', 'North America'], ['country', 'United States'], ['name', 'Texas']])
  assert.deepEqual(SQ.spinSteps(us, tx, rng).map(s => s.kind), ['name'])
  const by = SUB_FLAGS.find(s => s.code === 'de-by')
  assert.deepEqual(SQ.spinSteps(europe, by, rng).map(s => s.kind), ['country', 'name'])
  for (const step of SQ.spinSteps(SQ.WORLD, tx, rng)) assert.ok(step.choices.includes(step.answer), step.kind)
  assert.equal(SQ.spinSteps(us, tx, rng)[0].label, 'Which part of the United States?')
  assert.equal(SQ.spinSteps(europe, by, rng)[1].label, 'Which part of Germany?')
  assert.ok(SQ.poolFlags(europe).every(s => s.continent === 'Europe'))
})

test('Stumper: ten different flags a game, fewer only when the pool is smaller', () => {
  const rng = seededRandom('stumper')
  const whose = SQ.stumperRounds('whose', SQ.WORLD, rng)
  assert.equal(whose.length, 10)
  assert.equal(new Set(whose.map(r => r.target.code)).size, 10)
  for (const r of whose) assert.equal(r.answer, r.target.countryName)
  const asia = SQ.poolFromKey('asia')
  for (const r of SQ.stumperRounds('name', asia, rng)) {
    assert.equal(r.target.continent, 'Asia')
    assert.equal(r.answer, r.target.name)
    assert.ok(r.choices.every(c => SUB_FLAGS.some(s => s.countryCode === r.target.countryCode && s.name === c)), r.target.code)
  }
  const hn = SQ.poolFromKey('HN')
  assert.equal(SQ.stumperLength('name', hn), 4)
  assert.equal(SQ.stumperRounds('name', hn, rng).length, 4)
  assert.equal(SQ.stumperBestKey('name', hn), 'name-HN')
  assert.equal(SQ.stumperBestKey('whose', SQ.WORLD), 'whose')
})

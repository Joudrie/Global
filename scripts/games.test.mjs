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

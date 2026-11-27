// Lineage: typed answers score double at every reveal level, the typed
// matcher (forgiving, but never another country), one best score for the
// game whichever mode, and the iOS-safe answer box.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const L = await src('utils/lineage.ts')
const { FLAGS } = await src('data/flags.ts')
const { CODEX } = await src('data/codex.ts')
const { foldName, editDistance } = await src('utils/abroad.ts')
const { ruleFor } = await src('utils/mergeProgress.ts')

const codeOf = name => FLAGS.find(f => f.name === name)?.code ?? assert.fail(`no country ${name}`)
const right = (country, typed) => L.judgeLineage(codeOf(country), typed).correct
const fakeStore = (init = {}) => {
  const m = new Map(Object.entries(init))
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), dump: () => Object.fromEntries(m) }
}

// The countries a game can ask about (as LineageScreen picks them).
const ELIGIBLE = Object.entries(CODEX).filter(([code, e]) => e.flagHistory.length >= 3 && FLAGS.some(f => f.code === code)).map(([code]) => code)

test('a typed answer is worth double a picked one at every reveal level', () => {
  for (let total = 2; total <= 6; total++) {
    let prev = Infinity
    for (let revealed = 1; revealed <= total; revealed++) {
      const choice = L.roundPoints(revealed, total, 'choice', true)
      const typed = L.roundPoints(revealed, total, 'type', true)
      assert.equal(typed, choice * 2, `total ${total}, revealed ${revealed}`)
      assert.equal(L.roundWorth(revealed, total, 'type'), typed)
      assert.ok(choice < prev, 'each reveal lowers the worth')
      prev = choice
      assert.equal(L.roundPoints(revealed, total, 'choice', false), 0)
      assert.equal(L.roundPoints(revealed, total, 'type', false), 0)
    }
  }
  // The numbers the screen shows: 1000 / 2000 from the oldest flag alone, 150 / 300 once all six show.
  assert.equal(L.roundWorth(1, 6, 'choice'), 1000)
  assert.equal(L.roundWorth(1, 6, 'type'), 2000)
  assert.equal(L.roundWorth(2, 6, 'choice'), 830)
  assert.equal(L.roundWorth(2, 6, 'type'), 1660)
  assert.equal(L.roundWorth(6, 6, 'choice'), 150)
  assert.equal(L.roundWorth(6, 6, 'type'), 300)
  assert.equal(L.TYPE_MULTIPLIER, 2)
  assert.equal(L.MAX_SCORE, L.ROUNDS * 2000)
})

test('typed answers: case, accents, punctuation and other names count', () => {
  assert.ok(right('Serbia', 'serbia'))
  assert.ok(right('Serbia', '  SERBIA '))
  assert.ok(right('Serbia', 'Sérbia'))
  assert.ok(right('United States', 'USA'))
  assert.ok(right('United States', 'U.S.A.'))
  assert.ok(right('United States', 'America'))
  assert.ok(right('United Kingdom', 'UK'))
  assert.ok(right('United Kingdom', 'Great Britain'))
  assert.ok(right('Czech Republic', 'Czechia'))
  assert.ok(right("Côte d'Ivoire", 'Ivory Coast'))
  assert.ok(right("Côte d'Ivoire", 'cote divoire'))
  assert.ok(right('Bosnia and Herzegovina', 'Bosnia & Herzegovina'))
  assert.ok(right('Bosnia and Herzegovina', 'Bosnia'))
  assert.ok(right('Myanmar', 'Burma'))
  assert.ok(right('Netherlands', 'Holland'))
  assert.ok(right('Netherlands', 'The Netherlands'))
})

test('typed answers: small slips count, scaled to the length', () => {
  const v = L.judgeLineage(codeOf('Serbia'), 'Serbja')
  assert.ok(v.correct && v.misspelt, 'one slip in a six-letter name')
  assert.ok(right('Afghanistan', 'Afganistan'))
  assert.ok(right('Kazakhstan', 'Kazakstan'))
  assert.ok(right('Philippines', 'Phillipines'))
  assert.ok(right('Portugal', 'Portgual'), 'swapped letters are one slip')
  assert.ok(right('Cuba', 'Cuab'), 'one slip in a four-letter name')
  assert.ok(!right('Peru', 'Pxrx'), 'but not two')
  assert.ok(!right('Serbia', 'Sxrbxx'))
  assert.ok(!right('Serbia', ''))
})

test("typed answers never accept another country's name", () => {
  assert.ok(!right('Australia', 'Austria'))
  assert.ok(!right('Austria', 'Australia'))
  assert.ok(!right('Niger', 'Nigeria'))
  assert.ok(!right('Nigeria', 'Niger'))
  assert.ok(!right('Slovakia', 'Slovenia'))
  assert.ok(!right('Slovenia', 'Slovakia'))
  assert.ok(!right('Iran', 'Iraq'))
  assert.ok(!right('Guinea', 'Guyana'))
  assert.ok(!right('Mali', 'Malta'))
  assert.ok(!right('Serbia', 'Croatia'))
  // Every country a game can ask about: its own name counts, and no other
  // country's name does, even one only a few letters away.
  const names = FLAGS.map(f => [f.code, f.name])
  for (const code of ELIGIBLE) {
    const own = FLAGS.find(f => f.code === code).name
    assert.ok(L.judgeLineage(code, own).correct, own)
    for (const [other, name] of names) {
      if (other === code || editDistance(foldName(name), foldName(own)) > 4) continue
      assert.ok(!L.judgeLineage(code, name).correct, `${name} must not count for ${own}`)
    }
  }
})

test('a name that fits two countries is vague, not right', () => {
  const v = L.judgeLineage('CG', 'Congo')
  assert.ok(!v.correct && v.vague)
  assert.ok(L.judgeLineage('CD', 'DRC').correct)
  assert.ok(!L.judgeLineage('ZZ', 'Anything').correct, 'an unknown code is never right')
})

test('one best score for the game, whichever mode', () => {
  const store = fakeStore()
  assert.equal(L.loadBest(store), 0)
  assert.deepEqual(L.recordScore(3000, store), { best: 3000, beat: false }, 'the first game sets it')
  assert.deepEqual(L.recordScore(2000, store), { best: 3000, beat: false })
  assert.deepEqual(L.recordScore(7400, store), { best: 7400, beat: true })
  assert.deepEqual(store.dump(), { [L.BEST_KEY]: '7400' }, 'one number, not one per mode')
  assert.equal(L.BEST_KEY, 'globalio_lineage_best')
  assert.equal(ruleFor(L.BEST_KEY)?.rule, 'max', 'the best merges as the higher')
  assert.equal(L.loadBest(fakeStore({ [L.BEST_KEY]: 'junk' })), 0)
})

test('the chosen mode is remembered on this device', () => {
  const store = fakeStore()
  assert.equal(L.loadMode(store), 'choice', 'four choices until the player picks Type-in')
  L.saveMode('type', store)
  assert.equal(L.loadMode(store), 'type')
  L.saveMode('choice', store)
  assert.equal(L.loadMode(store), 'choice')
  assert.equal(L.loadMode(fakeStore({ [L.PREFS_KEY]: '{bad' })), 'choice')
  assert.equal(L.PREFS_KEY, 'globalio_lineage_prefs')
  assert.equal(ruleFor(L.PREFS_KEY)?.rule, 'device', "the mode stays this device's")
})

test("the answer box never mentions a name (iOS AutoFill) and doesn't autocorrect", () => {
  const f = L.LINEAGE_FIELD
  for (const k of ['id', 'placeholder', 'label']) assert.doesNotMatch(f[k], /name/i, k)
  assert.equal(f.autoComplete, 'off')
  assert.equal(f.autoCorrect, 'off')
  assert.equal(f.spellCheck, false)
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/LineageScreen.tsx'), 'utf8')
  assert.match(screen, /id=\{field\.id\}/)
  assert.match(screen, /autoComplete=\{field\.autoComplete\}/)
  for (const m of screen.matchAll(/(?:placeholder|aria-label|name)="([^"]*)"/g)) assert.doesNotMatch(m[1], /name/i, m[0])
  assert.match(screen, /Type it in for double points/)
})

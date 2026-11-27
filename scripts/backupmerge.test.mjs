// Combine backups: the merge rules (src/utils/mergeProgress.ts) and the
// restore flow around them (src/utils/backup.ts), Combine and Replace.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const M = await src('utils/mergeProgress.ts')
const B = await src('utils/backup.ts')
const { CHANGELOG } = await src('data/changelog.ts')
const { mergeSnapshots: merge, MAIN_KEY, ruleFor, RULES } = M

// ── helpers ──────────────────────────────────────────────────────────────────

const S = v => JSON.stringify(v)
const P = s => JSON.parse(s)
const main = (over = {}) => S({
  username: '', learnedFlags: [], learnedSubs: [], crowns: [], currentStreak: 0, longestStreak: 0,
  lastDailyDate: null, dailyHistory: {}, funFactStreak: 0, lastFunFactDate: null, lastShareResult: null,
  premium: false, gamesPlayed: 0, ...over,
})
const mainOf = snap => P(snap[MAIN_KEY])
const daily = (date, score, total = 10) => ({ score, total, date, answers: Array.from({ length: total }, (_, i) => (i < score ? 'correct' : 'wrong')) })
/** Merge one key both ways round; returns [a+b, b+a] parsed when JSON. */
const both = (key, a, b) => [merge({ [key]: a }, { [key]: b })[key], merge({ [key]: b }, { [key]: a })[key]]
const isSymmetric = key => ruleFor(key)?.symmetric ?? false

function assertSymmetric(a, b) {
  const ab = merge(a, b), ba = merge(b, a)
  for (const k of Object.keys(ab)) if (isSymmetric(k)) assert.equal(ab[k], ba[k], `A+B and B+A differ on ${k}`)
  assert.deepEqual(Object.keys(ab).sort(), Object.keys(ba).sort())
}
function assertIdempotent(a, b) {
  const once = merge(a, b)
  assert.deepEqual(merge(once, b), once, 'merging the same backup twice changed something')
  assert.deepEqual(merge(once, a), once, 'merging an input back in changed something')
  assert.deepEqual(merge(once, once), once, 'merging a save with itself changed something')
}

// In-memory localStorage with an optional size limit, like a nearly full disk.
class MemoryStorage {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); this.quota = Infinity }
  get length() { return this.m.size }
  get size() { let n = 0; for (const [k, v] of this.m) n += k.length + v.length; return n }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) {
    const old = this.m.has(k) ? k.length + this.m.get(k).length : 0
    if (this.size - old + k.length + String(v).length > this.quota) throw new Error('QuotaExceededError')
    this.m.set(k, String(v))
  }
  removeItem(k) { this.m.delete(k) }
  clear() { this.m.clear() }
  dump() { return Object.fromEntries(this.m) }
}
const useStorage = init => { const s = new MemoryStorage(init); globalThis.localStorage = s; return s }
const codeFor = snap => { const s = useStorage(snap); const c = B.exportProgress(); s.clear(); return c }

// ── a real-looking pair: a phone and a computer ─────────────────────────────

const design = (id, name, updated) => ({ id, name, base: 'stripes', parts: {}, overlays: [], updated, edited: true })
const PHONE = {
  [MAIN_KEY]: main({
    username: 'Sam', learnedFlags: ['FR', 'DE', 'JP', 'BR'], learnedSubs: ['US-CA'], crowns: ['europe'],
    currentStreak: 2, longestStreak: 9, lastDailyDate: '2026-11-25',
    dailyHistory: { '2026-11-20': daily('2026-11-20', 5), '2026-11-24': daily('2026-11-24', 7), '2026-11-25': daily('2026-11-25', 8) },
    funFactStreak: 3, lastFunFactDate: '2026-11-25',
    lastShareResult: { game: 'Daily', score: '8/10', emojiGrid: [], date: '2026-11-25', streak: 2 },
    premium: false, gamesPlayed: 40,
  }),
  globalio_hl_best: '12',
  globalio_prideroulette_best: '7',
  globalio_flagfusion_best: S({ easy: 300, hard: 120 }),
  globalio_citiesabroad_best: S({ 'easy-type': 340 }),
  globalio_citiesabroad_prefs: S({ mode: 'choice', tier: 'easy' }),
  globalio_gacha: S({ collected: ['FR', 'DE'], xp: 100, tokens: 0, lastDaily: '2026-11-25', seeded: true }),
  globalio_tierlist_Europe: S({ FR: 'S', DE: 'A' }),
  globalio_atlas_played: S({ m1: 1900 }),
  globalio_flagle_v1: S({ date: '2026-11-25', codes: ['FR', 'DE'] }),
  globalio_flagstudio_v1: S({ current: design('d1', 'Sunrise', 500), saved: [design('d1', 'Sunrise', 500)] }),
  globalio_recent_games: S(['flagle', 'atlas']),
  globalio_total_plays: '41',
  globalio_onboarded: '1',
  some_ad_script_key: 'phone',
}
const DESKTOP = {
  [MAIN_KEY]: main({
    username: '', learnedFlags: ['FR', 'IT', 'ES', 'JP'], learnedSubs: [], crowns: ['asia'],
    currentStreak: 5, longestStreak: 5, lastDailyDate: '2026-11-23',
    dailyHistory: Object.fromEntries(['19', '20', '21', '22', '23'].map(d => [`2026-11-${d}`, daily(`2026-11-${d}`, d === '20' ? 9 : 6)])),
    funFactStreak: 1, lastFunFactDate: '2026-11-24',
    lastShareResult: { game: 'Daily', score: '6/10', emojiGrid: [], date: '2026-11-23' },
    premium: true, gamesPlayed: 55,
  }),
  globalio_hl_best: '15',
  globalio_prideroulette_best_20: '15',
  globalio_statclash_best: '20',
  globalio_flagfusion_best: S({ easy: 250, medium: 200 }),
  globalio_citiesabroad_prefs: S({ mode: 'type', tier: 'hard' }),
  globalio_gacha: S({ collected: ['IT', 'FR'], xp: 180, tokens: 1, lastDaily: '2026-11-24', seeded: true }),
  globalio_tierlist_Europe: S({ FR: 'A', IT: 'B' }),
  globalio_atlas_played: S({ m1: 1850, m2: 1700 }),
  globalio_flagle_v1: S({ date: '2026-11-24', codes: ['US', 'CA', 'MX'] }),
  globalio_flagstudio_v1: S({ current: design('d2', 'Harbour', 700), saved: [design('d2', 'Harbour', 700), design('d1', 'Sunrise (old)', 300)] }),
  globalio_recent_games: S(['connections']),
  globalio_total_plays: '60',
  some_ad_script_key: 'desktop',
}

test('phone + computer combine into the best of both', () => {
  const out = merge(PHONE, DESKTOP)
  const m = mainOf(out)
  assert.deepEqual(m.learnedFlags, ['BR', 'DE', 'ES', 'FR', 'IT', 'JP'])
  assert.deepEqual(m.learnedSubs, ['US-CA'])
  assert.deepEqual(m.crowns, ['asia', 'europe'])
  assert.equal(m.username, 'Sam')
  assert.equal(m.premium, true)
  assert.equal(m.gamesPlayed, 55)
  // Desktop played the 19th–23rd, the phone the 20th, 24th and 25th: seven days in a row.
  assert.equal(m.lastDailyDate, '2026-11-25')
  assert.equal(m.currentStreak, 7)
  assert.equal(m.longestStreak, 9)
  assert.deepEqual(Object.keys(m.dailyHistory), ['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25'])
  assert.equal(m.dailyHistory['2026-11-20'].score, 9, 'same day keeps the higher score')
  assert.equal(m.funFactStreak, 3)
  assert.equal(m.lastFunFactDate, '2026-11-25')
  assert.equal(m.lastShareResult.score, '8/10')

  assert.equal(out.globalio_hl_best, '15')
  assert.equal(out.globalio_prideroulette_best, '7')
  assert.equal(out.globalio_prideroulette_best_20, '15')
  assert.equal(out.globalio_statclash_best, '20')
  assert.deepEqual(P(out.globalio_flagfusion_best), { easy: 300, hard: 120, medium: 200 })
  assert.deepEqual(P(out.globalio_citiesabroad_best), { 'easy-type': 340 })
  assert.equal(out.globalio_citiesabroad_prefs, PHONE.globalio_citiesabroad_prefs, 'settings stay this device\'s')
  assert.deepEqual(P(out.globalio_gacha), { collected: ['DE', 'FR', 'IT'], xp: 180, tokens: 0, lastDaily: '2026-11-25', seeded: true })
  assert.deepEqual(P(out.globalio_tierlist_Europe), { DE: 'A', FR: 'S', IT: 'B' })
  assert.deepEqual(P(out.globalio_atlas_played), { m1: 1900, m2: 1700 })
  assert.equal(out.globalio_flagle_v1, PHONE.globalio_flagle_v1)
  const studio = P(out.globalio_flagstudio_v1)
  assert.deepEqual(studio.saved.map(d => [d.id, d.name]), [['d2', 'Harbour'], ['d1', 'Sunrise']])
  assert.equal(studio.current.id, 'd1', 'the design open on this device stays open')
  assert.equal(out.globalio_recent_games, PHONE.globalio_recent_games)
  assert.equal(out.globalio_total_plays, '60')
  assert.equal(out.globalio_onboarded, '1')
  assert.equal(out.some_ad_script_key, 'phone', 'unknown text keeps this device\'s')

  const s = M.summarize(out)
  assert.deepEqual(s, { flags: 6, subs: 1, crowns: 2, streak: 7, bestStreak: 9, dailies: 7, bests: 8 })
  assert.equal(M.bestsRaised(PHONE, out), 4) // hl 12 → 15, and new: statclash, prideroulette 20-flag, flagfusion medium
  assert.equal(M.bestsRaised(out, out), 0)
})

test('the pair is symmetric and idempotent', () => {
  assertSymmetric(PHONE, DESKTOP)
  assertIdempotent(PHONE, DESKTOP)
  assertIdempotent(DESKTOP, PHONE)
  // The computer combining the phone's backup gets the same progress.
  const a = mainOf(merge(PHONE, DESKTOP)), b = mainOf(merge(DESKTOP, PHONE))
  assert.equal(b.username, 'Sam', 'an empty name takes the backup\'s')
  assert.deepEqual({ ...a, username: 0 }, { ...b, username: 0 })
  // Three devices, any order.
  const TABLET = { [MAIN_KEY]: main({ learnedFlags: ['KE'], currentStreak: 1, longestStreak: 12, lastDailyDate: '2026-11-26', dailyHistory: { '2026-11-26': daily('2026-11-26', 10) } }), globalio_hl_best: '30' }
  const abc = merge(merge(PHONE, DESKTOP), TABLET), cba = merge(merge(TABLET, DESKTOP), PHONE)
  for (const k of Object.keys(abc)) if (isSymmetric(k) && k !== MAIN_KEY) assert.equal(abc[k], cba[k], k)
  assert.deepEqual({ ...mainOf(abc), username: 0 }, { ...mainOf(cba), username: 0 })
  assert.equal(mainOf(abc).currentStreak, 8, 'the tablet\'s 26th extends the run')
  assert.equal(mainOf(abc).longestStreak, 12)
})

// ── the main save, rule by rule ──────────────────────────────────────────────

test('main save: learned flags, subdivisions and crowns are a union', () => {
  const [ab, ba] = both(MAIN_KEY, main({ learnedFlags: ['FR', 'DE'], learnedSubs: ['A'], crowns: ['x'] }), main({ learnedFlags: ['DE', 'IT'], crowns: ['y', 'x'] }))
  assert.equal(ab, ba)
  assert.deepEqual(P(ab).learnedFlags, ['DE', 'FR', 'IT'])
  assert.deepEqual(P(ab).learnedSubs, ['A'])
  assert.deepEqual(P(ab).crowns, ['x', 'y'])
})

test('main save: the streak travels with its date', () => {
  // The later daily wins even with a shorter streak; the longest is the max.
  let [ab, ba] = both(MAIN_KEY, main({ currentStreak: 30, longestStreak: 30, lastDailyDate: '2026-10-01' }), main({ currentStreak: 2, longestStreak: 4, lastDailyDate: '2026-11-25' }))
  assert.equal(ab, ba)
  assert.equal(P(ab).currentStreak, 2)
  assert.equal(P(ab).lastDailyDate, '2026-11-25')
  assert.equal(P(ab).longestStreak, 30)
  // Same day: the longer streak.
  ;[ab, ba] = both(MAIN_KEY, main({ currentStreak: 3, longestStreak: 3, lastDailyDate: '2026-11-25' }), main({ currentStreak: 6, longestStreak: 6, lastDailyDate: '2026-11-25' }))
  assert.equal(ab, ba)
  assert.equal(P(ab).currentStreak, 6)
  // Never played on one side (null date).
  ;[ab, ba] = both(MAIN_KEY, main({ currentStreak: 4, longestStreak: 4, lastDailyDate: '2026-11-25' }), main())
  assert.equal(P(ab).currentStreak, 4)
  assert.equal(P(ba).currentStreak, 4)
  // A gap in the combined history doesn't join two runs.
  ;[ab] = both(MAIN_KEY,
    main({ currentStreak: 1, longestStreak: 1, lastDailyDate: '2026-11-25', dailyHistory: { '2026-11-25': daily('2026-11-25', 5) } }),
    main({ currentStreak: 2, longestStreak: 2, lastDailyDate: '2026-11-23', dailyHistory: { '2026-11-22': daily('2026-11-22', 5), '2026-11-23': daily('2026-11-23', 5) } }))
  assert.equal(P(ab).currentStreak, 1)
  assert.equal(P(ab).longestStreak, 2)
})

test('main save: daily history is a union by day, higher score wins', () => {
  const [ab, ba] = both(MAIN_KEY,
    main({ dailyHistory: { '2026-11-01': daily('2026-11-01', 4), '2026-11-02': daily('2026-11-02', 9) } }),
    main({ dailyHistory: { '2026-11-01': daily('2026-11-01', 6), '2026-11-03': daily('2026-11-03', 1) } }))
  assert.equal(ab, ba)
  const h = P(ab).dailyHistory
  assert.deepEqual(Object.keys(h), ['2026-11-01', '2026-11-02', '2026-11-03'])
  assert.deepEqual([h['2026-11-01'].score, h['2026-11-02'].score, h['2026-11-03'].score], [6, 9, 1])
  // A tie on score is still settled the same way both ways round.
  const x = main({ dailyHistory: { d: { ...daily('2026-11-01', 5), answers: ['correct'] } } })
  const y = main({ dailyHistory: { d: { ...daily('2026-11-01', 5), answers: ['wrong'] } } })
  assert.equal(...both(MAIN_KEY, x, y))
})

test('main save: fun-fact streak, games played, Supporter, name and last share', () => {
  let [ab, ba] = both(MAIN_KEY,
    main({ funFactStreak: 9, lastFunFactDate: '2026-11-20', gamesPlayed: 3, premium: true, lastShareResult: { game: 'A', score: '1', emojiGrid: [], date: '2026-11-25' } }),
    main({ funFactStreak: 1, lastFunFactDate: '2026-11-25', gamesPlayed: 8, premium: false, lastShareResult: { game: 'B', score: '2', emojiGrid: [], date: '2026-11-24' } }))
  assert.equal(ab, ba)
  assert.equal(P(ab).funFactStreak, 1)
  assert.equal(P(ab).lastFunFactDate, '2026-11-25')
  assert.equal(P(ab).gamesPlayed, 8)
  assert.equal(P(ab).premium, true)
  assert.equal(P(ab).lastShareResult.game, 'A')
  // The name: this device's, unless it has none.
  ;[ab, ba] = both(MAIN_KEY, main({ username: 'Ana' }), main({ username: 'Bo' }))
  assert.equal(P(ab).username, 'Ana')
  assert.equal(P(ba).username, 'Bo')
  ;[ab, ba] = both(MAIN_KEY, main({ username: '  ' }), main({ username: 'Bo' }))
  assert.equal(P(ab).username, 'Bo')
  assert.equal(P(ba).username, 'Bo')
})

test('main save: fields this file does not know yet use the fallback', () => {
  const [ab, ba] = both(MAIN_KEY, main({ futureCount: 3, futureList: ['a'], futureFlag: 'x' }), main({ futureCount: 7, futureList: ['b'], futureFlag: 'y' }))
  assert.equal(P(ab).futureCount, 7)
  assert.deepEqual(P(ab).futureList, ['a', 'b'])
  assert.equal(P(ab).futureFlag, 'x')
  assert.equal(P(ba).futureFlag, 'y')
})

// ── every other key ─────────────────────────────────────────────────────────

test('best scores: the higher one, per tier when there are several', () => {
  for (const key of ['globalio_hl_best', 'globalio_doa_best', 'globalio_realorbot_best', 'globalio_forgery_best', 'globalio_spoterror_best', 'globalio_statclash_best', 'globalio_prideroulette_best', 'globalio_prideroulette_best_20', 'globalio_frankenflag_best']) {
    assert.deepEqual(both(key, '4', '11'), ['11', '11'], key)
    assert.equal(ruleFor(key).rule, 'max', key)
  }
  for (const id of ['flagfusion', 'citiesabroad', 'countriesabroad', 'nativenames', 'demonyms']) {
    const [ab, ba] = both(`globalio_${id}_best`, S({ easy: 5, hard: 50 }), S({ easy: 9, medium: 1 }))
    assert.equal(ab, ba)
    assert.deepEqual(P(ab), { easy: 9, hard: 50, medium: 1 })
  }
  assert.deepEqual(both('globalio_total_plays', '9', '3'), ['9', '9'])
})

test('days in progress: the later day, then the one further along', () => {
  assert.deepEqual(both('globalio_daily_progress', S({ date: '2026-11-25', answers: ['correct', 'wrong'] }), S({ date: '2026-11-24', answers: ['correct'] })).map(P).map(v => v.date), ['2026-11-25', '2026-11-25'])
  assert.deepEqual(both('globalio_daily_progress', S({ date: '2026-11-25', answers: ['correct'] }), S({ date: '2026-11-25', answers: ['correct', 'wrong', 'wrong'] })).map(P).map(v => v.answers.length), [3, 3])
  const c1 = S({ date: '2026-11-25', n: 40, history: [['a', 'b', 'c', 'd']], hints: [] })
  const c2 = S({ date: '2026-11-25', n: 40, history: [['a', 'b', 'c', 'd'], ['e', 'f', 'g', 'h']], hints: [] })
  assert.deepEqual(both('globalio_connections_v2', c1, c2), [c2, c2])
  assert.deepEqual(both('globalio_flagle_v1', S({ date: '2026-11-25', codes: ['FR'] }), S({ date: '2026-11-26', codes: [] })).map(P).map(v => v.date), ['2026-11-26', '2026-11-26'])
  const [a1, a2] = both('globalio_atlas_daily', S({ day: '2026-11-25', id: 'x', guess: 1900 }), S({ day: '2026-11-25', id: 'x', guess: 1910 }))
  assert.equal(a1, a2, 'two guesses on the same day: the same one either way round')
})

test('gacha: every flag, the higher XP, a spent pull stays spent', () => {
  const key = 'globalio_gacha'
  let [ab, ba] = both(key, S({ collected: ['A', 'B'], xp: 50, tokens: 1, lastDaily: '2026-11-26', seeded: true }), S({ collected: ['C'], xp: 90, tokens: 0, lastDaily: '2026-11-26' }))
  assert.equal(ab, ba)
  assert.deepEqual(P(ab), { collected: ['A', 'B', 'C'], xp: 90, tokens: 0, lastDaily: '2026-11-26', seeded: true })
  ;[ab, ba] = both(key, S({ collected: [], xp: 0, tokens: 1, lastDaily: '2026-11-26' }), S({ collected: ['C'], xp: 25, tokens: 0, lastDaily: '2026-11-25' }))
  assert.equal(ab, ba)
  assert.equal(P(ab).tokens, 1, "today's unused pull beats yesterday's spent one")
})

test('Flag Studio: every design, newer edit wins, the open one stays', () => {
  const key = 'globalio_flagstudio_v1'
  const local = S({ current: null, saved: [design('a', 'A new', 900), design('b', 'B', 100)] })
  const incoming = S({ current: design('c', 'C', 50), saved: [design('a', 'A old', 200), design('c', 'C', 50)] })
  const out = P(merge({ [key]: local }, { [key]: incoming })[key])
  assert.deepEqual(out.saved.map(d => d.name), ['A new', 'B', 'C'])
  assert.equal(out.current.id, 'c', 'an empty canvas takes the backup\'s open design')
  const many = n => S({ current: null, saved: Array.from({ length: n }, (_, i) => design(`x${i}`, `X${i}`, i)) })
  assert.equal(P(merge({ [key]: many(50) }, { [key]: S({ current: null, saved: Array.from({ length: 30 }, (_, i) => design(`y${i}`, `Y${i}`, 100 + i)) }) })[key]).saved.length, 60)
})

test('tier lists and Atlas guesses: everything placed, this device\'s on a clash', () => {
  assert.deepEqual(P(merge({ globalio_tierlist_World: S({ FR: 'S' }) }, { globalio_tierlist_World: S({ FR: 'C', DE: 'B' }) }).globalio_tierlist_World), { DE: 'B', FR: 'S' })
  assert.deepEqual(P(merge({ 'globalio_tierlist_North America': S({}) }, { 'globalio_tierlist_North America': S({ US: 'A' }) })['globalio_tierlist_North America']), { US: 'A' })
  assert.deepEqual(P(merge({ globalio_atlas_played: S({ m1: 1900 }) }, { globalio_atlas_played: S({ m1: 1700, m2: 1800 }) }).globalio_atlas_played), { m1: 1900, m2: 1800 })
})

test('settings, recents and seen-it flags stay this device\'s', () => {
  for (const key of ['globalio_flagfusion_prefs', 'globalio_nativenames_prefs', 'globalio_demonyms_prefs', 'globalio_recent_games', 'globalio_flashcard_recent', 'globalio_onboarded', 'globalio_fs_shuffle_hint', 'globalio_creator']) {
    assert.equal(ruleFor(key).rule, 'device', key)
    assert.equal(merge({ [key]: '"mine"' }, { [key]: '"theirs"' })[key], '"mine"', key)
    assert.equal(merge({}, { [key]: '"theirs"' })[key], '"theirs"', `${key}: filled in when this device has none`)
  }
})

test('unknown keys: numbers max, lists union, objects merged, anything else local', () => {
  assert.equal(merge({ x: '3' }, { x: '8' }).x, '8')
  assert.equal(merge({ x: S(['b', 'a']) }, { x: S(['c', 'a']) }).x, S(['a', 'b', 'c']))
  assert.equal(merge({ x: S({ n: 1, s: 'mine', o: { k: [1] } }) }, { x: S({ n: 4, s: 'theirs', o: { k: [2] }, z: true }) }).x,
    S({ n: 4, o: { k: [1, 2] }, s: 'mine', z: true }))
  assert.equal(merge({ x: 'plain text' }, { x: 'other text' }).x, 'plain text')
  assert.equal(merge({ x: 'true' }, { x: 'false' }).x, 'true')
  assert.equal(merge({}, { x: 'new' }).x, 'new')
  assert.equal(merge({ x: 'kept' }, {}).x, 'kept')
})

test('malformed values never crash and never beat good ones', () => {
  const bad = ['{', 'undefined', 'NaN', '[1,', '', '"unterminated', '{"a":1}}']
  for (const b of bad) {
    for (const key of [MAIN_KEY, 'globalio_hl_best', 'globalio_gacha', 'globalio_flagstudio_v1', 'globalio_flagle_v1', 'globalio_tierlist_World', 'x']) {
      const good = key === MAIN_KEY ? main({ learnedFlags: ['FR'] }) : key === 'globalio_hl_best' ? '5' : S({ collected: ['FR'], saved: [], date: '2026-11-25', codes: [] })
      assert.doesNotThrow(() => merge({ [key]: b }, { [key]: good }))
      assert.doesNotThrow(() => merge({ [key]: good }, { [key]: b }))
      assert.equal(merge({ [key]: good }, { [key]: b })[key], good, `${key}: a bad backup value is ignored`)
    }
  }
  // Neither parses: this device's text stays as it is.
  assert.equal(merge({ globalio_hl_best: '{' }, { globalio_hl_best: '[' }).globalio_hl_best, '{')
  // Only this device's is bad: the backup's good value repairs it.
  assert.equal(merge({ globalio_hl_best: '{' }, { globalio_hl_best: '9' }).globalio_hl_best, '9')
  // A main save that parses but has wrong shapes still merges.
  const m = mainOf(merge({ [MAIN_KEY]: S({ learnedFlags: 5, dailyHistory: [1], currentStreak: 'x', lastDailyDate: 7 }) }, { [MAIN_KEY]: main({ learnedFlags: ['FR'], currentStreak: 2, longestStreak: 2, lastDailyDate: '2026-11-25' }) }))
  assert.deepEqual(m.learnedFlags, ['FR'])
  assert.equal(m.currentStreak, 2)
  assert.equal(m.lastDailyDate, '2026-11-25')
  // Garbage inputs.
  for (const g of [null, undefined, 5, 'x', [], { a: 5 }]) assert.doesNotThrow(() => merge(g, g))
  assert.deepEqual(merge(null, { a: '1' }), { a: '1' })
  // Keys that look like object internals stay ordinary keys.
  const proto = merge({ __proto__x: '1', constructor: '2' }, JSON.parse('{"__proto__": "3", "toString": "4"}'))
  assert.equal(proto.constructor, '2')
  assert.equal(Object.getPrototypeOf(proto), Object.prototype)
  assert.equal(Object.hasOwn(proto, '__proto__'), true)
  const hist = mainOf(merge({ [MAIN_KEY]: main({ dailyHistory: JSON.parse('{"__proto__": {"score": 1}}') }) }, { [MAIN_KEY]: main({ dailyHistory: { toString: { score: 2 } }, lastDailyDate: 'constructor', currentStreak: 1 }) })).dailyHistory
  assert.deepEqual(Object.keys(hist).sort(), ['__proto__', 'toString'])
})

test('symmetry and idempotence hold for every symmetric rule', () => {
  const pairs = [
    [{ globalio_hl_best: '3', globalio_flagfusion_best: S({ easy: 1 }) }, { globalio_hl_best: '9', globalio_flagfusion_best: S({ easy: 7, hard: 2 }) }],
    [{ globalio_gacha: S({ collected: ['b'], xp: 1, tokens: 1, lastDaily: '2026-11-26' }) }, { globalio_gacha: S({ collected: ['a'], xp: 2, tokens: 0, lastDaily: '2026-11-26' }) }],
    [{ globalio_flagle_v1: S({ date: 'x', codes: ['A'] }) }, { globalio_flagle_v1: S({ date: 'x', codes: ['B'] }) }],
    [{ globalio_connections_v2: S({ date: '2026-11-26', n: 2, history: [] }) }, { globalio_connections_v2: S({ date: '2026-11-26', n: 1, history: [['a']] }) }],
    [{ [MAIN_KEY]: main({ learnedFlags: ['Z', 'A'], dailyHistory: { '2026-01-01': daily('2026-01-01', 3) } }) }, { [MAIN_KEY]: main({ learnedFlags: ['A'] }) }],
    [{ x: S([3, 1]), y: '2' }, { x: S([2]), y: '1' }],
  ]
  for (const [a, b] of pairs) { assertSymmetric(a, b); assertIdempotent(a, b); assertIdempotent(b, a) }
  // A key whose value doesn't change keeps its exact text.
  assert.equal(merge({ globalio_flagfusion_best: '{ "easy": 5 }' }, { globalio_flagfusion_best: '{"easy":3}' }).globalio_flagfusion_best, '{ "easy": 5 }')
  assert.equal(merge({ globalio_flagfusion_best: '{"easy":3}' }, { globalio_flagfusion_best: '{ "easy": 5 }' }).globalio_flagfusion_best, '{ "easy": 5 }')
})

test('every key the app writes has a merge rule', () => {
  const files = []
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p) } }
  walk(path.join(ROOT, 'src'))
  const SESSION_ONLY = new Set(['globalio_codex_view']) // sessionStorage, never in a backup
  const keys = new Set()
  for (const f of files) {
    if (f.endsWith('mergeProgress.ts')) continue
    for (const [, k] of fs.readFileSync(f, 'utf8').matchAll(/["'](globalio_[a-z0-9_]+|dailyglobe_v1)["']/g)) if (!SESSION_ONLY.has(k)) keys.add(k)
  }
  // Keys built from a template, with example values.
  for (const k of ['globalio_tierlist_Europe', 'globalio_prideroulette_best_30', 'globalio_citiesabroad_best', 'globalio_citiesabroad_prefs', 'globalio_countriesabroad_best', 'globalio_nativenames_prefs', 'globalio_demonyms_best', 'globalio_demonyms_prefs']) keys.add(k)
  assert.ok(keys.size >= 25, `found only ${keys.size} keys`)
  for (const k of keys) assert.ok(ruleFor(k), `${k} has no rule: add one to RULES in src/utils/mergeProgress.ts (the fallback may already be right; a rule says so)`)
  for (const r of RULES) assert.ok(r.note.length > 5)
})

// ── the restore flow ────────────────────────────────────────────────────────

test('readBackup accepts real codes only and touches nothing', () => {
  const code = codeFor(PHONE)
  const store = useStorage(DESKTOP)
  assert.deepEqual(B.readBackup(code), PHONE)
  assert.deepEqual(B.readBackup(`  ${code.slice(0, 40)}\n${code.slice(40)}\n`), PHONE, 'line-wrapped codes still read')
  for (const bad of ['', 'hello', 'GLOBALIO1:', 'GLOBALIO1:!!!', 'GLOBALIO1:' + btoa('[1,2]'), 'GLOBALIO1:' + btoa(S({ a: 'b' })), 'GLOBALIO1:' + btoa(S({ [MAIN_KEY]: 5 })), null, undefined, 42]) {
    assert.equal(B.readBackup(bad), null, String(bad))
  }
  assert.deepEqual(store.dump(), DESKTOP)
})

test('Combine merges the backup into this device', () => {
  const code = codeFor(PHONE)
  const store = useStorage(DESKTOP)
  const r = B.restoreBackup(B.readBackup(code), 'combine')
  assert.ok(r)
  assert.deepEqual(r.before, DESKTOP)
  assert.deepEqual(store.dump(), merge(DESKTOP, PHONE))
  assert.equal(mainOf(store.dump()).learnedFlags.length, 6)
  assert.equal(store.dump().globalio_recent_games, DESKTOP.globalio_recent_games)
  // Combining the same backup again changes nothing; a second device's adds to it.
  const once = store.dump()
  B.restoreBackup(B.readBackup(code), 'combine')
  assert.deepEqual(store.dump(), once)
  B.restoreBackup({ [MAIN_KEY]: main({ learnedFlags: ['KE'] }) }, 'combine')
  assert.equal(mainOf(store.dump()).learnedFlags.length, 7)
})

test('Replace still replaces', () => {
  const code = codeFor(PHONE)
  const store = useStorage({ ...DESKTOP, only_on_this_device: '1' })
  const r = B.restoreBackup(B.readBackup(code), 'replace')
  assert.ok(r)
  assert.deepEqual(store.dump(), PHONE)
  // The old entry point does the same.
  useStorage(DESKTOP)
  assert.equal(B.importProgress(code), true)
  assert.deepEqual(globalThis.localStorage.dump(), PHONE)
})

test('a bad backup or a full disk never wipes this device', () => {
  const store = useStorage(DESKTOP)
  assert.equal(B.importProgress('not a code'), false)
  assert.equal(B.restoreBackup({ nope: '1' }, 'combine'), null)
  assert.equal(B.restoreBackup(null, 'replace'), null)
  assert.deepEqual(store.dump(), DESKTOP)
  // Storage fills up part-way through writing the combined save: put back as it was.
  store.quota = store.size + 50
  assert.equal(B.restoreBackup(PHONE, 'combine'), null)
  assert.equal(B.restoreBackup({ ...PHONE, big: 'x'.repeat(store.size) }, 'replace'), null)
  store.quota = Infinity
  assert.deepEqual(store.dump(), DESKTOP)
})

test('a backup made after a combine round-trips', () => {
  useStorage(merge(PHONE, DESKTOP))
  const code = B.exportProgress()
  assert.deepEqual(B.readBackup(code), merge(PHONE, DESKTOP))
})

test('changelog announces it', () => {
  assert.ok(CHANGELOG.some(e => e.date === '2026-11-26' && /^Combine backups/.test(e.title)))
})

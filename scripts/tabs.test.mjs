// The home tabs: streak shown in the header, Codex search, crown sets and the
// daily/weekly shelves.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { FLAGS } = await src('data/flags.ts')
const { displayStreak, recordDailyResult } = await src('utils/storage.ts')
const { matchNames } = await src('utils/pickOnEnter.ts')
const { trendingGames, discoverGames, topGames } = await src('ui/registry.ts')

const day = (date, score = 7) => ({ score, total: 10, date, answers: [] })

test('the streak shows 0 once a day is missed, before the next daily', () => {
  let s = { currentStreak: 0, longestStreak: 0, lastDailyDate: null, dailyHistory: {} }
  assert.equal(displayStreak(s, '2026-03-01'), 0)
  s = recordDailyResult(s, day('2026-03-01'))
  s = recordDailyResult(s, day('2026-03-02'))
  assert.equal(displayStreak(s, '2026-03-02'), 2)  // played today
  assert.equal(displayStreak(s, '2026-03-03'), 2)  // today still to play
  assert.equal(displayStreak(s, '2026-03-04'), 0)  // missed the 3rd
  assert.equal(s.currentStreak, 2)                  // the stored value is untouched
  // Month and year boundaries.
  s = recordDailyResult(s, day('2026-12-31'))
  assert.equal(displayStreak(s, '2027-01-01'), 1)
  assert.equal(displayStreak(s, '2027-01-02'), 0)
})

// The Codex filters countries with matchNames(FLAGS, q, FLAGS.length).
const finds = (q, code) => matchNames(FLAGS, q, FLAGS.length).some(f => f.code === code)

test('Codex search finds countries by other names and without accents', () => {
  const cases = {
    cote: 'CI', ivory: 'CI', 'sao tome': 'ST', usa: 'US', uk: 'GB', britain: 'GB',
    holland: 'NL', czechia: 'CZ', turkiye: 'TR', burma: 'MM', drc: 'CD', 'Côte': 'CI',
  }
  for (const [q, code] of Object.entries(cases)) assert.ok(finds(q, code), `"${q}" should find ${code}`)
})

test('Codex search returns every match, not just the first few', () => {
  const hits = matchNames(FLAGS, 'guinea', FLAGS.length).map(f => f.code).sort()
  assert.deepEqual(hits, ['GN', 'GQ', 'GW', 'PG'])
})

test('trending leads with every featured game before any other', () => {
  for (let week = 2900; week < 2960; week++) {
    const deck = trendingGames(week, 30)
    const firstPlain = deck.findIndex(e => !e.featured)
    assert.ok(firstPlain > 0)
    assert.ok(deck.slice(firstPlain).every(e => !e.featured), `week ${week}`)
  }
})

test('daily and weekly shelves change from one day or week to the next', () => {
  const ids = list => list.map(e => e.id).join()
  let topChanges = 0, discoverChanges = 0, trendChanges = 0
  for (let d = 20000; d < 20030; d++) {
    if (ids(topGames(d)) !== ids(topGames(d + 1))) topChanges++
    if (ids(discoverGames([], d)) !== ids(discoverGames([], d + 1))) discoverChanges++
    if (ids(trendingGames(d)) !== ids(trendingGames(d + 1))) trendChanges++
  }
  assert.equal(topChanges, 30)
  assert.equal(discoverChanges, 30)
  assert.equal(trendChanges, 30)
  // Same seed, same order: a day's picks are stable.
  assert.equal(ids(topGames(20000)), ids(topGames(20000)))
})

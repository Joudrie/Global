// Patch notes in the app (src/utils/patchNotes.ts): the changelog grouped by
// day, which entries a player hasn't read, the Today line, and the merge rule
// for what has been read.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const P = await src('utils/patchNotes.ts')
const { CHANGELOG } = await src('data/changelog.ts')
const { REGISTRY, GAMES } = await src('ui/registry.ts')
const { mergeSnapshots: merge, ruleFor } = await src('utils/mergeProgress.ts')
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')

const e = (date, title) => ({ date, title, items: [`${title} item`] })
// Newest first, as in the changelog.
const LOG = [
  e('2026-11-27', 'C3'), e('2026-11-27', 'C2'), e('2026-11-27', 'C1'),
  e('2026-11-24', 'B1'),
  e('2026-11-14', 'A2'), e('2026-11-14', 'A1'),
]
const titles = flags => LOG.filter((_, i) => flags[i]).map(x => x.title)

test('entries group into one patch per day, newest day first, in changelog order', () => {
  const patches = P.groupPatches(LOG)
  assert.deepEqual(patches.map(p => p.date), ['2026-11-27', '2026-11-24', '2026-11-14'])
  assert.deepEqual(patches.map(p => p.entries.map(x => x.entry.title)), [['C3', 'C2', 'C1'], ['B1'], ['A2', 'A1']])
  assert.deepEqual(patches.flatMap(p => p.entries.map(x => x.index)), [0, 1, 2, 3, 4, 5])
  // An entry filed out of order still lands in its own day.
  assert.deepEqual(P.groupPatches([e('2026-01-02', 'x'), e('2026-01-01', 'y'), e('2026-01-02', 'z')]).map(p => p.entries.length), [2, 1])
})

test('the real changelog: every entry in exactly one patch, days newest first', () => {
  const patches = P.groupPatches(CHANGELOG)
  assert.equal(patches.reduce((n, p) => n + p.entries.length, 0), CHANGELOG.length)
  for (let i = 1; i < patches.length; i++) assert.ok(patches[i - 1].date > patches[i].date)
  for (const p of patches) assert.ok(p.entries.every(x => x.entry.date === p.date && CHANGELOG[x.index] === x.entry))
})

test('unread: a player who never opened the notes gets the newest week, not the whole history', () => {
  assert.equal(P.weekStart(LOG), '2026-11-21')
  assert.deepEqual(titles(P.unseenFlags(LOG, null)), ['C3', 'C2', 'C1', 'B1'])
  assert.equal(P.unseenCount(LOG, null), 4)
})

test('unread: after reading everything, only entries added since', () => {
  const seen = P.seenAll(LOG)
  assert.deepEqual(seen, { date: '2026-11-27', count: 3 })
  assert.equal(P.unseenCount(LOG, seen), 0)
  // Two more the same day go on top: those two are new.
  const more = [e('2026-11-27', 'C5'), e('2026-11-27', 'C4'), ...LOG]
  assert.deepEqual(P.unseenFlags(more, seen).map((u, i) => u && more[i].title).filter(Boolean), ['C5', 'C4'])
  // A new day: all of it is new.
  const later = [e('2026-12-02', 'D2'), e('2026-12-02', 'D1'), ...LOG]
  assert.equal(P.unseenCount(later, seen), 2)
  // Read up to B1 only: the whole 27th is new.
  assert.deepEqual(titles(P.unseenFlags(LOG, { date: '2026-11-24', count: 1 })), ['C3', 'C2', 'C1'])
  // Read one of the three on the 27th: the two newer ones are new.
  assert.deepEqual(titles(P.unseenFlags(LOG, { date: '2026-11-27', count: 1 })), ['C3', 'C2'])
  // A record from the future (another device on a newer build) hides nothing it shouldn't.
  assert.equal(P.unseenCount(LOG, { date: '2027-01-01', count: 1 }), 0)
})

test('the stored value: read safely, and never moves backwards', () => {
  assert.deepEqual(P.readSeen('{"date":"2026-11-27","count":4}'), { date: '2026-11-27', count: 4 })
  for (const bad of [null, '', '{', '5', '[]', '{"date":"x","count":1}', '{"date":"2026-11-27"}', '{"date":"2026-11-27","count":-1}', '{"date":"2026-11-27","count":1.5}']) {
    assert.equal(P.readSeen(bad), null, String(bad))
  }
  const a = { date: '2026-11-27', count: 2 }, b = { date: '2026-11-27', count: 5 }, c = { date: '2026-11-24', count: 9 }
  assert.equal(P.laterSeen(a, b), b)
  assert.equal(P.laterSeen(b, a), b)
  assert.equal(P.laterSeen(c, a), a)
  assert.equal(P.laterSeen(null, c), c)
})

test('merging two devices keeps the one that has read further', () => {
  const key = P.SEEN_KEY
  assert.equal(key, 'globalio_patchnotes_seen')
  assert.equal(ruleFor(key).rule, 'patchNotes')
  assert.equal(ruleFor(key).symmetric, true)
  const S = JSON.stringify
  const both = (x, y) => [merge({ [key]: x }, { [key]: y })[key], merge({ [key]: y }, { [key]: x })[key]]
  const a = S({ date: '2026-11-27', count: 2 }), b = S({ date: '2026-11-27', count: 12 }), c = S({ date: '2026-11-24', count: 30 })
  assert.deepEqual(both(a, b), [b, b], 'same day: the higher count, not the one that sorts last as text')
  assert.deepEqual(both(c, a), [a, a], 'the later day wins over a higher count')
  assert.deepEqual(both(a, '{'), [a, a], 'a broken value never wins')
  assert.deepEqual(both(a, S({ date: '2026-12-01' })), [a, a], 'nor one missing its count')
  // Idempotent.
  assert.equal(merge({ [key]: both(a, b)[0] }, { [key]: a })[key], b)
})

test('the Today line names new games first and counts the rest', () => {
  const log = [
    e('2026-11-27', 'Coats of arms in the Codex (beta)'),
    e('2026-11-27', 'Flag Bracket: mix any continents'),
    e('2026-11-27', 'New game: Demonyms'),
    e('2026-11-26', 'Sign in with an email link'),
    e('2026-11-01', 'Old news'),
  ]
  const names = REGISTRY.map(r => r.title)
  assert.deepEqual(P.headline(log, '2026-11-27', names), { label: 'New this week', names: 'Demonyms, coats of arms in the Codex', more: ' and 2 more' })
  assert.equal(P.headline(log, '2026-12-20', names).label, 'Latest updates', 'over a week since the last change')
  assert.deepEqual(P.headline(log, '2026-11-27', names, 1), { label: 'New this week', names: 'Demonyms', more: ' and 3 more' }, 'one name when two do not fit')
  assert.deepEqual(P.headline(log.slice(0, 2), '2026-11-27', names), { label: 'New this week', names: 'coats of arms in the Codex and Flag Bracket', more: '' })
  assert.deepEqual(P.headline(log.slice(2, 3), '2026-11-27', names), { label: 'New this week', names: 'Demonyms', more: '' })
  // Names keep their capitals; sentence-case phrases read inside the sentence.
  assert.equal(P.shortName('Two new games: Countries Abroad and Native Names', names), 'Countries Abroad and Native Names')
  assert.equal(P.shortName('Gauntlet progress, faster Dead or Alive', names), 'Gauntlet progress')
  assert.equal(P.shortName('A paint bucket for Sketch the Flag, and levels in Tile Flipper', names), 'a paint bucket for Sketch the Flag')
  assert.equal(P.shortName('“Did you mean…?”, a fairer Build the Flag', names), '“Did you mean…?”')
  // The real changelog makes a line, and the line counts the newest week.
  const h = P.headline(CHANGELOG, CHANGELOG[0].date, names)
  assert.ok(h.names.length > 0)
  const week = CHANGELOG.filter(x => x.date >= P.weekStart(CHANGELOG)).length
  assert.equal(h.more, week > 2 ? ` and ${week - 2} more` : '')
})

test('an entry links to a game only when its title names exactly one', () => {
  const linkable = REGISTRY.filter(r => !r.action)
  const id = t => P.gameFor(t, linkable)?.id ?? null
  assert.equal(id('New game: Demonyms'), 'demonyms')
  assert.equal(id('Flag Bracket: mix any continents and Codex sections'), 'flagbracket')
  assert.equal(id('Flag Studio: mix two flags'), 'flagstudio')
  assert.equal(id('New: Flag Identifier'), 'flagidentifier')
  assert.equal(id('Province Roulette and Subdivision Stumper are now two different games'), null)
  assert.equal(id('Gauntlet progress, faster Dead or Alive, records in The Peel, fairer Real or Bot'), null)
  assert.equal(id('Coats of arms in the Codex (beta)'), null)
  assert.equal(id('Lineage scores double when you type, and the Tier List gets eight new lists'), null, '"the Tier List" is a second game')
  assert.equal(id('Faster on phones, sharper forgeries'), null, 'a lower-case word is not the game Flag Forgery')
  // Every link points at a screen that exists.
  for (const x of CHANGELOG) { const g = P.gameFor(x.title, linkable); if (g) assert.ok(REGISTRY.includes(g)) }
})

test('patch notes open from Today, Settings and ?play=patchnotes, and are not a game', () => {
  const entry = CHANGELOG.find(e => e.title === 'Patch notes in the app')
  assert.ok(entry, 'the feature has its own changelog entry')
  assert.equal(entry.date, '2026-11-27')
  assert.equal(entry.items.length, 1)
  assert.ok(!REGISTRY.some(r => r.id === 'patchnotes'), 'not in the registry, so not in GAMES, GAME_COUNT or the game counts')
  assert.ok(!GAMES.some(r => r.id === 'patchnotes'))
  const app = read('src/App.tsx')
  assert.match(app, /screen === "patchnotes"/)
  assert.match(app, /id === "patchnotes"\) return id/)
  assert.match(app, /lazy\(\(\) => import\(".\/components\/PatchNotesScreen"\)\)/)
  assert.match(read('src/components/MainTabs.tsx'), /<PatchNotesStrip onOpen=\{\(\) => onNavigate\("patchnotes"\)\} \/>/)
  assert.match(read('src/components/SettingsScreen.tsx'), /onClick=\{onPatchNotes\}/)
  assert.match(read('src/components/PatchNotesScreen.tsx'), /href="\/whats-new\/"/)
})

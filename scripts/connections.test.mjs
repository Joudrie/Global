// Unit tests for the Connections rules (src/utils/connections.ts), ported
// from the ConnecSeans tests, plus the daily pick and a few fact checks.
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const G = await import(path.join(ROOT, 'src/utils/connections.ts'))
const { evaluate } = await import(path.join(ROOT, 'src/utils/connectionsRules.ts'))
const { FACTS } = await import(path.join(ROOT, 'src/data/countryFacts.ts'))
const { PUZZLES } = await import(path.join(ROOT, 'src/data/connectionsPuzzles.ts'))

const SAMPLE = {
  groups: [
    { name: 'Things Dave lost', why: 'All in one weekend.', words: ['Keys', 'Wallet', 'Dignity', 'Kayak'] },
    { name: 'Nicknames for the car', why: '', words: ['Big Blue', 'The Tank', 'Grandma', 'Old Faithful'] },
    { name: 'Banned words', why: 'Rule 4.', words: ['Moist', 'Synergy', 'Vibes', 'Crunchy'] },
    { name: 'Karaoke songs', why: '', words: ['Mr. Brightside', 'Toxic', 'Africa', 'Wannabe'] },
  ],
}
const plain = (x) => JSON.parse(JSON.stringify(x))

test('every listed puzzle is playable', () => {
  assert.equal(PUZZLES.length, 52)
  for (const p of PUZZLES) assert.deepEqual(G.problems(p), [])
})

test('problems: missing words, duplicates across groups, long words', () => {
  const p = plain(SAMPLE)
  p.groups[0].words[3] = ' '
  p.groups[2].words[0] = 'toxic'
  p.groups[1].name = ''
  p.groups[3].words[0] = 'x'.repeat(50)
  const out = G.problems(p).join('\n')
  assert.match(out, /Group 1 needs four words/)
  assert.match(out, /Group 2 needs a connection/)
  assert.match(out, /"toxic" is in two groups/i)
  assert.match(out, /won't fit on a tile/)
  assert.deepEqual(G.problems(SAMPLE), [])
})

test('check: correct, one away, wrong and repeated guesses', () => {
  assert.deepEqual(G.check(SAMPLE, ['kayak', 'Keys', 'Wallet', 'Dignity']), { result: 'correct', group: 0 })
  assert.equal(G.check(SAMPLE, ['Keys', 'Wallet', 'Dignity', 'Toxic']).result, 'one-away')
  assert.equal(G.check(SAMPLE, ['Keys', 'Wallet', 'Moist', 'Toxic']).result, 'wrong')
  const past = [['Keys', 'Wallet', 'Moist', 'Toxic']]
  assert.equal(G.check(SAMPLE, ['Toxic', 'Moist', 'Wallet', 'Keys'], past).result, 'repeat')
})

test('state: four mistakes lose, repeats are free, four groups win', () => {
  const wrong = [['Keys', 'Wallet', 'Moist', 'Toxic'], ['Keys', 'Big Blue', 'Moist', 'Toxic'], ['Wallet', 'Big Blue', 'Moist', 'Toxic']]
  let s = G.state(SAMPLE, [...wrong, wrong[0]])
  assert.equal(s.mistakes, 3)
  assert.equal(s.over, false)
  s = G.state(SAMPLE, [...wrong, ['Dignity', 'Grandma', 'Vibes', 'Africa']])
  assert.equal(s.lost, true)
  assert.equal(s.left, 0)
  s = G.state(SAMPLE, [wrong[0], ...[3, 1, 0, 2].map((g) => SAMPLE.groups[g].words)])
  assert.deepEqual(s.solved, [3, 1, 0, 2])
  assert.equal(s.won, true)
  assert.equal(s.mistakes, 1)
})

test('share text: a square per word, repeats left out, no URL when none given', () => {
  const h = [['Keys', 'Wallet', 'Dignity', 'Toxic'], ['Toxic', 'Keys', 'Wallet', 'Dignity'], SAMPLE.groups[0].words]
  const lines = G.shareText(SAMPLE, h, 'Title', 'https://x.test/').split('\n')
  assert.equal(lines[0], 'Title')
  assert.equal(lines[1], 'Found 1 of 4 groups')
  assert.equal(lines[2], '\u{1F7E8}\u{1F7E8}\u{1F7E8}\u{1F7EA}')
  assert.equal(lines[3], '\u{1F7E8}'.repeat(4))
  assert.equal(lines[4], 'https://x.test/')
  assert.equal(G.shareText(SAMPLE, h, 'Title').split('\n').length, 4)
})

test('shuffle keeps every word', () => {
  const words = SAMPLE.groups.flatMap((g) => g.words)
  assert.deepEqual(G.shuffle(words).sort(), words.slice().sort())
})

test('daily pick: 2026-09-29 is #1, then one a day, wrapping after 52', () => {
  assert.equal(G.puzzleIndex('2026-09-29', 52), 0)
  assert.equal(G.puzzleIndex('2026-09-30', 52), 1)
  assert.equal(G.puzzleIndex('2026-11-19', 52), 51)
  assert.equal(G.puzzleIndex('2026-11-20', 52), 0)
  assert.equal(G.puzzleIndex('2026-09-28', 52), 51)
  // Across a daylight-saving change (late March / late October).
  assert.equal(G.daysSinceEpoch('2027-03-29') - G.daysSinceEpoch('2027-03-27'), 2)
})

test('facts: 44 landlocked UN members plus Kosovo; the crescent list is strict', () => {
  const all = [...FACTS.landlocked.yes, ...FACTS.landlocked.maybe]
  assert.equal(all.length, 45)
  for (const c of ['TD', 'ET', 'XK', 'SS', 'LI', 'UZ']) assert.equal(evaluate({ type: 'fact', id: 'landlocked' }, c), 'yes', c)
  for (const c of ['SA', 'KZ', 'AF', 'BN']) assert.notEqual(evaluate({ type: 'fact', id: 'flagCrescent' }, c), 'yes', c)
})

test('rules: borders, name rules and capitals', () => {
  assert.equal(evaluate({ type: 'borders', code: 'RU' }, 'PL'), 'yes')
  assert.equal(evaluate({ type: 'borders', code: 'RU' }, 'AM'), 'no')
  assert.equal(evaluate({ type: 'borders', code: 'MA' }, 'ES'), 'maybe')
  assert.equal(evaluate({ type: 'containsCountry' }, 'RO'), 'yes') // Oman
  assert.equal(evaluate({ type: 'containsCountry' }, 'NE'), 'no')
  assert.equal(evaluate({ type: 'nameLength', n: 4 }, 'CU'), 'yes')
  assert.equal(evaluate({ type: 'capitalStarts', letter: 'B' }, 'HU'), 'yes')
  assert.equal(evaluate({ type: 'capitalStarts', letter: 'L' }, 'BO'), 'maybe') // Sucre / La Paz
  assert.equal(evaluate({ type: 'neighbours', n: 1 }, 'PT'), 'yes')
  assert.equal(evaluate({ type: 'neighbours', n: 1 }, 'GB'), 'maybe') // Gibraltar
})

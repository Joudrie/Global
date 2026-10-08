// Unit tests for the Connections rules (src/utils/connections.ts), ported
// from the ConnecSeans tests, plus mixed tile kinds, the daily pick, the
// uniqueness rules and a few fact checks.
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const G = await import(path.join(ROOT, 'src/utils/connections.ts'))
const TL = await import(path.join(ROOT, 'src/utils/connectionsTiles.ts'))
const { evaluate } = await import(path.join(ROOT, 'src/utils/connectionsRules.ts'))
const { FACTS } = await import(path.join(ROOT, 'src/data/countryFacts.ts'))
const { ENDONYMS } = await import(path.join(ROOT, 'src/data/endonyms.ts'))
const { PUZZLES } = await import(path.join(ROOT, 'src/data/connectionsPuzzles.ts'))

const tiles = (kind, codes) => codes.split(' ').map((code) => ({ kind, code }))
// A mixed board: Union Jack flags, Nordic local names, Danube capitals and
// countries in the G7.
const SAMPLE = {
  groups: [
    { name: 'Union Jack', why: 'In the corner.', tiles: tiles('flag', 'AU NZ FJ TV') },
    { name: 'Nordic', why: 'Their own names.', tiles: tiles('native', 'DK NO SE IS') },
    { name: 'Danube', why: 'On the river.', tiles: tiles('capital', 'AT SK HU RS') },
    { name: 'G7', why: 'Rich club.', tiles: tiles('country', 'CA FR DE JP') },
  ],
}
const ids = (g) => SAMPLE.groups[g].tiles.map(G.tileId)
const [A, B, C, D] = [0, 1, 2, 3].map(ids)
const plain = (x) => JSON.parse(JSON.stringify(x))

test('every listed puzzle is playable, mixes at least three kinds, and every tile can be shown', () => {
  assert.equal(PUZZLES.length, 52)
  for (const [i, p] of PUZZLES.entries()) {
    assert.deepEqual(G.problems(p), [], `#${i + 1}`)
    assert.deepEqual(TL.tileProblems(p.groups.flatMap((g) => g.tiles)), [], `#${i + 1}`)
    assert.ok(new Set(p.groups.map((g) => g.tiles[0].kind)).size >= 3, `#${i + 1} needs three kinds`)
  }
})

test('problems: missing tiles, mixed kinds, duplicates across groups', () => {
  const p = plain(SAMPLE)
  p.groups[0].tiles.pop()
  p.groups[1].tiles[0] = { kind: 'capital', code: 'DK' }
  p.groups[2].tiles[0] = { kind: 'country', code: 'CA' }
  p.groups[3].name = ''
  const out = G.problems(p).join('\n')
  assert.match(out, /Group 1 needs four tiles/)
  assert.match(out, /Group 2 mixes kinds/)
  assert.match(out, /country:CA is in two groups/)
  assert.match(out, /Group 4 needs a connection/)
  assert.deepEqual(G.problems(SAMPLE), [])
})

test('tiles: text, plain-English answers, screen-reader labels', () => {
  assert.equal(TL.tileText({ kind: 'capital', code: 'AT' }), 'Vienna')
  assert.equal(TL.tileText({ kind: 'native', code: 'DE' }), 'Deutschland')
  assert.equal(TL.tileText({ kind: 'flag', code: 'FR' }), '')
  assert.equal(TL.tileText({ kind: 'capital', code: 'CO' }), 'Bogotá')
  assert.equal(TL.tileAnswer({ kind: 'capital', code: 'AT' }), 'Vienna (Austria)')
  assert.equal(TL.tileAnswer({ kind: 'native', code: 'DE' }), 'Deutschland (Germany)')
  assert.equal(TL.tileAnswer({ kind: 'flag', code: 'DE' }), 'Germany')
  assert.equal(TL.tileLabel({ kind: 'flag', code: 'DE' }), 'Flag of Germany')
  assert.equal(TL.tileLabel({ kind: 'native', code: 'JP' }), 'Nippon, local name')
})

test('tiles: two tiles that read the same, and tiles that cannot be shown', () => {
  // Singapore the country and Singapore the capital read the same.
  assert.match(TL.tileProblems([{ kind: 'country', code: 'SG' }, { kind: 'capital', code: 'SG' }]).join(), /reads the same/)
  // Accents don't make two tiles different.
  assert.equal(TL.fold('México'), TL.fold('Mexico'))
  // A country with no local name, a split capital, an unknown code.
  assert.match(TL.tileProblems([{ kind: 'native', code: 'FR' }]).join(), /no native tile/)
  assert.match(TL.tileProblems([{ kind: 'capital', code: 'BO' }]).join(), /no capital tile/)
  assert.match(TL.tileProblems([{ kind: 'flag', code: 'ZZ' }]).join(), /not a country/)
  // Flags have no text, so two flags never clash.
  assert.deepEqual(TL.tileProblems([{ kind: 'flag', code: 'TD' }, { kind: 'flag', code: 'RO' }]), [])
})

test('endonyms: never just the English name, and in Latin script', () => {
  for (const [code, e] of Object.entries(ENDONYMS)) {
    assert.notEqual(TL.fold(e.name), TL.fold(TL.countryName(code)), code)
    assert.match(e.name, /^[\p{Script=Latin}' -]+$/u, code)
  }
  assert.ok(Object.keys(ENDONYMS).length >= 50)
})

test('check: correct, one away, wrong and repeated guesses across kinds', () => {
  assert.deepEqual(G.check(SAMPLE, [A[3], A[0], A[1], A[2]]), { result: 'correct', group: 0 })
  assert.equal(G.check(SAMPLE, [A[0], A[1], A[2], B[0]]).result, 'one-away')
  assert.equal(G.check(SAMPLE, [A[0], A[1], B[0], C[0]]).result, 'wrong')
  // The same country as a different kind is a different tile.
  assert.equal(G.check(SAMPLE, [C[0], C[1], C[2], 'native:AT']).result, 'one-away')
  const past = [[A[0], A[1], B[0], C[0]]]
  assert.equal(G.check(SAMPLE, [C[0], B[0], A[1], A[0]], past).result, 'repeat')
})

test('state: six mistakes lose, repeats are free, four groups win', () => {
  assert.equal(G.MISTAKES, 6)
  const wrong = [
    [A[0], A[1], B[0], C[0]], [A[0], B[1], B[0], C[0]], [A[1], B[1], B[0], C[0]],
    [A[2], B[1], B[0], C[0]], [A[3], B[1], B[0], C[0]],
  ]
  let s = G.state(SAMPLE, [...wrong, wrong[0]])
  assert.equal(s.mistakes, 5)
  assert.equal(s.left, 1)
  assert.equal(s.over, false)
  s = G.state(SAMPLE, [...wrong, [A[2], B[2], C[2], D[2]]])
  assert.equal(s.lost, true)
  assert.equal(s.left, 0)
  s = G.state(SAMPLE, [wrong[0], D, B, A, C])
  assert.deepEqual(s.solved, [3, 1, 0, 2])
  assert.equal(s.won, true)
  assert.equal(s.mistakes, 1)
})

test('share text: a square per tile, repeats left out, hints counted, no URL when none given', () => {
  const h = [[A[0], A[1], A[2], D[0]], [D[0], A[0], A[1], A[2]], A]
  const lines = G.shareText(SAMPLE, h, 'Title', 'https://x.test/').split('\n')
  assert.equal(lines[0], 'Title')
  assert.equal(lines[1], 'Found 1 of 4 groups, no hints')
  assert.equal(lines[2], '\u{1F7E8}\u{1F7E8}\u{1F7E8}\u{1F7EA}')
  assert.equal(lines[3], '\u{1F7E8}'.repeat(4))
  assert.equal(lines[4], 'https://x.test/')
  assert.equal(G.shareText(SAMPLE, h, 'Title').split('\n').length, 4)
  const won = [h[0], A, B, C, D]
  assert.equal(G.shareText(SAMPLE, won, 'T', undefined, 2).split('\n')[1], 'Solved with 1 mistake, 2 hints')
  assert.equal(G.shareText(SAMPLE, won, 'T', undefined, 1).split('\n')[1], 'Solved with 1 mistake, 1 hint')
})

test('hints: name the easiest open group, then mark two of its tiles, three at most', () => {
  const hints = []
  let h = G.nextHint(SAMPLE, [], hints)
  assert.deepEqual(h, { group: 0 })
  hints.push(h)
  h = G.nextHint(SAMPLE, [], hints)
  assert.equal(h.group, 0)
  assert.ok(A.includes(h.word))
  hints.push(h)
  const h3 = G.nextHint(SAMPLE, [], hints)
  assert.equal(h3.group, 0)
  assert.notEqual(h3.word, h.word)
  hints.push(h3)
  assert.equal(G.nextHint(SAMPLE, [], hints), null)
  assert.deepEqual(G.nextHint(SAMPLE, [A], []), { group: 1 })
  assert.deepEqual(G.nextHint(SAMPLE, [A], [{ group: 0 }]), { group: 1 })
  assert.equal(G.nextHint(SAMPLE, [A, B, C, D], []), null)
  assert.deepEqual(G.validHints(SAMPLE, [{ group: 0 }, { group: 0, word: A[0] }]), [{ group: 0 }, { group: 0, word: A[0] }])
  assert.deepEqual(G.validHints(SAMPLE, [{ group: 0 }, { group: 0, word: B[0] }]), [{ group: 0 }])
  assert.deepEqual(G.validHints(SAMPLE, 'junk'), [])
})

test('storage: saves from the old all-country-names game are ignored, not trusted', () => {
  // The key is versioned, so the v1 save is never even read...
  const src = fs.readFileSync(path.join(ROOT, 'src/components/ConnectionsScreen.tsx'), 'utf8')
  assert.match(src, /STORE_KEY = "globalio_connections_v2"/)
  // ...and a history that doesn't fit today's tiles is dropped whole.
  assert.deepEqual(G.validHistory(SAMPLE, [['Austria', 'Hungary', 'Serbia', 'Slovakia']]), [])
  assert.deepEqual(G.validHistory(SAMPLE, [A, ['country:CA', 'country:CA', 'country:FR', 'country:DE']]), [])
  assert.deepEqual(G.validHistory(SAMPLE, 'junk'), [])
  assert.deepEqual(G.validHistory(SAMPLE, [A, [B[0], B[1], B[2], C[0]]]), [A, [B[0], B[1], B[2], C[0]]])
})

test('shuffle keeps every tile', () => {
  const all = G.ids(SAMPLE)
  assert.deepEqual(G.shuffle(all).sort(), all.slice().sort())
})

test('daily pick: 2026-09-29 is #1, then one a day, wrapping after 52', () => {
  assert.equal(G.puzzleIndex('2026-09-29', 52), 0)
  assert.equal(G.puzzleIndex('2026-09-30', 52), 1)
  assert.equal(G.puzzleIndex('2026-11-19', 52), 51)
  assert.equal(G.puzzleIndex('2026-11-20', 52), 0)
  assert.equal(G.puzzleIndex('2026-09-28', 52), 51)
  assert.equal(G.daysSinceEpoch('2027-03-29') - G.daysSinceEpoch('2027-03-27'), 2)
})

test('uniqueness: no tile fits another group of the same kind on its board', () => {
  for (const [i, p] of PUZZLES.entries()) {
    for (const g of p.groups) {
      for (const other of p.groups) {
        for (const t of other.tiles) {
          if (t.kind !== g.tiles[0].kind) continue
          const v = evaluate(g.rule, t)
          if (other === g) assert.equal(v, 'yes', `#${i + 1} ${g.name}: ${t.kind}:${t.code}`)
          else assert.equal(v, 'no', `#${i + 1} ${g.name}: ${t.kind}:${t.code} from ${other.name}`)
        }
      }
    }
  }
})

test('uniqueness: same-kind groups are where the checker looks; other kinds are free', () => {
  // Vienna fits "capitals on the Danube" but the Austria flag tile does too:
  // rules are about the country, and only same-kind tiles are compared.
  const danube = { type: 'fact', id: 'capitalDanube' }
  assert.equal(evaluate(danube, { kind: 'capital', code: 'AT' }), 'yes')
  assert.equal(evaluate(danube, { kind: 'flag', code: 'AT' }), 'yes')
  // Text rules read the tile: a flag has no text.
  assert.equal(evaluate({ type: 'nameEnds', text: 'land' }, { kind: 'country', code: 'FI' }), 'yes')
  assert.equal(evaluate({ type: 'nameEnds', text: 'land' }, { kind: 'flag', code: 'FI' }), 'no')
  assert.equal(evaluate({ type: 'nameEnds', text: 'land' }, { kind: 'native', code: 'DE' }), 'yes') // Deutschland
})

test('facts: 44 landlocked UN members plus Kosovo; the crescent list is strict', () => {
  const all = [...FACTS.landlocked.yes, ...FACTS.landlocked.maybe]
  assert.equal(all.length, 45)
  for (const c of ['TD', 'ET', 'XK', 'SS', 'LI', 'UZ']) assert.equal(evaluate({ type: 'fact', id: 'landlocked' }, { kind: 'country', code: c }), 'yes', c)
  for (const c of ['SA', 'KZ', 'AF', 'BN']) assert.notEqual(evaluate({ type: 'fact', id: 'flagCrescent' }, { kind: 'flag', code: c }), 'yes', c)
})

test('rules: borders, names, capitals and local names', () => {
  const c = (code) => ({ kind: 'country', code })
  const k = (code) => ({ kind: 'capital', code })
  const n = (code) => ({ kind: 'native', code })
  assert.equal(evaluate({ type: 'borders', code: 'RU' }, c('PL')), 'yes')
  assert.equal(evaluate({ type: 'borders', code: 'RU' }, c('AM')), 'no')
  assert.equal(evaluate({ type: 'borders', code: 'MA' }, c('ES')), 'maybe')
  assert.equal(evaluate({ type: 'containsCountry' }, c('RO')), 'yes') // Oman
  assert.equal(evaluate({ type: 'containsCountry' }, c('NE')), 'no')
  assert.equal(evaluate({ type: 'nameLength', n: 4 }, c('CU')), 'yes')
  assert.equal(evaluate({ type: 'neighbours', n: 1 }, c('PT')), 'yes')
  assert.equal(evaluate({ type: 'neighbours', n: 1 }, c('GB')), 'maybe') // Gibraltar
  // Capital rules: a country tile weighs every claimant, a capital tile the city shown.
  assert.equal(evaluate({ type: 'capitalStarts', letter: 'B' }, c('HU')), 'yes')
  assert.equal(evaluate({ type: 'capitalStarts', letter: 'L' }, c('BO')), 'maybe') // Sucre / La Paz
  assert.equal(evaluate({ type: 'capitalSameLetter' }, c('BR')), 'maybe') // Brasilia, but Rio was the capital
  assert.equal(evaluate({ type: 'capitalSameLetter' }, k('BR')), 'yes') // the tile says Brasília
  assert.equal(evaluate({ type: 'capitalSameLetter' }, k('KR')), 'yes') // Seoul
  assert.equal(evaluate({ type: 'capitalSameLetter' }, k('FR')), 'no')
  assert.equal(evaluate({ type: 'capitalInName' }, k('TN')), 'yes') // Tunis in Tunisia
  assert.equal(evaluate({ type: 'capitalInName' }, k('KW')), 'no') // Kuwait City is not in Kuwait
  assert.equal(evaluate({ type: 'nameEnds', text: ' City' }, k('KW')), 'yes')
  // Local names.
  assert.equal(evaluate({ type: 'nativeDiffLetter' }, n('DE')), 'yes') // Deutschland
  assert.equal(evaluate({ type: 'nativeDiffLetter' }, n('IS')), 'no') // Ísland
  assert.equal(evaluate({ type: 'nativeDiffLetter' }, c('DE')), 'no')
  assert.equal(evaluate({ type: 'nameEnds', text: ['stan', 'ston'] }, n('AM')), 'yes') // Hayastan
  assert.equal(evaluate({ type: 'nativeLang', lang: 'Arabic' }, n('EG')), 'yes') // Misr
})

test('variety: no kind of group on more than four of the 52 boards', () => {
  const key = (r) => JSON.stringify(r)
  const uses = new Map()
  for (const p of PUZZLES) for (const g of p.groups) uses.set(key(g.rule), (uses.get(key(g.rule)) ?? 0) + 1)
  for (const [k, n] of uses) assert.ok(n <= 4, `${k} used ${n} times`)
})

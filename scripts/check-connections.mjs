// Proves every daily Connections puzzle has exactly one answer.
//
// For each of the 52 puzzles:
//   - four groups of four tiles, each group one kind (country, capital,
//     flag or local name), 16 different tiles, at least three kinds;
//   - every tile can be shown (the country is in FLAGS, has a capital tile or
//     a local name), and no two tiles read the same;
//   - every group's members satisfy its rule ("yes");
//   - no tile of the same kind in another group satisfies that rule, even
//     arguably ("maybe"). Tiles of a different kind can't be confused: the
//     kind is visible, and a group is always one kind.
// Groups with rule {type:'manual'} (wordplay) can't be evaluated, so they are
// listed at the end for a human to read.
//
// It also reports how often each kind of group is used, and fails if one is
// used more than MAX_USES times, so the 52 days stay varied.
//
// Run: npm run check:connections   (add --list to print every board,
// --stats for the kind mix and rule counts)
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { FLAGS } = await import(path.join(ROOT, 'src/data/flags.ts'))
const { FACTS, OFFICIAL } = await import(path.join(ROOT, 'src/data/countryFacts.ts'))
const { ENDONYMS } = await import(path.join(ROOT, 'src/data/endonyms.ts'))
const { PUZZLES, PUZZLE_COUNT } = await import(path.join(ROOT, 'src/data/connectionsPuzzles.ts'))
const { evaluate, TEXT_RULES } = await import(path.join(ROOT, 'src/utils/connectionsRules.ts'))
const { problems, tileId } = await import(path.join(ROOT, 'src/utils/connections.ts'))
const { tileProblems, tileAnswer, tileText } = await import(path.join(ROOT, 'src/utils/connectionsTiles.ts'))

const MAX_USES = 4
const CODES = new Set(FLAGS.map(f => f.code))
const errors = []
const manual = []
const fail = (n, msg) => errors.push(`Puzzle #${n}: ${msg}`)

// The data tables themselves: real codes, and nothing both yes and maybe.
for (const [id, f] of [...Object.entries(FACTS), ...Object.entries(OFFICIAL).map(([k, v]) => ['official.' + k, v])]) {
  for (const c of [...f.yes, ...(f.maybe ?? [])]) if (!CODES.has(c)) errors.push(`countryFacts ${id}: unknown code ${c}`)
  for (const c of f.yes) if (f.maybe?.includes(c)) errors.push(`countryFacts ${id}: ${c} is both yes and maybe`)
  if (new Set(f.yes).size !== f.yes.length) errors.push(`countryFacts ${id}: duplicate code`)
}
for (const c of Object.keys(ENDONYMS)) if (!CODES.has(c)) errors.push(`endonyms: unknown code ${c}`)

if (PUZZLES.length !== 52 || PUZZLE_COUNT !== 52) errors.push(`Expected 52 puzzles, found ${PUZZLES.length}`)

// A name for "the same kind of group", for the variety count.
const ruleKey = r => r.type === 'fact' ? r.id : r.type === 'official' ? `official.${r.lang}`
  : r.type === 'borders' ? `borders.${r.code}` : r.type === 'manual' ? null
  : ['nameStarts', 'nameEnds', 'nameContains'].includes(r.type) ? `${r.type}.${[].concat(r.text).join('/')}`
  : r.type

const uses = new Map()
const kindTiles = { country: 0, capital: 0, flag: 0, native: 0 }
const kindGroups = { country: 0, capital: 0, flag: 0, native: 0 }
const mixes = new Map()
const boards = new Map()

PUZZLES.forEach((p, i) => {
  const n = i + 1
  for (const msg of problems(p)) fail(n, msg)
  if (p.groups.length !== 4) return
  const tiles = p.groups.flatMap(g => g.tiles)
  for (const msg of tileProblems(tiles)) fail(n, msg)
  const key = tiles.map(tileId).sort().join('|')
  if (boards.has(key)) fail(n, `same board as puzzle #${boards.get(key)}`)
  boards.set(key, n)

  const kinds = p.groups.map(g => g.tiles[0]?.kind)
  if (new Set(kinds).size < 3) fail(n, `uses ${new Set(kinds).size} kinds of tile; a board needs at least three`)
  const mix = [...new Set(kinds)].sort().map(k => `${k} x${kinds.filter(x => x === k).length}`).join(', ')
  mixes.set(mix, (mixes.get(mix) ?? 0) + 1)

  p.groups.forEach((g, gi) => {
    const kind = g.tiles[0]?.kind
    kindGroups[kind]++
    kindTiles[kind] += g.tiles.length
    if (!g.why || g.why.length > 160) fail(n, `group ${gi + 1} needs a "why" of 1–160 characters`)
    if (!g.rule) return fail(n, `group ${gi + 1} (${g.name}) has no rule`)
    const k = ruleKey(g.rule)
    if (k) uses.set(k, [...(uses.get(k) ?? []), n])
    if (g.rule.type === 'manual') { manual.push({ n, g }); return }
    if (kind === 'flag' && TEXT_RULES.has(g.rule.type)) fail(n, `group ${gi + 1} (${g.name}) reads tile text, but flag tiles have none`)
    for (const t of tiles) {
      const mine = g.tiles.includes(t)
      if (!mine && t.kind !== kind) continue
      const v = evaluate(g.rule, t)
      const label = t.kind === 'flag' ? `flag of ${tileAnswer(t)}` : `"${tileText(t)}"`
      if (mine && v !== 'yes') fail(n, `${label} is in "${g.name}" but the rule says ${v}`)
      if (!mine && v !== 'no') fail(n, `${label} (in another ${kind} group) also fits "${g.name}" (${v}), so the board has two answers`)
    }
  })
})

for (const [k, list] of uses) {
  if (list.length > MAX_USES) errors.push(`"${k}" groups are used ${list.length} times (#${list.join(', #')}); keep each to ${MAX_USES}`)
}

if (process.argv.includes('--list')) {
  PUZZLES.forEach((p, i) => {
    console.log(`\n#${i + 1}`)
    p.groups.forEach(g => console.log(`  [${g.tiles[0].kind}] ${g.name}: ${g.tiles.map(tileAnswer).join(', ')}`))
  })
}
if (process.argv.includes('--stats') || process.argv.includes('--list')) {
  console.log('\nTiles by kind:', kindTiles)
  console.log('Groups by kind:', kindGroups)
  console.log('Board mixes:', Object.fromEntries(mixes))
  console.log('Group types by use:')
  for (const [k, list] of [...uses].sort((a, b) => b[1].length - a[1].length)) console.log(`  ${list.length}  ${k}`)
}
console.log(manual.length
  ? `Manual (wordplay) groups to review by eye:\n${manual.map(({ n, g }) => `  #${n} ${g.name}: ${g.tiles.map(tileAnswer).join(', ')} (${g.why})`).join('\n')}`
  : 'Manual groups: none (every group is machine-checked).')

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\ncheck-connections: ${errors.length} problem(s)`)
  process.exit(1)
}
console.log(`check-connections: ${PUZZLES.length} puzzles OK, ${uses.size} kinds of group, none used more than ${MAX_USES} times`)

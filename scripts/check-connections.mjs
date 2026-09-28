// Proves every daily Connections puzzle has exactly one answer.
//
// For each of the 52 puzzles: 16 different countries that exist in FLAGS;
// every group's four members satisfy the group's rule; and no other country
// on the board satisfies (or even arguably satisfies, "maybe") that rule.
// Groups with rule {type:'manual'} (wordplay) can't be evaluated, so they are
// listed at the end for a human to read; the other groups' rules are still
// checked against their members.
//
// Run: npm run check:connections   (add --list to print every board)
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { FLAGS } = await import(path.join(ROOT, 'src/data/flags.ts'))
const { FACTS, OFFICIAL } = await import(path.join(ROOT, 'src/data/countryFacts.ts'))
const { PUZZLES, PUZZLE_COUNT } = await import(path.join(ROOT, 'src/data/connectionsPuzzles.ts'))
const { evaluate } = await import(path.join(ROOT, 'src/utils/connectionsRules.ts'))
const { problems } = await import(path.join(ROOT, 'src/utils/connections.ts'))

const CODE = new Map(FLAGS.map(f => [f.name, f.code]))
const CODES = new Set(FLAGS.map(f => f.code))
const errors = []
const manual = []
const fail = (n, msg) => errors.push(`Puzzle #${n}: ${msg}`)

// The fact tables themselves: real codes, and nothing both yes and maybe.
for (const [id, f] of [...Object.entries(FACTS), ...Object.entries(OFFICIAL).map(([k, v]) => ['official.' + k, v])]) {
  for (const c of [...f.yes, ...(f.maybe ?? [])]) if (!CODES.has(c)) errors.push(`countryFacts ${id}: unknown code ${c}`)
  for (const c of f.yes) if (f.maybe?.includes(c)) errors.push(`countryFacts ${id}: ${c} is both yes and maybe`)
  if (new Set(f.yes).size !== f.yes.length) errors.push(`countryFacts ${id}: duplicate code`)
}

if (PUZZLES.length !== 52 || PUZZLE_COUNT !== 52) errors.push(`Expected 52 puzzles, found ${PUZZLES.length}`)

const boards = new Map()
PUZZLES.forEach((p, i) => {
  const n = i + 1
  for (const msg of problems(p)) fail(n, msg)
  if (p.groups.length !== 4) return
  const board = p.groups.flatMap(g => g.words)
  const key = [...board].sort().join('|')
  if (boards.has(key)) fail(n, `same board as puzzle #${boards.get(key)}`)
  boards.set(key, n)
  for (const w of board) if (!CODE.has(w)) fail(n, `"${w}" is not a country name in FLAGS`)
  p.groups.forEach((g, gi) => {
    if (!g.why || g.why.length > 160) fail(n, `group ${gi + 1} needs a "why" of 1–160 characters`)
    if (!g.rule) return fail(n, `group ${gi + 1} (${g.name}) has no rule`)
    if (g.rule.type === 'manual') { manual.push({ n, g, others: p.groups.filter(o => o !== g) }); return }
    for (const w of board) {
      const code = CODE.get(w)
      if (!code) continue
      const v = evaluate(g.rule, code)
      if (g.words.includes(w) && v !== 'yes') fail(n, `"${w}" is in "${g.name}" but the rule says ${v}`)
      if (!g.words.includes(w) && v !== 'no') fail(n, `"${w}" (in another group) also fits "${g.name}" (${v}), so the board has two answers`)
    }
  })
})

if (process.argv.includes('--list')) {
  PUZZLES.forEach((p, i) => {
    console.log(`\n#${i + 1}`)
    p.groups.forEach(g => console.log(`  ${g.name}: ${g.words.join(', ')}`))
  })
}
if (process.argv.includes('--manual') || process.argv.includes('--list')) {
  console.log('\nManual (wordplay) groups to review by eye:')
  for (const { n, g } of manual) console.log(`  #${n} ${g.name}: ${g.words.join(', ')} (${g.why})`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\ncheck-connections: ${errors.length} problem(s)`)
  process.exit(1)
}
console.log(`check-connections: ${PUZZLES.length} puzzles OK (${manual.length} manual groups; run with --manual to review them)`)

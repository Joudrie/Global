// Flag Fusion: fair rounds, generous answers, readable emblems, and the game
// wired in everywhere a game must be.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const F = await src('utils/flagFusion.ts')
const { STRUCTURE_FAMILIES, EMBLEM_FAME, COLOUR_FAME } = await src('data/flagFusionSetup.ts')
const { FUSION_STRUCTURES } = await src('data/flagFusionStructures.ts')
const { FLAGS } = await src('data/flags.ts')
const { matchNames, pickOnEnter } = await src('utils/pickOnEnter.ts')
const { seededRandom } = await src('utils/prng.ts')
const { REGISTRY, GAME_COUNT } = await src('ui/registry.ts')
const { CHANGELOG } = await src('data/changelog.ts')

const CODES = new Set(FLAGS.map(f => f.code))
const games = Object.fromEntries(F.TIERS.map(t => {
  const rng = seededRandom(`flagfusion-test-${t}`)
  return [t, Array.from({ length: 150 }, () => F.dealGame(t, rng))]
}))
const dealt = Object.values(games).flat(2)
const every = F.TIERS.flatMap(t => F.allFusions(t))

// ── Rounds ─────────────────────────────────────────────────────────────────

test('every game deals five fused flags, and each tier has plenty to deal from', () => {
  for (const t of F.TIERS) {
    for (const g of games[t]) assert.equal(g.length, F.ROUNDS, t)
    assert.ok(F.allFusions(t).length >= 500, `${t}: only ${F.allFusions(t).length} fusions`)
  }
})

test("every round's three countries differ, and no country counts for two parts", () => {
  for (const f of dealt) {
    const codes = [f.structure.code, f.emblem.code, f.colours.code]
    assert.equal(new Set(codes).size, 3, codes.join())
    const [s, e, c] = [f.structure.accept, f.emblem.accept, f.colours.accept]
    for (const [a, b] of [[s, e], [s, c], [e, c]]) assert.ok(!a.some(x => b.includes(x)), `${codes.join('+')}: ${a} / ${b}`)
    // Each part's own country is a right answer for that part.
    for (const p of F.PARTS) assert.ok(F.isRight(f, p, f[p].code), `${p} ${f[p].code}`)
  }
})

test('a game never repeats a flag, a layout family or a colour set', () => {
  for (const g of Object.values(games).flat()) {
    const codes = g.flatMap(f => [f.structure.code, f.emblem.code, f.colours.code])
    assert.equal(new Set(codes).size, codes.length, codes.join())
    assert.equal(new Set(g.map(f => f.structure.accept.join())).size, g.length)
    assert.equal(new Set(g.map(f => f.colours.accept.join())).size, g.length)
  }
})

test('tiers: easy is all famous flags, hard leans obscure', () => {
  for (const f of games.easy.flat()) assert.deepEqual([f.structure.fame, f.emblem.fame, f.colours.fame], [1, 1, 1])
  for (const f of games.medium.flat()) assert.ok([f.structure, f.emblem, f.colours].every(x => x.fame <= 2))
  for (const f of games.hard.flat()) assert.ok([f.structure, f.emblem, f.colours].filter(x => x.fame === 3).length >= 2)
})

test('the fused flag never looks like the structure country\'s own flag', () => {
  for (const f of every) assert.ok(F.changedShare(f.structure.structure, f.fill) >= 0.5, `${f.structure.code}+${f.colours.code}`)
})

// ── Structures ─────────────────────────────────────────────────────────────

test('structure families: real countries, one family each, and every shown layout has art', () => {
  const seen = new Map()
  const art = new Set(FUSION_STRUCTURES.map(s => s.code))
  for (const fam of STRUCTURE_FAMILIES) {
    for (const c of fam.members) {
      assert.ok(CODES.has(c), c)
      assert.ok(!seen.has(c), `${c} is in two families`)
      seen.set(c, fam)
    }
    for (const c of Object.keys(fam.show)) {
      assert.ok(fam.members.includes(c), c)
      assert.ok(art.has(c), `${c} has no structure art`)
    }
  }
  assert.equal(F.STRUCTURE_POOL.length, STRUCTURE_FAMILIES.reduce((n, f) => n + Object.keys(f.show).length, 0))
})

test('structure accept-lists: shared layouts count for every country that has them', () => {
  const accept = code => F.STRUCTURE_POOL.find(s => s.code === code).accept
  assert.deepEqual(accept('DK').slice().sort(), ['DK', 'FI', 'SE'])
  assert.deepEqual(accept('SE').slice().sort(), ['DK', 'FI', 'SE'])
  assert.deepEqual(accept('NO').slice().sort(), ['IS', 'NO'])
  assert.deepEqual(accept('JP').slice().sort(), ['BD', 'JP', 'PW'])
  assert.deepEqual(accept('CZ').slice().sort(), ['CZ', 'DJ', 'PH'])
  assert.deepEqual(accept('AU').slice().sort(), ['AU', 'FJ', 'NZ', 'TV'])
  for (const c of ['SD', 'JO', 'PS', 'BS', 'ST', 'GQ']) assert.ok(accept('BS').includes(c), c)
  assert.deepEqual(accept('BR'), ['BR'])
  assert.deepEqual(accept('GB'), ['GB'])
})

test('structure art: slots in rank order, touching slots never share a colour', () => {
  for (const s of FUSION_STRUCTURES) {
    for (let i = 1; i < s.areas.length; i++) assert.ok(s.areas[i] <= s.areas[i - 1], s.code)
    const slots = new Set([...s.svg.matchAll(/\{(\d+)\}/g)].map(m => +m[1]))
    assert.deepEqual([...slots].sort(), s.areas.map((_, i) => i), `${s.code} uses every slot`)
    assert.equal(s.grid.length, 144, s.code)
    assert.doesNotMatch(s.svg, /<(text|image|use)\b/, `${s.code} keeps no emblem parts`)
  }
  for (const f of every) for (const [a, b] of f.structure.structure.touch) assert.notEqual(f.fill[a], f.fill[b], f.structure.code)
})

// ── Colours ────────────────────────────────────────────────────────────────

test('colour names: shades on the edge of two names get both', () => {
  assert.deepEqual(F.colourNames('#ffffff'), ['white'])
  assert.deepEqual(F.colourNames('#000000'), ['black'])
  assert.ok(F.colourNames('#ce1126').includes('red'))
  assert.ok(F.colourNames('#ff671f').includes('orange'))
  assert.ok(F.colourNames('#ffcd00').includes('yellow'))
  assert.ok(F.colourNames('#009440').includes('green'))
  assert.ok(F.colourNames('#74acdf').includes('light blue'))
  assert.ok(F.colourNames('#0a3161').includes('blue'))
  assert.ok(F.colourNames('#8a1538').includes('maroon') && F.colourNames('#8a1538').includes('red'))
  assert.ok(F.colourNames('#418fde').includes('blue') && F.colourNames('#418fde').includes('light blue'))
})

test('colour accept-lists: every country with the same set of colours counts', () => {
  const accept = code => F.COLOUR_POOL.find(c => c.code === code)?.accept ?? []
  for (const c of ['DE', 'BE']) assert.ok(accept('DE').includes(c), c)
  for (const c of ['IN', 'IE', 'CI', 'NE']) assert.ok(accept('IN').includes(c), c)
  for (const c of ['SE', 'UA']) assert.ok(accept('UA').includes(c), c)
  assert.deepEqual(accept('BT').slice().sort(), ['BT', 'VA'])
  for (const src of F.COLOUR_POOL) {
    assert.ok(src.accept.includes(src.code), src.code)
    assert.ok(src.accept.length <= F.MAX_COLOUR_TWINS, `${src.code}: ${src.accept}`)
    assert.ok(src.colours.length >= 2 && src.colours.length <= 5, src.code)
    for (const c of src.accept) assert.ok(CODES.has(c), c)
    // Accepting is mutual: each of them has these colours as its own set.
    for (const c of src.accept) assert.ok(F.coloursAccept(src.colours).includes(c))
  }
  // Common sets are never dealt: red-white-blue, red-white, green-white-red.
  for (const c of ['US', 'FR', 'GB', 'JP', 'CA', 'IT', 'MX', 'CN']) assert.ok(!F.COLOUR_POOL.some(x => x.code === c), c)
  for (const c of Object.keys(COLOUR_FAME)) assert.ok(CODES.has(c), c)
})

test('every colour of the set shows on the fused flag, and nothing else', () => {
  for (const f of every) {
    const shown = new Set([...f.fill, f.tint])
    for (const c of f.colours.colours) assert.ok(shown.has(c), `${f.colours.code} ${c} missing on ${f.structure.code}`)
    for (const c of shown) assert.ok(f.colours.colours.includes(c), `${c} is not ${f.colours.code}'s`)
  }
})

// ── Emblems ────────────────────────────────────────────────────────────────

test('emblem contrast: the emblem stands out from everything behind it, and is big enough to see', () => {
  for (const f of every) {
    assert.ok(f.box[2] * f.box[3] >= F.MIN_EMBLEM_AREA, `${f.emblem.code} in ${f.structure.code}`)
    const s = f.structure.structure
    for (const [i, share] of F.behindEmblem(s, f.emblem.ratio)) {
      if (share < 0.04) continue
      assert.ok(F.standsOut(f.tint, f.fill[i]) >= 1, `${f.emblem.code} ${f.tint} on ${f.fill[i]} (${s.code}+${f.colours.code}): ${F.contrast(f.tint, f.fill[i]).toFixed(2)}`)
    }
  }
  // The owner's example: white on Bhutan's orange.
  assert.ok(F.standsOut('#ffffff', '#ff671f') >= 1)
  // Too faint: yellow on white, red on green, black on dark green.
  assert.ok(F.standsOut('#ffcd00', '#ffffff') < 1)
  assert.ok(F.standsOut('#ce1126', '#009a44') < 1)
  assert.ok(F.standsOut('#2d2926', '#007749') < 1)
})

test('emblem stencils: one per emblem, each a mask that inks in one colour', () => {
  const dir = path.join(ROOT, 'public/fusion/emblems')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)).sort()
  assert.deepEqual(files, Object.keys(EMBLEM_FAME).sort())
  for (const code of files) {
    const svg = fs.readFileSync(path.join(dir, `${code}.svg`), 'utf8')
    assert.match(svg, /<mask id="ff-stencil"/, code)
    assert.match(svg, /mask="url\(#ff-stencil\)"/, code)
    assert.ok(CODES.has(code.toUpperCase()), code)
  }
  for (const e of F.EMBLEM_POOL) assert.deepEqual(e.accept, [e.code])
})

test('the example is Brazil + Afghanistan + Bhutan, as in the sketch, and its poster is current', () => {
  const f = F.exampleFusion()
  assert.deepEqual([f.structure.code, f.emblem.code, f.colours.code], ['BR', 'AF', 'BT'])
  assert.deepEqual(f.fill, ['#ffcd00', '#ff671f'])   // yellow field, orange diamond
  assert.equal(f.tint, '#ffffff')                    // white emblem
  const stencil = fs.readFileSync(path.join(ROOT, 'public', F.emblemUrl('AF')), 'utf8')
  assert.equal(fs.readFileSync(path.join(ROOT, 'public/fusion/example.svg'), 'utf8').trim(), F.fusionSvg(f, stencil))
})

// ── Answers ────────────────────────────────────────────────────────────────

const enter = typed => pickOnEnter(matchNames(FLAGS, typed, 5), typed)?.code

test('answers: common other names work', () => {
  assert.equal(enter('USA'), 'US')
  assert.equal(enter('UK'), 'GB')
  assert.equal(enter('Czechia'), 'CZ')
  assert.equal(enter('Ivory Coast'), 'CI')
  assert.equal(enter('Holland'), 'NL')
  assert.equal(enter('Burma'), 'MM')
  assert.equal(enter('Eswatini'), 'SZ')
  assert.equal(enter('East Timor'), 'TL')
})

const CONFUSABLE = [['NE', 'NG'], ['CG', 'CD'], ['DM', 'DO'], ['GN', 'GW'], ['GN', 'GQ'], ['GW', 'GQ'], ['GN', 'PG'], ['AT', 'AU'], ['SD', 'SS'], ['SK', 'SI'], ['IN', 'ID']]

test('confusable pairs never count for each other', () => {
  assert.equal(enter('Niger'), 'NE')
  assert.equal(enter('Nigeria'), 'NG')
  assert.equal(enter('Dominica'), 'DM')
  assert.equal(enter('Dominican Republic'), 'DO')
  assert.equal(enter('Guinea'), 'GN')
  assert.equal(enter('Austria'), 'AT')
  assert.equal(enter('Australia'), 'AU')
  const lists = [
    ...F.STRUCTURE_POOL.map(s => [`structure ${s.code}`, s.accept]),
    ...F.EMBLEM_POOL.map(e => [`emblem ${e.code}`, e.accept]),
    ...F.COLOUR_POOL.map(c => [`colours ${c.code}`, c.accept]),
  ]
  for (const [what, accept] of lists) for (const [a, b] of CONFUSABLE) {
    assert.ok(!(accept.includes(a) && accept.includes(b)), `${what} accepts both ${a} and ${b}`)
  }
  // Judging is by the exact country picked.
  for (const f of dealt) for (const p of F.PARTS) for (const [a, b] of CONFUSABLE) {
    if (f[p].code === a) assert.ok(!F.isRight(f, p, b), `${p}: ${b} for ${a}`)
    if (f[p].code === b) assert.ok(!F.isRight(f, p, a), `${p}: ${a} for ${b}`)
  }
})

test('scoring: points per part, a bonus only for naming all three', () => {
  assert.equal(F.fusionPoints(0, 0), 0)
  assert.equal(F.fusionPoints(2, 3), 2 * F.PART_POINTS)
  assert.equal(F.fusionPoints(3, 5), 3 * F.PART_POINTS + 5 * F.SPARE_POINTS)
  assert.equal(F.MAX_POINTS, F.ROUNDS * (3 * F.PART_POINTS + F.WRONG_GUESSES * F.SPARE_POINTS))
})

// ── The screen and the shelf ───────────────────────────────────────────────

test('no input mentions a name, so iOS offers no contact AutoFill', () => {
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/FlagFusionScreen.tsx'), 'utf8')
  const inputs = [...screen.matchAll(/<input\b[\s\S]*?\/>/g)].map(m => m[0])
  assert.ok(inputs.length >= 1)
  for (const tag of inputs) {
    assert.doesNotMatch(tag.replace(/className="[^"]*"/g, '').replace(/style=\{\{[\s\S]*?\}\}/g, ''), /name/i, tag)
    assert.match(tag, /autoComplete=\{FIELD\.autoComplete\}/)
    assert.match(tag, /autoCorrect=\{FIELD\.autoCorrect\}/)
    assert.match(tag, /spellCheck=\{FIELD\.spellCheck\}/)
  }
  const field = screen.match(/const FIELD = (\{[^\n]*\}) as const/)[1]
  assert.doesNotMatch(field, /name/i)
  assert.match(field, /autoComplete: "off"/)
  assert.match(field, /autoCorrect: "off"/)
  assert.match(field, /spellCheck: false/)
  for (const label of [...screen.matchAll(/aria-label=\{`\$\{PART_LABEL\[part\]\} ([^`]*)`\}/g)]) assert.doesNotMatch(label[1], /name/i)
})

test('Flag Fusion sits next to Frankenflag on the One Glance shelf, and every count says 57', () => {
  const ids = REGISTRY.map(e => e.id)
  assert.equal(ids[ids.indexOf('frankenflag') + 1], 'flagfusion')
  const e = REGISTRY.find(x => x.id === 'flagfusion')
  assert.equal(e.title, 'Flag Fusion')
  assert.equal(e.subtitle, 'Structure · emblem · colours')
  assert.equal(e.group, 'One Glance')
  assert.equal(e.tab, 'play')
  assert.ok(!e.sandbox)
  assert.equal(GAME_COUNT, 57)
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
  assert.match(read('scripts/prerender.mjs'), /flagfusion: '/)
  assert.match(read('src/App.tsx'), /screen === "flagfusion"/)
  assert.match(read('src/components/icons.tsx'), /flagfusion: \w+/)
  assert.match(read('src/components/GamePoster.tsx'), /case "flagfusion":/)
  assert.match(read('scripts/test-site.mjs'), /\|fusion\|/)
  assert.ok(CHANGELOG.some(c => c.title === 'New game: Flag Fusion'))
})

test('the copy says five flags and five wrong guesses, matching the rules', () => {
  assert.equal(F.ROUNDS, 5)
  assert.equal(F.WRONG_GUESSES, 5)
})

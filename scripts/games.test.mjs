// Game logic that decides right and wrong answers.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { FLAGS } = await src('data/flags.ts')
const { CODEX } = await src('data/codex.ts')
const { matchNames, pickOnEnter, didYouMean, editDistance, normName, COUNTRY_ALIASES } = await src('utils/pickOnEnter.ts')
const { timelineFlags, timelineScore } = await src('utils/timeline.ts')
const { PUZZLES, oneOfEachColour } = await src('data/buildFlagPuzzles.ts')
const { CUTS, ROUND_CUTS, TOTAL_PIECES, W, H, pieceMask, innerMask, dominantShare, meanDiff, cutForRound } = await src('utils/flagHalves.ts')

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

// ── Did you mean …? ─────────────────────────────────────────────────────────
const dym = typed => didYouMean(FLAGS, typed).map(f => f.code)

test('did you mean: a typo offers the country it was close to', () => {
  assert.deepEqual(dym('Papua New Guinae'), ['PG'])
  assert.deepEqual(dym('papua new guinae'), ['PG'])
  assert.deepEqual(dym('Turky'), ['TR'])
  assert.deepEqual(dym('Phillipines'), ['PH'])
  assert.deepEqual(dym('Columbia'), ['CO'])
  assert.deepEqual(dym('Kazakstan'), ['KZ'])
  assert.deepEqual(dym('Guinea Bisau'), ['GW'])
  assert.deepEqual(dym('Eswatinni'), ['SZ'])
  assert.deepEqual(dym('Saint Vinc'), ['VC'], 'part of a name, when it is the only one')
})

test('did you mean: nothing for gibberish, and nothing when the name is already right', () => {
  for (const t of ['qwxzv', 'asdfgh', 'zzzz', 'qwertyuiop', 'xy', '', '   ']) assert.deepEqual(dym(t), [], t)
  for (const t of ['Niger', 'Nigeria', 'Turkey', 'Türkiye', 'Burma', 'UK', 'fr']) assert.deepEqual(dym(t), [], t)
})

test('Niger and Nigeria stay exact; a typo between them offers both', () => {
  assert.equal(enter('Niger'), 'NE')
  assert.equal(enter('Nigeria'), 'NG')
  assert.deepEqual(dym('Nigera').sort(), ['NE', 'NG'])
  assert.deepEqual(dym('Nigerai'), ['NG'])
})

test('old and other names submit the country they mean', () => {
  const cases = { Turkey: 'TR', 'Türkiye': 'TR', Turkiye: 'TR', 'Czech Republic': 'CZ', Czechia: 'CZ',
    Swaziland: 'SZ', Eswatini: 'SZ', Burma: 'MM', Myanmar: 'MM', Zaire: 'CD', Ceylon: 'LK', Persia: 'IR',
    Siam: 'TH', Rhodesia: 'ZW', Abyssinia: 'ET', Dahomey: 'BJ', 'Upper Volta': 'BF', Kampuchea: 'KH',
    Byelorussia: 'BY', Moldavia: 'MD', 'Western Samoa': 'WS', 'New Hebrides': 'VU' }
  for (const [typed, code] of Object.entries(cases)) assert.equal(enter(typed), code, typed)
  // and a typo in one still finds it
  assert.deepEqual(dym('Swazilnd'), ['SZ'])
  assert.deepEqual(dym('Ceylone'), ['LK'])
})

test('other names: each written as it is matched, for one country, never another country\'s name', () => {
  const codes = new Set(FLAGS.map(f => f.code))
  const names = new Map(FLAGS.map(f => [normName(f.name), f.code]))
  const seen = new Map()
  for (const [code, aliases] of Object.entries(COUNTRY_ALIASES)) {
    assert.ok(codes.has(code), `${code} is a flag`)
    for (const a of aliases) {
      assert.equal(normName(a), a, `${code}: "${a}" is written like normName's output`)
      assert.ok(!seen.has(a), `"${a}" is listed for ${seen.get(a)} and ${code}`)
      seen.set(a, code)
      if (names.has(a)) assert.equal(names.get(a), code, `"${a}" is ${names.get(a)}'s own name`)
    }
  }
  // Former names didn't crowd a word other countries are typed by.
  assert.equal(enter('coast'), 'CI')
  assert.equal(enter('sudan'), 'SD')
  assert.equal(enter('honduras'), 'HN')
})

test('edit distance counts a swapped pair as one edit', () => {
  assert.equal(editDistance('guinae', 'guinea'), 1)
  assert.equal(editDistance('kitten', 'sitting'), 3)
  assert.equal(editDistance('same', 'same'), 0)
  assert.equal(editDistance('', 'abc'), 3)
  assert.equal(editDistance('abcdefgh', 'zyxwvuts', 2), 3, 'gives up past the limit')
})

// ── Build the Flag ──────────────────────────────────────────────────────────
test('Build the Flag: every colour shows once, so the palette never counts a flag\'s bands', () => {
  const colour = (pz, id) => pz.pieces.find(p => p.id === id)?.color.toLowerCase()
  for (const pz of PUZZLES) {
    const colours = pz.pieces.map(p => p.color.toLowerCase())
    assert.equal(new Set(colours).size, colours.length, `${pz.code}: a colour is listed twice`)
    assert.equal(new Set(pz.pieces.map(p => p.label.toLowerCase())).size, pz.pieces.length, `${pz.code}: two swatches share a name`)
    for (const s of pz.slots) assert.ok(colour(pz, pz.solution[s]), `${pz.code} ${s}: the answer is in the palette`)
    // Same size palette whether or not a colour repeats on the flag.
    const used = new Set(pz.slots.map(s => colour(pz, pz.solution[s])))
    assert.ok(pz.pieces.length - used.size >= 2, `${pz.code}: at least two decoys`)
  }
  const at = PUZZLES.find(p => p.code === 'AT')
  assert.equal(at.solution.top, at.solution.bottom, 'Austria: both red bands are the one red swatch')
  assert.equal(at.pieces.filter(p => p.label === 'Red').length, 1)
  const sizes = new Set(PUZZLES.filter(p => p.layout === 'h3' || p.layout === 'v3').map(p => p.pieces.length))
  assert.deepEqual([...sizes], [6], 'every tricolour offers six colours, repeated colour or not')
})

test('Build the Flag: merging same-colour pieces keeps the palette size and the answer', () => {
  const pz = { code: 'XX', name: 'Test', layout: 'h3', slots: ['top', 'middle', 'bottom'],
    solution: { top: 'a', middle: 'b', bottom: 'c' },
    pieces: [{ id: 'a', color: '#CF0921', label: 'Red' }, { id: 'b', color: '#F5F5F5', label: 'White' }, { id: 'c', color: '#cf0921', label: 'Red' },
      { id: 'd', color: '#003189', label: 'Blue' }] }
  const out = oneOfEachColour(pz)
  assert.equal(out.pieces.length, 4)
  assert.equal(out.solution.top, out.solution.bottom)
  assert.equal(out.pieces.filter(p => p.color.toLowerCase() === '#cf0921').length, 1)
})

// ── Frankenflag ─────────────────────────────────────────────────────────────
test('Frankenflag: each cut covers the whole flag once, and the cuts get harder', () => {
  for (const [cut, pieces] of Object.entries(CUTS)) {
    const hits = new Array(W * H).fill(0)
    for (const pc of pieces) for (const i of pieceMask(pc.poly)) hits[i]++
    assert.ok(hits.every(n => n === 1), `${cut}: every pixel in exactly one piece`)
    const sizes = pieces.map(pc => pieceMask(pc.poly).length)
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= W, `${cut}: pieces are about the same size (${sizes})`)
    assert.equal(new Set(pieces.map(p => p.label)).size, pieces.length, `${cut}: every box has its own label`)
  }
  assert.deepEqual(ROUND_CUTS.map(c => CUTS[c[0]].length), [2, 2, 2, 3, 4])
  assert.deepEqual(ROUND_CUTS.map(cs => new Set(cs.map(c => CUTS[c].length)).size), [1, 1, 1, 1, 1], 'a round\'s options have the same number of pieces')
  assert.equal(TOTAL_PIECES, 13)
  assert.equal(cutForRound(2), 'diag')
  assert.equal(cutForRound(4), 'quad')
  assert.ok(['h3', 'v3'].includes(cutForRound(3, () => 0.99)))
})

test('Frankenflag: a plain piece is spotted, a striped one is not', () => {
  const px = (fn) => { const a = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [r, g, b] = fn(x, y); a.set([r, g, b, 255], (y * W + x) * 4) } return a }
  const red = [207, 9, 33], white = [245, 245, 245]
  const austria = px((x, y) => (y < 10 || y >= 20 ? red : white))
  const poland = px((x, y) => (y < 15 ? white : red))
  const top = pieceMask(CUTS.h2[0].poly), topThird = pieceMask(CUTS.h3[0].poly)
  assert.equal(dominantShare(poland, top), 1, "Poland's top half is plain white")
  assert.ok(dominantShare(austria, top) < 0.9, "Austria's top half is red and white")
  assert.equal(dominantShare(austria, topThird), 1, "Austria's top third is plain red")
  // A plain band whose edges blur into its neighbours is still plain once the rim is left out.
  const france = px(x => (x < 13 ? [0, 49, 137] : x === 13 ? [120, 140, 190] : x < 26 ? white : x === 26 ? [230, 120, 130] : red))
  const middle = pieceMask(CUTS.v3[1].poly)
  assert.ok(dominantShare(france, middle) < 0.9)
  assert.equal(dominantShare(france, innerMask(middle)), 1, "France's middle third is plain white")
  assert.equal(innerMask(pieceMask(CUTS.h2[0].poly)).length, W * 14, 'the flag\'s own edge stays; the cut line goes')
  assert.equal(meanDiff(austria, austria, top), 0)
  assert.ok(meanDiff(austria, poland, top) > 30)
})

// Province Roulette and Subdivision Stumper (src/utils/subdivisionQuiz.ts).
const SQ = await src('utils/subdivisionQuiz.ts')
const { SUB_FLAGS } = await src('data/subdivisions.ts')
const { seededRandom } = await src('utils/prng.ts')

test('Name it: four different names, all from the answer\'s country, never its twin', () => {
  const rng = seededRandom('names')
  const byName = new Map()
  for (const s of SUB_FLAGS) byName.set(`${s.countryCode}|${s.name}`, s)
  for (const target of SQ.NAMEABLE_FLAGS) {
    for (let i = 0; i < 3; i++) {
      const choices = SQ.nameChoices(target, rng)
      assert.equal(choices.length, 4, target.code)
      assert.equal(new Set(choices).size, 4, target.code)
      assert.ok(choices.includes(target.name), target.code)
      for (const c of choices) {
        const s = byName.get(`${target.countryCode}|${c}`)
        assert.ok(s, `${target.code}: ${c} is not from ${target.countryName}`)
        if (c !== target.name) assert.notEqual(s.flagUrl, target.flagUrl, `${target.code}: ${c} flies the same flag`)
      }
    }
  }
})

test('Whose is it?: four different countries, the answer among them', () => {
  const rng = seededRandom('countries')
  for (const target of SUB_FLAGS) {
    const choices = SQ.countryChoices(target, rng)
    assert.equal(choices.length, 4, target.code)
    assert.equal(new Set(choices).size, 4, target.code)
    assert.ok(choices.includes(target.countryName), target.code)
  }
})

test('every pickable pool has enough flags and round-trips through its saved key', () => {
  assert.ok(SQ.NAMEABLE_COUNTRIES.length >= 80, `only ${SQ.NAMEABLE_COUNTRIES.length} countries`)
  for (const c of SQ.NAMEABLE_COUNTRIES) {
    const pool = SQ.poolFromKey(c.code)
    assert.equal(pool?.kind, 'country', c.code)
    const flags = SQ.poolFlags(pool)
    assert.equal(flags.length, c.total, c.code)
    assert.ok(new Set(flags.map(s => s.flagUrl)).size >= SQ.MIN_NAME_FLAGS, c.code)
  }
  for (const c of SQ.PICK_CONTINENTS) {
    const pool = SQ.poolFromKey(c.id)
    if (!c.wholeContinent) { assert.equal(pool, null, c.id); continue }
    assert.equal(SQ.poolKey(pool), c.id)
    assert.equal(SQ.poolFlags(pool).length, c.total, c.id)
  }
  assert.equal(SQ.poolFromKey('world'), SQ.WORLD)
  assert.equal(SQ.poolFromKey('nowhere'), null)
  assert.equal(SQ.poolFromKey(undefined), null)
})

test('Roulette traces a spin down from where it started', () => {
  const rng = seededRandom('spin')
  const us = SQ.poolFromKey('US'), europe = SQ.poolFromKey('europe')
  const tx = SUB_FLAGS.find(s => s.code === 'us-tx')
  assert.deepEqual(SQ.spinSteps(SQ.WORLD, tx, rng).map(s => [s.kind, s.answer]), [['continent', 'North America'], ['country', 'United States'], ['name', 'Texas']])
  assert.deepEqual(SQ.spinSteps(us, tx, rng).map(s => s.kind), ['name'])
  const by = SUB_FLAGS.find(s => s.code === 'de-by')
  assert.deepEqual(SQ.spinSteps(europe, by, rng).map(s => s.kind), ['country', 'name'])
  for (const step of SQ.spinSteps(SQ.WORLD, tx, rng)) assert.ok(step.choices.includes(step.answer), step.kind)
  assert.equal(SQ.spinSteps(us, tx, rng)[0].label, 'Which part of the United States?')
  assert.equal(SQ.spinSteps(europe, by, rng)[1].label, 'Which part of Germany?')
  assert.ok(SQ.poolFlags(europe).every(s => s.continent === 'Europe'))
})

test('Stumper: ten different flags a game, fewer only when the pool is smaller', () => {
  const rng = seededRandom('stumper')
  const whose = SQ.stumperRounds('whose', SQ.WORLD, rng)
  assert.equal(whose.length, 10)
  assert.equal(new Set(whose.map(r => r.target.code)).size, 10)
  for (const r of whose) assert.equal(r.answer, r.target.countryName)
  const asia = SQ.poolFromKey('asia')
  for (const r of SQ.stumperRounds('name', asia, rng)) {
    assert.equal(r.target.continent, 'Asia')
    assert.equal(r.answer, r.target.name)
    assert.ok(r.choices.every(c => SUB_FLAGS.some(s => s.countryCode === r.target.countryCode && s.name === c)), r.target.code)
  }
  const hn = SQ.poolFromKey('HN')
  assert.equal(SQ.stumperLength('name', hn), 4)
  assert.equal(SQ.stumperRounds('name', hn, rng).length, 4)
  assert.equal(SQ.stumperBestKey('name', hn), 'name-HN')
  assert.equal(SQ.stumperBestKey('whose', SQ.WORLD), 'whose')
})

// Spoken Here: the data (built from the hand-checked input, every country
// accounted for, shares and families sound), the pies, rounds and choices,
// typed answers, colours and the wiring.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { LANGUAGE_SHARES, LANGUAGE_GROUPS } = await src('data/languageShares.ts')
const S = await src('utils/spokenHere.ts')
const { FLAGS } = await src('data/flags.ts')
const { MAX_ROUNDS, TIERS } = await src('utils/abroad.ts')
const { REGISTRY, GAME_COUNT } = await src('ui/registry.ts')
const { COUNTRIES, LEFT_OUT, MEDIUM } = await import(path.join(ROOT, 'scripts/languagepie/countries.mjs'))
const { GROUPS, groupOf } = await import(path.join(ROOT, 'scripts/languagepie/families.mjs'))

const by = code => LANGUAGE_SHARES.find(s => s.code === code) ?? assert.fail(`no ${code}`)
const rng = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')

// ── The data ──────────────────────────────────────────────────────────────

test('the data is what build.mjs makes from the input and its cache (nothing edited by hand)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'languagepie-'))
  const out = path.join(dir, 'languageShares.ts')
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/languagepie/build.mjs'), '--offline', '--out', out, '--report', path.join(dir, 'report.md')], { stdio: 'pipe' })
  assert.equal(fs.readFileSync(out, 'utf8'), read('src/data/languageShares.ts'))
})

test('every country is in the game or left out with a reason, never both', () => {
  for (const f of FLAGS) {
    const inGame = !!COUNTRIES[f.code], out = !!LEFT_OUT[f.code]
    assert.ok(inGame !== out, `${f.code} ${f.name}`)
    if (out) assert.ok(LEFT_OUT[f.code].length > 10, f.code)
  }
  assert.equal(LANGUAGE_SHARES.length, Object.keys(COUNTRIES).length)
  assert.ok(LANGUAGE_SHARES.length >= 90, `${LANGUAGE_SHARES.length}`)
})

test('each country names its year, measure, source and link', () => {
  for (const s of LANGUAGE_SHARES) {
    assert.ok(s.year >= 1990 && s.year <= 2026, s.code)
    assert.match(s.url, /^https?:\/\//, s.code)
    assert.ok(s.source.length > 5, s.code)
    assert.match(S.measureLine(s), /^[A-Z][a-z ]+, \d{4} (census|survey|population register|estimate)$/, s.code)
  }
  assert.equal(S.measureLine(by('MK')), 'Mother tongue, 2021 census')
  assert.equal(S.ageLine(by('UA'), 2026), 'From 2001, 25 years ago.')
  assert.equal(S.ageLine(by('ME'), 2026), null, 'recent figures say nothing about age')
})

test('pies: at most six named slices of 3% or more, then Other; shares add up', () => {
  for (const s of LANGUAGE_SHARES) {
    const named = s.slices.filter(x => x.group !== 'other' || x.name !== 'Other')
    assert.ok(named.length <= 6, s.code)
    for (const x of named) assert.ok(x.pct >= 3, `${s.code} ${x.name}`)
    assert.ok(s.slices.filter(x => x.name === 'Other').length <= 1, s.code)
    const total = s.slices.reduce((a, x) => a + x.pct, 0)
    if (s.multi) assert.ok(total > 100, `${s.code}: ${total}`)
    else assert.ok(Math.abs(total - 100) <= 1.6, `${s.code}: ${total}`)
    const vals = s.slices.filter(x => !/^Other\b/.test(x.name)).map(x => x.pct)
    assert.deepEqual(vals, [...vals].sort((a, b) => b - a), `${s.code}: largest first`)
  }
  // "Not stated" is left out and the rest scaled to those who answered.
  const bg = by('MK')
  assert.equal(bg.answered, 92.8)
  assert.equal(bg.slices[0].name, 'Macedonian')
  assert.equal(bg.slices[0].pct, 66.2)
  assert.ok(!by('CH').slices.some(x => x.name === 'Romansh'), 'Romansh (0.5%) is in Other')
  assert.ok(by('CH').full.some(x => x.name === 'Romansh'), 'but in the full list')
})

test('every language has a family, and every family a colour its label reads on', () => {
  for (const s of LANGUAGE_SHARES) for (const x of [...s.slices, ...s.full]) {
    assert.ok(LANGUAGE_GROUPS[x.group], `${s.code} ${x.name}`)
    assert.ok(x.family.startsWith(LANGUAGE_GROUPS[x.group].name), `${s.code} ${x.name}: ${x.family}`)
  }
  for (const [id, g] of Object.entries(LANGUAGE_GROUPS)) assert.ok(Math.max(S.contrastRatio(g.color, '#FFFCF4'), S.contrastRatio(g.color, '#1F3A3C')) >= 4.5, id)
  assert.equal(groupOf('Spanish only'), 'romance')
  assert.equal(groupOf('Guarani and Spanish'), 'two')
  assert.equal(by('ES').full.find(x => x.name === 'Basque').family, 'Language isolate')
  assert.equal(by('MU').slices[0].family, 'Creole · French-based')
  assert.equal(by('IN').slices.find(x => x.name === 'Tamil').family, 'Dravidian')
  assert.ok(Object.keys(GROUPS).length >= Object.keys(LANGUAGE_GROUPS).length)
})

test('tiers: medium is the hand-picked list, every tier fills a game', () => {
  for (const s of LANGUAGE_SHARES) assert.equal(s.tier, MEDIUM.includes(s.code) ? 'medium' : 'easy', s.code)
  for (const t of TIERS) assert.ok(S.pool(t).length >= MAX_ROUNDS * 2, `${t}: ${S.pool(t).length}`)
  // Hard shows only families, so it plays pies the families still tell apart.
  for (const s of S.pool('hard')) {
    const twins = S.lookalikes(s, 'families')
    assert.deepEqual(twins, [], `${s.code} looks like ${twins} by family`)
  }
  assert.ok(by('CH').hard && by('IN').hard && by('PY').hard)
  assert.ok(!by('DE').hard, 'German 90% is any German-speaking country by family')
})

// ── Pies alike ────────────────────────────────────────────────────────────

test('pie distance: 0 for the same pie, lookalikes are the near-identical ones', () => {
  assert.equal(S.pieDistance(by('CH'), by('CH'), 'names'), 0)
  assert.ok(S.pieDistance(by('DE'), by('LI'), 'names') <= S.LOOKALIKE)
  assert.ok(S.lookalikes(by('CO'), 'names').includes('VE'))
  assert.ok(S.pieDistance(by('ES'), by('CO'), 'families') > S.LOOKALIKE, "Spain's three Romance slices still show on hard")
  assert.deepEqual(S.lookalikes(by('CH'), 'names'), [])
})

// ── Rounds and choices ────────────────────────────────────────────────────

test('a game is up to twelve different countries of its tier, gentlest first, few lookalikes', () => {
  for (const t of TIERS) for (const seed of [1, 7, 42]) {
    const rounds = S.pickRounds(t, rng(seed))
    assert.equal(rounds.length, MAX_ROUNDS)
    assert.equal(new Set(rounds.map(r => r.code)).size, rounds.length)
    for (const r of rounds) assert.ok(S.pool(t).includes(r), `${t} ${r.code}`)
    const ranks = rounds.map(r => (t === 'hard' ? r.hardRank : r.rank))
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b))
    assert.ok(rounds.filter(r => S.lookalikes(r, S.viewFor(t)).length).length <= S.MAX_LOOKALIKE_ROUNDS)
  }
})

test('four choices: the answer and three that can be told from it and from each other', () => {
  for (const s of LANGUAGE_SHARES) for (const view of ['names', 'families']) {
    const c = S.pickChoices(s, view, rng(3))
    assert.equal(c.length, 4, s.code)
    assert.equal(new Set(c).size, 4, s.code)
    assert.ok(c.includes(s.code))
    const shares = c.map(by)
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(S.pieDistance(shares[i], shares[j], view) > S.LOOKALIKE, `${s.code}: ${c[i]} ~ ${c[j]}`)
  }
  // Decoys look like the answer: a Spanish pie gets other Spanish pies.
  const co = S.pickChoices(by('CO'), 'names', rng(5)).filter(c => c !== 'CO')
  assert.ok(co.every(c => by(c).slices[0].name.startsWith('Spanish')), co.join())
})

// ── Typed answers ─────────────────────────────────────────────────────────

test('typed answers: names, other names, lookalikes', () => {
  assert.equal(S.judgeTyped('Switzerland', by('CH'), 'names').correct, true)
  assert.equal(S.judgeTyped('switzerland ', by('CH'), 'names').correct, true)
  assert.equal(S.judgeTyped('USA', by('US'), 'names').correct, true)
  assert.equal(S.judgeTyped('Austria', by('CH'), 'names').correct, false)
  const v = S.judgeTyped('Venezuela', by('CO'), 'names')
  assert.ok(v.correct && v.lookalike, 'a pie that looks the same counts')
  assert.equal(S.judgeTyped('Swit', by('CH'), 'names').correct, true, 'one match is enough')
  assert.equal(S.judgeTyped('xyz', by('CH'), 'names').country, null)
})

// ── Colours ───────────────────────────────────────────────────────────────

test('slice colours: one hue per family, lighter for each further slice, labels readable', () => {
  const ch = by('CH')
  const c = S.sliceColors(ch.slices)
  assert.notEqual(c[1].fill, c[2].fill, 'French and Italian are both Romance but not the same shade')
  for (const s of LANGUAGE_SHARES) for (const x of S.sliceColors(s.slices)) assert.ok(S.contrastRatio(x.fill, x.ink) >= 3, `${s.code} ${x.fill}`)
})

// ── Wiring ────────────────────────────────────────────────────────────────

test('Spoken Here sits after Guess the Language on Loremaster, and every count says 57', () => {
  const ids = REGISTRY.map(e => e.id)
  assert.equal(ids[ids.indexOf('language') + 1], 'spoken')
  const e = REGISTRY.find(x => x.id === 'spoken')
  assert.equal(e.title, 'Spoken Here')
  assert.equal(e.group, 'Loremaster')
  assert.ok(e.subtitle.length <= 22, 'fits a 140px tile')
  assert.ok(!e.sandbox && !e.tool)
  assert.equal(GAME_COUNT, 57)
  assert.match(read('src/App.tsx'), /screen === "spoken"/)
  assert.match(read('src/components/icons.tsx'), /spoken: \w+/)
  assert.match(read('src/components/GamePoster.tsx'), /case "spoken":/)
  const desc = read('scripts/prerender.mjs').match(/spoken: '((?:[^'\\]|\\.)*)'/)?.[1] ?? assert.fail('no prerender description')
  assert.match(desc, new RegExp(`\\b${LANGUAGE_SHARES.length} countries`), 'the country count matches the data')
  for (const f of ['index.html', 'public/manifest.webmanifest']) assert.match(read(f), /\b57 (free games|ways to play|flag and geography games)/, f)
  const screen = read('src/components/SpokenHereScreen.tsx')
  assert.match(screen, /globalio_spoken_best/)
  assert.match(screen, /Hard: only the families are shown/)
  assert.match(screen, /role="img" aria-label=\{`Pie chart:/, 'the chart has a text alternative')
})

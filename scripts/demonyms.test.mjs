// Demonyms: the verified data (sources, fakes, traps, tiers), the typed-answer
// matcher, the hint, rounds, the answer box and the wiring.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { DEMONYMS } = await src('data/demonyms.ts')
const D = await src('utils/demonyms.ts')
const { TIERS, MAX_ROUNDS, roundPoints, gameState } = await src('utils/abroad.ts')
const { REGISTRY, GAME_COUNT } = await src('ui/registry.ts')
const { PLACES } = await import(path.join(ROOT, 'scripts/demonyms/places.mjs'))

const by = place => DEMONYMS.find(d => d.place === place) ?? assert.fail(`no ${place}`)
const judge = (place, typed) => D.judgeDemonym(by(place), typed, DEMONYMS)
const right = (place, typed) => judge(place, typed).correct
const fold = D.foldDemonym
const rng = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const kindOf = s => s.split(/[ :]/)[0]

// ── The data ──────────────────────────────────────────────────────────────

test('the data is what verify.mjs makes from its cache (nothing edited by hand)', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demonyms-')), 'demonyms.ts')
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/demonyms/verify.mjs'), '--offline', '--out', out, '--report', `${out}.md`], { stdio: 'pipe' })
  const body = f => fs.readFileSync(f, 'utf8').split('\n').slice(1).join('\n') // the first line carries the date
  assert.equal(body(out), body(path.join(ROOT, 'src/data/demonyms.ts')))
})

test('every answer has at least two sources of different kinds, and they give the same word', () => {
  for (const d of DEMONYMS) {
    const kinds = new Set(d.sources.map(kindOf))
    assert.ok(kinds.size >= 2, `${d.place}: ${d.sources.join('; ')}`)
    for (const k of kinds) assert.ok(['Wikidata', 'Wikipedia', 'Wiktionary'].includes(k), `${d.place}: ${k}`)
  }
  // The answers agree: the cached Wikidata, Wikipedia and Wiktionary entries named in `sources` give the answer.
  const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/demonyms/cache.json'), 'utf8'))
  for (const d of DEMONYMS) {
    const qid = d.sources.map(s => s.match(/^Wikidata (Q\d+)/)?.[1]).find(Boolean)
    if (qid) assert.ok(cache.wikidata[qid].some(v => fold(v.split('@')[0]).startsWith(fold(d.answer)) || fold(d.answer).startsWith(fold(v.split('@')[0]))), `${d.place}: Wikidata ${qid}`)
    const wk = d.sources.map(s => s.match(/^Wiktionary: (.+?)( \(\w+\))?$/)?.[1]).find(Boolean)
    if (wk) assert.ok(cache.wiktionary[wk], `${d.place}: Wiktionary ${wk}`)
  }
})

test('places are unique, and so are their words', () => {
  assert.equal(new Set(DEMONYMS.map(d => d.id)).size, DEMONYMS.length)
  assert.equal(new Set(DEMONYMS.map(d => fold(d.place))).size, DEMONYMS.length)
  const owner = new Map()
  for (const d of DEMONYMS) for (const w of D.acceptedForms(d)) {
    assert.ok(!owner.has(w) || owner.get(w) === d.place, `${w}: ${owner.get(w)} and ${d.place}`)
    owner.set(w, d.place)
  }
})

test('exactly three distinct fakes, none of them a word the sources give for the place', () => {
  for (const d of DEMONYMS) {
    assert.equal(d.fakes.length, 3, d.place)
    assert.equal(new Set(d.fakes.map(fold)).size, 3, `${d.place}: ${d.fakes}`)
    const right = D.acceptedForms(d)
    const other = new Set([...(d.notAnswers ?? []), ...(d.aka ?? [])].map(fold))
    for (const f of d.fakes) {
      assert.ok(!right.has(fold(f)), `${d.place}: fake ${f} is an accepted form`)
      assert.ok(!other.has(fold(f)), `${d.place}: fake ${f} is a word the sources give`)
      assert.notEqual(fold(f), fold(d.place), d.place)
      // A fake that is another place's word in the game must be a trap.
      const elsewhere = DEMONYMS.find(o => o !== d && D.acceptedForms(o).has(fold(f)))
      if (elsewhere) assert.ok(d.traps?.[f], `${d.place}: ${f} is ${elsewhere.place}'s word but not a trap`)
    }
  }
})

test("traps are fakes, say whose word they are, cite a source, and point somewhere else", () => {
  let n = 0
  for (const d of DEMONYMS) for (const [w, note] of Object.entries(d.traps ?? {})) {
    n++
    assert.ok(d.fakes.includes(w), `${d.place}: trap ${w} isn't a fake`)
    assert.match(note, new RegExp(`^${w} (is someone from|is [A-Z][a-z]+ for someone from|means “of|is an? )`), note)
    assert.ok(d.trapSources?.[w], `${d.place}: ${w} has no source`)
    const whose = note.match(/(?:someone from|means “of) (.+?)”?\.$/)?.[1]
    if (whose) assert.ok(whose === `${d.place} state` || fold(whose) !== fold(d.place), `${d.place}: ${note} points back at the place`)
  }
  assert.ok(n >= 8, `only ${n} traps`)
  assert.equal(by('Naples').traps.Nepalese, 'Nepalese is someone from Nepal.')
  assert.equal(by('Manchester').traps.Manchurian, 'Manchurian is someone from Manchuria.')
  assert.equal(by('Madrid').traps.Madridista, 'Madridista is a Real Madrid fan.')
  assert.equal(by('Niger').traps.Nigerian, 'Nigerian is someone from Nigeria.')
})

test('origin notes, nicknames and variants are sourced; nicknames are never answers', () => {
  for (const d of DEMONYMS) {
    if (d.origin) assert.match(d.originSource ?? '', /^Wiktionary: .+ \(etymology\)/, d.place)
    if (d.aka) assert.equal(d.akaSources?.length, d.aka.length, d.place)
    for (const n of d.aka ?? []) assert.equal(right(d.place, n), false, `${n} accepted for ${d.place}`)
  }
  assert.ok(DEMONYMS.filter(d => d.origin).length >= 25)
  assert.deepEqual(by('Liverpool').aka, ['Scouser'])
  assert.equal(by('Naples').origin, 'From Neapolis, Greek for “new city”.')
})

test('tiers are big enough for varied games, and the owner\'s sample is in', () => {
  for (const t of TIERS) {
    const n = DEMONYMS.filter(d => d.tier === t).length
    assert.ok(n >= 40, `${t}: ${n}`)
    assert.ok(n >= MAX_ROUNDS * 3, `${t}: ${n}`)
  }
  const sample = {
    easy: ['Venice', 'Florence', 'Vienna', 'Paris', 'Boston', 'Toronto', 'Brittany', 'Hamburg'],
    medium: ['Naples', 'Manchester', 'Oxford', 'Liverpool', 'Glasgow', 'Moscow', 'Sydney', 'Phoenix', 'Flanders'],
    hard: ['Halifax', 'Aberdeen', 'Isle of Man', 'Orkney', 'Madrid', 'Buenos Aires', 'Rio de Janeiro', 'Indianapolis', 'Los Angeles', 'Burkina Faso', 'Kiribati'],
  }
  for (const [tier, places] of Object.entries(sample)) for (const p of places) assert.equal(by(p).tier, tier, p)
  assert.deepEqual(by('Naples').fakes, ['Nepalese', 'Naplesian', 'Napolite'])
  assert.deepEqual(by('Venice').fakes, ['Venician', 'Venetan', 'Venecian'])
  // Places with two standard words are left out.
  for (const p of ['Monaco', 'Florida', 'Guinea-Bissau']) assert.ok(!DEMONYMS.some(d => d.place === p), p)
  assert.ok(PLACES.some(p => p.place === 'Monaco'), 'Monaco stays a candidate, so the report says why it is out')
})

test('rounds: twelve different places a game, mixed countries, gentlest first, four distinct choices', () => {
  for (const t of TIERS) for (let seed = 1; seed < 30; seed++) {
    const game = D.pickDemonyms(DEMONYMS, t, rng(seed))
    assert.equal(game.length, MAX_ROUNDS, t)
    assert.equal(new Set(game.map(d => d.id)).size, MAX_ROUNDS)
    assert.ok(game.every(d => d.tier === t))
    for (let i = 1; i < game.length; i++) assert.ok(game[i - 1].rank <= game[i].rank)
    const perCountry = new Map()
    for (const d of game) perCountry.set(D.countryOf(d), (perCountry.get(D.countryOf(d)) ?? 0) + 1)
    assert.ok(Math.max(...perCountry.values()) <= 3, `${t} ${seed}: ${[...perCountry]}`)
    for (const d of game) {
      const c = D.demonymChoices(d, rng(seed))
      assert.equal(c.length, 4)
      assert.equal(new Set(c).size, 4)
      assert.equal(c.filter(x => D.isDemonym(d, x)).length, 1, d.place)
    }
  }
  for (const t of TIERS) assert.equal(by(D.DEMONYM_SAMPLES[t].name).tier, t)
})

// ── Typing ────────────────────────────────────────────────────────────────

test('typed answers ignore case, accents, spaces, hyphens and punctuation, and take the listed variants', () => {
  assert.ok(right('Naples', '  NEAPOLITAN '))
  assert.ok(right('Madrid', 'madrileno'))
  assert.ok(right('Madrid', 'Madrileña'))
  assert.ok(right('Madrid', 'Madrilenian'))
  assert.ok(right('Burkina Faso', 'Burkinabe'))
  assert.ok(right('Kiribati', 'I Kiribati'))
  assert.ok(right('Kiribati', 'ikiribati'))
  assert.ok(right('Los Angeles', 'Angelino'))
  assert.ok(right('Liverpool', 'Liverpolitan'))
  assert.ok(right('Isle of Man', 'Manxman'))
  assert.ok(right('Amsterdam', 'Amsterdamer'))
  assert.equal(D.afterAnswer(by('Liverpool'), 'Liverpolitan'), 'Liverpolitan counts too, but Liverpudlian is the usual word.')
})

test('one slip only in words of eight letters or more', () => {
  assert.equal(D.slipsAllowed('neapolitan'), 1)
  assert.equal(D.slipsAllowed('breton'), 0)
  const v = judge('Naples', 'Neapolitam')
  assert.ok(v.correct && v.misspelt)
  assert.ok(right('Halifax', 'Haligonain'), 'a swapped pair is one slip')
  assert.equal(right('Venice', 'Venetain'), false, 'one slip from Venetian, but just as close to the fake Venetan')
  assert.equal(right('Naples', 'Neapolatin'), false, 'two slips')
  assert.equal(right('Brittany', 'Bretton'), false, 'Breton is six letters: no slips')
  assert.equal(right('Isle of Man', 'Mans'), false)
  assert.ok(judge('Brittany', 'Bretton').near, 'but it says how it is spelled')
})

test('never a fake, a nickname or another place\'s word, however close', () => {
  assert.equal(right('Venice', 'Venecian'), false, 'a fake one slip from the answer')
  assert.equal(right('Naples', 'Nepalese'), false)
  assert.equal(right('Liverpool', 'Scouser'), false)
  assert.equal(right('Glasgow', 'Weegie'), false)
  assert.equal(right('Indianapolis', 'Hoosier'), false)
  assert.equal(right('Manchester', 'Liverpudlian'), false)
  assert.equal(right('Auckland', 'Jafa'), false)
  for (const d of DEMONYMS) {
    for (const f of d.fakes) assert.equal(D.judgeDemonym(d, f, DEMONYMS).correct, false, `${d.place}: ${f}`)
    for (const o of DEMONYMS) if (o !== d) assert.equal(D.judgeDemonym(d, o.answer, DEMONYMS).correct, false, `${d.place}: ${o.answer}`)
  }
})

test('the hint is the first two letters or the ending, never the answer', () => {
  assert.equal(D.demonymHint(by('Halifax')), 'Ends in -onian')
  assert.equal(D.endingOf('Tripolitan'), 'itan')
  for (const d of DEMONYMS) {
    const h = D.demonymHint(d)
    assert.match(h, /^(Starts with .{2}…|Ends in -.+)$/, d.place)
    assert.ok(!fold(h).includes(fold(d.answer)), `${d.place}: ${h}`)
    if (h.startsWith('Ends')) assert.ok(h.length - 'Ends in -'.length <= Math.max(2, Math.ceil(d.answer.length * 0.55)), `${d.place}: ${h}`)
  }
})

test('scoring follows the Abroad games: typing doubles, a hint halves, ten right or three strikes', () => {
  assert.equal(roundPoints(by('Halifax').value, 'type', true, false), 60)
  assert.equal(roundPoints(by('Halifax').value, 'choice', true, true), 15)
  assert.deepEqual(TIERS.map(t => DEMONYMS.find(d => d.tier === t).value), [10, 20, 30])
  assert.equal(gameState([{ correct: false }, { correct: false }, { correct: false }]), 'out')
})

// ── The answer box and the shelf ──────────────────────────────────────────

test('the answer box never mentions a name, so iOS offers no contact AutoFill', () => {
  for (const [k, v] of Object.entries(D.DEMONYM_FIELD)) assert.doesNotMatch(String(v), /name/i, `${k}: ${v}`)
  assert.equal(D.DEMONYM_FIELD.autoComplete, 'off')
  assert.equal(D.DEMONYM_FIELD.autoCorrect, 'off')
  assert.equal(D.DEMONYM_FIELD.spellCheck, false)
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/DemonymsScreen.tsx'), 'utf8')
  assert.doesNotMatch(screen, /<input\b/, 'the shared screen draws the box')
})

test('Demonyms sits after the Abroad games on Sharp Recall, and every count says 57', () => {
  const ids = REGISTRY.map(e => e.id)
  assert.equal(ids[ids.indexOf('nativenames') + 1], 'demonyms')
  const e = REGISTRY.find(x => x.id === 'demonyms')
  assert.equal(e.title, 'Demonyms')
  assert.equal(e.subtitle, 'Neapolitan or Nepalese?')
  assert.equal(e.group, 'Sharp Recall')
  assert.equal(e.tab, 'play')
  assert.ok(!e.sandbox && !e.tool)
  assert.equal(GAME_COUNT, 57)
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
  assert.match(read('src/App.tsx'), /screen === "demonyms"/)
  assert.match(read('src/components/icons.tsx'), /demonyms: \w+/)
  assert.match(read('src/components/GamePoster.tsx'), /case "demonyms":/)
  const desc = read('scripts/prerender.mjs').match(/demonyms: '([^']*)'/)?.[1] ?? assert.fail('no prerender description')
  assert.match(desc, new RegExp(`\\b${DEMONYMS.length} cities, regions and countries`), 'the place count matches the data')
  for (const f of ['index.html', 'public/manifest.webmanifest']) assert.doesNotMatch(read(f), /\b56 (free )?(flag and geography )?(games|ways)/, f)
})

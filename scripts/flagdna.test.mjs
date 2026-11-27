// Flag DNA: a guess only talks about the guessed flag's own traits, green ones
// first; yellow is stripes or a cross turned the other way; the traits match
// the flags as drawn; "Known so far" adds the guesses up.
// Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const D = await src('utils/flagDna.ts')
const { FLAGS } = await src('data/flags.ts')
const { ruleFor } = await src('utils/mergeProgress.ts')
const traits = code => D.DNA[code].traits
const marks = (g, t) => Object.fromEntries(D.compare(g, t).clues.map(c => [c.trait, c.mark]))

test('every country flag has DNA: a region, two or more colours, and a pattern', () => {
  assert.equal(D.DNA_CODES.length, FLAGS.length)
  for (const f of FLAGS) {
    const d = D.DNA[f.code]
    assert.ok(d, f.code)
    assert.equal(d.region, f.region, f.code)
    assert.ok(d.colours >= 2 && d.colours <= 6, `${f.code} has ${d.colours} colours`)
    assert.ok(d.traits.some(t => D.TRAIT[t].kind === 'pattern'), `${f.code} has no pattern`)
    assert.equal(new Set(d.traits).size, d.traits.length, f.code)
  }
})

test('the traits match the flags as drawn', () => {
  const has = (code, ...ts) => { for (const t of ts) assert.ok(traits(code).includes(t), `${code} should have ${t}`) }
  const lacks = (code, ...ts) => { for (const t of ts) assert.ok(!traits(code).includes(t), `${code} should not have ${t}`) }
  // The owner's example: stars, horizontal stripes and a corner box, no green.
  assert.deepEqual(traits('US'), ['red', 'blue', 'white', 'hstripes', 'manystripes', 'canton', 'star'])
  has('JP', 'red', 'white', 'circle', 'plain'); lacks('JP', 'sun', 'star')
  has('FR', 'vstripes'); lacks('FR', 'hstripes')
  has('DE', 'hstripes'); lacks('DE', 'vstripes')
  has('DK', 'cross', 'nordic'); lacks('DK', 'saltire')
  has('JM', 'saltire'); lacks('JM', 'cross')
  has('GB', 'unionjack', 'cross', 'saltire')
  has('AU', 'unionjack', 'cross', 'saltire', 'canton', 'star')
  has('CH', 'cross', 'plain'); lacks('CH', 'nordic')
  has('CZ', 'triangle', 'hstripes', 'split')
  has('CA', 'vstripes', 'plant')
  has('BR', 'white', 'diamond', 'circle', 'star', 'writing')
  has('CY', 'green', 'map', 'plant')
  lacks('CV', 'circle')                          // a ring of stars
  has('AR', 'sun', 'blue'); lacks('AR', 'star')  // a sun is not a star
  has('LV', 'red'); has('LU', 'blue')            // maroon is red, light blue is blue
  has('NP', 'shape', 'sun', 'crescent')
  has('TR', 'crescent', 'star', 'plain')
  // Small parts inside a coat of arms don't count.
  lacks('ES', 'crown', 'writing', 'building'); has('ES', 'emblem')
  lacks('SI', 'star', 'yellow')
})

test('a guess lists only its own flag\'s traits: green first, then yellow, then grey', () => {
  // The United States against Italy: nothing about green, which the US doesn't have.
  const r = D.compare('US', 'IT')
  assert.deepEqual(r.clues.map(c => c.trait), ['red', 'white', 'hstripes', 'blue', 'manystripes', 'canton', 'star'])
  assert.deepEqual(r.clues.map(c => c.mark), ['hit', 'hit', 'near', 'miss', 'miss', 'miss', 'miss'])
  assert.ok(!r.clues.some(c => c.trait === 'green'))
  for (const g of D.DNA_CODES) for (const t of ['US', 'NP', 'BR', 'SA']) {
    const res = D.compare(g, t)
    assert.deepEqual(res.clues.map(c => c.trait).sort(), [...traits(g)].sort(), `${g} vs ${t}`)
    const order = res.clues.map(c => ({ hit: 0, near: 1, miss: 2 })[c.mark])
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `${g} vs ${t}: green first`)
    for (const c of res.clues) assert.equal(c.mark === 'hit', traits(t).includes(c.trait), `${g} vs ${t}: ${c.trait}`)
  }
})

test('yellow: stripes or a cross that run the other way, never when the guess has both', () => {
  assert.equal(marks('DE', 'FR').hstripes, 'near')
  assert.equal(marks('FR', 'DE').vstripes, 'near')
  assert.equal(marks('DK', 'JM').cross, 'near')
  assert.equal(marks('JM', 'DK').saltire, 'near')
  // Like a Wordle letter used twice: the UAE's vertical band matches France, so
  // its horizontal stripes are plain grey, not "turned".
  assert.deepEqual([marks('AE', 'FR').vstripes, marks('AE', 'FR').hstripes], ['hit', 'miss'])
  assert.deepEqual([marks('GB', 'DK').cross, marks('GB', 'DK').saltire], ['hit', 'miss'])
  // Nothing else is ever yellow.
  for (const g of D.DNA_CODES) for (const t of ['FR', 'DE', 'JM', 'DK', 'TZ']) {
    for (const c of D.compare(g, t).clues) if (c.mark === 'near') assert.ok(['hstripes', 'vstripes', 'cross', 'saltire'].includes(c.trait), `${g} vs ${t}`)
  }
})

test('match %: 100 only for the answer; lookalikes are named', () => {
  for (const g of D.DNA_CODES) {
    assert.equal(D.compare(g, g).match, 100)
    assert.ok(D.compare(g, g).solved)
  }
  for (const g of D.DNA_CODES) for (const t of ['US', 'JP', 'RU']) {
    if (g === t) continue
    const r = D.compare(g, t)
    assert.ok(r.match >= 0 && r.match <= 99, `${g} vs ${t}: ${r.match}`)
    assert.equal(r.match, D.compare(t, g).match, 'the same both ways')
  }
  const nl = D.compare('NL', 'RU')
  assert.ok(nl.lookalike && nl.region && nl.clues.every(c => c.mark === 'hit') && nl.match === 99)
  assert.ok(!D.compare('IE', 'CI').lookalike, 'same DNA, but another region')
  assert.ok(D.compare('DE', 'BE').match > D.compare('JP', 'BE').match)
  assert.equal(D.warmth(85), 'Hot'); assert.equal(D.warmth(10), 'Cold')
})

test('every puzzle can be solved: at most three flags share one DNA and region', () => {
  const groups = new Map()
  for (const d of Object.values(D.DNA)) {
    const k = d.traits.join() + '|' + d.region
    groups.set(k, [...(groups.get(k) ?? []), d.code])
  }
  for (const g of groups.values()) assert.ok(g.length <= 3, g.join(' = '))
})

test('Known so far adds the guesses up, turned ones included', () => {
  const k = D.knownSoFar(['US', 'NE'].map(g => D.compare(g, 'CI')), D.DNA.CI.colours)
  assert.equal(k.colourCount, 3)
  assert.deepEqual(k.colours, ['orange', 'green', 'white'])
  // Two "turned" horizontal stripes: it has vertical ones, not horizontal.
  assert.deepEqual(k.has, ['vstripes'])
  assert.deepEqual(k.not, ['red', 'blue', 'hstripes', 'manystripes', 'canton', 'circle', 'star'])
  assert.equal(k.region, 'Africa')
  assert.deepEqual(k.notRegions, [])
  // A region is known once every other one is ruled out.
  const away = D.knownSoFar(['FR', 'JP', 'NG', 'SA', 'AU'].map(g => D.compare(g, 'MX')), 3)
  assert.equal(away.region, 'Americas')
  const some = D.knownSoFar(['FR', 'JP'].map(g => D.compare(g, 'MX')), 3)
  assert.equal(some.region, null)
  assert.deepEqual(some.notRegions, ['Europe', 'Asia'])
  // Nothing is ever both known and ruled out.
  for (const t of ['US', 'GB', 'BR', 'NP', 'JM']) {
    const kk = D.knownSoFar(['DE', 'FR', 'DK', 'JM', 'AE', 'GB', 'US', 'JP'].map(g => D.compare(g, t)), D.DNA[t].colours)
    for (const x of [...kk.colours, ...kk.has]) assert.ok(traits(t).includes(x), `${t}: ${x}`)
    for (const x of kk.not) assert.ok(!traits(t).includes(x), `${t}: not ${x}`)
  }
})

test('the screen uses the DNA rules, the did-you-mean chip, and a synced best streak', () => {
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/FlagDNAScreen.tsx'), 'utf8')
  assert.match(screen, /from "\.\.\/utils\/flagDna"/)
  assert.match(screen, /<DidYouMean /)
  assert.ok(!/FLAG_ATTRIBS/.test(screen), 'the old attribute table is not used')
  const key = /BEST_KEY = "(globalio_[a-z]+_best)"/.exec(screen)?.[1]
  assert.equal(key, 'globalio_flagdna_best')
  assert.equal(ruleFor(key)?.rule, 'max')
})

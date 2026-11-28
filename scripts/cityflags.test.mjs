// City flags (the Codex's "City Flags" section, beta): src/data/cityFlags.ts,
// written by scripts/cities/build.mjs, and src/data/cityAtlas.ts, which joins
// it with the U.S. cities.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { EUROPE_CITY_FLAGS, US_CITY_POPULATION } = await src('data/cityFlags.ts')
const { CITY_ATLAS, ALL_ATLAS_CITIES, formatPopulation } = await src('data/cityAtlas.ts')
const { FLAGS } = await src('data/flags.ts')
const { US_CITY_FLAGS } = await src('data/usCityFlags.ts')

// The selection rule in scripts/cities/build.mjs.
const MIN_POP = 100_000, MAX_PER_COUNTRY = 25, MIN_PER_COUNTRY = 10
// City-states: their city flag is the national flag.
const NO_CITIES = ['MC', 'VA']
const byCountry = new Map()
for (const c of EUROPE_CITY_FLAGS) byCountry.set(c.country, [...(byCountry.get(c.country) ?? []), c])

test('every European city has a hosted flag, a dated population and a free licence', () => {
  for (const c of EUROPE_CITY_FLAGS) {
    assert.match(c.flagUrl, /^\/city-flags\/[a-z]{2}\/[a-z0-9-]+\.(svg|png|jpg|gif)$/, c.id)
    const file = path.join(ROOT, 'public', c.flagUrl)
    assert.ok(fs.existsSync(file) && fs.statSync(file).size > 100, `${c.id}: ${c.flagUrl} is missing`)
    assert.ok(Number.isInteger(c.population) && c.population > 0, `${c.id}: population`)
    assert.ok(Number.isInteger(c.year) && c.year >= 1990 && c.year <= new Date().getFullYear(), `${c.id}: year ${c.year}`)
    assert.match(c.licence, /^(Public domain|CC0|CC BY(-SA)? [\d.]+( [A-Za-z-]+)?)$/, `${c.id}: licence ${c.licence}`)
    assert.match(c.commons, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${c.id}: Commons page`)
    assert.ok(c.name && !/^Q\d+$/.test(c.name) && c.local !== c.name, `${c.id}: name`)
    if (c.description) assert.ok(c.article?.startsWith('https://en.wikipedia.org/wiki/') && c.description.length <= 260, `${c.id}: description source`)
  }
})

test('no city is listed twice', () => {
  const unique = (xs, what) => assert.equal(new Set(xs).size, xs.length, `duplicate ${what}`)
  unique(EUROPE_CITY_FLAGS.map(c => c.id), 'id')
  unique(EUROPE_CITY_FLAGS.map(c => c.flagUrl), 'image')
  unique(EUROPE_CITY_FLAGS.map(c => c.commons), 'Commons file')
  unique(EUROPE_CITY_FLAGS.map(c => `${c.country} ${c.name}`), 'name in a country')
  unique(ALL_ATLAS_CITIES.map(x => x.city.key), 'atlas key')
})

test('Europe: every country but the city-states, each with its cities by the rule', () => {
  const europe = FLAGS.filter(f => f.region === 'Europe').map(f => f.code)
  for (const code of byCountry.keys()) assert.ok(europe.includes(code), `${code} isn't a European country in flags.ts`)
  for (const code of europe) {
    if (NO_CITIES.includes(code)) { assert.ok(!byCountry.has(code), code); continue }
    const list = byCountry.get(code)
    assert.ok(list?.length, `${code} has no cities`)
    assert.ok(list.filter(c => c.capital).length <= 1, `${code}: one capital`)
    const others = list.filter(c => !c.capital)
    const small = others.filter(c => c.population < MIN_POP)
    // Every place of 100,000 or more, at most 25; topped up to 10 only when
    // the country has fewer than 10 of those.
    assert.ok(others.length <= (small.length ? MIN_PER_COUNTRY : MAX_PER_COUNTRY), `${code}: ${others.length} cities`)
    if (small.length) assert.ok(others.filter(c => c.population >= MIN_POP).length < MIN_PER_COUNTRY, `${code}: topped up although it has ${MIN_PER_COUNTRY} big cities`)
  }
  // The capital is there wherever it has a flag of its own: London and
  // Athens have none on Wikimedia Commons, and Copenhagen's and Luxembourg
  // City's are logos (scripts/cities/build.mjs, DROP).
  const NO_CAPITAL = ['DK', 'GB', 'GR', 'LU']
  const without = [...byCountry].filter(([, list]) => !list.some(c => c.capital)).map(([code]) => code).sort()
  assert.deepEqual(without, NO_CAPITAL, 'countries listed without their capital')
})

test('each country lists its cities biggest first', () => {
  for (const [code, list] of byCountry) {
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].population >= list[i].population, `${code}: ${list[i - 1].name} before ${list[i].name}`)
  }
  for (const cont of CITY_ATLAS) for (const k of cont.countries) {
    const pops = k.cities.map(c => c.population ?? -1)
    assert.deepEqual(pops, [...pops].sort((a, b) => b - a), `${k.name}: biggest first`)
  }
})

test('the atlas: Europe A–Z, then the U.S. cities under North America', () => {
  assert.deepEqual(CITY_ATLAS.map(c => c.name), ['Europe', 'North America'])
  const names = CITY_ATLAS[0].countries.map(k => k.name)
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)))
  const us = CITY_ATLAS[1].countries.find(k => k.code === 'US')
  assert.equal(us?.cities.length, US_CITY_FLAGS.length, 'every U.S. city')
  assert.ok(CITY_ATLAS.every(c => c.countries.every(k => k.cities.length)), 'no empty continent or country')
  // Every population belongs to a city in usCityFlags.ts (a city whose flag is
  // gone from Commons, like Dallas, is in the source but not in US_CITY_FLAGS).
  const ids = new Set([...fs.readFileSync(path.join(ROOT, 'src/data/usCityFlags.ts'), 'utf8').matchAll(/\bc\("([a-z0-9-]+)"/g)].map(m => m[1]))
  for (const id of Object.keys(US_CITY_POPULATION)) assert.ok(ids.has(id), `${id} isn't a U.S. city`)
  assert.ok(Object.keys(US_CITY_POPULATION).length >= US_CITY_FLAGS.length - 5, 'most U.S. cities have a population')
})

test('populations read plainly', () => {
  assert.equal(formatPopulation(2_113_705), '2.1 million')
  assert.equal(formatPopulation(931_298), '931,298')
  assert.equal(formatPopulation(12_655_050), '12.7 million')
})

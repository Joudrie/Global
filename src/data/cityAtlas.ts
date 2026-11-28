import { FLAGS } from "./flags"
import { US_CITY_FLAGS } from "./usCityFlags"
import { EUROPE_CITY_FLAGS, US_CITY_POPULATION } from "./cityFlags"

// The Codex's "City Flags" section (beta), its Flashcards deck and the Mega
// Codex all read the cities from here: continent → country → cities, biggest
// first. Europe comes from scripts/cities/build.mjs (cityFlags.ts); the United
// States is the hand-picked list in usCityFlags.ts, with populations from the
// same script. A continent shows once it has cities.

export interface AtlasCity {
  key: string
  name: string
  /** The city's own name for itself, when it differs ("München"). */
  local?: string
  /** A U.S. city's state ("IL"). */
  state?: string
  population?: number
  year?: number
  capital?: boolean
  flagUrl: string
  /** What the flag shows: Wikipedia's words for European cities, ours for U.S. ones. */
  note?: string
  /** The Wikipedia article the note comes from. */
  article?: string
  credit?: { commons: string; author?: string; licence: string; licenceUrl?: string }
}
export interface AtlasCountry { code: string; name: string; flagUrl: string; cities: AtlasCity[] }
export interface AtlasContinent { name: string; countries: AtlasCountry[] }

const byPopulation = (a: AtlasCity, b: AtlasCity) =>
  (b.population ?? -1) - (a.population ?? -1) || a.name.localeCompare(b.name)

function buildAtlas(): AtlasContinent[] {
  const europe = new Map<string, AtlasCity[]>()
  for (const c of EUROPE_CITY_FLAGS) {
    const list = europe.get(c.country) ?? []
    list.push({
      key: c.id, name: c.name, local: c.local, population: c.population, year: c.year, capital: c.capital,
      flagUrl: c.flagUrl, note: c.description, article: c.article,
      credit: { commons: c.commons, author: c.author, licence: c.licence, licenceUrl: c.licenceUrl },
    })
    europe.set(c.country, list)
  }
  const countries = (byCode: Map<string, AtlasCity[]>): AtlasCountry[] =>
    [...byCode].map(([code, cities]) => {
      const f = FLAGS.find(x => x.code === code)!
      return { code, name: f.name, flagUrl: f.flagUrl, cities: [...cities].sort(byPopulation) }
    }).sort((a, b) => a.name.localeCompare(b.name))

  const us: AtlasCity[] = US_CITY_FLAGS.map(c => {
    const pop = US_CITY_POPULATION[c.id]
    return { key: `us-${c.id}`, name: c.name, state: c.state, population: pop?.[0], year: pop?.[1], flagUrl: c.flagUrl, note: c.note,
      capital: c.id === "dc" }
  })
  return [
    { name: "Europe", countries: countries(europe) },
    { name: "North America", countries: countries(new Map([["US", us]])) },
  ].filter(c => c.countries.length)
}

export const CITY_ATLAS: AtlasContinent[] = buildAtlas()

/** Every city in the atlas, continent by continent, country by country. */
export const ALL_ATLAS_CITIES = CITY_ATLAS.flatMap(c => c.countries.flatMap(k => k.cities.map(city => ({ city, country: k }))))

/** "2.1 million", "843,120", "5,819". */
export function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(Math.round(n / 100_000) / 10).toLocaleString("en-US")} million`
  return n.toLocaleString("en-US")
}

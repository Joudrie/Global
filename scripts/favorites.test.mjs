// Play tab changes: favourite games and per-game play counts
// (src/utils/favorites.ts) and how they merge between devices
// (src/utils/mergeProgress.ts); Abroad, the one game Cities Abroad and
// Countries Abroad became; and US City Flags back on a main shelf.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const F = await src('utils/favorites.ts')
const { mergeSnapshots: merge, ruleFor, summarize, bestsRaised } = await src('utils/mergeProgress.ts')
const R = await src('ui/registry.ts')
const { statsOf } = await src('profile/stats.ts')

const S = v => JSON.stringify(v)
const P = s => JSON.parse(s)
const both = (key, a, b) => [merge({ [key]: a }, { [key]: b })[key], merge({ [key]: b }, { [key]: a })[key]]

// A browser-like storage and window for the favourites module.
function useStorage(init = {}) {
  const m = new Map(Object.entries(init))
  const events = []
  globalThis.localStorage = {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k),
  }
  globalThis.window = { dispatchEvent: e => events.push(e.type) }
  return { m, events }
}

// ── Favourites and play counts on one device ────────────────────────────────

test('starring and unstarring: kept with a time, announced, and unstarred games stay marked', () => {
  const { m, events } = useStorage()
  assert.deepEqual(F.readFavorites(), {})
  assert.equal(F.hasUsedFavorites(F.readFavorites()), false)
  F.setFavorite('flagfusion', true, 1000)
  F.setFavorite('abroad', true, 2000)
  F.setFavorite('flagfusion', false, 3000)
  assert.deepEqual(P(m.get(F.FAVORITES_KEY)), { flagfusion: { on: false, at: 3000 }, abroad: { on: true, at: 2000 } })
  assert.deepEqual(events, Array(3).fill(F.FAVORITES_EVENT))
  assert.ok(F.hasUsedFavorites(F.readFavorites()), 'the hint stays away once a star was used')
  // A clock set back still makes the newest choice the latest one.
  F.setFavorite('abroad', false, 5)
  assert.equal(F.readFavorites().abroad.at, 2001)
})

test('play counts go up one per open, and junk in storage is ignored', () => {
  useStorage({ globalio_playcounts: S({ realorbot: 2, bad: 'x', neg: -3 }), globalio_favorites: S({ a: { on: true, at: 1 }, b: 'nope', c: { on: 'yes', at: 2 } }) })
  F.notePlay('realorbot')
  F.notePlay('abroad')
  assert.deepEqual(F.readPlayCounts(), { realorbot: 3, abroad: 1 })
  assert.deepEqual(F.readFavorites(), { a: { on: true, at: 1 } })
  useStorage({ globalio_playcounts: '{', globalio_favorites: '[1,2]' })
  assert.deepEqual(F.readPlayCounts(), {})
  assert.deepEqual(F.readFavorites(), {})
})

test('storage that throws never breaks starring or counting', () => {
  globalThis.localStorage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  globalThis.window = { dispatchEvent() { throw new Error('no') } }
  assert.doesNotThrow(() => F.setFavorite('x', true))
  assert.doesNotThrow(() => F.notePlay('x'))
  assert.deepEqual(F.readFavorites(), {})
})

test('the Favourites row: most played first, ties to the most recently starred, unstarred left out', () => {
  const favs = {
    flagfusion: { on: true, at: 100 }, abroad: { on: true, at: 300 }, realorbot: { on: true, at: 200 },
    geopaint: { on: false, at: 900 }, thepeel: { on: true, at: 50 },
  }
  const counts = { realorbot: 2, flagfusion: 2, thepeel: 7, geopaint: 40 }
  assert.deepEqual(F.rankFavorites(favs, counts), ['thepeel', 'realorbot', 'flagfusion', 'abroad'])
  assert.deepEqual(F.rankFavorites(favs, {}), ['abroad', 'realorbot', 'flagfusion', 'thepeel'])
  assert.deepEqual(F.rankFavorites({}, counts), [])
})

// ── Between devices (backup Combine, account sync) ──────────────────────────

test('favourites merge: every star from both devices, and a later unstar wins', () => {
  assert.equal(ruleFor('globalio_favorites').rule, 'latest')
  assert.ok(ruleFor('globalio_favorites').symmetric)
  const phone = S({ flagfusion: { on: true, at: 10 }, abroad: { on: true, at: 20 } })
  const laptop = S({ realorbot: { on: true, at: 15 }, abroad: { on: false, at: 30 } })
  const [ab, ba] = both('globalio_favorites', phone, laptop)
  assert.equal(ab, ba)
  assert.deepEqual(P(ab), { abroad: { on: false, at: 30 }, flagfusion: { on: true, at: 10 }, realorbot: { on: true, at: 15 } })
  // Starred again later on the phone: the star comes back.
  const again = S({ abroad: { on: true, at: 40 } })
  assert.deepEqual(P(merge({ globalio_favorites: ab }, { globalio_favorites: again }).globalio_favorites).abroad, { on: true, at: 40 })
  // Same moment, different choice: starred, either way round.
  const [t1, t2] = both('globalio_favorites', S({ x: { on: true, at: 5 } }), S({ x: { on: false, at: 5 } }))
  assert.equal(t1, t2)
  assert.equal(P(t1).x.on, true)
  // Idempotent.
  const once = merge({ globalio_favorites: phone }, { globalio_favorites: laptop })
  assert.deepEqual(merge(once, { globalio_favorites: laptop }), once)
  assert.deepEqual(merge(once, once), once)
})

test('play counts merge: the higher count per game, and they are not best scores', () => {
  assert.equal(ruleFor('globalio_playcounts').rule, 'max')
  const [ab, ba] = both('globalio_playcounts', S({ realorbot: 9, abroad: 1 }), S({ realorbot: 4, thepeel: 3 }))
  assert.equal(ab, ba)
  assert.deepEqual(P(ab), { abroad: 1, realorbot: 9, thepeel: 3 })
  const snap = { dailyglobe_v1: S({ learnedFlags: [] }), globalio_playcounts: S({ realorbot: 9 }), globalio_hl_best: '4' }
  assert.equal(summarize(snap).bests, 1, 'only the Higher / Lower best counts')
  assert.equal(bestsRaised({}, { globalio_playcounts: S({ realorbot: 9 }) }), 0)
  assert.equal(ruleFor('globalio_abroad_prefs').rule, 'device', "Abroad's last switch stays this device's")
})

// ── Abroad ──────────────────────────────────────────────────────────────────

test('Abroad: one game, old links open it on the right switch, bests kept per switch', () => {
  assert.equal(R.currentId('abroad'), 'abroad')
  assert.equal(R.currentId('citiesabroad'), 'abroad')
  assert.equal(R.currentId('countriesabroad'), 'abroad')
  assert.equal(R.currentId('capitalsabroad'), 'abroad')
  assert.equal(R.currentId('atlaswhen'), 'atlas')
  assert.equal(R.currentId('nope'), null)
  assert.deepEqual(R.ABROAD_LINK_KINDS, { capitalsabroad: 'cities', citiesabroad: 'cities', countriesabroad: 'countries' })
  for (const old of Object.keys(R.RENAMED)) assert.ok(!R.REGISTRY.some(e => e.id === old), `${old} is no longer its own game`)
  const e = R.REGISTRY.find(x => x.id === 'abroad')
  assert.equal(e.title, 'Abroad')
  assert.equal(e.subtitle, 'Allemagne → Germany', 'short enough for a tile')
  assert.match(read('src/components/GamePoster.tsx'), /"\+ CITIES"/, 'the poster says cities are in it too')
  // The two switches keep their ids, so their saved bests and settings keep their keys.
  assert.match(read('src/components/CitiesAbroadScreen.tsx'), /id: "citiesabroad"/)
  assert.match(read('src/components/CountriesAbroadScreen.tsx'), /id: "countriesabroad"/)
  const screen = read('src/components/AbroadGameScreen.tsx')
  assert.match(screen, /label: "Countries"/)
  assert.match(screen, /label: "Cities"/)
  assert.match(screen, /title="Abroad"/)
  // Profile bests: the higher of the two switches, under Abroad.
  const s = statsOf({ globalio_citiesabroad_best: S({ 'easy-type': 340 }), globalio_countriesabroad_best: S({ 'hard-choice': 500 }) })
  assert.deepEqual(s.bests, { abroad: 500 })
  // The thumbnail is Countries Abroad's Germany stamps, and the app routes it.
  assert.match(read('src/components/GamePoster.tsx'), /case "abroad":/)
  assert.match(read('src/components/GamePoster.tsx'), /ABROAD_STAMPS\[both \? "countriesabroad" : id\]/)
  assert.match(read('src/components/icons.tsx'), /abroad: \w+/)
  assert.match(read('src/App.tsx'), /screen === "abroad"/)
  assert.doesNotMatch(read('src/App.tsx'), /screen === "(cities|countries)abroad"/)
  assert.match(read('scripts/prerender.mjs'), /\n {2}abroad: '/)
  assert.doesNotMatch(read('scripts/prerender.mjs'), /\n {2}(cities|countries)abroad: '/)
})

// ── US City Flags and the stars on Play ─────────────────────────────────────

test('US City Flags is on a main shelf, counted, with its own poster', () => {
  const e = R.REGISTRY.find(x => x.id === 'uscityflags')
  assert.ok(e && !e.sandbox && e.tab === 'play')
  assert.equal(e.group, 'Sharp Recall')
  assert.ok(R.GAMES.includes(e))
  assert.match(read('src/components/GamePoster.tsx'), /case "uscityflags":/)
  assert.doesNotMatch(read('scripts/prerender.mjs'), /More games': '[^']*city flags/i)
})

test('the favourite star: a labelled toggle beside the card, never inside its button', () => {
  const ui = read('src/components/ui.tsx')
  assert.match(ui, /aria-pressed=\{on\}/)
  assert.match(ui, /aria-label=\{`Add \$\{title\} to favourites`\}/)
  assert.match(ui, /e\.stopPropagation\(\)/)
  assert.match(ui, /position: "absolute"/)
  // The tile's button closes before the star opens.
  const tile = ui.slice(ui.indexOf('export function FlagTile'))
  assert.ok(tile.indexOf('{card}') < tile.indexOf('<FavoriteStar'), 'the star is a sibling of the card button')
  const css = read('src/index.css')
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.fav-star:hover/, 'hidden until hover only where there is hover')
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.fav-star \{ transition: none; \}/)
})

test("Play: Carousel, Favourites, Creator's Picks, View all, then the categories (no Daily Rituals)", async () => {
  const reg = await import(path.join(ROOT, 'src/ui/registry.ts'))
  assert.deepEqual(reg.creatorPicks().map(e => e.title),
    ['Abroad', 'Flag Fusion', 'Flag Studio', 'Flag Identifier', 'Guess the Language', 'Real or Bot', 'Lineage'])
  const az = reg.allGamesAZ()
  assert.equal(new Set(az.map(e => e.id)).size, az.length, 'each game once')
  assert.deepEqual(az.map(e => e.title), [...az.map(e => e.title)].sort((a, b) => a.localeCompare(b)))
  assert.ok(az.length >= reg.GAME_COUNT)
  const tabs = fs.readFileSync(path.join(ROOT, 'src/components/MainTabs.tsx'), 'utf8')
  const at = t => tabs.indexOf(t, tabs.indexOf('<TrendingDeck games'))
  assert.ok(at('<TrendingDeck') < at('title="Favourites"') && at('title="Favourites"') < at(`title="Creator's Picks"`) &&
    at(`title="Creator's Picks"`) < at('View all games') && at('View all games') < at('{categoryGroups.map(g => ('), 'row order')
  for (const gone of ['title="Jump back in"', 'title="Recommended for you"', 'title="Top games"', 'title="Discover something new"'])
    assert.ok(!tabs.includes(gone), `${gone} is gone`)
  const groups = reg.groupsFor('play').map(g => g.group)
  assert.ok(!groups.includes('Daily Rituals'), 'Daily Rituals is split up')
  const where = id => reg.REGISTRY.find(e => e.id === id).group
  assert.equal(where('connections'), 'Spot It'); assert.equal(where('funfact'), 'Learn the World')
  assert.equal(where('worldcup'), 'Learn the World'); assert.equal(where('flagbracket'), 'One Glance'); assert.equal(where('tierlist'), 'One Glance')
})

test('Play: the All chip opens the A–Z page, four to a row', () => {
  const tabs = fs.readFileSync(path.join(ROOT, 'src/components/MainTabs.tsx'), 'utf8')
  assert.match(tabs, /\{ label: "All", group: VIEW_ALL \}/)
  assert.match(tabs, /gridTemplateColumns: "repeat\(4, minmax\(0, 1fr\)\)"/)
})

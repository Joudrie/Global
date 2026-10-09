// The home screen avoids importing big data modules by keeping a few copied
// values (see src/data/posterShapes.ts, SUB_FLAG_COUNT in src/ui/registry.ts and
// CODEX_COUNTS in src/data/codexCounts.ts).
// These tests fail if the copies drift from their sources.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))

test('SUB_FLAG_COUNT matches SUB_FLAGS.length', async () => {
  const { SUB_FLAGS } = await src('data/subdivisions.ts')
  const { SUB_FLAG_COUNT } = await src('ui/registry.ts')
  assert.equal(SUB_FLAG_COUNT, SUB_FLAGS.length)
})

test('poster subdivision flags match SUB_FLAGS', async () => {
  const { SUB_FLAGS } = await src('data/subdivisions.ts')
  const { POSTER_SUB_URLS } = await src('data/posterShapes.ts')
  for (const [code, url] of Object.entries(POSTER_SUB_URLS)) {
    assert.equal(url, SUB_FLAGS.find(s => s.code === code)?.flagUrl, code)
  }
})

test('poster shapes match the simplified world map', async () => {
  const { buildWorldPaths, readWorld, posterFile, POSTER_FILE } = await import(path.join(ROOT, 'scripts/world-paths.mjs'))
  const { POSTER_MAP_VIEWBOX } = await src('data/posterShapes.ts')
  assert.equal(POSTER_MAP_VIEWBOX, readWorld().viewBox)
  assert.ok(fs.readFileSync(POSTER_FILE, 'utf8') === posterFile(buildWorldPaths().detail),
    'src/data/posterShapes.ts is stale: run scripts/world-paths.mjs (see its header)')
})

test('CODEX_COUNTS match the Codex galleries', async () => {
  const { CODEX_COUNTS } = await src('data/codexCounts.ts')
  const g = await src('data/codexGalleries.ts')
  const { ETHNIC_FLAGS } = await src('data/ethnicFlags.ts')
  const { IDENTITY_FLAGS, IDENTITY_CATEGORIES, SIGNAL_FLAGS } = await src('data/identityFlags.ts')
  const { EXTINCT_STATES } = await src('data/extinctStates.ts')
  const { HISTORICAL_FLAGS } = await src('data/historicalFlags.ts')
  const { ORG_FLAGS } = await src('data/orgFlags.ts')
  const { US_CITY_FLAGS } = await src('data/usCityFlags.ts')
  const { ALL_FLAGS_AZ } = await src('data/megaCodex.ts')
  const inCat = c => IDENTITY_FLAGS.filter(f => f.category === c).length
  assert.deepEqual(CODEX_COUNTS, {
    mega: ALL_FLAGS_AZ.length,
    peoples: g.rowCount(g.peoplesRegions(ETHNIC_FLAGS, IDENTITY_FLAGS)),
    identity: IDENTITY_CATEGORIES.filter(g.isIdentityMain).map(c => [c, inCat(c)]),
    micronations: inCat('Micronations'),
    extinct: g.rowCount(g.extinctRegions(EXTINCT_STATES, HISTORICAL_FLAGS)),
    usCities: US_CITY_FLAGS.length,
    orgs: g.rowCount(g.orgRegions(ORG_FLAGS)),
    signal: SIGNAL_FLAGS.length,
  }, 'update src/data/codexCounts.ts')
})

test('onboarding flags match fp()', async () => {
  const { fp } = await src('data/codex.ts')
  const text = fs.readFileSync(path.join(ROOT, 'src/components/Onboarding.tsx'), 'utf8')
  const val = name => text.match(new RegExp(`const ${name} = "([^"]+)"`))?.[1]
  assert.equal(val('ESTELADA'), fp('Estelada_blava.svg'))
  assert.equal(val('KANAKA'), fp('Kanaka_Maoli_flag.svg'))
})

test('GamePoster historical art matches fp()', async () => {
  const { fp } = await src('data/codex.ts')
  const text = fs.readFileSync(path.join(ROOT, 'src/components/GamePoster.tsx'), 'utf8')
  for (const m of text.matchAll(/= "(\/cf\/[^"]+)"\s*\/\/ (\S+)/g)) assert.equal(m[1], fp(m[2]), m[2])
})

test('game counts in index.html and the manifest match GAME_COUNT', async () => {
  const { GAME_COUNT } = await src('ui/registry.ts')
  for (const f of ['index.html', 'public/manifest.webmanifest']) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8')
    const counts = [...text.matchAll(/(\d+) (?:free games|ways to play|flag and geography games)/g)].map(m => +m[1])
    assert.ok(counts.length, `${f}: no game count found`)
    for (const n of counts) assert.equal(n, GAME_COUNT, f)
  }
})

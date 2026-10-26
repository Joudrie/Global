// Atlas, When?: the rescued map table decodes cleanly and the scoring and
// daily-map rules match the original game.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ATLAS_MAPS, atlasScore, dailyIndex, scanUrl, MIN_YEAR, MAX_YEAR } = await import(path.join(ROOT, 'src/utils/atlasWhen.ts'))

test('all 197 maps decode with a year, clues, a source and a scan', () => {
  assert.equal(ATLAS_MAPS.length, 197)
  assert.equal(new Set(ATLAS_MAPS.map(m => m.id)).size, 197)
  for (const m of ATLAS_MAPS) {
    assert.ok(m.year >= MIN_YEAR && m.year <= MAX_YEAR, m.id)
    assert.ok(m.hint && m.clues.length >= 2 && m.clues.every(c => c.text), m.id)
    assert.match(m.source, /^https:\/\/www\.(loc\.gov\/item|davidrumsey\.com\/luna\/servlet\/detail)\//, m.id)
    assert.match(m.detail.service, /^https:\/\/(tile\.loc\.gov|www\.davidrumsey\.com)\//, m.id)
    assert.equal(m.detail.region.length, 4, m.id)
    assert.ok(Math.max(m.detail.base[2], m.detail.base[3]) === 4500, m.id)
    assert.ok(!/\\["u]/.test(m.title + m.maker + m.publisher), `escaped text left in ${m.id}`)
  }
})

test('scoring: exact 1,000, ten years 923, 42 years 715', () => {
  assert.equal(atlasScore(1900, 1900), 1000)
  assert.equal(atlasScore(1890, 1900), 923)
  assert.equal(atlasScore(1942, 1900), 715)
})

test('daily maps follow the original sequence and cycle through every map', () => {
  assert.equal(ATLAS_MAPS[dailyIndex('2026-10-24')].id, 'RUMSEY~8~1~250800~5517252')
  assert.equal(ATLAS_MAPS[dailyIndex('2026-10-26')].id, 'loc-2003626092')
  const seen = new Set()
  for (let d = 0; d < 197; d++) seen.add(dailyIndex(new Date(Date.UTC(2027, 0, 1 + d)).toISOString().slice(0, 10)))
  assert.equal(seen.size, 197)
})

test('scan URLs ask the IIIF server for the visible region', () => {
  const m = ATLAS_MAPS.find(x => x.id === '98687102')
  assert.equal(scanUrl(m.detail, 1600), 'https://tile.loc.gov/image-services/iiif/service:gmd:gmd3:g3200:g3200:ct000160/0,0,6384,3672/1600,/0/default.jpg')
})

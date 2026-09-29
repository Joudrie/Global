// The home screen avoids importing big data modules by keeping a few copied
// values (see src/data/posterShapes.ts and SUB_FLAG_COUNT in src/ui/registry.ts).
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

test('poster shapes match @svg-maps/world', async () => {
  // The package ships ESM in a .js file without "type": "module"; read it as data.
  const text = fs.readFileSync(path.join(ROOT, 'node_modules/@svg-maps/world/index.js'), 'utf8')
  const world = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  const { POSTER_SHAPES, POSTER_MAP_VIEWBOX } = await src('data/posterShapes.ts')
  assert.equal(POSTER_MAP_VIEWBOX, world.viewBox)
  for (const [id, d] of Object.entries(POSTER_SHAPES)) {
    assert.equal(d, world.locations.find(l => l.id === id)?.path, id)
  }
})

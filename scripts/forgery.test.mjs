// Flag Forgery: every fake must be a clean SVG in public/fakes with the same
// 640×480 viewBox as the real artwork, so nothing but the doctored detail
// tells it apart. The generated fakes must match scripts/flags/fakes.mjs.
// Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { FAKE_FLAGS } = await import(path.join(ROOT, 'src/data/fakeFlags.ts'))
const { buildFake } = await import(path.join(ROOT, 'scripts/flags/fakes.mjs'))

test('every fake is an SVG in public/fakes with the real flags\' 640×480 viewBox', () => {
  assert.ok(FAKE_FLAGS.length >= 20)
  for (const f of FAKE_FLAGS) {
    assert.match(f.src, /^\/fakes\/[a-z]{2}\.svg$/, `${f.code}: src ${f.src}`)
    const file = path.join(ROOT, 'public', f.src)
    assert.ok(fs.existsSync(file), `${f.code}: ${f.src} missing`)
    const svg = fs.readFileSync(file, 'utf8')
    assert.match(svg, /^<svg [^>]*viewBox="0 0 640 480"/, `${f.code}: not a 640×480 SVG`)
    assert.ok(!/<image\b/.test(svg), `${f.code}: embeds a raster image`)
    assert.ok(fs.existsSync(path.join(ROOT, 'public/flags', `${f.code}.svg`)), `${f.code}: no real flag`)
  }
  assert.equal(new Set(FAKE_FLAGS.map(f => f.code)).size, FAKE_FLAGS.length, 'duplicate fake')
  const stray = fs.readdirSync(path.join(ROOT, 'public/fakes')).filter(n => !n.endsWith('.svg'))
  assert.deepEqual(stray, [], 'non-SVG files in public/fakes')
})

test('generated fakes are up to date with scripts/flags/fakes.mjs', () => {
  for (const code of ['de', 'ar', 'cu', 'no', 'bi', 'kr', 'pa', 'gr', 'dz']) {
    const svg = fs.readFileSync(path.join(ROOT, 'public/fakes', `${code}.svg`), 'utf8')
    assert.equal(svg, buildFake(code), `${code}: run node scripts/flags/fakes.mjs`)
  }
})

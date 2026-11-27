// Tile Flipper (game id "composer"): the level ramp, board geometry, which
// tile a guess flips, points, harder flags and the best record
// (src/utils/tileFlipper.ts).
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TF = await import(path.join(ROOT, 'src/utils/tileFlipper.ts'))
const { FLAGS } = await import(path.join(ROOT, 'src/data/flags.ts'))
const { mergeSnapshots, ruleFor } = await import(path.join(ROOT, 'src/utils/mergeProgress.ts'))
const { ACHIEVEMENTS } = await import(path.join(ROOT, 'src/data/achievements.ts'))
const ACH = await import(path.join(ROOT, 'src/profile/achievements.ts'))

test('level 1 is 3×3, the grid grows every level, then stays at the cap', () => {
  assert.deepEqual(TF.gridFor(1), { cols: 3, rows: 3, tiles: 9 })
  let prev = 0
  for (let level = 1; level <= TF.CAP_LEVEL; level++) {
    const g = TF.gridFor(level)
    assert.ok(g.tiles > prev, `level ${level} has more tiles than the one before`)
    assert.ok(g.tiles - prev <= 5 || level === 1, `level ${level} grows by at most 5 tiles`)
    assert.ok(g.cols >= g.rows, 'landscape, like the flag')
    prev = g.tiles
  }
  const cap = TF.gridFor(TF.CAP_LEVEL)
  for (const level of [TF.CAP_LEVEL + 1, 20, 500]) assert.deepEqual(TF.gridFor(level), cap)
  for (const level of [0, -3, NaN]) assert.deepEqual(TF.gridFor(level), TF.gridFor(1))
})

test('tiles stay at least 44px both ways on a 375px phone at every level', () => {
  const board = TF.boardWidth(375)
  assert.equal(board, 335)
  for (let level = 1; level <= TF.CAP_LEVEL + 3; level++) {
    const { cols, rows } = TF.gridFor(level)
    const t = TF.tileSize(board, cols, rows)
    assert.ok(t.w >= TF.MIN_TILE && t.h >= TF.MIN_TILE, `level ${level} ${cols}×${rows}: ${t.w.toFixed(1)}×${t.h.toFixed(1)}`)
  }
  // The cap is the biggest: one more column or row would break the 44px floor.
  const { cols, rows } = TF.gridFor(TF.CAP_LEVEL)
  assert.ok(TF.tileSize(board, cols + 1, rows).w < TF.MIN_TILE)
  assert.ok(TF.tileSize(board, cols, rows + 1).h < TF.MIN_TILE)
  // The board never overflows a 320px screen.
  assert.ok(TF.boardWidth(320) <= 320 - 2 * TF.SIDE_PAD)
})

test('warmth bands: 3×3 is centre / edges / corners, and every grid splits all its tiles', () => {
  assert.deepEqual(TF.tileBands(3, 3), { hot: [4], warm: [1, 3, 5, 7], cold: [0, 2, 6, 8] })
  for (let level = 1; level <= TF.CAP_LEVEL; level++) {
    const { cols, rows, tiles } = TF.gridFor(level)
    const b = TF.tileBands(cols, rows)
    const all = [...b.hot, ...b.warm, ...b.cold].sort((x, y) => x - y)
    assert.deepEqual(all, Array.from({ length: tiles }, (_, i) => i), `${cols}×${rows} covers each tile once`)
    assert.ok(b.hot.length >= 1 && b.cold.length >= 1)
    // The corners are always cold.
    for (const corner of [0, cols - 1, tiles - cols, tiles - 1]) assert.ok(b.cold.includes(corner), `${cols}×${rows} corner ${corner}`)
  }
})

test('a guess flips a face-down tile from its band, falling back when the band is used up', () => {
  const b = TF.tileBands(3, 3)
  assert.equal(TF.nextTile(b, 'hot', new Set()), 4)
  assert.ok(b.warm.includes(TF.nextTile(b, 'hot', new Set([4]))))
  assert.ok(b.cold.includes(TF.nextTile(b, 'cold', new Set())))
  assert.ok(b.warm.includes(TF.nextTile(b, 'cold', new Set(b.cold))))
  assert.equal(TF.nextTile(b, 'warm', new Set([0, 1, 2, 3, 4, 5, 6, 7, 8])), null)
  // Every guess flips a new tile until all are up.
  const g = TF.gridFor(TF.CAP_LEVEL), bands = TF.tileBands(g.cols, g.rows), up = new Set()
  for (let i = 0; i < g.tiles; i++) { const t = TF.nextTile(bands, ['hot', 'warm', 'cold'][i % 3], up); assert.ok(!up.has(t)); up.add(t) }
  assert.equal(up.size, g.tiles)
})

test('points: 3×3 keeps the old 1000, 900, 800…; later levels pay more', () => {
  assert.deepEqual([0, 1, 2, 8].map(w => TF.levelPoints(1, w, 9)), [1000, 900, 800, 200])
  for (let level = 2; level <= 10; level++) {
    const { tiles } = TF.gridFor(level)
    assert.ok(TF.levelPoints(level, 3, tiles) > TF.levelPoints(level - 1, 3, TF.gridFor(level - 1).tiles), `level ${level}`)
    assert.equal(TF.levelPoints(level, 0, tiles), 1000 * level)
    assert.equal(TF.levelPoints(level, 0, tiles) % 10, 0)
  }
})

test('harder flags once the grid stops growing, and no repeats in a run', () => {
  assert.equal(TF.minLookalikes(1), 0)
  assert.equal(TF.minLookalikes(TF.CAP_LEVEL - 1), 0)
  assert.equal(TF.minLookalikes(TF.CAP_LEVEL), 2)
  assert.equal(TF.minLookalikes(TF.CAP_LEVEL + 5), 3)
  for (let i = 0; i < 50; i++) assert.ok(TF.pickFlag(FLAGS, TF.CAP_LEVEL + 3, new Set()).confusableWith.length >= 3)
  const used = new Set(FLAGS.slice(1).map(f => f.code))
  assert.equal(TF.pickFlag(FLAGS, 1, used).code, FLAGS[0].code, 'skips flags already used')
  assert.ok(TF.pickFlag(FLAGS, 1, new Set(FLAGS.map(f => f.code))), 'falls back once every flag is used')
})

test('best record: parsed safely, merged field by field (higher wins)', () => {
  assert.equal(TF.BEST_KEY, 'globalio_composer_best')
  assert.deepEqual(TF.parseBest(null), { level: 0, score: 0 })
  assert.deepEqual(TF.parseBest('{'), { level: 0, score: 0 })
  assert.deepEqual(TF.parseBest('[3]'), { level: 0, score: 0 })
  assert.deepEqual(TF.parseBest('{"level":4.7,"score":-5}'), { level: 4, score: 0 })
  assert.deepEqual(TF.betterBest({ level: 5, score: 100 }, { level: 3, score: 900 }), { level: 5, score: 900 })
  assert.equal(ruleFor(TF.BEST_KEY).rule, 'max')
  const a = { [TF.BEST_KEY]: JSON.stringify({ level: 6, score: 2000 }) }
  const b = { [TF.BEST_KEY]: JSON.stringify({ level: 4, score: 5100 }) }
  for (const m of [mergeSnapshots(a, b), mergeSnapshots(b, a)]) assert.deepEqual(JSON.parse(m[TF.BEST_KEY]), { level: 6, score: 5100 })
})

test('Tile master unlocks at level 5 reached', () => {
  const a = ACHIEVEMENTS.find(x => x.id === 'composer-5')
  assert.ok(a && a.game === 'composer')
  assert.ok(!ACH.earned({ [TF.BEST_KEY]: JSON.stringify({ level: 4, score: 99999 }) }).includes('composer-5'), 'score alone does not count')
  assert.ok(ACH.earned({ [TF.BEST_KEY]: JSON.stringify({ level: 5, score: 10 }) }).includes('composer-5'))
})

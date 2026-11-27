// Tile Flipper (game id "composer"): the level ramp, the board geometry, which
// tiles a hot / warm / cold guess flips, the points and the best record.
// Pure, so scripts/tileflipper.test.mjs can check it.

/** Grid per level as [columns, rows]. Each step adds 3 to 5 tiles. Past the
 *  end, levels stay at the last (hardest) grid and use harder flags. */
export const RAMP: readonly (readonly [number, number])[] = [
  [3, 3], [4, 3], [4, 4], [5, 4], [5, 5], [6, 5], [7, 5],
]
/** The level the grid stops growing at. */
export const CAP_LEVEL = RAMP.length

export interface Grid { cols: number; rows: number; tiles: number }

export function gridFor(level: number): Grid {
  const i = Math.min(RAMP.length, Math.max(1, Math.floor(level) || 1)) - 1
  const [cols, rows] = RAMP[i]
  return { cols, rows, tiles: cols * rows }
}

// ── Board geometry ───────────────────────────────────────────────────────────
// The board is the flag's shape: its inside is exactly 4:3, like the flag
// artwork, so the slices line up with no letterboxing. It is as wide as the
// screen allows up to BOARD_MAX and the same size at every level: only the
// tiles get smaller. The tiles fill the inside edge to edge, and TILE_GAP-wide
// lines drawn over the joins make the gaps, so the flag runs straight across
// them. The 7×5 cap is the biggest grid whose tiles stay at least MIN_TILE
// (44px) both ways, between the lines, on a 375px phone.
export const BOARD_MAX = 360
export const TILE_GAP = 3
export const BOARD_BORDER = 2
export const MIN_TILE = 44
/** Side padding of the screen's content column (px-5). */
export const SIDE_PAD = 20

/** The board's outer width (border included) on a screen this wide. */
export const boardWidth = (viewport: number) => Math.max(0, Math.min(BOARD_MAX, viewport - 2 * SIDE_PAD))

/** The visible size in px of an inner tile (between two gap lines) on a board this wide. */
export function tileSize(board: number, cols: number, rows: number): { w: number; h: number } {
  const inner = board - 2 * BOARD_BORDER
  return { w: inner / cols - TILE_GAP, h: (inner * 3) / 4 / rows - TILE_GAP }
}

// ── Which tile a guess flips ─────────────────────────────────────────────────
// Tiles near the middle show the most of a flag. A hot guess (a look-alike)
// flips one of the middle tiles, a warm one (same region) one from the ring
// around them, a cold one an outer tile. On 3×3 that is the centre, the four
// edges and the four corners. Bigger grids keep the same shares (1/9, 4/9,
// 4/9), and tiles the same distance from the middle stay in one band.
export type Warmth = "hot" | "warm" | "cold"
export interface Bands { hot: number[]; warm: number[]; cold: number[] }

export function tileBands(cols: number, rows: number): Bands {
  const n = cols * rows
  const dist = (i: number) => Math.hypot(((i % cols) - (cols - 1) / 2) / cols, (Math.floor(i / cols) - (rows - 1) / 2) / rows)
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => dist(a) - dist(b) || a - b)
  const EPS = 1e-9
  const hotCut = dist(order[Math.max(1, Math.round(n / 9)) - 1]) + EPS
  const warmCut = dist(order[Math.max(1, Math.round((5 * n) / 9)) - 1]) + EPS
  const bands: Bands = { hot: [], warm: [], cold: [] }
  for (const i of order) (dist(i) <= hotCut ? bands.hot : dist(i) <= warmCut ? bands.warm : bands.cold).push(i)
  for (const b of [bands.hot, bands.warm, bands.cold]) b.sort((x, y) => x - y)
  return bands
}

const FALLBACK: Record<Warmth, (keyof Bands)[]> = {
  hot: ["hot", "warm", "cold"],
  warm: ["warm", "cold", "hot"],
  cold: ["cold", "warm", "hot"],
}

/** A face-down tile for this guess, or null when every tile is already up. */
export function nextTile(bands: Bands, warmth: Warmth, flipped: ReadonlySet<number>, rand: () => number = Math.random): number | null {
  for (const band of FALLBACK[warmth]) {
    const open = bands[band].filter(i => !flipped.has(i))
    if (open.length) return open[Math.floor(rand() * open.length) % open.length]
  }
  return null
}

// ── Points ───────────────────────────────────────────────────────────────────
/** Points for solving a level after `wrong` wrong guesses: 100 + 900 × the
 *  share of tiles still face down (rounded to 10), times the level. On 3×3
 *  that is the old 1000, 900, 800… */
export function levelPoints(level: number, wrong: number, tiles: number): number {
  const hidden = Math.max(0, tiles - Math.max(0, wrong)) / Math.max(1, tiles)
  return Math.round((100 + 900 * hidden) / 10) * 10 * Math.max(1, Math.floor(level))
}

// ── Best record (localStorage globalio_composer_best) ────────────────────────
// { level, score }: the highest level reached (solving level N reaches N+1)
// and the best run score. Merged field by field, higher wins
// (src/utils/mergeProgress.ts, the *_best rule).
export const BEST_KEY = "globalio_composer_best"
export interface Best { level: number; score: number }

const whole = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0)

export function parseBest(text: string | null | undefined): Best {
  if (!text) return { level: 0, score: 0 }
  try {
    const v = JSON.parse(text) as unknown
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const o = v as Record<string, unknown>
      return { level: whole(o.level), score: whole(o.score) }
    }
  } catch { /* junk counts as nothing */ }
  return { level: 0, score: 0 }
}

export const betterBest = (a: Best, b: Best): Best => ({ level: Math.max(a.level, b.level), score: Math.max(a.score, b.score) })

// ── Harder flags once the grid stops growing ─────────────────────────────────
/** Look-alikes a level's flag must have (FlagRecord.confusableWith): any
 *  flag before the cap, two or more at the cap (129 of 197), three or more
 *  from two levels later (55 of 197), where a near miss only flips a tile. */
export function minLookalikes(level: number): number {
  if (level < CAP_LEVEL) return 0
  return level < CAP_LEVEL + 2 ? 2 : 3
}

/** A level's flag: from the pool for its level, skipping flags already used in the run (unless every one has been). */
export function pickFlag<F extends { code: string; confusableWith: string[] }>(
  flags: readonly F[], level: number, used: ReadonlySet<string>, rand: () => number = Math.random,
): F {
  const need = minLookalikes(level)
  const pool = flags.filter(f => f.confusableWith.length >= need)
  const fresh = pool.filter(f => !used.has(f.code))
  const from = fresh.length ? fresh : pool.length ? pool : flags
  return from[Math.floor(rand() * from.length) % from.length]
}

// The paint bucket in Sketch the Flag: a scanline flood fill over a canvas's
// raw RGBA bytes (ImageData.data), at the canvas's real (device-pixel)
// resolution. Pure and canvas-free, so it runs in tests on a plain
// Uint8ClampedArray.
//
// How a tap fills:
// 1. Every pixel whose colour is within `tolerance` of the tapped pixel's,
//    on every channel, may join. The tolerance takes in the faint
//    anti-aliased edge of a stroke, so no light halo is left behind.
// 2. A scanline flood (4-way) from the tapped pixel takes the joinable
//    pixels connected to it.
// 3. The region grows by `grow` pixels (8-way) into the edge around it, so
//    there's no thin gap line between the fill and a stroke. This works on
//    the flood's row spans, not pixel by pixel.
// The result is a list of horizontal runs, which the screen paints as 1px-high
// rectangles and keeps for redrawing after an undo.
//
// Hot loops index typed arrays directly: no per-pixel function calls. A
// full 900×600 fill (a 3x phone) takes about 7 ms on a laptop.

export type Rgb = readonly [number, number, number]

/** Per-channel difference (0-255) a pixel may have from the tapped one and still fill. */
export const FILL_TOLERANCE = 64

/** A fill as runs: [x, y, length, x, y, length, …], row by row, left to right. */
export type Runs = Int32Array

/**
 * The region a tap at (sx, sy) floods. Returns its runs, or null when the
 * tap is off the canvas or the tapped region already is the fill colour.
 */
export function floodRuns(
  data: Uint8ClampedArray, width: number, height: number,
  sx: number, sy: number, fill: Rgb,
  tolerance = FILL_TOLERANCE, grow = 1,
): Runs | null {
  sx = Math.floor(sx); sy = Math.floor(sy)
  if (!(width > 0 && height > 0 && width < 32768) || sx < 0 || sy < 0 || sx >= width || sy >= height) return null
  if (data.length < width * height * 4) return null
  const n = width * height
  const s = (sy * width + sx) * 4
  const r0 = data[s], g0 = data[s + 1], b0 = data[s + 2]
  if (Math.abs(r0 - fill[0]) <= 2 && Math.abs(g0 - fill[1]) <= 2 && Math.abs(b0 - fill[2]) <= 2) return null

  // 1. Joinable pixels. st: 0 = edge, 1 = joinable, 2 = flooded.
  const st = new Uint8Array(n)
  const tol = Math.max(0, tolerance)
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const dr = data[i] - r0, dg = data[i + 1] - g0, db = data[i + 2] - b0
    if (dr <= tol && dr >= -tol && dg <= tol && dg >= -tol && db <= tol && db >= -tol) st[p] = 1
  }

  // 2. Scanline flood from the seed. Each row segment it fills is kept as a
  // span (row, left, right).
  let stack = new Int32Array(1024)
  let sp = 0
  let spans = new Int32Array(3 * 256)
  let m = 0
  stack[sp++] = sy * width + sx
  while (sp > 0) {
    const p = stack[--sp]
    if (st[p] !== 1) continue
    const rowStart = p - (p % width)
    const rowEnd = rowStart + width - 1
    let l = p, r = p
    while (l > rowStart && st[l - 1] === 1) l--
    while (r < rowEnd && st[r + 1] === 1) r++
    for (let q = l; q <= r; q++) st[q] = 2
    if (m + 3 > spans.length) { const bigger = new Int32Array(spans.length * 2); bigger.set(spans); spans = bigger }
    spans[m++] = rowStart / width; spans[m++] = l - rowStart; spans[m++] = r - rowStart
    // Seed each run of joinable pixels in the rows above and below.
    for (let side = 0; side < 2; side++) {
      const off = side === 0 ? -width : width
      if (side === 0 ? rowStart === 0 : rowEnd === n - 1) continue
      let inRun = false
      for (let q = l + off, end = r + off; q <= end; q++) {
        if (st[q] === 1) {
          if (!inRun) {
            if (sp === stack.length) { const bigger = new Int32Array(sp * 2); bigger.set(stack); stack = bigger }
            stack[sp++] = q
            inRun = true
          }
        } else inRun = false
      }
    }
  }

  // 3. Grow into the edge by `grow` px every way (8-way, a square brush),
  // worked on spans rather than pixels: row y of the result is the spans of
  // rows y-grow..y+grow, each widened by `grow`, sorted and merged.
  const g = Math.max(0, Math.floor(grow))
  const count = m / 3
  const first = new Int32Array(height + 1) // spans of row y: first[y]..first[y+1]-1
  for (let j = 0; j < m; j += 3) first[spans[j] + 1]++
  for (let y = 0; y < height; y++) first[y + 1] += first[y]
  const at = first.slice(0, height)
  // Packed as left·2^15 + right: one number per span, so a plain typed-array
  // sort orders them by left edge (widths stay below 32768).
  const byRow = new Int32Array(count)
  for (let j = 0; j < m; j += 3) byRow[at[spans[j]]++] = spans[j + 1] * 32768 + spans[j + 2]
  let pool = new Int32Array(64)

  let runs = new Int32Array(3 * 256)
  let k = 0
  for (let y = 0; y < height; y++) {
    const y0 = y - g < 0 ? 0 : y - g, y1 = y + g >= height ? height - 1 : y + g
    const from = first[y0], to = first[y1 + 1]
    const c = to - from
    if (c === 0) continue
    if (c > pool.length) pool = new Int32Array(c * 2)
    const list = pool.subarray(0, c)
    list.set(byRow.subarray(from, to))
    list.sort()
    let curL = -1, curR = -1
    for (let j = 0; j <= c; j++) {
      let L = 0, R = 0
      if (j < c) {
        L = (list[j] / 32768) | 0; R = list[j] - L * 32768
        L = L - g < 0 ? 0 : L - g; R = R + g >= width ? width - 1 : R + g
        if (curL >= 0 && L <= curR + 1) { if (R > curR) curR = R; continue }
      }
      if (curL >= 0) {
        if (k + 3 > runs.length) { const bigger = new Int32Array(runs.length * 2); bigger.set(runs); runs = bigger }
        runs[k++] = curL; runs[k++] = y; runs[k++] = curR - curL + 1
      }
      curL = L; curR = R
    }
  }
  return runs.slice(0, k)
}

/** Number of pixels a fill covers. */
export function runsArea(runs: Runs): number {
  let a = 0
  for (let i = 2; i < runs.length; i += 3) a += runs[i]
  return a
}

/** Paint runs into RGBA bytes (for tests; the screen paints them on the canvas). */
export function paintRuns(data: Uint8ClampedArray, width: number, runs: Runs, fill: Rgb): void {
  for (let i = 0; i < runs.length; i += 3) {
    let o = (runs[i + 1] * width + runs[i]) * 4
    for (let x = 0; x < runs[i + 2]; x++, o += 4) {
      data[o] = fill[0]; data[o + 1] = fill[1]; data[o + 2] = fill[2]; data[o + 3] = 255
    }
  }
}

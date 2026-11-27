// Frankenflag cuts flags into pieces and stitches one piece of each flag
// together. The cut gets harder each round: halves (top/bottom, then
// left/right), a diagonal, thirds, then quarters.
//
// Many pieces look the same: plain red (Poland, Liechtenstein, Chile), red
// over white (Austria, Netherlands, Hungary). A guess counts when its piece
// looks like the one shown, and a flag is only dealt for a piece that shows
// more than one plain colour, so every piece has something to recognise.

export type Cut = "h2" | "v2" | "diag" | "h3" | "v3" | "quad"

/** A point in the flag, 0–1 across and 0–1 down. */
export type Pt = [number, number]

export interface PieceDef {
  id: string
  /** What the input box says ("Top third", "Bottom-right"). */
  label: string
  /** The piece's outline, 0–1 across and down. */
  poly: Pt[]
}

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

export const CUTS: Record<Cut, PieceDef[]> = {
  h2: [
    { id: "top", label: "Top half", poly: rect(0, 0, 1, 1 / 2) },
    { id: "bottom", label: "Bottom half", poly: rect(0, 1 / 2, 1, 1) },
  ],
  v2: [
    { id: "left", label: "Left half", poly: rect(0, 0, 1 / 2, 1) },
    { id: "right", label: "Right half", poly: rect(1 / 2, 0, 1, 1) },
  ],
  // Corner to corner, bottom-left to top-right.
  diag: [
    { id: "tl", label: "Top-left", poly: [[0, 0], [1, 0], [0, 1]] },
    { id: "br", label: "Bottom-right", poly: [[1, 0], [1, 1], [0, 1]] },
  ],
  h3: [
    { id: "top", label: "Top third", poly: rect(0, 0, 1, 1 / 3) },
    { id: "middle", label: "Middle third", poly: rect(0, 1 / 3, 1, 2 / 3) },
    { id: "bottom", label: "Bottom third", poly: rect(0, 2 / 3, 1, 1) },
  ],
  v3: [
    { id: "left", label: "Left third", poly: rect(0, 0, 1 / 3, 1) },
    { id: "middle", label: "Middle third", poly: rect(1 / 3, 0, 2 / 3, 1) },
    { id: "right", label: "Right third", poly: rect(2 / 3, 0, 1, 1) },
  ],
  quad: [
    { id: "tl", label: "Top-left quarter", poly: rect(0, 0, 1 / 2, 1 / 2) },
    { id: "tr", label: "Top-right quarter", poly: rect(1 / 2, 0, 1, 1 / 2) },
    { id: "bl", label: "Bottom-left quarter", poly: rect(0, 1 / 2, 1 / 2, 1) },
    { id: "br", label: "Bottom-right quarter", poly: rect(1 / 2, 1 / 2, 1, 1) },
  ],
}

/** What each round's cut is called, for the header. */
export const CUT_NAME: Record<Cut, string> = {
  h2: "Top and bottom", v2: "Left and right", diag: "Diagonal", h3: "Thirds", v3: "Thirds", quad: "Quarters",
}

/** The cuts each round can use, easiest first: 2, 2, 2, 3, then 4 pieces. */
export const ROUND_CUTS: Cut[][] = [["h2"], ["v2"], ["diag"], ["h3", "v3"], ["quad"]]

export const cutForRound = (round: number, rand = Math.random): Cut => {
  const options = ROUND_CUTS[Math.min(round, ROUND_CUTS.length - 1)]
  return options[Math.floor(rand() * options.length)]
}

/** Pieces in a whole game: one point each. */
export const TOTAL_PIECES = ROUND_CUTS.reduce((n, cuts) => n + CUTS[cuts[0]].length, 0)

// ── Looking at the pixels ───────────────────────────────────────────────────

export const W = 40, H = 30           // the 4:3 artwork, small

/** True when (x, y) is inside the polygon (ray casting). */
export function inPoly(poly: Pt[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const masks = new Map<string, number[]>()
/** The pixel indexes (into a W×H grid) whose centres fall inside a piece. */
export function pieceMask(poly: Pt[]): number[] {
  const key = poly.flat().join(",")
  let m = masks.get(key)
  if (!m) {
    m = []
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inPoly(poly, (x + 0.5) / W, (y + 0.5) / H)) m.push(y * W + x)
    masks.set(key, m)
  }
  return m
}

/**
 * A piece without its rim: pixels on a cut line blend the colours either
 * side of it, so France's plain white middle third would otherwise look like
 * white with a little blue and red. The flag's own edge isn't a cut and stays.
 */
export function innerMask(mask: number[]): number[] {
  const set = new Set(mask)
  return mask.filter(p => {
    const x = p % W, y = (p - x) / W
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && !set.has(ny * W + nx)) return false
    }
    return true
  })
}

/** Mean difference per colour channel (0–255) between two images over a piece. */
export function meanDiff(a: ArrayLike<number>, b: ArrayLike<number>, mask: number[]): number {
  let diff = 0
  for (const p of mask) {
    const i = p * 4
    diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
  }
  return mask.length ? diff / (mask.length * 3) : 0
}

/**
 * The share of a piece taken by its most common colour (colours within a
 * small step of each other count as one). 1 means the piece is one plain colour.
 */
export function dominantShare(px: ArrayLike<number>, mask: number[]): number {
  const counts = new Map<number, number>()
  let top = 0
  for (const p of mask) {
    const i = p * 4
    const k = ((px[i] >> 5) << 6) | ((px[i + 1] >> 5) << 3) | (px[i + 2] >> 5)
    const n = (counts.get(k) ?? 0) + 1
    counts.set(k, n)
    if (n > top) top = n
  }
  return mask.length ? top / mask.length : 1
}

/** A piece this much one colour is just a colour swatch, shared by many flags. */
export const PLAIN_SHARE = 0.9
/** Pieces this close (mean channel difference) look the same. */
export const SAME_DIFF = 30

const cache = new Map<string, Promise<Uint8ClampedArray | null>>()

function pixels(url: string): Promise<Uint8ClampedArray | null> {
  let p = cache.get(url)
  if (!p) {
    p = new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        try {
          const c = document.createElement("canvas"); c.width = W; c.height = H
          const ctx = c.getContext("2d")!
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H)
          ctx.drawImage(img, 0, 0, W, H)
          resolve(ctx.getImageData(0, 0, W, H).data)
        } catch { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
    cache.set(url, p)
  }
  return p
}

/** True when two flags' pieces look alike. */
export async function samePiece(aUrl: string, bUrl: string, piece: PieceDef): Promise<boolean> {
  if (aUrl === bUrl) return true
  const [a, b] = await Promise.all([pixels(aUrl), pixels(bUrl)])
  if (!a || !b) return false
  return meanDiff(a, b, pieceMask(piece.poly)) < SAME_DIFF
}

/** True when the flag's piece is one plain colour; null when the flag didn't load. */
export async function isPlainPiece(url: string, piece: PieceDef): Promise<boolean | null> {
  const px = await pixels(url)
  return px ? dominantShare(px, innerMask(pieceMask(piece.poly))) >= PLAIN_SHARE : null
}

/** The top (or bottom) halves: the first cut, kept for anything that compares halves. */
export const sameHalf = (aUrl: string, bUrl: string, half: "top" | "bottom") =>
  samePiece(aUrl, bUrl, CUTS.h2[half === "top" ? 0 : 1])

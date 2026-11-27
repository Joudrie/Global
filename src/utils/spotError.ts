// Spot the Error: a real flag with one doctored detail; tap where it is.
//
// Rounds come from two places:
// - Flag Forgery's fakes (src/data/fakeFlags.ts) that carry `spot`: a centred
//   crest, a missing star, a mirrored crescent, an upside-down leaf… each with
//   the boxes where its SVG differs from the real one.
// - The easiest tier: a plain striped or Nordic-cross flag (src/data/plainFlags.ts)
//   with one part painted over in a clearly wrong colour.
//
// Everything is in the artwork's 640×480 viewBox, so a tap maps straight onto
// the hit boxes. Pure: no DOM, no storage; randomness comes in as `rand`.

import { FAKE_FLAGS } from "../data/fakeFlags"
import type { ErrorKind, FakeFlag, HitBox, SpotInfo } from "../data/fakeFlags"
import { PLAIN_FLAGS } from "../data/plainFlags"
import type { PlainFlag, PlainPart } from "../data/plainFlags"
import { colorAccuracy, colorName, hexToRgb } from "./color"

export type { ErrorKind, HitBox }
export type Level = 1 | 2 | 3

export const VIEW_W = 640
export const VIEW_H = 480
/** How far outside a hit box a tap still counts, in viewBox units (about 9px on a phone). */
export const TAP_SLACK = 16
/** No error may cover more of the flag than this, or a random tap would find it too often. */
export const MAX_COVERAGE = 0.45
/** Every hit box is at least this wide and tall: a fair target for a finger. */
export const MIN_HIT = 60
/** A country isn't dealt again until this many other rounds have passed. */
export const RECENT = 8

export const LEVEL_NAME: Record<Level, string> = { 1: "Easy", 2: "Medium", 3: "Hard" }

export interface SpotRound {
  /** One id per distinct error. */
  id: string
  /** Lowercase ISO code of the genuine flag. */
  code: string
  name: string
  kind: ErrorKind
  level: Level
  /** The image the player sees. */
  src: string
  /** The genuine artwork, shown next to it at the reveal. */
  real: string
  /** Colour tier: drawn over `src` in order. The first entry is the wrong
   *  colour; any after it are parts that sit on top of it, in their real colours. */
  paint?: { color: string; boxes: HitBox[] }[]
  /** Where the error is. */
  hits: HitBox[]
  /** What was wrong, for the reveal. */
  reason: string
}

// ── Hit testing ─────────────────────────────────────────────────────────────

/** Is (x, y) inside the box (or its ellipse), give or take `slack`? */
export function inBox(h: HitBox, x: number, y: number, slack = TAP_SLACK): boolean {
  if (h.round) {
    const rx = h.w / 2 + slack, ry = h.h / 2 + slack
    return ((x - h.x - h.w / 2) / rx) ** 2 + ((y - h.y - h.h / 2) / ry) ** 2 <= 1
  }
  return x >= h.x - slack && x <= h.x + h.w + slack && y >= h.y - slack && y <= h.y + h.h + slack
}

/** Did a tap at (x, y), in viewBox units, find the error? */
export const isHit = (round: Pick<SpotRound, "hits">, x: number, y: number): boolean =>
  round.hits.some(h => inBox(h, x, y))

/** Share of the flag the boxes cover (no slack), sampled every `step` units. */
export function coverage(hits: HitBox[], step = 8): number {
  let n = 0, inside = 0
  for (let y = step / 2; y < VIEW_H; y += step) for (let x = step / 2; x < VIEW_W; x += step) {
    n++
    if (hits.some(h => inBox(h, x, y, 0))) inside++
  }
  return inside / n
}

/** A region the player can fairly be asked to find: inside the flag, finger-sized, not most of it. */
export const fairHits = (hits: HitBox[]): boolean =>
  hits.length > 0 &&
  hits.every(h => h.w >= MIN_HIT && h.h >= MIN_HIT && h.x >= 0 && h.y >= 0 && h.x + h.w <= VIEW_W + 0.01 && h.y + h.h <= VIEW_H + 0.01) &&
  coverage(hits) <= MAX_COVERAGE

// ── Rounds ──────────────────────────────────────────────────────────────────

/** Believable, vivid flag colours to paint one part with. */
export const WRONG = ["#D52B1E", "#FF7A00", "#FFD500", "#1EA84A", "#0A7E8C", "#0047AB", "#6B2FB3", "#E84393", "#111111", "#FFFFFF"]

const overlaps = (a: HitBox, b: HitBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** The colours a flag's part could be painted: none named like, or close to, any colour on the flag. */
export function wrongColours(f: PlainFlag): string[] {
  const words = new Set(f.parts.flatMap(p => [colorName(p.color), ...(p.word ? [p.word] : [])]))
  return WRONG.filter(c => !words.has(colorName(c)) && f.parts.every(p => colorAccuracy(hexToRgb(c), hexToRgb(p.color)) < 75))
}

/** Parts small enough to ask for (a Nordic flag's background isn't). */
export const paintableParts = (f: PlainFlag): number[] =>
  f.parts.flatMap((p, i) => (fairHits(p.boxes) ? [i] : []))

/** One plain flag with part `i` painted `wrong`. */
export function paintRound(f: PlainFlag, i: number, wrong: string): SpotRound {
  const part: PlainPart = f.parts[i]
  const above = f.parts.slice(i + 1).filter(p => p.boxes.some(b => part.boxes.some(a => overlaps(a, b))))
  const real = `/flags/${f.code}.svg`
  return {
    id: `paint:${f.code}:${i}:${wrong}`, code: f.code, name: f.name, kind: "colour", level: 1,
    src: real, real,
    paint: [{ color: wrong, boxes: part.boxes }, ...above.map(p => ({ color: p.color, boxes: p.boxes }))],
    hits: part.boxes,
    reason: `The ${part.label} should be ${part.word ?? colorName(part.color)}, not ${colorName(wrong)}.`,
  }
}

/** One of Flag Forgery's fakes. */
export function fakeRound(f: FakeFlag & { spot: SpotInfo }): SpotRound {
  return {
    id: `fake:${f.code}`, code: f.code, name: f.name, kind: f.spot.kind, level: f.spot.level,
    src: f.src, real: `/flags/${f.code}.svg`, hits: f.spot.hits, reason: f.reason,
  }
}

const pick = <X>(xs: X[], rand: () => number): X => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))]

function pickWeighted<X>(xs: X[], weights: number[], rand: () => number): X {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < xs.length; i++) { r -= weights[i]; if (r < 0) return xs[i] }
  return xs[xs.length - 1]
}

/** Something the dealer can draw: a fake, or a plain flag (its part and colour picked when dealt). */
export interface Source { key: string; code: string; kind: ErrorKind; level: Level; make: (rand: () => number) => SpotRound }

export const SOURCES: Source[] = [
  ...FAKE_FLAGS.flatMap((f): Source[] => {
    const spot = f.spot
    if (!spot) return []
    return [{ key: `fake:${f.code}`, code: f.code, kind: spot.kind, level: spot.level, make: () => fakeRound({ ...f, spot }) }]
  }),
  ...PLAIN_FLAGS.flatMap((f): Source[] => {
    const parts = paintableParts(f), colours = wrongColours(f)
    if (!parts.length || !colours.length) return []
    return [{ key: `paint:${f.code}`, code: f.code, kind: "colour", level: 1,
      make: rand => paintRound(f, pick(parts, rand), pick(colours, rand)) }]
  }),
]

/** How likely each level is at a given streak: easy to start, harder as it grows. */
export function levelWeights(streak: number): [number, number, number] {
  if (streak < 2) return [0.75, 0.25, 0]
  if (streak < 4) return [0.4, 0.45, 0.15]
  if (streak < 7) return [0.15, 0.5, 0.35]
  return [0.05, 0.4, 0.55]
}

/** A dealer: call it with the current streak for the next round. It keeps
 *  countries from coming back too soon and mixes the kinds of error: never
 *  the same kind twice running when another is available, and a kind with
 *  many flags (colour) only a little likelier than one with a single flag. */
export function makeDealer(rand: () => number = Math.random) {
  const recent: string[] = []
  let lastKind: ErrorKind | null = null
  return (streak: number): SpotRound => {
    const level = pickWeighted<Level>([1, 2, 3], levelWeights(streak), rand)
    const fresh = SOURCES.filter(s => !recent.includes(s.code))
    // The level asked for, else the nearest one, with a fresh country and a
    // different kind of error from last time; failing that, any fresh country;
    // failing that, anything but the last country.
    let pool: Source[] = []
    for (const from of [fresh.filter(s => s.kind !== lastKind), fresh]) {
      for (const l of [level, level - 1, level + 1, level - 2, level + 2]) {
        pool = from.filter(s => s.level === l)
        if (pool.length) break
      }
      if (pool.length) break
    }
    if (!pool.length) pool = SOURCES.filter(s => s.code !== recent[recent.length - 1])
    const byKind = new Map<ErrorKind, Source[]>()
    for (const s of pool) byKind.set(s.kind, [...(byKind.get(s.kind) ?? []), s])
    let kinds = [...byKind.keys()]
    if (kinds.length > 1) kinds = kinds.filter(k => k !== lastKind)
    const kind = pickWeighted(kinds, kinds.map(k => Math.min(4, byKind.get(k)!.length)), rand)
    const source = pick(byKind.get(kind)!, rand)
    recent.push(source.code)
    if (recent.length > RECENT) recent.shift()
    lastKind = kind
    return source.make(rand)
  }
}

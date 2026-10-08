// Shared colour helpers used by the colour-driven games (GeoPaint variants,
// Spot the Error, Sketch the Flag). Kept dependency-free and pure.

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return [h, s, l]
}

// Perceptual-ish "redmean" distance → 0–100 accuracy (100 = identical colours).
// MAX_DIST must use each channel's *maximum reachable* coefficient: the red term
// peaks at rmean=255 → (2 + 255/256), and the blue term peaks at rmean=0 →
// (2 + 255/256). Using 2 for the blue term (as before) understated the true max,
// so far-apart colours produced dist > MAX_DIST and all clamped to 0.
const MAX_DIST = Math.sqrt((2 + 255 / 256) * 255 * 255 + 4 * 255 * 255 + (2 + 255 / 256) * 255 * 255)
export function colorAccuracy(a: RGB, b: RGB): number {
  const rmean = (a[0] + b[0]) / 2
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]
  const dist = Math.sqrt((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db)
  return Math.max(0, Math.min(100, Math.round(100 * (1 - dist / MAX_DIST))))
}

// Coarse human name for a colour — for explanations like "should be green".
export function colorName(hex: string): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex))
  if (l > 0.9) return "white"
  if (l < 0.12) return "black"
  if (s < 0.15) return l > 0.6 ? "light grey" : "grey"
  if (h < 15 || h >= 345) return "red"
  if (h < 40) return "orange"      // Lithuania's golden yellow (43°) is yellow
  if (h < 70) return "yellow"
  if (h < 170) return "green"      // Bangladesh's bottle green (164°) is green
  if (h < 192) return "teal"       // Palau's light blue (197°) is blue
  if (h < 255) return "blue"
  if (h < 295) return "purple"
  return "pink"
}

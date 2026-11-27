// Profile banners: a fixed set drawn in code (no uploads), in the parchment
// palette. Each is an SVG 1200×400 that is cropped to fit (slice), so the
// same art fills the profile header and the saved card. Stored by id.
import { T, GROUP_TONES } from "../ui/tokens"

export interface Banner { id: string; name: string; body: string; bg: string }

const W = 1200, H = 400
const [OCHRE, SAGE, SLATE] = GROUP_TONES

// Rounded wobbly rings, like contour lines on a survey map (fixed, not random).
function contours(): string {
  const rings: string[] = []
  const hills = [[260, 250, 9], [860, 170, 8], [620, 420, 6]] as const
  for (const [cx, cy, n] of hills) {
    for (let i = 1; i <= n; i++) {
      const r = i * 34
      const pts: string[] = []
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * Math.PI * 2
        const wob = 1 + 0.12 * Math.sin(a * 3 + i * 0.7) + 0.06 * Math.sin(a * 5 + cx)
        pts.push(`${(cx + Math.cos(a) * r * 1.35 * wob).toFixed(1)},${(cy + Math.sin(a) * r * wob).toFixed(1)}`)
      }
      rings.push(`<path d="M${pts.join("L")}Z" fill="none" stroke="${T.text}" stroke-opacity="${i % 4 === 0 ? 0.32 : 0.16}" stroke-width="${i % 4 === 0 ? 2.5 : 1.5}"/>`)
    }
  }
  return rings.join("")
}

function graticule(): string {
  const out: string[] = []
  for (let i = -6; i <= 6; i++) {
    const x = W / 2 + i * 110
    out.push(`<path d="M${x} -20 Q${W / 2 + i * 150} ${H / 2} ${x} ${H + 20}" fill="none" stroke="${T.surface}" stroke-opacity="0.7" stroke-width="1.5"/>`)
  }
  for (let j = 1; j < 6; j++) out.push(`<path d="M-20 ${j * 70} Q${W / 2} ${j * 70 - 30} ${W + 20} ${j * 70}" fill="none" stroke="${T.surface}" stroke-opacity="0.7" stroke-width="1.5"/>`)
  return out.join("")
}

function waves(): string {
  const out: string[] = []
  for (let row = 0; row < 9; row++) {
    const y = 30 + row * 46
    let d = `M-40 ${y}`
    for (let x = -40; x < W + 40; x += 80) d += ` q20 -16 40 0 t40 0`
    out.push(`<path d="${d}" fill="none" stroke="${T.surface}" stroke-opacity="${row % 2 ? 0.35 : 0.6}" stroke-width="3" stroke-linecap="round" transform="translate(${row % 2 ? 40 : 0} 0)"/>`)
  }
  return out.join("")
}

function compass(): string {
  const cx = 930, cy = 200
  const ring = (r: number, o: number) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${T.text}" stroke-opacity="${o}" stroke-width="2"/>`
  const pt = (a: number, r: number) => `${(cx + Math.sin(a) * r).toFixed(1)},${(cy - Math.cos(a) * r).toFixed(1)}`
  const star = [0, 1, 2, 3].map(q => {
    const a = q * Math.PI / 2
    return `<path d="M${pt(a, 150)}L${pt(a + 0.3, 34)}L${cx},${cy}Z" fill="${T.text}" fill-opacity="0.55"/><path d="M${pt(a, 150)}L${pt(a - 0.3, 34)}L${cx},${cy}Z" fill="${T.text}" fill-opacity="0.25"/>`
  }).join("")
  const small = [0, 1, 2, 3].map(q => {
    const a = q * Math.PI / 2 + Math.PI / 4
    return `<path d="M${pt(a, 90)}L${pt(a + 0.35, 24)}L${cx},${cy}L${pt(a - 0.35, 24)}Z" fill="${T.text}" fill-opacity="0.3"/>`
  }).join("")
  const lines = [0, 1, 2, 3, 4, 5].map(i => `<path d="M-20 ${60 + i * 60}H${W + 20}" stroke="${T.text}" stroke-opacity="0.08" stroke-width="1.5"/>`).join("")
  return lines + ring(170, 0.35) + ring(120, 0.2) + small + star
}

function routes(): string {
  const dash = (d: string) => `<path d="${d}" fill="none" stroke="${T.warm}" stroke-opacity="0.7" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/>`
  const pin = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="9" fill="${T.surface}" stroke="${T.text}" stroke-width="3"/>`
  const grid = Array.from({ length: 13 }, (_, i) => `<path d="M${i * 100} 0V${H}" stroke="${T.text}" stroke-opacity="0.06"/>`).join("")
    + Array.from({ length: 5 }, (_, i) => `<path d="M0 ${i * 100}H${W}" stroke="${T.text}" stroke-opacity="0.06"/>`).join("")
  return grid + dash("M120 300 C300 120 460 340 640 180 S980 90 1110 230") + dash("M300 60 C420 160 560 60 700 120") +
    pin(120, 300) + pin(640, 180) + pin(1110, 230) + pin(300, 60) + pin(700, 120)
}

const hills = () =>
  `<path d="M0 260 C200 180 360 250 520 200 S880 130 1200 220 V400 H0Z" fill="${SAGE}"/>` +
  `<path d="M0 320 C260 250 420 330 700 280 S1000 250 1200 300 V400 H0Z" fill="${T.green}" fill-opacity="0.75"/>` +
  `<circle cx="960" cy="110" r="54" fill="${OCHRE}"/>`

export const BANNERS: Banner[] = [
  { id: "parchment", name: "Parchment", bg: T.void, body: Array.from({ length: 12 }, (_, i) => `<path d="M${i * 110 + 40} 0V${H}M0 ${i * 110 + 40}H${W}" stroke="${T.text}" stroke-opacity="0.05" stroke-width="1.5"/>`).join("") },
  { id: "contours", name: "Contours", bg: T.void, body: contours() },
  { id: "graticule", name: "Globe lines", bg: SLATE, body: graticule() },
  { id: "waves", name: "Ocean", bg: T.cyan, body: waves() },
  { id: "compass", name: "Compass", bg: OCHRE, body: compass() },
  { id: "routes", name: "Routes", bg: T.bg, body: routes() },
  { id: "hills", name: "Hills", bg: T.void, body: hills() },
  { id: "tricolour", name: "Tricolour", bg: T.bg, body: `<rect width="${W}" height="${H / 3}" fill="${T.chartreuse}"/><rect y="${(H * 2) / 3}" width="${W}" height="${H / 3}" fill="${T.text}"/>` },
  { id: "bands", name: "Bands", bg: T.bg, body: `<rect width="${W / 3}" height="${H}" fill="${SAGE}"/><rect x="${(W * 2) / 3}" width="${W / 3}" height="${H}" fill="${T.warm}"/>` },
  { id: "nordic", name: "Nordic cross", bg: T.text, body: `<rect x="330" width="90" height="${H}" fill="${T.bg}"/><rect y="155" width="${W}" height="90" fill="${T.bg}"/>` },
  { id: "saltire", name: "Saltire", bg: T.cyan, body: `<path d="M0 0L${W} ${H}M${W} 0L0 ${H}" stroke="${T.bg}" stroke-width="70"/>` },
]

export const bannerById = (id: string | null | undefined) => BANNERS.find(b => b.id === id) ?? BANNERS[0]

/** The banner as a standalone SVG (cropped to fill whatever box it's put in). */
export function bannerSvg(id: string | null | undefined): string {
  const b = bannerById(id)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><rect width="${W}" height="${H}" fill="${b.bg}"/>${b.body}</svg>`
}

export const bannerUri = (id: string | null | undefined) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bannerSvg(id))}`
export const BANNER_RATIO = W / H

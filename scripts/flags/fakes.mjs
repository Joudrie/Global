// Builds the SVG forgeries for Flag Forgery from the real artwork.
// Each fake starts from public/flags/<code>.svg (same 640×480 viewBox, same
// colours) and gets exactly one doctored detail, matching the short/reason text
// in src/data/fakeFlags.ts. Every edit must match exactly once, so a change to
// the real artwork fails loudly instead of producing a silently wrong fake.
// Run: node scripts/flags/fakes.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FLAGS = path.join(ROOT, 'public/flags')
const FAKES = path.join(ROOT, 'public/fakes')

/** Replace `from` with `to`, insisting it occurs exactly once. */
function once(svg, from, to, code) {
  const n = svg.split(from).length - 1
  if (n !== 1) throw new Error(`${code}: expected 1 match for ${JSON.stringify(from.slice(0, 60))}, found ${n}`)
  return svg.replace(from, () => to)
}

/** Points of a regular star with `n` points, top point up, as an SVG path. */
function star(cx, cy, outer, inner, n) {
  const pts = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = -Math.PI / 2 + (i * Math.PI) / n
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return `M${pts.join('L')}z`
}

// Burundi: one of the real six-pointed stars, centred at (250.8, 183.3) in the
// flag's inner coordinates. The white roundel is centred at (250.8, 256), r=148.
const BI_STAR = 'm280 200.2-19.3.3-10 16.4-9.9-16.4-19.2-.4 9.3-16.9-9.2-16.8 19.2-.4 10-16.4 9.9 16.5 19.2.4-9.3 16.8z'

const EDITS = {
  // Bands run red–black–gold instead of black–red–gold.
  de: [
    ['fill="#000001" d="M0 0h640v480H0z"', 'fill="red" d="M0 0h640v480H0z"'],
    ['fill="red" d="M0 160h640v320H0z"', 'fill="#000001" d="M0 160h640v320H0z"'],
  ],
  // The Sun of May keeps its disc and rays but loses every facial feature.
  ar: [
    [/(<circle cx="320" cy="240" r="26.7"[^>]*\/>)[\s\S]*<\/svg>/, '$1\n</svg>\n'],
  ],
  // The lone star has six points (same centre and size as the real one).
  cu: [
    ['d="M161.8 325.5 114.3 290l-47.2 35.8 17.6-58.1-47.2-36 58.3-.4 18.1-58 18.5 57.8 58.3.1-46.9 36.3z"',
      `d="${star(114.2, 256, 82, 36, 6)}"`],
  ],
  // The Nordic cross is centred instead of shifted toward the hoist.
  no: [
    ['d="M180 0h120v480H180z"', 'd="M260 0h120v480H260z"'],
    ['d="M210 0h60v480h-60z"', 'd="M290 0h60v480h-60z"'],
  ],
  // Four stars in the roundel instead of three: a 2×2 group, same star size.
  bi: [
    [/<path fill="#cf0921" stroke="#18b637" stroke-width="3.9" d="[^"]*"\/>/,
      `<path fill="#cf0921" stroke="#18b637" stroke-width="3.9" d="${
        [[-50, -50], [50, -50], [-50, 50], [50, 50]]
          .map(([dx, dy]) => `M${(280 + dx).toFixed(1)} ${(200.2 + 72.7 + dy).toFixed(1)}l${BI_STAR.slice(BI_STAR.indexOf('-'))}`)
          .join('')}"/>`],
  ],
  // The taegeuk's colours are swapped: blue on top, red below.
  kr: [
    ['<path fill="#cd2e3a" d="M0-12a12 12 0 0 1 0 24Z"/>', '<path fill="#0047a0" d="M0-12a12 12 0 0 1 0 24Z"/>'],
    ['<path fill="#0047a0" d="M0-12a12 12 0 0 0 0 24A6 6 0 0 0 0 0Z"/>', '<path fill="#cd2e3a" d="M0-12a12 12 0 0 0 0 24A6 6 0 0 0 0 0Z"/>'],
    ['<circle cy="-6" r="6" fill="#cd2e3a"/>', '<circle cy="-6" r="6" fill="#0047a0"/>'],
  ],
  // The red star in the lower fly quarter is turned upside down.
  pa: [
    ['<path fill="#d80000" fill-rule="evenodd" d="m516.9', '<path fill="#d80000" fill-rule="evenodd" transform="rotate(180 474.4 360.7)" d="m516.9'],
  ],
  // The canton is inverted: a blue cross on a white square. (The real cross's
  // upright runs on into the white stripe below the canton; a blue one stops at
  // the canton's edge, and its arm runs on into the blue stripe instead.)
  gr: [
    ['<path fill="#0d5eaf" d="M0 0h266.7v266.7H0z"/>', '<path fill="#fff" d="M0 0h266.7v266.7H0z"/>'],
    ['<g fill="#fff" fill-rule="evenodd" stroke-width="1.3">', '<g fill="#0d5eaf" fill-rule="evenodd" stroke-width="1.3">'],
    ['d="M106.7 0H160v293.3h-53.3z"', 'd="M106.7 0H160v266.7h-53.3z"'],
    ['d="M0 106.7h266.7V160H0z"', 'd="M0 106.7h293.3V160H0z"'],
  ],
  // The star sits clear of the crescent, past the tips of its horns.
  dz: [
    ['M424 180a120 120 0 1 0 0 120 96 96 0 1 1 0-120m4 60-108-35.2 67.2 92V183.2l-67.2 92z',
      'M424 180a120 120 0 1 0 0 120 96 96 0 1 1 0-120m116 60-108-35.2 67.2 92V183.2l-67.2 92z'],
  ],
  // One of the four small stars (the third) is gone.
  cn: [
    [/\n {2}<use xlink:href="#cn-a" width="30" height="20" transform="matrix\(6\.5991 -23\.0749 23\.0746 6\.59919 288 168\)"\/>/, ''],
  ],
  // The arms of the cross run out to the edges of the flag.
  ch: [
    ['<path d="M170 195h300v90H170z"/>', '<path d="M0 195h640v90H0z"/>'],
    ['<path d="M275 90h90v300h-90z"/>', '<path d="M275 0h90v480h-90z"/>'],
  ],
  // The Ashoka Chakra is gone: the white band is empty.
  in: [
    [/\n {2}<g transform="matrix\(3\.2 0 0 3\.2 320 240\)">[\s\S]*<\/g>\n(?=<\/svg>)/, '\n'],
  ],
  // The crescent and star are mirrored (about the disc's centre, x = 319.5),
  // so the crescent opens toward the hoist.
  tn: [
    ['<path fill="#fff" d="M320 119.2', '<path fill="#fff" transform="matrix(-1 0 0 1 639 0)" d="M320 119.2'],
  ],
  // The disc slides 64 units (a tenth of the width) toward the hoist.
  jp: [
    ['transform="translate(-168.4 8.6)scale(.76554)"', 'transform="translate(-232.4 8.6)scale(.76554)"'],
  ],
  // The disc is dead centre instead of set toward the hoist.
  bd: [
    ['<circle cx="280" cy="240" r="160"', '<circle cx="320" cy="240" r="160"'],
  ],
  // The maple leaf is upside down. The side bands share its path, and turning
  // them about the centre leaves them where they were.
  ca: [
    ['<path fill="#d52b1e" d="M-19.7 0h169.8v480H-19.7z', '<path fill="#d52b1e" transform="rotate(180 320 240)" d="M-19.7 0h169.8v480H-19.7z'],
  ],
  // The black star is green.
  gh: [
    ['<path fill="#000001" d="m320 160 52 160', '<path fill="#006b3f" d="m320 160 52 160'],
  ],
  // The ornament hangs along the fly edge instead of the hoist.
  kz: [
    ['<g transform="scale(.48)">', '<g transform="matrix(-.48 0 0 .48 640 0)">'],
  ],
}

export function buildFake(code) {
  let svg = fs.readFileSync(path.join(FLAGS, `${code}.svg`), 'utf8')
  svg = once(svg, `id="flag-icons-${code}"`, `id="fake-${code}"`, code)
  for (const [from, to] of EDITS[code]) {
    if (from instanceof RegExp) {
      if (!from.test(svg)) throw new Error(`${code}: pattern ${from} did not match`)
      svg = svg.replace(from, to)
    } else svg = once(svg, from, to, code)
  }
  return svg
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const code of Object.keys(EDITS)) {
    fs.writeFileSync(path.join(FAKES, `${code}.svg`), buildFake(code))
    console.log(`public/fakes/${code}.svg`)
  }
}

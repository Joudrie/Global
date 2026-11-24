// Flag Identifier: the first draft of every country's description, worked out
// from data the site already has. build.mjs starts from this and applies the
// hand-checked corrections in checked.mjs, so a fact that changes in one of
// these sources shows up as a difference to review (REPORT=1 node build.mjs).
//
//   layouts  src/data/flagAttribs.ts (stripes, STRIPES_V, cross) and the layout
//            families in src/data/flagFusionSetup.ts
//   colours  src/data/flagPalettes.ts: each colour's hue and lightness gives
//            its name, its share of the flag says main (4% or more) or minor
//   details  flagAttribs.ts (star, crescent, cross, emblem) and the symbol
//            lists in src/data/flagSymbols.ts and countryFacts.ts
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const data = f => import(path.join(ROOT, 'src/data', f))
const { FLAG_ATTRIBS, STRIPES_V } = await data('flagAttribs.ts')
const { FLAG_PALETTES } = await data('flagPalettes.ts')
const { FACTS } = await data('countryFacts.ts')
const { SYMBOLS } = await data('flagSymbols.ts')

// Layout families from Flag Fusion's structures, by the identifier's layout ids.
const FAMILY = {
  nordic: ['DK', 'SE', 'FI', 'NO', 'IS'],
  saltire: ['JM', 'BI'],
  diagonal: ['BT', 'PG', 'TZ', 'KN', 'NA', 'TT', 'CD', 'CG', 'SB', 'BN'],
  hoist: ['CZ', 'PH', 'DJ', 'SD', 'JO', 'PS', 'BS', 'ST', 'GQ', 'MZ', 'SS', 'CU', 'KM', 'TL', 'GY', 'ER'],
  chevron: ['GY', 'TL', 'AG', 'ZA', 'VU'],
  canton: ['US', 'MY', 'LR', 'WS', 'TW', 'CL', 'TG', 'GR', 'TO', 'AU', 'NZ', 'TV', 'FJ'],
  unionjack: ['AU', 'NZ', 'TV', 'FJ', 'GB'],
  disc: ['JP', 'BD', 'PW', 'LA', 'UG', 'KP', 'NE', 'ET', 'BI'],
  diamond: ['BR'],
  border: ['ME', 'LK', 'GD', 'MV'],
  quartered: ['PA', 'DO'],
  shape: ['NP'],
}

function hsl(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}

/** The colour word a person would most likely use for a flag colour, or null (brown, grey). */
export function colourName(hex) {
  const { h, s, l } = hsl(hex)
  if (l >= 0.88 && s < 0.5) return 'white'
  if (l <= 0.13) return 'black'
  if (s < 0.2) return l > 0.6 ? 'white' : null
  if (h < 12 || h >= 330) return l < 0.33 ? 'maroon' : 'red'
  if (h < 40) return l < 0.3 ? null : 'orange'
  if (h < 68) return l < 0.3 ? null : 'yellow'
  if (h < 180) return 'green'
  if (h < 255) return (h < 215 && l >= 0.43) ? 'lightblue' : 'blue'
  return 'blue'
}

export function deriveDraft(code) {
  const a = FLAG_ATTRIBS[code]
  const pal = FLAG_PALETTES[code] ?? []
  const layouts = new Set()
  if (a.stripes) layouts.add('hstripes')
  if (STRIPES_V.has(code)) layouts.add('vstripes')
  for (const [id, codes] of Object.entries(FAMILY)) if (codes.includes(code)) layouts.add(id)
  if (a.cross && !layouts.has('nordic') && !layouts.has('unionjack') && !layouts.has('saltire')) layouts.add('cross')
  const big = pal.filter(([, p]) => p >= 20)
  if (big.length === 2 && big[0][1] + big[1][1] >= 95 && (a.stripes || STRIPES_V.has(code))) layouts.add('split')
  if ((pal[0]?.[1] ?? 0) >= 75 && !a.stripes && !STRIPES_V.has(code) && layouts.size === 0) layouts.add('plain')

  const main = [], minor = []
  for (const [hex, pct] of pal) {
    const name = colourName(hex)
    if (!name) continue
    if (pct >= 4) { if (!main.includes(name)) main.push(name) }
    else if (!main.includes(name) && !minor.includes(name)) minor.push(name)
  }

  const details = new Set(), minorDetails = new Set()
  if (a.star) details.add('star')
  if (a.crescent) details.add('crescent')
  if (a.emblem) details.add('emblem')
  if (a.cross) details.add('cross')
  const sym = id => SYMBOLS.find(s => s.id === id)
  for (const [id, detail] of [['sun', 'sun'], ['bird', 'animal'], ['weapon', 'weapon'], ['plant', 'plant']]) {
    const s = sym(id)
    if (s?.codes.has(code)) details.add(detail)
    else if (s?.also.has(code)) minorDetails.add(detail)
  }
  for (const [fact, detail] of [['flagCrescent', 'crescent'], ['flagCross', 'cross']])
    if (FACTS[fact].maybe.includes(code) && !details.has(detail)) minorDetails.add(detail)
  if (layouts.has('hoist') || layouts.has('chevron')) details.add('triangle')
  if (layouts.has('disc')) details.add('circle')
  return { layouts: [...layouts], colors: main, minorColors: minor, details: [...details], minorDetails: [...minorDetails] }
}

/** One readable line: "layouts / colours / details", minor items marked "?". */
export function toLine(d) {
  const part = (main, minor) => [...main, ...minor.map(x => `${x}?`)].join(' ')
  return [d.layouts.join(' '), part(d.colors, d.minorColors), part(d.details, d.minorDetails)].join(' / ')
}

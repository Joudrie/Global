// Flag Fusion emblems: each emblem from public/emblems/ (cut from our flag
// SVGs by scripts/flags/emblems.mjs) turned into a one-colour stencil, so a
// round can paint it in another country's colour. The emblem's colours are
// split by lightness into two groups: the group that covers the most becomes
// ink and the other becomes holes (an eagle's white outline lines, a globe's
// band and stars), so the details survive in one colour.
//
// Each stencil is an SVG that draws its ink in black on a transparent ground;
// the game uses it as a CSS mask over a block of the chosen colour. Writes
// public/fusion/emblems/<code>.svg and src/data/flagFusionEmblems.ts.
//
// Needs Playwright, which isn't a project dependency:
//   PLAYWRIGHT=/path/to/playwright node --experimental-strip-types \
//     --import ./scripts/ts-resolve.mjs scripts/flag-fusion/stencils.mjs
import fs from 'node:fs'
import path from 'node:path'

const pw = await import(process.env.PLAYWRIGHT || 'playwright')
const { chromium } = pw.chromium ? pw : pw.default
const ROOT = path.resolve(import.meta.dirname, '../..')
const { EMBLEM_FAME } = await import(path.join(ROOT, 'src/data/flagFusionSetup.ts'))
const OUT_DIR = path.join(ROOT, 'public/fusion/emblems')

// Hand corrections. INVERT swaps ink and holes; INK makes every colour ink
// (a plain silhouette); HOLE lists colours (as #rrggbb) that are always holes.
const INVERT = new Set([])
const INK = new Set(['cy', 'mx', 'sz'])
const HOLE = {}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined })
const page = await browser.newPage()
await page.setContent('<div id="host" style="width:600px"></div>')

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })
const out = []
for (const code of Object.keys(EMBLEM_FAME).sort()) {
  const src = fs.readFileSync(path.join(ROOT, 'public/emblems', `${code}.svg`), 'utf8')
  // 1. How much of the emblem each colour covers, as drawn.
  const counts = await page.evaluate(async src => {
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src)
    await img.decode()
    const W = 300, H = Math.max(1, Math.round(W * img.naturalHeight / img.naturalWidth)) || 300
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0, W, H)
    const px = ctx.getImageData(0, 0, W, H).data
    const counts = {}
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 250) continue
      const k = '#' + [px[i], px[i + 1], px[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')
      counts[k] = (counts[k] ?? 0) + 1
    }
    return counts
  }, src)

  // 2. Every colour the shapes are painted with, and which group it joins.
  const res = await page.evaluate(([src, counts, opts]) => {
    const host = document.getElementById('host')
    host.innerHTML = src
    const root = host.querySelector('svg')
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
    const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
    const hex = c => {
      const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
      if (!m || (m[4] !== undefined && +m[4] === 0)) return null
      return '#' + [m[1], m[2], m[3]].map(v => Math.round(+v).toString(16).padStart(2, '0')).join('')
    }
    // A gradient paints as its middle stop.
    const paint = v => {
      if (!v || v === 'none') return null
      const url = v.match(/url\("?#([^")]+)"?\)/)
      if (url) {
        const g = root.querySelector(`[id="${url[1]}"]`)
        const stops = g ? [...g.querySelectorAll('stop')] : []
        if (!stops.length) return null
        return hex(getComputedStyle(stops[Math.floor(stops.length / 2)]).stopColor)
      }
      return hex(v)
    }
    const shapes = [...root.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line, use, text')]
      .filter(el => !el.closest('clipPath, mask, defs, pattern, marker, symbol'))
    const used = shapes.map(el => {
      const cs = getComputedStyle(el)
      return { el, fill: paint(cs.fill), stroke: parseFloat(cs.strokeWidth) > 0 ? paint(cs.stroke) : null }
    })
    // Area per used colour: the drawn pixels nearest to it.
    const colours = [...new Set(used.flatMap(u => [u.fill, u.stroke]).filter(Boolean))]
    const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) }
    const area = Object.fromEntries(colours.map(c => [c, 0]))
    for (const [k, n] of Object.entries(counts)) {
      let best = null, bd = 1e9
      for (const c of colours) { const d = dist(k, c); if (d < bd) { bd = d; best = c } }
      if (best && bd < 60) area[best] += n
    }
    // Two groups by lightness (the split that keeps each group tightest,
    // weighted by area); the group covering more is ink.
    const sorted = colours.slice().sort((a, b) => lum(a) - lum(b))
    let bestSplit = 0, bestCost = Infinity
    const cost = g => { const n = g.reduce((s, c) => s + area[c] + 1, 0); const m = g.reduce((s, c) => s + (area[c] + 1) * lum(c), 0) / n; return g.reduce((s, c) => s + (area[c] + 1) * (lum(c) - m) ** 2, 0) }
    for (let i = 1; i < sorted.length; i++) {
      const c = cost(sorted.slice(0, i)) + cost(sorted.slice(i))
      if (c < bestCost) { bestCost = c; bestSplit = i }
    }
    const dark = new Set(sorted.slice(0, bestSplit)), light = new Set(sorted.slice(bestSplit))
    const sum = s => [...s].reduce((n, c) => n + area[c], 0)
    let ink = sum(dark) >= sum(light) ? dark : light
    if (opts.invert) ink = ink === dark ? light : dark
    if (opts.allInk || bestSplit === 0) ink = new Set(colours)
    for (const h of opts.hole ?? []) ink.delete(h)
    const isInk = c => ink.has(c)
    // 3. Repaint: ink white and holes black, inside a mask over a black block.
    for (const u of used) {
      u.el.removeAttribute('style'); u.el.removeAttribute('class')
      u.el.setAttribute('fill', u.fill ? (isInk(u.fill) ? '#fff' : '#000') : 'none')
      u.el.setAttribute('stroke', u.stroke ? (isInk(u.stroke) ? '#fff' : '#000') : 'none')
      u.el.removeAttribute('fill-opacity'); u.el.removeAttribute('stroke-opacity')
    }
    const vb = root.viewBox.baseVal
    const ns = 'http://www.w3.org/2000/svg'
    let defs = root.querySelector(':scope > defs')
    if (!defs) { defs = document.createElementNS(ns, 'defs'); root.insertBefore(defs, root.firstChild) }
    const mask = document.createElementNS(ns, 'mask')
    mask.setAttribute('id', 'ff-stencil')
    mask.setAttribute('maskUnits', 'userSpaceOnUse')
    const frame = [['x', vb.x], ['y', vb.y], ['width', vb.width], ['height', vb.height]]
    for (const [a, v] of frame) mask.setAttribute(a, String(+v.toFixed(2)))
    const bg = document.createElementNS(ns, 'rect')
    for (const [a, v] of frame) bg.setAttribute(a, String(+v.toFixed(2)))
    bg.setAttribute('fill', '#000')
    mask.appendChild(bg)
    for (const n of [...root.childNodes]) if (n !== defs) mask.appendChild(n)
    defs.appendChild(mask)
    const block = document.createElementNS(ns, 'rect')
    for (const [a, v] of frame) block.setAttribute(a, String(+v.toFixed(2)))
    block.setAttribute('mask', 'url(#ff-stencil)')
    root.appendChild(block)
    return {
      svg: root.outerHTML,
      ratio: vb.width / vb.height,
      ink: [...ink], holes: colours.filter(c => !ink.has(c)),
      inkShare: sum(ink) / Math.max(1, sum(new Set(colours))),
    }
  }, [src, counts, { invert: INVERT.has(code), allInk: INK.has(code), hole: HOLE[code] }])
  const svg = res.svg.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
  fs.writeFileSync(path.join(OUT_DIR, `${code}.svg`), svg + '\n')
  out.push({ code: code.toUpperCase(), ratio: +res.ratio.toFixed(3) })
  if (process.env.DEBUG) console.log(code, 'ink', res.ink.join(' '), '| holes', res.holes.join(' '), '| ink share', res.inkShare.toFixed(2))
}
await browser.close()

const ts = `// Generated by scripts/flag-fusion/stencils.mjs: the one-colour emblem
// stencils in public/fusion/emblems/<code>.svg (cut from flag-icons artwork,
// MIT), with each one's width / height. Do not edit by hand.
export const FUSION_EMBLEMS: { code: string; ratio: number }[] = [
${out.map(e => `  ${JSON.stringify(e)},`).join('\n')}
]
`
fs.writeFileSync(path.join(ROOT, 'src/data/flagFusionEmblems.ts'), ts)
console.log(`[stencils] wrote ${out.length} emblems`)

// Cuts the emblems (eagles, crests, seals, suns…) out of our self-hosted flag
// SVGs for Flag Studio's Emblems library. Writes one cropped SVG per emblem to
// public/emblems/<code>.svg and the list to src/data/emblems.ts.
//
// The flags are flag-icons artwork (MIT), so the emblems are too. Nothing is
// redrawn: each flag is laid out in a headless browser, the shapes that span
// the flag (fields, stripes, crosses, triangles) are dropped, and whatever is
// left is cropped to its own box.
//
// Needs Playwright, which isn't a project dependency:
//   npm i --no-save playwright && node scripts/flags/emblems.mjs
// (set CHROMIUM=/path/to/chrome to use an installed browser)
import fs from 'node:fs'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright')
const ROOT = path.resolve(import.meta.dirname, '../..')
const FLAGS_DIR = path.join(ROOT, 'public/flags')
const OUT_DIR = path.join(ROOT, 'public/emblems')

// Names come from the app's flag list.
const flagsTs = fs.readFileSync(path.join(ROOT, 'src/data/flags.ts'), 'utf8')
const NAMES = new Map([...flagsTs.matchAll(/f\('([a-z-]+)',\s*'([^']+)'/gi)].map(m => [m[1].toLowerCase(), m[2]]))

// Flags whose leftover shapes aren't one emblem (or aren't an emblem at all).
// by: border ornament; ir: the takbir border; tm: carpet band; tv, tw: a
// canton or a scatter of stars, not an emblem.
const SKIP = new Set(['by', 'ir', 'tm', 'tv', 'tw'])

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--headless=new'] })
const page = await browser.newPage()
await page.setContent('<div id="host" style="width:640px"></div>')

const found = []
fs.mkdirSync(OUT_DIR, { recursive: true })
for (const code of [...NAMES.keys()].sort()) {
  const file = path.join(FLAGS_DIR, `${code}.svg`)
  if (!fs.existsSync(file) || SKIP.has(code)) continue
  const svg = fs.readFileSync(file, 'utf8')
  const res = await page.evaluate(src => {
    const host = document.getElementById('host')
    host.innerHTML = src
    const root = host.querySelector('svg')
    if (!root) return null
    const vb = root.viewBox.baseVal
    root.setAttribute('width', '640')
    root.setAttribute('height', String(640 * vb.height / vb.width))
    const box = root.getBoundingClientRect()
    const sx = vb.width / box.width, sy = vb.height / box.height
    const shapes = [...root.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line, use, text')]
      .filter(el => !el.closest('clipPath, mask, defs, pattern'))
    const keep = [], drop = []
    for (const el of shapes) {
      const r = el.getBoundingClientRect()
      const w = r.width * sx, h = r.height * sy
      const spans = w >= vb.width * 0.97 || h >= vb.height * 0.97 || w * h >= vb.width * vb.height * 0.45
      if (spans || w * h === 0) drop.push(el); else keep.push({ el, r })
    }
    if (!keep.length) return null
    // Shapes that touch or nearly touch belong to the same emblem. Keep the
    // most detailed group, so a flag's corner stars or a stray stripe
    // (Zambia, Sri Lanka, Oman) don't end up stuck to the emblem.
    const detailOf = el => (el.getAttribute('d') || '').length + (el.getAttribute('points') || '').length + 40
    const gap = box.width * 0.015
    const near = (a, b) => a.left - gap < b.right && b.left - gap < a.right && a.top - gap < b.bottom && b.top - gap < a.bottom
    const parent = keep.map((_, i) => i)
    const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])))
    for (let i = 0; i < keep.length; i++) for (let j = i + 1; j < keep.length; j++) if (near(keep[i].r, keep[j].r)) parent[find(i)] = find(j)
    const score = new Map()
    keep.forEach((k, i) => score.set(find(i), (score.get(find(i)) ?? 0) + detailOf(k.el)))
    const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0][0]
    for (let i = keep.length - 1; i >= 0; i--) if (find(i) !== best) { drop.push(keep[i].el); keep.splice(i, 1) }
    const x0 = Math.min(...keep.map(k => k.r.left)), y0 = Math.min(...keep.map(k => k.r.top))
    const x1 = Math.max(...keep.map(k => k.r.right)), y1 = Math.max(...keep.map(k => k.r.bottom))
    const ex = (x0 - box.left) * sx + vb.x, ey = (y0 - box.top) * sy + vb.y
    const ew = (x1 - x0) * sx, eh = (y1 - y0) * sy
    // How detailed the emblem is: plain discs and stars are already symbols.
    const detail = keep.reduce((n, k) => n + (k.el.getAttribute('d') || '').length + (k.el.getAttribute('points') || '').length, 0)
    drop.forEach(el => el.remove())
    const pad = Math.max(ew, eh) * 0.02
    root.setAttribute('viewBox', `${(ex - pad).toFixed(2)} ${(ey - pad).toFixed(2)} ${(ew + 2 * pad).toFixed(2)} ${(eh + 2 * pad).toFixed(2)}`)
    root.removeAttribute('width'); root.removeAttribute('height'); root.removeAttribute('id')
    return { svg: root.outerHTML, w: ew + 2 * pad, h: eh + 2 * pad, parts: keep.length, detail, area: (ew * eh) / (vb.width * vb.height) }
  }, svg)
  if (!res || res.detail < 900 || res.area < 0.004) continue
  // Prefix ids so an emblem can sit inside any flag without id clashes.
  const out = res.svg
    .replace(/\sid="([^"]+)"/g, ' id="em-$1"')
    .replace(/url\(#([^)]+)\)/g, 'url(#em-$1)')
    .replace(/(xlink:href|href)="#([^"]+)"/g, '$1="#em-$2"')
  fs.writeFileSync(path.join(OUT_DIR, `${code}.svg`), out + '\n')
  found.push({ code, name: NAMES.get(code), ratio: +(res.w / res.h).toFixed(3) })
}
await browser.close()

const ts = `// Generated by scripts/flags/emblems.mjs: emblems cut from our own flag SVGs
// (flag-icons artwork, MIT). The files live in public/emblems/<code>.svg.
export interface Emblem { code: string; name: string; ratio: number }

export const EMBLEMS: Emblem[] = [
${found.map(e => `  { code: ${JSON.stringify(e.code)}, name: ${JSON.stringify(e.name)}, ratio: ${e.ratio} },`).join('\n')}
]
`
fs.writeFileSync(path.join(ROOT, 'src/data/emblems.ts'), ts)
console.log(`[emblems] wrote ${found.length} emblems`)

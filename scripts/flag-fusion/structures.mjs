// Flag Fusion structures: each flag's layout with its emblem taken out, the
// inverse of scripts/flags/emblems.mjs. Every flag in a structure family
// (src/data/flagFusionSetup.ts) is laid out in a headless browser; the
// shapes that span the flag or are plain geometry (fields, stripes, crosses,
// triangles, diamonds, discs) are kept and everything else (emblems, stars,
// crescents, text) is dropped. Each kept colour becomes a slot, numbered by
// area, largest first, so the game can repaint the layout in another
// country's colours. Writes src/data/flagFusionStructures.ts.
//
// For every structure it records:
//   svg    the layout, with "{0}", "{1}"… where the slot colours go
//   areas  share of the flag each slot covers, largest first
//   from   the flag's own colour for each slot
//   touch  pairs of slots that share an edge (never painted the same)
//   slot   the box the emblem sits in, in the 640×480 frame
//   grid   which colour slot lies under each of 12×12 points in that box
//
// The flags are flag-icons artwork (MIT), so the layouts are too. Needs
// Playwright, which isn't a project dependency:
//   PLAYWRIGHT=/path/to/playwright node --experimental-strip-types \
//     --import ./scripts/ts-resolve.mjs scripts/flag-fusion/structures.mjs
// Add DEBUG=1 to print every shape with its index, for the overrides below.
import fs from 'node:fs'
import path from 'node:path'

const pw = await import(process.env.PLAYWRIGHT || 'playwright')
const { chromium } = pw.chromium ? pw : pw.default
const ROOT = path.resolve(import.meta.dirname, '../..')
const { STRUCTURE_FAMILIES } = await import(path.join(ROOT, 'src/data/flagFusionSetup.ts'))

// Hand corrections, by shape index (DEBUG=1 lists them). KEEP keeps a shape
// the rules would drop; DROP drops one they would keep.
const KEEP = {
  ge: 'all',           // the four small crosses are part of Georgia's layout
  au: [1, 2], nz: [10, 11], tv: [3, 4], fj: [94, 95], // the Union Jack's diagonals
  bi: [3], kp: [4], la: [2], pw: [1], ug: [5],       // discs drawn as arcs
  pa: [3],
}
const DROP = {
  au: [5], fj: [3], mh: [2], tw: [23, 24],           // stars, Fiji's shield top, Taiwan's sun
  ba: [2], gw: [3], il: [3], kh: [2], mv: [2, 3], ph: [3], sr: [3], ss: [5], zw: [6],
  ki: [10, 11, 12, 14, 15, 16],                      // the sun's rays
}
// Shapes redrawn without the emblem that is cut into them.
const REPLACE = {
  ca: { 1: { d: 'M-19.7 0h169.8v480H-19.7zm509.5 0h169.8v480H489.9z' } },  // the bars, no maple leaf
  pa: { 2: { d: 'M320 0h320v240H320z' }, 3: { d: 'M0 240h320v240H0z' } }, // quarters, no stars
  ug: { 5: { stroke: 'none' } },                                            // the disc without its outline
  il: { 1: { d: 'M619.4 115.2H-112V48h731.4zm0 350.5H-112v-67.2h731.4z' } }, // the stripes, no star
}
// Where the emblem goes, when not the middle of the flag: [x, y, w, h] in the
// 640×480 frame. Mostly the centre of the flag's own disc, canton or panel.
const SLOTS = {
  // the hoist triangle (its inscribed circle)
  bs: [40, 145, 190, 190], sd: [35, 155, 170, 170], jo: [43, 135, 210, 210], st: [30, 170, 140, 140],
  mz: [35, 157, 167, 167], ss: [41, 142, 196, 196], km: [38, 150, 181, 181], cu: [40, 142, 196, 196],
  cz: [38, 150, 181, 181], ph: [41, 142, 196, 196], dj: [38, 150, 181, 181], zw: [36, 154, 171, 171],
  tl: [35, 155, 170, 170], vu: [30, 170, 140, 140], er: [60, 145, 190, 190],
  // the canton
  us: [70, 20, 225, 220], my: [50, 20, 220, 234], lr: [14, 14, 190, 190], gr: [33, 33, 200, 200],
  cl: [30, 30, 180, 180], tw: [80, 20, 200, 200], ws: [70, 25, 180, 190], tg: [40, 45, 205, 200],
  pa: [40, 20, 240, 200], mh: [30, 40, 190, 170],
  // where the cross arms meet
  dk: [140, 140, 200, 200], fi: [140, 140, 200, 200], no: [140, 140, 200, 200], is: [140, 140, 200, 200],
  se: [124, 140, 200, 200],
  // the disc
  jp: [220, 140, 200, 200], bd: [180, 140, 200, 200], pw: [170, 131, 200, 200], kp: [107, 155, 170, 170],
  mk: [243, 163, 154, 154], ug: [245, 165, 150, 150], la: [220, 140, 200, 200], bi: [205, 125, 230, 230],
  // a field or band beside the layout's main lines
  tz: [30, 25, 150, 140], kn: [30, 25, 150, 140], na: [30, 25, 150, 140],  // the upper hoist triangle
  au: [380, 140, 200, 200], nz: [380, 140, 200, 200], za: [380, 175, 200, 130], gy: [300, 170, 140, 140],
  ag: [230, 30, 180, 140], ki: [210, 40, 220, 190], zm: [420, 20, 200, 140], kw: [330, 170, 220, 140],
  pk: [290, 140, 200, 200], qa: [358, 150, 180, 180], bh: [300, 140, 200, 200], lk: [322, 140, 200, 200],
  ae: [340, 170, 180, 140], om: [16, 16, 150, 150], bj: [40, 150, 180, 180], mg: [25, 160, 165, 160],
  np: [40, 290, 150, 140], to: [320, 170, 240, 220], mv: [195, 140, 250, 200], ba: [60, 230, 220, 200],
}
const W = 640, H = 480
const DEFAULT_SLOT = [320 - 170, 240 - 115, 340, 230]

const codes = [...new Set(STRUCTURE_FAMILIES.flatMap(f => f.members))].map(c => c.toLowerCase()).sort()

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined })
const page = await browser.newPage()
await page.setContent('<div id="host" style="width:640px"></div>')

const out = []
const skipped = []
for (const code of codes) {
  const file = path.join(ROOT, 'public/flags', `${code}.svg`)
  if (!fs.existsSync(file)) { skipped.push(`${code} (no flag)`); continue }
  const svg = fs.readFileSync(file, 'utf8')
  const res = await page.evaluate(([src, code, keepIx, dropIx, replace, debug]) => {
    const host = document.getElementById('host')
    host.innerHTML = src
    const root = host.querySelector('svg')
    const vb = root.viewBox.baseVal
    root.setAttribute('width', '640')
    root.setAttribute('height', String(640 * vb.height / vb.width))
    const box = root.getBoundingClientRect()
    const sx = vb.width / box.width, sy = vb.height / box.height
    const shapes = [...root.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line, use')]
      .filter(el => !el.closest('clipPath, mask, defs, pattern, marker, symbol'))
    shapes.forEach((el, i) => { for (const [a, v] of Object.entries(replace?.[i] ?? {})) el.setAttribute(a, v) })
    const hex = c => {
      const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
      if (!m || (m[4] !== undefined && +m[4] === 0)) return null
      return '#' + [m[1], m[2], m[3]].map(v => Math.round(+v).toString(16).padStart(2, '0')).join('')
    }
    const info = shapes.map((el, i) => {
      const r = el.getBoundingClientRect()
      const w = r.width * sx, h = r.height * sy
      const cs = getComputedStyle(el)
      const tag = el.tagName.toLowerCase()
      // How many numbers draw it: a rectangle or triangle takes a handful, a
      // star, crescent or crest dozens.
      const nums = ((tag === 'path' ? el.getAttribute('d') : el.getAttribute('points')) || '').match(/-?(\d*\.\d+|\d+)(e-?\d+)?/gi)?.length ?? 0
      const marker = ['marker-start', 'marker-mid', 'marker-end'].some(a => el.getAttribute(a)) || cs.markerMid !== 'none'
      const fill = cs.fill.startsWith('url(') ? null : hex(cs.fill)
      const stroke = cs.stroke === 'none' || parseFloat(cs.strokeWidth) === 0 ? null : hex(cs.stroke)
      const area = (w * h) / (vb.width * vb.height)
      const spans = w >= vb.width * 0.97 || h >= vb.height * 0.97 || area >= 0.45
      const simple = ['circle', 'ellipse', 'rect'].includes(tag) || (nums > 0 && nums <= 12)
      let keep = !marker && (fill || stroke) && (spans || (simple && area >= 0.015))
      if (keepIx === 'all' || (Array.isArray(keepIx) && keepIx.includes(i))) keep = true
      if (dropIx && dropIx.includes(i)) keep = false
      return { el, i, tag, nums, fill, stroke, w, h, area, spans, keep, x: (r.left - box.left) * sx + vb.x, y: (r.top - box.top) * sy + vb.y }
    })
    const log = debug ? info.map(s => `${s.keep ? 'KEEP' : '    '} #${s.i} ${s.tag} nums=${s.nums} fill=${s.fill} stroke=${s.stroke} box=${s.x.toFixed(0)},${s.y.toFixed(0)} ${s.w.toFixed(0)}x${s.h.toFixed(0)}`) : []
    // The removed emblem's box, to place the new emblem where the old one was.
    const gone = info.filter(s => !s.keep && s.area > 0.002 && s.area < 0.45)
    const emblemBox = gone.length ? (() => {
      const big = gone.sort((a, b) => b.area - a.area)[0]
      return [big.x, big.y, big.w, big.h].map(v => +v.toFixed(1))
    })() : null
    // Colours → slots, in order of first appearance for now.
    const colours = []
    const slotOf = c => { let i = colours.indexOf(c); if (i < 0) { colours.push(c); i = colours.length - 1 } return i }
    for (const s of info) {
      if (!s.keep) { s.el.remove(); continue }
      const el = s.el
      el.removeAttribute('style'); el.removeAttribute('class')
      el.setAttribute('fill', s.fill ? `{${slotOf(s.fill)}}` : 'none')
      if (s.stroke) el.setAttribute('stroke', `{${slotOf(s.stroke)}}`)
      else el.setAttribute('stroke', 'none')
      el.removeAttribute('id')
    }
    // Drop groups left empty, markers, and any definitions (the stars'
    // shapes) nothing uses now.
    for (let pass = 0; pass < 6; pass++) for (const g of [...root.querySelectorAll('g')]) if (!g.closest('defs') && !g.children.length) g.remove()
    // Every kept shape has its own paint now; groups keep none of the old colours.
    for (const g of root.querySelectorAll('g')) if (!g.closest('defs, clipPath')) { g.removeAttribute('fill'); g.removeAttribute('stroke') }
    for (const m of root.querySelectorAll('marker')) m.remove()
    for (let pass = 0; pass < 4; pass++) {
      const live = root.cloneNode(true)
      live.querySelectorAll('defs').forEach(d => d.remove())
      const html = live.outerHTML + [...root.querySelectorAll('defs [id]')].map(d => {
        // a definition used by another definition that is itself used
        const refs = d.outerHTML.match(/(?:url\(#|href="#)([^)"]+)/g) ?? []
        return refs.length && root.outerHTML.includes(`#${d.id}`) ? refs.join(' ') : ''
      }).join(' ')
      for (const d of [...root.querySelectorAll('defs > [id]')]) if (!html.includes(`#${d.id}`)) d.remove()
    }
    for (const d of [...root.querySelectorAll('defs')]) if (!d.children.length) d.remove()
    root.removeAttribute('id'); root.removeAttribute('width'); root.removeAttribute('height')
    root.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`)
    return { svg: root.outerHTML, colours, log, emblemBox }
  }, [svg, code, KEEP[code] ?? null, DROP[code] ?? null, REPLACE[code] ?? null, !!process.env.DEBUG])
  if (process.env.DEBUG) console.log(`── ${code}\n${res.log.join('\n')}`)

  // Measure: paint each slot a pure test colour with crisp edges and count.
  const n = res.colours.length
  const test = i => `#${(40 + i * 20).toString(16).padStart(2, '0')}${(250 - i * 20).toString(16).padStart(2, '0')}${((i * 97) % 200 + 30).toString(16).padStart(2, '0')}`
  let testSvg = res.svg.replace(/\{(\d+)\}/g, (_, i) => test(+i))
  testSvg = testSvg.replace('<svg', '<svg shape-rendering="crispEdges" width="320" height="240"')
  const slot = SLOTS[code] ?? DEFAULT_SLOT
  const m = await page.evaluate(async ([src, n, slot, W, H]) => {
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src)
    await img.decode()
    const cw = 320, ch = 240
    const c = document.createElement('canvas'); c.width = cw; c.height = ch
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0, cw, ch)
    const px = ctx.getImageData(0, 0, cw, ch).data
    const tests = Array.from({ length: n }, (_, i) => [40 + i * 20, 250 - i * 20, (i * 97) % 200 + 30])
    const cls = new Int8Array(cw * ch).fill(-1)
    for (let p = 0; p < cw * ch; p++) {
      if (px[p * 4 + 3] < 200) continue
      let best = -1, bd = 1e9
      tests.forEach((t, i) => { const d = Math.abs(t[0] - px[p * 4]) + Math.abs(t[1] - px[p * 4 + 1]) + Math.abs(t[2] - px[p * 4 + 2]); if (d < bd) { bd = d; best = i } })
      if (bd < 24) cls[p] = best
    }
    const count = new Array(n).fill(0)
    const adj = {}
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const a = cls[y * cw + x]
      if (a < 0) continue
      count[a]++
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const X = x + dx, Y = y + dy
        if (X >= cw || Y < 0 || Y >= ch) continue
        const b = cls[Y * cw + X]
        if (b >= 0 && b !== a) { const k = a < b ? `${a},${b}` : `${b},${a}`; adj[k] = (adj[k] ?? 0) + 1 }
      }
    }
    const grid = []
    for (let gy = 0; gy < 12; gy++) for (let gx = 0; gx < 12; gx++) {
      const x = Math.floor((slot[0] + (gx + 0.5) * slot[2] / 12) / W * cw), y = Math.floor((slot[1] + (gy + 0.5) * slot[3] / 12) / H * ch)
      grid.push(cls[Math.min(ch - 1, Math.max(0, y)) * cw + Math.min(cw - 1, Math.max(0, x))])
    }
    return { count, adj, grid, total: cw * ch }
  }, [testSvg, n, slot, W, H])

  // Renumber slots by area, largest first; drop colours that cover nothing.
  const order = m.count.map((c, i) => [c, i]).filter(([c]) => c / m.total >= 0.001).sort((a, b) => b[0] - a[0]).map(([, i]) => i)
  const rank = new Map(order.map((old, i) => [old, i]))
  const svgOut = res.svg
    .replace(/\{(\d+)\}/g, (_, i) => rank.has(+i) ? `{${rank.get(+i)}}` : 'none')
    .replace(/\s+/g, ' ').replace(/> </g, '><').trim()
  const touch = Object.entries(m.adj).filter(([, v]) => v >= 4).map(([k]) => k.split(',').map(Number))
    .filter(([a, b]) => rank.has(a) && rank.has(b)).map(([a, b]) => [rank.get(a), rank.get(b)].sort((x, y) => x - y))
  const grid = m.grid.map(c => (rank.has(c) ? String(rank.get(c)) : '.')).join('')
  out.push({
    code: code.toUpperCase(),
    svg: svgOut,
    areas: order.map(i => +(m.count[i] / m.total).toFixed(3)),
    from: order.map(i => res.colours[i]),
    touch,
    slot,
    grid,
  })
}
await browser.close()

const ts = `// Generated by scripts/flag-fusion/structures.mjs: each flag's layout with
// its emblem removed (flag-icons artwork, MIT), for Flag Fusion. Do not edit
// by hand: change the overrides in the script and run it again.
export interface FusionStructure {
  code: string
  svg: string                  // 640×480 layout; "{n}" is colour slot n
  areas: number[]              // share of the flag per slot, largest first
  from: string[]               // the flag's own colour per slot
  touch: [number, number][]    // slots that share an edge
  slot: [number, number, number, number] // the emblem's box: x, y, w, h
  grid: string                 // slot under each of 12×12 points in that box ("." = none)
}

export const FUSION_STRUCTURES: FusionStructure[] = [
${out.map(s => `  ${JSON.stringify(s)},`).join('\n')}
]
`
fs.writeFileSync(path.join(ROOT, 'src/data/flagFusionStructures.ts'), ts)
console.log(`[structures] wrote ${out.length} structures${skipped.length ? `; skipped ${skipped.join(', ')}` : ''}`)

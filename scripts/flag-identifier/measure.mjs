// Flag Identifier: a first draft of a flag's description, measured from its
// image, for flags with no line yet. A draft is never used as it is: each one
// goes on a contact sheet next to its flag, is checked by eye, corrected, and
// only then copied into more.mjs (see the "Codex" sections there).
//
//   PLAYWRIGHT=/path/to/playwright node --experimental-strip-types \
//     --import ./scripts/ts-resolve.mjs scripts/flag-identifier/measure.mjs <in.json> <out-dir>
//
// in.json: [{ key, name, url }], url a site path under public/. Writes
// drafts.json ({ key: { line, shares } }) and sheet-NN.png contact sheets that
// show each flag with its number, key and draft line. Needs Playwright, which
// isn't a project dependency.
//
// How a draft is measured (on a 150px-wide copy of the image):
//   colours   every pixel gets the colour word a person would use (the same
//             cut-offs as colourName() in derive.mjs, plus pink, purple, brown
//             and grey); 6% of the flag or more is a main colour, 1.5–6% a
//             small one ("?"), less is anti-aliasing and ignored
//   stripes   rows (or columns) whose main colour covers 92% of them are
//             "clean"; runs of one colour down the flag are its stripes. Two
//             or more colours of stripe covering half the flag or more make
//             hstripes (vstripes); exactly two equal-ish runs add "split"; five
//             runs or more add the manystripes detail
//   plain     no stripes and one colour on 55% of the flag or more
//   symbol    3% or more of the flag that isn't its stripe or field colour
//             means something is drawn on it: the draft says "X", and the
//             person checking names it (emblem, star, animal…)
// Crosses, triangles, discs, borders and diagonals aren't measured: the
// person checking adds them.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '../..')
const [IN, OUT] = process.argv.slice(2)
if (!IN || !OUT) throw new Error('usage: measure.mjs <in.json> <out-dir>')
fs.mkdirSync(OUT, { recursive: true })
const pwPath = process.env.PLAYWRIGHT || 'playwright'
const pw = pwPath.startsWith('/') ? createRequire(import.meta.url)(pwPath) : await import(pwPath)
const { chromium } = pw.chromium ? pw : pw.default

const items = JSON.parse(fs.readFileSync(IN, 'utf8'))
const PER = +(process.env.PER || 40), COLS = +(process.env.COLS || 8)
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' }
const src = u => {
  const f = path.join(ROOT, 'public', u.split('?')[0])
  return `data:${MIME[path.extname(f).slice(1).toLowerCase()] ?? 'image/svg+xml'};base64,` + fs.readFileSync(f).toString('base64')
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

// Runs in the page: the measuring itself.
function measureAll() {
  function word(r, g, b) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
    let h = 0, s = 0
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60
    }
    if (l >= 0.88 && s < 0.5) return 'white'
    if (l <= 0.13) return 'black'
    if (s < 0.2) return l > 0.6 ? 'white' : l > 0.25 ? 'grey' : 'black'
    if (h < 12 || h >= 330) return l < 0.33 ? 'maroon' : l > 0.72 ? 'pink' : 'red'
    if (h < 40) return l < 0.3 ? 'brown' : (s < 0.45 && l < 0.5) ? 'brown' : 'orange'
    if (h < 68) return l < 0.3 ? null : 'yellow'
    if (h < 180) return 'green'
    if (h < 255) return (h < 215 && l >= 0.43) ? 'lightblue' : 'blue'
    if (h < 290) return 'purple'
    return l > 0.65 ? 'pink' : 'purple'
  }
  const out = []
  for (const img of document.querySelectorAll('img')) {
    const W = 150, H = Math.max(30, Math.min(150, Math.round(150 * (img.naturalHeight / img.naturalWidth || 0.66))))
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const x = c.getContext('2d')
    try { x.drawImage(img, 0, 0, W, H) } catch { out.push(null); continue }
    const data = x.getImageData(0, 0, W, H).data
    const grid = []
    for (let y = 0; y < H; y++) { const row = []; for (let i = 0; i < W; i++) { const k = (y * W + i) * 4; row.push(data[k + 3] < 128 ? null : word(data[k], data[k + 1], data[k + 2])) } grid.push(row) }
    const count = cells => { const m = {}; let n = 0; for (const w of cells) if (w) { m[w] = (m[w] || 0) + 1; n++ } return [m, n] }
    const [all, total] = count(grid.flat())
    const shares = Object.entries(all).map(([w, v]) => [w, Math.round(1000 * v / total) / 10]).sort((a, b) => b[1] - a[1])
    // stripes along one axis: lines = rows or columns
    const stripes = lines => {
      const info = lines.map(line => { const [m, n] = count(line); const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return top ? { w: top[0], f: top[1] / n } : { w: null, f: 0 } })
      const runs = []
      for (const { w } of info) { if (runs.length && runs[runs.length - 1].w === w) runs[runs.length - 1].n++; else runs.push({ w, n: 1 }) }
      const min = Math.max(2, Math.round(lines.length * 0.03))
      const kept = []
      for (const r of runs) { if (r.n < min) continue; if (kept.length && kept[kept.length - 1].w === r.w) kept[kept.length - 1].n += r.n; else kept.push({ ...r }) }
      const clean = info.filter(i => i.f >= 0.92).length / lines.length
      const colours = new Set(kept.map(r => r.w))
      // foreign: share of pixels not the main colour of their line
      let foreign = 0
      lines.forEach((line, i) => { for (const w of line) if (w && w !== info[i].w) foreign++ })
      return { runs: kept, clean, colours: colours.size, foreign: foreign / total }
    }
    const rows = stripes(grid), cols = stripes(grid[0].map((_, i) => grid.map(r => r[i])))
    const layouts = [], details = []
    const isStripes = s => s.runs.length >= 2 && s.colours >= 2 && s.clean >= 0.5
    let field = null
    if (isStripes(rows) && (!isStripes(cols) || rows.clean >= cols.clean)) field = ['hstripes', rows]
    else if (isStripes(cols)) field = ['vstripes', cols]
    if (field) {
      layouts.push(field[0])
      const r = field[1].runs
      if (r.length === 2 && Math.min(r[0].n, r[1].n) / (r[0].n + r[1].n) >= 0.25) layouts.push('split')
      if (r.length >= 5) details.push('manystripes')
      if (field[1].foreign >= 0.03) details.push('X')
    } else if (shares[0] && shares[0][1] >= 55) {
      layouts.push('plain')
      if (100 - shares[0][1] >= 3) details.push('X')
    } else {
      layouts.push('?')
      details.push('X')
    }
    const main = shares.filter(([w, p]) => p >= (w === 'grey' ? 10 : 6)).map(([w]) => w)
    const minor = shares.filter(([w, p]) => p >= 1.5 && !main.includes(w)).map(([w]) => w + '?')
    out.push({ line: `${layouts.join(' ')} / ${[...main, ...minor].join(' ')} / ${details.join(' ')}`, shares })
  }
  return out
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: COLS * 250 + 20, height: 800 } })
const drafts = {}
for (let i = 0; i < items.length; i += PER) {
  const chunk = items.slice(i, i + PER)
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:8px;font:12px system-ui;background:#f4f1ea;color:#222}
    main{display:grid;grid-template-columns:repeat(${COLS},1fr);gap:6px}
    figure{margin:0;background:#fff;border:1px solid #bbb;border-radius:4px;padding:4px}
    img{width:100%;height:140px;object-fit:contain;display:block;background:#ccc}
    figcaption{margin-top:3px;line-height:1.2;word-break:break-word} code{font:11px ui-monospace,monospace;color:#036}
  </style><main>${chunk.map((p, j) => `<figure><img src="${src(p.url)}"><figcaption><b>${i + j}</b> ${esc(p.name).slice(0, 48)}<br><code id="d${j}"></code></figcaption></figure>`).join('')}</main>`, { waitUntil: 'load' })
  const res = await page.evaluate(measureAll)
  for (let j = 0; j < chunk.length; j++) {
    drafts[chunk[j].key] = res[j] ?? { line: 'BROKEN', shares: [] }
    await page.evaluate(([j, t]) => { document.getElementById('d' + j).textContent = t }, [j, drafts[chunk[j].key].line])
  }
  const file = path.join(OUT, `sheet-${String(i / PER + 1).padStart(2, '0')}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(file)
}
await browser.close()
fs.writeFileSync(path.join(OUT, 'drafts.json'), JSON.stringify(drafts, null, 1))

// Contact sheets for checking the Flag Identifier's data by eye: one PNG per
// layout, colour and detail, showing every flag tagged with it (small or
// arguable ones, the "?" in checked.mjs, are marked "minor"), plus the flags
// that have none of the details. Needs Playwright, which isn't a project
// dependency:
//   PLAYWRIGHT=/path/to/playwright node --experimental-strip-types \
//     --import ./scripts/ts-resolve.mjs scripts/flag-identifier/sheets.mjs <out-dir>
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = process.argv[2]
if (!OUT) throw new Error('usage: sheets.mjs <out-dir>')
fs.mkdirSync(OUT, { recursive: true })
const pwPath = process.env.PLAYWRIGHT || 'playwright'
const pw = pwPath.startsWith('/') ? createRequire(import.meta.url)(pwPath) : await import(pwPath)
const { chromium } = pw.chromium ? pw : pw.default
const { IDENTIFY_FLAGS } = await import(path.join(ROOT, 'src/data/flagIdentify.ts'))
const { LAYOUTS, COLOURS, DETAILS, STRUCTURAL } = await import(path.join(ROOT, 'src/utils/flagIdentify.ts'))

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const flagSrc = code => 'data:image/svg+xml;base64,' +
  fs.readFileSync(path.join(ROOT, 'public/flags', `${code.toLowerCase()}.svg`)).toString('base64')

function sheet(title, items) {
  const cells = items.map(({ e, minor }) => `<figure class="${minor ? 'minor' : ''}">
    <img src="${flagSrc(e.code)}" /><figcaption>${esc(e.code)} ${esc(e.name)}${minor ? ' <b>minor</b>' : ''}</figcaption></figure>`).join('')
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:16px;font:13px system-ui;background:#f4f1ea;color:#222}
    h1{font-size:20px;margin:0 0 12px}
    main{display:grid;grid-template-columns:repeat(8,1fr);gap:10px}
    figure{margin:0;background:#fff;border:1px solid #ccc;border-radius:6px;padding:6px}
    figure.minor{border:2px dashed #c60}
    img{width:100%;aspect-ratio:3/2;object-fit:contain;display:block;background:#eee}
    figcaption{margin-top:4px;line-height:1.25}
    b{color:#c60}
  </style><h1>${esc(title)} (${items.length})</h1><main>${cells}</main>`
}

const jobs = []
for (const l of LAYOUTS)
  jobs.push([`layout-${l.id}`, `Layout: ${l.label}`, IDENTIFY_FLAGS.filter(e => e.layouts.includes(l.id)).map(e => ({ e }))])
for (const c of COLOURS)
  jobs.push([`colour-${c.id}`, `Colour: ${c.label}`, IDENTIFY_FLAGS.flatMap(e => {
    if (e.colors.some(s => s.split('|').includes(c.id))) return [{ e }]
    return e.minorColors.includes(c.id) ? [{ e, minor: true }] : []
  })])
for (const d of DETAILS)
  jobs.push([`detail-${d.id}`, `Detail: ${d.label}`, IDENTIFY_FLAGS.flatMap(e =>
    e.details.includes(d.id) ? [{ e }] : e.minorDetails.includes(d.id) ? [{ e, minor: true }] : [])])
jobs.push(['detail-none', 'No symbols (only layout details, or "?" ones)',
  IDENTIFY_FLAGS.filter(e => e.details.every(d => STRUCTURAL.has(d))).map(e => ({ e }))])

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } })
for (const [file, title, items] of jobs) {
  await page.setContent(sheet(title, items), { waitUntil: 'load' })
  await page.screenshot({ path: path.join(OUT, `${file}.png`), fullPage: true })
}
await browser.close()
console.log(`[flag-identifier] ${jobs.length} contact sheets in ${OUT}`)

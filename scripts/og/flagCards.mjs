// Share images for the country pages (/flags/<code>/): one 1200×630 card per
// country, the size social sites preview, with the flag at its official
// proportions on the site's parchment. Writes public/og/flags/<code>.jpg.
//
// Needs Playwright, which isn't a project dependency:
//   npm i --no-save playwright && node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/og/flagCards.mjs
// (set CHROMIUM=/path/to/chrome to use an installed browser)
import fs from 'node:fs'
import path from 'node:path'

const pw = await import(process.env.PLAYWRIGHT || 'playwright')
const { chromium } = pw.chromium ? pw : pw.default
const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = path.join(ROOT, 'public/og/flags')
const data = f => import(path.join(ROOT, 'src/data', f))
const { FLAGS } = await data('flags.ts')
const { STUDIO_FLAGS } = await data('studioFlags.ts')

// The game's short labels spelled out, as on the pages themselves.
const LONG_NAME = { AE: 'United Arab Emirates' }
// Names that take "the" (as on the pages): "The flag of the United States".
const THE = new Set(['AE', 'BS', 'CD', 'CF', 'CG', 'CZ', 'DO', 'GB', 'GM', 'KM', 'MH', 'MV', 'NL', 'PH', 'SB', 'SC', 'US'])
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const html = (name, svgDataUrl, the) => `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600&family=Playfair+Display:wght@700&display=block" rel="stylesheet">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{background:#FBF4E4;background-image:linear-gradient(rgba(31,58,60,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(31,58,60,.06) 1px,transparent 1px);background-size:30px 30px;display:flex;align-items:center;font-family:Inter,sans-serif;color:#1F3A3C}
  .flag{flex:0 0 600px;height:630px;display:flex;align-items:center;justify-content:center}
  .flag img{max-width:520px;max-height:400px;filter:drop-shadow(0 14px 22px rgba(31,58,60,.35));display:block}
  .text{flex:1;padding-right:70px}
  .eyebrow{font-weight:600;font-size:20px;letter-spacing:.18em;color:#5F726D}
  h1{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:${name.length > 22 ? 52 : 64}px;line-height:1.05;margin:14px 0 0}
  .rule{width:48px;height:3px;background:#C2735A;margin:36px 0 14px}
  .credit{font-size:20px;color:#5F726D}
</style></head><body>
<div class="flag"><img src="${svgDataUrl}" alt=""></div>
<div class="text"><div class="eyebrow">THE FLAG OF${the ? ' THE' : ''}</div><h1>${esc(name)}</h1><div class="rule"></div><div class="credit">Meaning, history and facts · globalio.app</div></div>
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--headless=new'] })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
fs.mkdirSync(OUT, { recursive: true })
let n = 0
for (const f of FLAGS) {
  const art = STUDIO_FLAGS[f.code.toLowerCase()]?.[0] ?? f.flagUrl
  const svg = fs.readFileSync(path.join(ROOT, 'public', art))
  const url = `data:image/svg+xml;base64,${svg.toString('base64')}`
  await page.setContent(html(LONG_NAME[f.code] ?? f.name, url, THE.has(f.code)), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(OUT, `${f.code.toLowerCase()}.jpg`), type: 'jpeg', quality: 78 })
  n++
}
await browser.close()
console.log(`[og] wrote ${n} flag cards`)

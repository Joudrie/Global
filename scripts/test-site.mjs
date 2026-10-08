// Turns a normal build (dist/) into the GitHub Pages test site, served under a
// sub-path such as /Global/. Run after `npm run build` with PAGES_BASE set.
//
// - Prefixes the site's root-absolute paths (/cf/, /flags/, /about/ …) with the base.
// - Hides the test site from search engines, so it never competes with globalio.app.
// - Drops AdSense and analytics: ads only run on globalio.app.
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.PAGES_BASE
if (!BASE || !BASE.startsWith('/') || !BASE.endsWith('/')) throw new Error('Set PAGES_BASE, e.g. /Global/')
const DIST = path.resolve('dist')

const ROOTS = 'cf|flags|emblems|studio-flags|flag-maker|whats-new|fakes|identity|historical|games|privacy|contact|about|terms|favicon|manifest|logo|icon-|apple-touch|world-map|\\?play'
const rootPath = new RegExp(`(["'\`(])/(${ROOTS})`, 'g')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])
}

let changed = 0
for (const file of walk(DIST)) {
  if (!/\.(html|js|css|webmanifest)$/.test(file)) continue
  let s = fs.readFileSync(file, 'utf8')
  const before = s
  s = s.replace(rootPath, `$1${BASE}$2`)
  s = s.replace(/href="\/"/g, `href="${BASE}"`)
  s = s.replace(/"(start_url|scope)": "\/"/g, `"$1": "${BASE}"`)
  if (file.endsWith('.html')) {
    s = s.replace(/\s*<script[^>]*adsbygoogle\.js[^>]*><\/script>/g, '')
    s = s.replace(/\s*<meta name="google-adsense-account"[^>]*>/g, '')
    s = s.replace(/\s*<script src="[^"]*analytics\.js"><\/script>/g, '')
    s = s.replace(/<meta name="robots"[^>]*>/g, '')
    s = s.replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow" />')
    s = s.replace(/<title>/, '<title>[Test] ')
  }
  if (s !== before) { fs.writeFileSync(file, s); changed++ }
}
for (const f of ['ads.txt', 'sitemap.xml', 'analytics.js']) fs.rmSync(path.join(DIST, f), { force: true })
fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
fs.writeFileSync(path.join(DIST, '.nojekyll'), '')
console.log(`[test-site] rebased ${changed} files onto ${BASE}`)

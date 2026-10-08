// Static content-page generator — run AFTER `vite build` (see package.json).
//
// Globalio is a client-rendered SPA: every flag history, note and description
// only appears once JavaScript runs and the player taps into the Codex. Search
// engines and the AdSense reviewer mostly read the plain HTML, so without this
// script they see almost none of the site's writing ("low value content").
//
// This emits real, crawlable HTML into dist/ from the same data the app uses:
//   /flags/            every country, by region
//   /flags/<code>/     one page per country: overview, current flag, full flag
//                      history, related historical states, territories and
//                      regional flags
//   /historical/…      vanished states and empires, one page per region
//   /identity/…        pride, ethnic, indigenous, separatist, micronation and
//                      civic flags, one page per category
//   /games/            every game and how it plays
//   /about/, /contact/, 404.html, sitemap.xml
//
// Data is imported straight from the TypeScript sources via Node's native type
// stripping (Node >= 22) plus scripts/ts-resolve.mjs, so the pages can never
// drift from the in-app data.

import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const ORIGIN = 'https://globalio.app'
const CONTACT_EMAIL = 'sjoudrie@gmail.com'
const data = f => import(path.join(ROOT, 'src/data', f))

const { FLAGS: GAME_FLAGS, REGIONS } = await data('flags.ts')
// The game's short labels spelled out for reading (UAE -> United Arab Emirates).
const LONG_NAME = { AE: 'United Arab Emirates' }
const FLAGS = GAME_FLAGS.map(f => LONG_NAME[f.code] ? { ...f, name: LONG_NAME[f.code] } : f)
const { CAPITALS } = await data('capitals.ts')
const { CODEX, fp } = await data('codex.ts')
const { HISTORICAL_FLAGS } = await data('historicalFlags.ts')
const { IDENTITY_FLAGS, IDENTITY_CATEGORIES } = await data('identityFlags.ts')
const { TERRITORIES } = await data('territories.ts')
const { UK_NATIONS } = await data('ukNations.ts')
const { CHALLENGE_CONTINENTS } = await data('challenges.ts')
const { CHANGELOG, LAST_UPDATED, formatDate } = await data('changelog.ts')
const { GAMES, GAME_COUNT } = await import(path.join(ROOT, 'src/ui/registry.ts'))
const { FLAG_MEANINGS } = await data('flagMeanings.ts')
const { FLAG_DETAILS } = await data('flagDetails.ts')
const { neighborsOf } = await data('borders.ts')
const { STATS } = await data('countryStats.ts')
const { FLAG_ATTRIBS } = await data('flagAttribs.ts')
const { FACTS } = await data('countryFacts.ts')
const { EMBLEMS } = await data('emblems.ts')
const { SYMBOLS } = await import(path.join(ROOT, 'src/utils/flagStudio.ts'))
const EMBLEM_COUNT = EMBLEMS.length
const SYMBOL_COUNT = SYMBOLS.length

const CAPITAL = new Map(CAPITALS.map(c => [c.code, c.capital]))
const missingMeaning = FLAGS.filter(f => !FLAG_MEANINGS[f.code]).map(f => f.code)
if (missingMeaning.length) {
  console.error(`[prerender] no flag meaning in src/data/flagMeanings.ts for: ${missingMeaning.join(', ')}`)
  process.exit(1)
}
const BY_CODE = new Map(FLAGS.map(f => [f.code, f]))
const SUBREGIONS = new Map()
for (const cont of CHALLENGE_CONTINENTS)
  for (const c of cont.countries) SUBREGIONS.set(c.code, c.subRegions)

// ── helpers ──────────────────────────────────────────────────────────────────
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const years = (from, to) => to == null ? `${from}–present` : from === to ? `${from}` : `${from}–${to}`
const img = (src, alt, cls = 'thumb') => src
  ? `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" />`
  : `<span class="${cls} noflag">No flag</span>`
// Rounded figures from src/data/countryStats.ts (millions of people, thousand km²).
const people = m => m >= 1000 ? `about ${(m / 1000).toFixed(1)} billion` : m >= 10 ? `about ${Math.round(m)} million`
  : m >= 1 ? `about ${String(Math.round(m * 10) / 10)} million`
  : `about ${Number((m * 1e6).toPrecision(2)).toLocaleString('en')}`
const km2 = a => {
  const k = a * 1000
  const r = k >= 100000 ? Math.round(k / 1000) * 1000 : k >= 1000 ? Math.round(k / 100) * 100 : Math.round(k)
  return `about ${r.toLocaleString('en')} km²`
}
// Country names in a sentence: "the United States", "the Netherlands' flag".
const THE = new Set(['AE', 'BS', 'CD', 'CF', 'CG', 'CZ', 'DO', 'GB', 'GM', 'KM', 'MH', 'MV', 'NL', 'PH', 'SB', 'SC', 'US'])
const the = f => THE.has(f.code) ? `the ${f.name}` : f.name
const The = f => THE.has(f.code) ? `The ${f.name}` : f.name
const poss = s => s.endsWith('s') ? `${s}'` : `${s}'s`
// A meta description of at most `max` characters, cut at a sentence or word.
const clip = (s, max = 158) => {
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const stop = cut.lastIndexOf('. ')
  if (stop >= max * 0.6) return cut.slice(0, stop + 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–-]+$/, '')}…`
}
const list = xs => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
const words = html => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length

const NAV = [
  ['/flags/', 'Country flags'],
  ['/historical/', 'Historical flags'],
  ['/identity/', 'Identity flags'],
  ['/games/', 'Games'],
  ['/flag-maker/', 'Flag maker'],
  ['/about/', 'About'],
]

// Flags that are hate symbols today. Pages that show them stay educational and
// indexed, but carry no ads: AdSense restricts ads next to hateful imagery.
const NO_AD_FLAGS = [
  'Flag_of_the_German_Reich_(1935–1945).svg',
  'Flag_of_the_Confederate_States_(1863–1865).svg',
  'Flag_of_the_Confederate_States_(1865).svg',
  'Battle_flag_of_the_Confederate_States_of_America_(1-1).svg',
  'Flag_of_Croatia_(1941–1945).svg',            // Ustaše
  'War_flag_of_the_Italian_Social_Republic.svg',
].map(fp)
const showsHateSymbol = html => NO_AD_FLAGS.some(u => html.includes(u))

// Shared <head> + chrome so every generated page is self-contained and styled
// in the app's "Modern Cartographer" look (parchment, ink-teal, terracotta).
// `ads: false` for utility pages (contact, 404) where an ad would sit on a page
// with little content of its own; hate-symbol pages never get the script.
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap'
function page({ title, description, canonical, body, noindex = false, ads = true, ogImage = `${ORIGIN}/og-image.jpg`, jsonLd = null }) {
  const adScript = ads && !noindex && !showsHateSymbol(body)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
${canonical ? `<link rel="canonical" href="${canonical}" />` : ''}
${noindex ? '<meta name="robots" content="noindex" />' : ''}
<meta name="theme-color" content="#FBF4E4" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Globalio" />
${canonical ? `<meta property="og:url" content="${canonical}" />` : ''}
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${ogImage}" />
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<meta name="twitter:card" content="summary_large_image" />
<script src="/analytics.js"></script>
${adScript ? '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2216954143093824" crossorigin="anonymous"></script>' : ''}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="${FONTS}" onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="${FONTS}" /></noscript>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;color:#1F3A3C;line-height:1.65;
       background-color:#FBF4E4;
       background-image:radial-gradient(circle at 1px 1px,rgba(31,58,60,0.05) 1px,transparent 0);
       background-size:26px 26px;min-height:100vh}
  a{color:#A85440}
  a:hover{color:#C2735A}
  .wrap{max-width:800px;margin:0 auto;padding:0 20px 64px}
  .top{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:18px 0;border-bottom:1px solid #DDCEAF;margin-bottom:22px}
  .brand{font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:22px;color:#1F3A3C;text-decoration:none;margin-right:auto}
  .top nav{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:14px}
  .top nav a{color:#5F726D;text-decoration:none;font-weight:500}
  .top nav a:hover{color:#A85440}
  .crumbs{font-size:13px;color:#5F726D;margin-bottom:8px}
  .crumbs a{color:#5F726D}
  h1,h2,h3{font-family:'Playfair Display',Georgia,serif;color:#1F3A3C;line-height:1.25}
  h1{font-size:34px;font-weight:800;margin:0 0 8px}
  h2{font-size:23px;font-weight:700;margin:38px 0 12px;padding-top:6px;border-top:1px solid #DDCEAF}
  h3{font-size:18px;font-weight:700;margin:0 0 4px}
  p{margin:0 0 14px}
  .muted{color:#5F726D}
  .small{font-size:13px}
  .index{font-size:14px;line-height:1.9}
  .eyebrow{font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8F6320;margin-bottom:6px}
  .lead{font-size:17px}
  .hero{width:100%;max-width:320px;height:auto;border-radius:10px;border:1px solid #DDCEAF;background:#fff;display:block;margin:18px 0}
  .facts{list-style:none;padding:0;margin:0 0 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
  .facts li{background:#FFFCF4;border:1px solid #DDCEAF;border-radius:10px;padding:9px 13px;font-size:14px}
  .facts b{display:block;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5F726D;font-weight:600}
  .entry > div{min-width:0}
  .entry h2.entry-title{font-size:18px;margin:0 0 4px;padding:0;border:0}
  .entry .entry{margin-left:0}
  .entry{display:flex;gap:16px;align-items:flex-start;background:#FFFCF4;border:1px solid #DDCEAF;border-radius:12px;padding:14px;margin:0 0 12px;
         box-shadow:0 1px 2px rgba(31,58,60,0.05),0 8px 20px -14px rgba(31,58,60,0.25)}
  .entry .thumb{width:96px;flex-shrink:0}
  .entry p{margin:4px 0 0;font-size:15px}
  .entry .when{font-size:13px;color:#8F6320;font-weight:600}
  .thumb{width:40px;height:auto;border-radius:4px;border:1px solid #DDCEAF;background:#fff;display:block}
  .noflag{display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;font-size:11px;color:#7A6C56;background:#FCF6E7}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin:10px 0 4px}
  .card{display:flex;align-items:center;gap:9px;background:#FFFCF4;border:1px solid #DDCEAF;border-radius:10px;padding:8px 10px;font-size:14px;color:#1F3A3C;text-decoration:none}
  a.card:hover{border-color:#C8B58C;color:#1F3A3C}
  .card .thumb{width:32px;flex-shrink:0}
  .games{display:grid;gap:10px}
  .game{background:#FFFCF4;border:1px solid #DDCEAF;border-radius:12px;padding:12px 14px}
  .game h3 a{color:#1F3A3C;text-decoration:none}
  .game p{margin:2px 0 0;font-size:15px}
  .cta{display:inline-block;margin:24px 0 4px;background:#A85440;color:#FFFCF4;font-weight:700;padding:13px 22px;border-radius:12px;text-decoration:none}
  .cta:hover{color:#FFFCF4;filter:brightness(1.06)}
  .shot{width:100%;height:auto;border-radius:12px;border:1px solid #DDCEAF;display:block;margin:18px 0 6px;box-shadow:0 12px 30px -18px rgba(31,58,60,0.45)}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:12px 0 8px}
  .cards img{width:100%;height:auto;border-radius:10px;border:1px solid #DDCEAF;display:block}
  .how,.rules,.tiles{display:grid;gap:10px;margin:0 0 12px}
  .how{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
  .how div,.rules div,.tile{background:#FFFCF4;border:1px solid #DDCEAF;border-radius:12px;padding:12px 14px;display:grid;gap:2px}
  .how b{font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#A85440}
  .how span,.rules span,.tile span{font-size:14px;color:#5F726D;line-height:1.4}
  .tiles{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
  .tile b{font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:800;line-height:1.1;color:#1F3A3C;font-variant-numeric:tabular-nums}
  .rules{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
  .rules b{font-size:15px}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chips span{background:#FFFCF4;border:1px solid #DDCEAF;border-radius:999px;padding:6px 13px;font-size:14px}
  .faq details{border-bottom:1px solid #DDCEAF;padding:12px 0}
  .faq summary{cursor:pointer;font-weight:600;list-style:none;display:flex;justify-content:space-between;gap:12px}
  .faq summary::-webkit-details-marker{display:none}
  .faq summary::after{content:'+';color:#A85440;font-weight:700;font-size:18px;line-height:1}
  .faq details[open] summary::after{content:'–'}
  .faq details p{margin:8px 0 0;color:#5F726D;font-size:15px}
  footer{margin-top:48px;padding-top:18px;border-top:1px solid #DDCEAF;font-size:13px;color:#5F726D}
  footer a{margin-right:14px;color:#5F726D}
  @media (max-width:520px){h1{font-size:28px}.entry .thumb{width:72px}.entry .entry{flex-direction:column;gap:8px}}
</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <a class="brand" href="/">Globalio</a>
  <nav>${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>
</header>
${body}
<footer>
  <p><a href="/">Play Globalio</a><a href="/flags/">Country flags</a><a href="/historical/">Historical flags</a><a href="/identity/">Identity flags</a><a href="/games/">Games</a><a href="/flag-maker/">Flag maker</a></p>
  <p><a href="/whats-new/">What's new</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></p>
  <p>© Globalio. Flags, names and dates are researched from Wikipedia, Wikimedia Commons and official sources. Spot a mistake? <a href="/contact/">Tell us</a>.</p>
  <p class="muted">Last updated ${formatDate(LAST_UPDATED)}. New games every month.</p>
</footer>
</div>
</body>
</html>
`
}

const out = []  // [urlPath, html] — written at the end
const emit = (urlPath, html) => out.push([urlPath, html])

// ── per-country pages: /flags/<code>/ ────────────────────────────────────────
function historyList(entries) {
  return entries.map(h => `
<div class="entry">
  ${img(h.flagUrl, h.label)}
  <div>
    <div class="when">${esc(years(h.fromYear, h.toYear))}</div>
    <h3>${esc(h.label)}</h3>
    <p>${esc(h.note)}</p>
    ${h.parallel?.length ? `<p class="muted"><b>${esc(h.parallelCaption || 'Flown alongside')}:</b></p>${historyList(h.parallel)}` : ''}
  </div>
</div>`).join('')
}

function countryPage(flag) {
  const capital = CAPITAL.get(flag.code)
  const codex = CODEX[flag.code]
  const confusable = (flag.confusableWith ?? []).map(c => BY_CODE.get(c)).filter(Boolean)
  const history = (codex?.flagHistory ?? []).filter(h => h.toYear != null || h.label)
  const related = HISTORICAL_FLAGS.filter(h => h.relatedCode === flag.code || h.relatedCodes?.includes(flag.code))
  const territories = TERRITORIES[flag.code] ?? []
  const subs = (SUBREGIONS.get(flag.code) ?? []).filter(s => s.flagUrl && !s.noFlag)
  const neighbours = neighborsOf(flag.code).map(c => BY_CODE.get(c)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))
  const stat = STATS[flag.code]
  const colours = FLAG_ATTRIBS[flag.code]?.colors ?? []
  const colourKey = c => [...(FLAG_ATTRIBS[c]?.colors ?? [])].sort().join('+')
  const sameColours = colours.length ? FLAGS.filter(f => f.code !== flag.code && colourKey(f.code) === colourKey(flag.code))
    .sort((a, b) => a.name.localeCompare(b.name)) : []
  const current = history.find(h => h.toYear == null)
  const geography = FACTS.landlocked.yes.includes(flag.code) ? 'Landlocked'
    : FACTS.island.yes.includes(flag.code) ? 'Island nation' : null
  const name = the(flag)
  const title = [`Flag of ${name}: history, meaning & facts | Globalio`, `Flag of ${name}: meaning & history | Globalio`, `Flag of ${name} | Globalio`]
    .find(t => t.length <= 65) ?? `Flag of ${name} | Globalio`
  const description = clip(`The flag of ${name}: what it means and its history. ${FLAG_MEANINGS[flag.code]}`)

  const body = `
<div class="crumbs"><a href="/">Home</a> › <a href="/flags/">Country flags</a> › ${esc(flag.name)}</div>
<div class="eyebrow">${esc(flag.region)}</div>
<h1>Flag of ${esc(name)}</h1>
${codex?.summary ? `<p class="lead">${esc(codex.summary)}</p>` : ''}
<img class="hero" src="${esc(flag.flagUrl)}" width="320" height="240" alt="Flag of ${esc(name)}" />
<ul class="facts">
  ${capital ? `<li><b>Capital</b>${esc(capital)}</li>` : ''}
  <li><b>Region</b>${esc(flag.region)}</li>
  ${current ? `<li><b>Current flag since</b>${esc(current.fromYear)}</li>` : ''}
  ${colours.length ? `<li><b>Main colours</b>${esc(colours.map(c => c[0].toUpperCase() + c.slice(1)).join(', '))}</li>` : ''}
  ${stat ? `<li><b>Population</b>${esc(people(stat.pop))}</li><li><b>Area</b>${esc(km2(stat.area))}</li>` : ''}
  ${geography ? `<li><b>Geography</b>${geography}</li>` : ''}
  ${history.length ? `<li><b>Flags in history</b>${history.length}</li>` : ''}
</ul>
${stat ? '<p class="muted small">Population and area are rounded.</p>' : ''}
<h2>What the flag of ${esc(name)} means</h2>
<p>${esc(FLAG_MEANINGS[flag.code])}</p>
${FLAG_DETAILS[flag.code] ? `<h2>More about the flag</h2>
<p>${esc(FLAG_DETAILS[flag.code])}</p>` : ''}
<h2>How to recognise it</h2>
<p>${esc(flag.distinguishingTip)}</p>
<h2>Did you know?</h2>
<p>${esc(flag.funFact)}</p>
${confusable.length ? `<h2>Easily confused with</h2>
<p class="muted">${esc(poss(The(flag)))} flag is often mixed up with these. Learn to tell them apart:</p>
<div class="grid">
${confusable.map(c => `<a class="card" href="/flags/${slug(c.code)}/">${img(c.flagUrl, `Flag of ${c.name}`)} ${esc(c.name)}</a>`).join('\n')}
</div>` : ''}
${history.length ? `<h2>Flag history of ${esc(name)}</h2>
<p class="muted">Every flag that has flown over ${esc(name)}, from today back through time.</p>
${historyList(history)}` : ''}
${flag.code === 'GB' ? UK_NATIONS.map(n => `<h2>${esc(n.name)}</h2>${historyList(n.flagHistory ?? [])}`).join('') : ''}
${related.length ? `<h2>Related historical states</h2>
<p class="muted">Empires, kingdoms and republics that once covered part of ${esc(name)}.</p>
${related.map(h => `
<div class="entry">
  ${img(h.flagUrl, `Flag of ${h.name}`)}
  <div><div class="when">${esc(h.era)}</div><h3>${esc(h.name)}</h3><p>${esc(h.note)}</p></div>
</div>`).join('')}` : ''}
${territories.length ? `<h2>Territories &amp; dependencies</h2>
${territories.map(t => `
<div class="entry">
  ${img(t.noFlag ? '' : t.flagUrl, `Flag of ${t.name}`)}
  <div><div class="when">${esc(t.status)}</div><h3>${esc(t.name)}</h3><p>${esc(t.note)}</p></div>
</div>`).join('')}` : ''}
${subs.length ? `<h2>Regional flags of ${esc(name)}</h2>
<p class="muted">The ${subs.length} states, provinces and regions of ${esc(name)} with their own flags.</p>
<div class="grid">
${subs.map(s => `<div class="card">${img(s.flagUrl, `Flag of ${s.name}`)} ${esc(s.name)}</div>`).join('\n')}
</div>` : ''}
${neighbours.length ? `<h2>Neighbouring countries</h2>
<p class="muted">${esc(The(flag))} shares a land border with ${neighbours.length === 1 ? 'one country' : `${neighbours.length} countries`}: ${esc(list(neighbours.map(the)))}.</p>
<div class="grid">
${neighbours.map(c => `<a class="card" href="/flags/${slug(c.code)}/">${img(c.flagUrl, `Flag of ${c.name}`)} ${esc(c.name)}</a>`).join('\n')}
</div>` : ''}
${sameColours.length ? `<h2>Other flags in ${esc(list(colours))}</h2>
<p class="muted">${sameColours.length === 1 ? 'One other national flag uses' : `${sameColours.length} other national flags use`} the same main colours as ${esc(poss(name))}.</p>
<div class="grid">
${sameColours.map(c => `<a class="card" href="/flags/${slug(c.code)}/">${img(c.flagUrl, `Flag of ${c.name}`)} ${esc(c.name)}</a>`).join('\n')}
</div>` : ''}
<a class="cta" href="/">Play Globalio and learn ${esc(poss(name))} flag</a>
`
  return page({ title, description, canonical: `${ORIGIN}/flags/${slug(flag.code)}/`, body })
}

// ── hub page: /flags/ ────────────────────────────────────────────────────────
function flagsHub() {
  const byRegion = REGIONS.map(region => ({
    region,
    flags: FLAGS.filter(f => f.region === region).sort((a, b) => a.name.localeCompare(b.name)),
  }))
  const body = `
<div class="crumbs"><a href="/">Home</a> › Country flags</div>
<h1>Flags of the World</h1>
<p class="lead">Browse the flags of all ${FLAGS.length} countries, grouped by region. Each page covers the
country's current flag, how to recognise it, and every flag that has flown there
through history, plus its territories and regional flags.</p>
<p>Looking for flags that aren't national? See <a href="/historical/">historical flags</a> of vanished
states and empires, or <a href="/identity/">identity flags</a> for pride, indigenous, separatist and
micronation flags. When you're ready, test yourself in <a href="/games/">${GAME_COUNT} flag games</a>.</p>
${byRegion.map(({ region, flags }) => `
<h2>${esc(region)} <span class="muted" style="font-size:15px;font-weight:400">(${flags.length})</span></h2>
<div class="grid">
${flags.map(f => `<a class="card" href="/flags/${slug(f.code)}/">${img(f.flagUrl, `Flag of ${f.name}`)} ${esc(f.name)}</a>`).join('\n')}
</div>`).join('\n')}
<a class="cta" href="/">Play Globalio</a>
`
  return page({
    title: `Flags of the World: all ${FLAGS.length} country flags | Globalio`,
    description: `Browse the flags of all ${FLAGS.length} countries, grouped by region, with each flag's history, meaning, capital and facts. Free flag games, no sign-up.`,
    canonical: `${ORIGIN}/flags/`,
    body,
  })
}

// ── historical flags: /historical/ and /historical/<region>/ ─────────────────
const HIST_REGIONS = [...new Set(HISTORICAL_FLAGS.map(h => h.region))]
// Region labels as they read in a sentence.
const REGION_TEXT = { 'Americas': 'the Americas', 'Africa & Middle East': 'Africa and the Middle East' }
const inRegion = r => REGION_TEXT[r] ?? r

function historicalRegionPage(region) {
  const items = HISTORICAL_FLAGS.filter(h => h.region === region)
  const body = `
<div class="crumbs"><a href="/">Home</a> › <a href="/historical/">Historical flags</a> › ${esc(region)}</div>
<div class="eyebrow">Historical flags</div>
<h1>Historical flags of ${esc(inRegion(region))}</h1>
<p class="lead">${items.length} kingdoms, empires, republics and short-lived states from ${esc(inRegion(region))} that no
longer exist, with the flags they flew and the story behind each one.</p>
${items.map(h => {
    const links = [h.relatedCode, ...(h.relatedCodes ?? [])].filter(Boolean).map(c => BY_CODE.get(c)).filter(Boolean)
    return `
<div class="entry" id="${esc(h.id)}">
  ${img(h.flagUrl, `Flag of ${h.name}`)}
  <div>
    <div class="when">${esc(h.era)}</div>
    <h2 class="entry-title">${esc(h.name)}</h2>
    <p>${esc(h.note)}</p>
    ${links.length ? `<p class="muted" style="font-size:13px">Today part of: ${links.map(c => `<a href="/flags/${slug(c.code)}/">${esc(c.name)}</a>`).join(', ')}</p>` : ''}
  </div>
</div>`
  }).join('')}
<a class="cta" href="/?play=historical">Play the historical flags quiz</a>
`
  return page({
    title: [`Historical flags of ${inRegion(region)}: lost states | Globalio`, `Historical flags of ${inRegion(region)} | Globalio`].find(t => t.length <= 65) ?? `Historical flags of ${inRegion(region)} | Globalio`,
    description: `The flags of ${items.length} former states, empires and kingdoms of ${inRegion(region)}, with the history behind each one.`,
    canonical: `${ORIGIN}/historical/${slug(region)}/`,
    body,
  })
}

function historicalHub() {
  const body = `
<div class="crumbs"><a href="/">Home</a> › Historical flags</div>
<h1>Historical flags</h1>
<p class="lead">Countries come and go, and so do their flags. This archive covers ${HISTORICAL_FLAGS.length}
states that no longer exist, from medieval kingdoms and colonial empires to Cold War republics
that lasted only a few years.</p>
<p>For the flags each modern country has flown over time, open that country's page in the
<a href="/flags/">country flag index</a>.</p>
<p>Each entry gives the years the state existed, the flag it flew and a short note on what happened to it,
with links to the modern countries that cover its territory today. Some of these flags belonged to
regimes responsible for war, slavery or genocide. They are included because they are part of history,
and their notes say so plainly. Pages that show flags now used as hate symbols, such as the Nazi swastika
flag and the Confederate battle flag, carry no advertising.</p>
${HIST_REGIONS.map(r => {
    const items = HISTORICAL_FLAGS.filter(h => h.region === r)
    return `<h2><a href="/historical/${slug(r)}/">${esc(r)}</a> <span class="muted" style="font-size:15px;font-weight:400">(${items.length})</span></h2>
<p class="index">${items.map(h => `<a href="/historical/${slug(r)}/#${esc(h.id)}">${esc(h.name)}</a>`).join(' · ')}</p>`
  }).join('\n')}
<a class="cta" href="/?play=historical">Play the historical flags quiz</a>
`
  return page({
    title: 'Historical flags of vanished states and empires | Globalio',
    description: `An illustrated archive of ${HISTORICAL_FLAGS.length} flags from states, empires and kingdoms that no longer exist, with the history behind each one.`,
    canonical: `${ORIGIN}/historical/`,
    body,
  })
}

// ── identity flags: /identity/ and /identity/<category>/ ─────────────────────
const ID_INTRO = {
  'Pride & LGBTQ+': 'The rainbow flag and the many pride flags that followed it, and what each stripe and colour stands for.',
  'Civic & Ideological': 'Flags of movements, causes, organisations and ideas, from political symbols to international bodies.',
  'Pan-National & Ethnic': 'Flags that unite a people or a family of nations across borders.',
  'Indigenous Peoples': 'Flags of indigenous nations and peoples around the world.',
  'Separatist & Autonomous': 'Flags of independence movements, breakaway states and autonomous regions.',
  'Micronations': 'Flags of self-declared micronations, from sea forts to desert "kingdoms".',
  'Maritime & Signal': 'Nautical signal flags and the maritime code they spell out.',
}
const ID_CATS = [...IDENTITY_CATEGORIES, 'Maritime & Signal'].filter(c => IDENTITY_FLAGS.some(f => f.category === c))
const byTier = (a, b) => (a.tier ?? 2) - (b.tier ?? 2) || a.name.localeCompare(b.name)

function identityPage(cat) {
  const items = IDENTITY_FLAGS.filter(f => f.category === cat).sort(byTier)
  const body = `
<div class="crumbs"><a href="/">Home</a> › <a href="/identity/">Identity flags</a> › ${esc(cat)}</div>
<div class="eyebrow">Identity flags</div>
<h1>${esc(cat)} flags</h1>
<p class="lead">${esc(ID_INTRO[cat] ?? '')} ${items.length} flags, each with its story.</p>
${items.map(f => `
<div class="entry" id="${esc(f.id)}">
  ${img(f.noFlag ? '' : f.flagUrl, f.name)}
  <div><h2 class="entry-title">${esc(f.name)}</h2><p>${esc(f.note)}</p></div>
</div>`).join('')}
<a class="cta" href="/?play=identity">Play the identity flags quiz</a>
`
  return page({
    title: [`${cat} flags: ${items.length} flags and their meaning | Globalio`, `${cat} flags and their meaning | Globalio`].find(t => t.length <= 65) ?? `${cat} flags | Globalio`,
    description: `${ID_INTRO[cat] ?? ''} ${items.length} flags with the story behind each one.`.trim(),
    canonical: `${ORIGIN}/identity/${slug(cat)}/`,
    body,
  })
}

function identityHub() {
  const body = `
<div class="crumbs"><a href="/">Home</a> › Identity flags</div>
<h1>Identity flags</h1>
<p class="lead">Not every flag belongs to a country. These ${IDENTITY_FLAGS.length} flags represent communities,
peoples, movements and would-be nations.</p>
<p>Each flag comes with a short note on who flies it and what its colours and symbols stand for. Including
a flag here describes it; it does not endorse the cause behind it. Separatist and micronation flags are
listed whether or not any government recognises them.</p>
${ID_CATS.map(c => {
    const items = IDENTITY_FLAGS.filter(f => f.category === c).sort(byTier)
    return `<h2><a href="/identity/${slug(c)}/">${esc(c)}</a> <span class="muted" style="font-size:15px;font-weight:400">(${items.length})</span></h2>
<p>${esc(ID_INTRO[c] ?? '')}</p>
<p class="index">${items.map(f => `<a href="/identity/${slug(c)}/#${esc(f.id)}">${esc(f.name)}</a>`).join(' · ')}</p>`
  }).join('\n')}
<a class="cta" href="/?play=identity">Play the identity flags quiz</a>
`
  return page({
    title: 'Identity flags: pride, ethnic and micronation flags | Globalio',
    description: `${IDENTITY_FLAGS.length} flags of communities, peoples, movements and micronations, with the story behind each one.`,
    canonical: `${ORIGIN}/identity/`,
    body,
  })
}

// ── games: /games/ ───────────────────────────────────────────────────────────
const GROUP_INTRO = {
  'Learn the World': 'Study mode. Work through every country, historical and identity flag at your own pace, then drill down into states, provinces and regions.',
  'Daily Rituals': 'Something new every day, worth coming back for.',
  'One Glance': 'Quick, visual games where you recognise, rebuild or draw a flag.',
  'Spot It': 'Eagle-eye games about the small details that separate similar flags.',
  'Cartographer': 'Geography beyond flags: country shapes, borders and continents.',
  'Sharp Recall': 'Fast-paced quizzes that test what you remember.',
  'Loremaster': 'History, language and trivia for people who want to go deeper.',
  'Challenge': 'Long-form tests for when you think you know them all.',
  'More games': 'Quick extra games, from the daily Flagle puzzle to American city flags.',
}
const GAME_DESC = {
  flags: 'Browse and study flag sets for every country, plus historical states and identity flags, and track which ones you have mastered.',
  flashcards: 'Swipe through all 197 country flags as flashcards until you know each one by sight.',
  historical: 'Learn and quiz yourself on the flags of empires, kingdoms and republics that no longer exist.',
  identity: 'Learn pride, ethnic, indigenous, separatist and micronation flags and the stories behind them.',
  provinceroulette: 'Spin a continent, then a country, then name the flag of one of its regions.',
  substumper: 'You are shown the flag of a state or province. Name the country it belongs to.',
  gacha: 'Pull a random flag every day and build up your collection.',
  connections: 'A daily puzzle: sort sixteen countries into four hidden groups of four, like borders, flags, languages or wordplay. Six mistakes allowed, and three free hints.',
  funfact: 'A new fact about a flag every day.',
  flagbracket: 'Flags go head to head in a tournament bracket and you vote for your favourite until one is champion.',
  tierlist: 'Rank flags from S to F and share your tier list.',
  worldcup: 'Explore the flags and histories of the 48 nations at the 2026 FIFA World Cup.',
  silhouette: 'Guess the country from its flag shown only in shadow.',
  thecrop: 'Start from a tight crop of a flag and zoom out until you can name it.',
  thepeel: 'Scratch away the cover to reveal a flag bit by bit, and guess it as early as you can.',
  composer: 'A flag is hidden under a grid of tiles. Each guess flips a tile, and closer guesses reveal better ones.',
  flagstudio: 'Make your own flag. Start from any real flag or a blank layout, recolour any part, add stars, suns and crescents, then download it as a PNG or share a link.',
  buildflag: 'Put a flag together from its stripes and bands in the right order.',
  geopaint: 'Colour in a blank flag and see how close you got to the real thing.',
  sketchflag: 'Draw a flag from memory, then compare your sketch with the real flag.',
  flagoutline: 'Only the outlines of a flag are shown. Each wrong guess bleeds in more colour.',
  frankenflag: 'Two flags are stitched together. Name both halves.',
  oddoneout: 'Several flags share something in common. Find the one that does not belong.',
  lookalikes: 'Pick the real flag out of near-identical lookalikes.',
  flagdna: 'Guess the mystery flag. Each guess shows which attributes match, like colours, stripes, symbols and region, and how close you are.',
  symbolhunt: 'Find every flag that carries a particular symbol, such as a star, eagle or crescent.',
  flagfamilies: 'Sort flags into the families they belong to, like Nordic crosses and Pan-African colours.',
  spoterror: 'One colour on this flag is wrong. Find it.',
  forgery: 'Swipe to decide whether each flag is correct or has been doctored.',
  geo: 'Identify countries from the shape of their borders.',
  bordermap: "Fill in all of a country's neighbours on the map.",
  borderchain: 'Connect two countries by travelling overland through their neighbours.',
  continentsort: 'Sort as many countries into their continents as you can in one minute.',
  reversequiz: 'You are given a country name. Pick its flag from the options.',
  capitalquiz: 'Name the capital city of each country.',
  statclash: 'Two countries, one question: which has the bigger population or area?',
  prideroulette: 'Name pride flags one after another. One mistake and the run is over.',
  language: 'Read a sentence and pick which of 88 languages it is written in, from easy to extreme.',
  realorbot: 'Swipe to decide whether a flag is real or an AI-generated fake.',
  twotruths: 'Three statements about a country. Two are true. Spot the lie.',
  deadoralive: 'Is this country still around, or has it vanished from the map?',
  lineage: "Trace a flag's family tree through the flags that came before it.",
  timeline: "Put a country's historical flags in the order they were used.",
  gauntlet: 'Name every flag in the world in one run with a single life.',
  challenge: 'Master the flags of states, provinces and regions, country by country.',
  flagle: 'A daily flag puzzle in the style of Wordle, with six guesses.',
  capitalmatch: 'Match each flag to its capital city.',
  higherlower: 'Does this flag have more red or more blue? Keep the streak going.',
  oddborder: "Spot the country that isn't a neighbour.",
  describeit: 'Guess the flag from a written description.',
  uscityflags: 'Name the American city from its flag.',
  progressmap: 'Watch the world map light up as you master each country.',
  substats: 'See your mastery of regional flags continent by continent.',
}

function gamesPage() {
  const games = GAMES
  const groups = [...new Set(games.map(e => e.sandbox ? 'More games' : e.group))]
  const body = `
<div class="crumbs"><a href="/">Home</a> › Games</div>
<h1>Every Globalio game</h1>
<p class="lead">Globalio has ${games.length} ways to learn flags and geography. All of them are free
and none of them need an account. Tap any game to jump straight in.</p>
${groups.map(g => `
<h2>${esc(g)}</h2>
<p class="muted">${esc(GROUP_INTRO[g] ?? '')}</p>
<div class="games">
${games.filter(e => (e.sandbox ? 'More games' : e.group) === g).map(e => `<div class="game">
  <h3><a href="/?play=${esc(e.id)}">${esc(e.title)}</a></h3>
  <p>${esc(GAME_DESC[e.id] ?? e.subtitle)}</p>
</div>`).join('\n')}
</div>`).join('\n')}
<a class="cta" href="/">Open Globalio</a>
`
  return page({
    title: `${games.length} free flag and geography games | Globalio`,
    description: `Every Globalio game in one place: flag quizzes, drawing and colouring games, border and map puzzles, history and language games. Free, no sign-up.`,
    canonical: `${ORIGIN}/games/`,
    body,
  })
}


// ── flag maker: /flag-maker/ ─────────────────────────────────────────────────
// The landing page for Flag Studio, so "flag maker" searches find it. The
// studio itself lives in the app at /?play=flagstudio.
const STUDIO_URL = '/?play=flagstudio'
const FLAG_MAKER_FAQ = [
  ['Is it free?', 'Yes. No account, no sign-up, and every download size is free.'],
  ['Can I use the flags I make?', 'Yes, they\'re yours: games, stories, school projects, clubs. Real national emblems can have legal limits, so keep those to creative and fictional flags.'],
  ['Does it work on a phone?', 'Yes. The flag stays on top with the tools underneath, and you can pinch to resize and rotate a symbol.'],
  ['Where are my flags saved?', 'On your own device, automatically, under My flags. Nothing is uploaded unless you share a link.'],
  ['How do I share a flag?', 'Tap Share to copy a link that holds the whole design, or download a PNG, an SVG or a nation card.'],
  ['Can I start from a real country\'s flag?', `Yes. All ${FLAGS.length} country flags are templates, at their official proportions.`],
]

function flagMakerPage() {
  const tile = (big, small) => `<div class="tile"><b>${big}</b><span>${small}</span></div>`
  const body = `
<div class="crumbs"><a href="/">Home</a> › Flag maker</div>
<p class="eyebrow">Free flag maker</p>
<h1>Make your own flag</h1>
<p class="lead">Start from any country's flag or a blank layout, change anything, and download it. Free, no sign-up.</p>
<a class="cta" href="${STUDIO_URL}">Open Flag Studio</a>
<img class="shot" src="/flag-maker/studio.jpg" alt="Flag Studio with a blue and gold striped flag, a laurel wreath and a red star" width="1200" height="716" />

<h2>How it works</h2>
<div class="how">
  <div><b>1 · Pick</b><span>A real flag, a blank layout, or Random</span></div>
  <div><b>2 · Tap</b><span>Any part to recolour it</span></div>
  <div><b>3 · Add</b><span>Stars, suns, crests and emblems</span></div>
  <div><b>4 · Save</b><span>PNG, SVG, a link or a nation card</span></div>
</div>

<h2>Made in Flag Studio</h2>
<div class="cards">
  <img src="/flag-maker/aldmere.jpg" alt="Nation card for the Kingdom of Aldmere: blue and gold stripes with a laurel wreath and a red star" width="1200" height="630" loading="lazy" />
  <img src="/flag-maker/norhaven.jpg" alt="Nation card for the Free State of Norhaven: a green flag with a white Nordic cross and a gold crescent and star" width="1200" height="630" loading="lazy" />
  <img src="/flag-maker/solenna.jpg" alt="Nation card for the Republic of Solenna: black and gold with a red hoist triangle and a gold sun" width="1200" height="630" loading="lazy" />
</div>

<h2>What's inside</h2>
<div class="tiles">
  ${tile(FLAGS.length, 'country flags to start from, at their real shape')}
  ${tile(EMBLEM_COUNT, 'national emblems, like Albania\'s eagle')}
  ${tile(SYMBOL_COUNT, 'symbols: stars, suns, maple leaf, laurel')}
  ${tile('2–9', 'stripes, horizontal or vertical, any width')}
  ${tile('4K', 'PNG downloads, plus SVG')}
  ${tile('0', 'accounts needed. Saved on your device')}
</div>

<h2>Five rules of a good flag</h2>
<div class="rules">
  <div><b>Keep it simple</b><span>A child could draw it from memory.</span></div>
  <div><b>Give it meaning</b><span>Every colour and symbol stands for something.</span></div>
  <div><b>Two or three colours</b><span>Contrasting, so it reads from far away.</span></div>
  <div><b>No lettering or seals</b><span>Both blur on a flag in the wind.</span></div>
  <div><b>Be distinctive</b><span>Chad and Romania show how easily flags clash.</span></div>
</div>
<p class="small muted">Flag Studio's design check scores your flag against these. See how real countries did it on the <a href="/flags/">country flag pages</a>.</p>

<h2>Ideas</h2>
<p class="chips"><span>A fantasy kingdom</span><span>Your state or city, redesigned</span><span>A sports team or club</span><span>A school project</span><span>Your family</span><span>A tabletop campaign</span></p>

<h2>Questions</h2>
<div class="faq">
${FLAG_MAKER_FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
</div>
<a class="cta" href="${STUDIO_URL}">Make your flag</a>
<p class="small muted">Then test yourself on the real ones in <a href="/games/">${GAME_COUNT} flag games</a>.</p>
`
  return page({
    title: 'Flag Maker: Make Your Own Flag Free | Globalio',
    description: `Free flag maker. Start from any of ${FLAGS.length} country flags or a blank layout, recolour anything, add stars and emblems, and download a PNG or SVG. No sign-up.`,
    canonical: `${ORIGIN}/flag-maker/`,
    ogImage: `${ORIGIN}/flag-maker/aldmere.jpg`,
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Flag Studio', url: `${ORIGIN}${STUDIO_URL}`,
        applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: 'A free flag maker: start from any country flag or a blank layout, recolour it, add symbols and emblems, and download or share it.',
      },
      {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: FLAG_MAKER_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
    body,
  })
}

// ── about, contact, 404 ──────────────────────────────────────────────────────
const totalSubs = [...SUBREGIONS.values()].flat().filter(s => s.flagUrl && !s.noFlag && !s.groupHeader).length

function aboutPage() {
  const body = `
<div class="crumbs"><a href="/">Home</a> › About</div>
<h1>About Globalio</h1>
<p class="lead">Globalio is a free flag and geography game made by Sean Joudrie, an independent developer
in the United States who loves flags.</p>
<p>It started as a way to learn every country's flag and grew into something much bigger. Today
Globalio covers the flags of all ${FLAGS.length} countries, ${totalSubs.toLocaleString('en')} state, province and regional
flags, ${HISTORICAL_FLAGS.length} historical states and empires, and ${IDENTITY_FLAGS.length} identity flags, including pride
flags, indigenous and ethnic flags, separatist movements and micronations.</p>
<p>Every entry was researched by hand, cross-checking Wikipedia, Wikimedia Commons, official
government websites and the flag community to find the correct, current version of each flag,
and to write a short description of what it means and where it came from.</p>
<h2>What you can do here</h2>
<p><b><a href="/games/">Play ${GAME_COUNT} games.</a></b> Quizzes, drawing and colouring games,
lookalike spotting, map and border puzzles, a language game and daily challenges. Each one teaches
something different.</p>
<p><b>Read the archive.</b> Every <a href="/flags/">country page</a> tells the story of that country's flags
through history. The <a href="/historical/">historical</a> and <a href="/identity/">identity</a> archives cover
flags you won't find on a list of countries.</p>
<h2>How the archive is made</h2>
<p>Each country page brings together the current flag, a note on what its colours and symbols mean, the
flags that flew there before it, the historical states that once covered its land, its territories and
its regional flags. The descriptions are written for Globalio, and facts are checked against Wikipedia,
Wikimedia Commons and official government sources. Where a meaning is only traditional or popular rather than official, the page says so.</p>
<p>Flag images come from Wikimedia Commons and are served from Globalio's own server, so pages load
quickly and don't break when a file is renamed upstream. The archive grows every month; the
<a href="/whats-new/">what's new</a> page lists each change.</p>
<h2>Difficult flags</h2>
<p>Some historical flags belonged to regimes responsible for war, slavery or genocide, and a few, such as
the Nazi swastika flag and the Confederate battle flag, are used as hate symbols today. They appear only
in their historical context, with notes that say what they stood for, and pages that show them carry no
advertising. Identity and separatist flags are described, not endorsed.</p>
<h2>Accuracy</h2>
<p>We do our best to get every flag, name and date right, but we're not an official reference and
mistakes can slip through. If you spot one, please <a href="/contact/">let us know</a> and we'll fix it.</p>
<h2>Free to play</h2>
<p>Globalio is free, with no account or sign-up, and your progress is saved only on your own device.
Ads from Google help cover its running costs. See the <a href="/privacy.html">privacy policy</a> for details.</p>
<a class="cta" href="/">Play Globalio</a>
`
  return page({
    title: 'About Globalio: who makes it and how',
    description: 'Globalio is a free flag and geography game by Sean Joudrie, covering country, regional, historical and identity flags, and how the archive is researched.',
    canonical: `${ORIGIN}/about/`,
    body,
  })
}

function contactPage() {
  const body = `
<div class="crumbs"><a href="/">Home</a> › Contact</div>
<h1>Contact</h1>
<p class="lead">Questions, ideas, bug reports or a flag we got wrong: we'd love to hear from you.</p>
<p>Email <a href="mailto:${CONTACT_EMAIL}?subject=Globalio">${CONTACT_EMAIL}</a>. Globalio is made by Sean Joudrie,
an independent developer in the United States, who reads every message himself.</p>
<h2>Reporting a flag correction</h2>
<p>Please include the flag's name, the page or game where you saw it, what looks wrong, and a link to a
source if you have one, such as a government website or the flag's Wikipedia article. Corrections are
usually fixed within a few days and listed on the <a href="/whats-new/">what's new</a> page.</p>
<h2>Bugs and game ideas</h2>
<p>If a game misbehaves, say which game it was, what you tapped, and which phone or browser you were
using; a screenshot helps. Ideas for new games, flags or archive pages are always welcome.</p>
<h2>Privacy requests</h2>
<p>Globalio has no accounts, so there is no profile to look up: your game progress lives only in your own
browser. For anything about cookies, ads or analytics, see the <a href="/privacy.html">privacy policy</a>
or email the address above.</p>
`
  return page({
    title: 'Contact Globalio',
    description: 'Get in touch with Globalio: questions, game ideas, bug reports, flag corrections and privacy requests. Email sjoudrie@gmail.com.',
    canonical: `${ORIGIN}/contact/`,
    body,
    ads: false,
  })
}

function whatsNewPage() {
  const body = `
<div class="crumbs"><a href="/">Home</a> › What's new</div>
<h1>What's new</h1>
<p class="lead">Globalio gets new games, flags and fixes every month. Here's what changed recently.</p>
${CHANGELOG.map(e => `
<h2>${esc(e.title)}</h2>
<p class="muted">${formatDate(e.date)}</p>
<ul>${e.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
<p>Have an idea for a game or found a mistake? <a href="/contact/">Tell us</a>.</p>
`
  return page({
    title: "What's new on Globalio",
    description: 'Recent updates to Globalio: new flag games, new flags and fixes, updated every month.',
    canonical: `${ORIGIN}/whats-new/`,
    body,
  })
}

function notFoundPage() {
  const body = `
<h1>Page not found</h1>
<p class="lead">This page doesn't exist, or it has moved.</p>
<p>Try the <a href="/flags/">country flag index</a>, browse <a href="/games/">all games</a>, or head back to
<a href="/">Globalio</a>.</p>
`
  return page({ title: 'Page not found | Globalio', description: 'This page could not be found.', body, noindex: true })
}

// ── build ────────────────────────────────────────────────────────────────────
emit('/flags/', flagsHub())
for (const flag of FLAGS) emit(`/flags/${slug(flag.code)}/`, countryPage(flag))
emit('/historical/', historicalHub())
for (const r of HIST_REGIONS) emit(`/historical/${slug(r)}/`, historicalRegionPage(r))
emit('/identity/', identityHub())
for (const c of ID_CATS) emit(`/identity/${slug(c)}/`, identityPage(c))
emit('/games/', gamesPage())
emit('/flag-maker/', flagMakerPage())
emit('/about/', aboutPage())
emit('/contact/', contactPage())
emit('/whats-new/', whatsNewPage())

function sitemap() {
  const urls = [
    { loc: `${ORIGIN}/`, priority: '1.0', freq: 'daily' },
    ...out.map(([p]) => ({
      loc: ORIGIN + p,
      priority: p.split('/').filter(Boolean).length === 1 ? '0.8' : '0.6',
      freq: 'monthly',
    })),
    { loc: `${ORIGIN}/privacy.html`, priority: '0.3', freq: 'yearly' },
    { loc: `${ORIGIN}/terms.html`, priority: '0.3', freq: 'yearly' },
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${LAST_UPDATED}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>
`
}

if (!fs.existsSync(DIST)) {
  console.error('[prerender] dist/ not found — run `vite build` first.')
  process.exit(1)
}

let totalWords = 0
for (const [urlPath, html] of out) {
  const dir = path.join(DIST, urlPath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
  totalWords += words(html.slice(html.indexOf('<body>')))
}
fs.writeFileSync(path.join(DIST, '404.html'), notFoundPage())
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap())

console.log(`[prerender] wrote ${out.length} content pages (~${totalWords.toLocaleString('en')} words) + 404 + sitemap.`)

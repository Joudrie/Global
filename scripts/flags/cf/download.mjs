// Polite, resumable downloader for the flags in files.txt → public/cf/.
// Meant for GitHub Actions (.github/workflows/selfhost-flags.yml); Wikimedia
// rate-limits bulk pulls, so it is slow on purpose and safe to re-run:
//   - skips anything already in manifest.json, and files Commons says are
//     missing (recorded in missing.json after two misses);
//   - resolves names through the Commons API (handles %-escapes, accents,
//     redirects), 50 per request;
//   - at most CONCURRENCY (2) downloads at once, a pause between each, backoff
//     and Retry-After on 429/5xx, and it stops early if throttling persists;
//   - heavy files (big SVG seals, large rasters) are stored as a 640px
//     Commons thumbnail instead of the original;
//   - saves progress every 20 files, so a cancelled run keeps what it got.
//   LIMIT=1500 node scripts/flags/cf/download.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { FILES, MAN, MISSING, OUT, UA, canonName } from "./common.mjs"

const LIMIT = Number(process.env.LIMIT || 1500)
const CONCURRENCY = Math.min(2, Number(process.env.CONCURRENCY || 2))
const GAP_MS = 400                 // pause after each download, per worker
const THUMB_W = 640
const BIG_SVG = 250_000            // bytes; above this use a PNG thumbnail
const BIG_RASTER = 400_000
const API = "https://commons.wikimedia.org/w/api.php"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

mkdirSync(OUT, { recursive: true })
const manifest = existsSync(MAN) ? JSON.parse(readFileSync(MAN, "utf8")) : {}
const missing = existsSync(MISSING) ? JSON.parse(readFileSync(MISSING, "utf8")) : {}
const hosted = new Set(Object.keys(manifest).map(canonName))
const save = () => {
  writeFileSync(MAN, JSON.stringify(manifest, null, 0))
  writeFileSync(MISSING, JSON.stringify(missing, null, 1) + "\n")
}

const seen = new Set()
const queue = []
for (const name of readFileSync(FILES, "utf8").split("\n").filter(Boolean)) {
  const c = canonName(name)
  if (hosted.has(c) || seen.has(c) || (missing[c]?.misses ?? 0) >= 2) continue
  seen.add(c)
  queue.push(name)
}
const todo = queue.slice(0, LIMIT)
console.log(`targets ${seen.size + hosted.size}, hosted ${hosted.size}, queued ${queue.length}, this run ${todo.length}`)

// ── throttling ──────────────────────────────────────────────────────────────
let pauseUntil = 0
let throttledInARow = 0
const MAX_THROTTLED = 25           // give up this run; the next run resumes
let stop = false
async function politeFetch(url, what) {
  for (let a = 0; a < 6 && !stop; a++) {
    const wait = pauseUntil - Date.now()
    if (wait > 0) await sleep(wait)
    let res
    try {
      res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(60_000) })
    } catch (e) {
      await sleep(3000 * 2 ** a)
      continue
    }
    if (res.status === 429 || res.status >= 500) {
      const ra = Number(res.headers.get("retry-after"))
      const ms = Math.min(120_000, ra > 0 ? ra * 1000 : 5000 * 2 ** a) + Math.random() * 1000
      pauseUntil = Math.max(pauseUntil, Date.now() + ms)
      if (res.status === 429 && ++throttledInARow >= MAX_THROTTLED) {
        console.log(`still throttled after ${MAX_THROTTLED} tries — stopping; re-run later to resume`)
        stop = true
      }
      console.log(`  ${res.status} on ${what}; waiting ${Math.round(ms / 1000)}s`)
      continue
    }
    throttledInARow = 0
    return res
  }
  return null
}

// ── resolve names through the Commons API ───────────────────────────────────
async function resolve(names) {
  const out = new Map() // name -> { url, mime, size, thumb } | null (missing)
  for (let i = 0; i < names.length && !stop; i += 50) {
    const batch = names.slice(i, i + 50)
    const title = new Map(batch.map((n) => [n, "File:" + canonName(n)]))
    const qs = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", redirects: "1",
      prop: "imageinfo", iiprop: "url|mime|size", iiurlwidth: String(THUMB_W),
      titles: [...new Set(title.values())].join("|"),
    })
    const res = await politeFetch(`${API}?${qs}`, "api")
    if (!res || !res.ok) continue
    const data = await res.json()
    const alias = new Map()
    for (const r of [...(data.query?.normalized ?? []), ...(data.query?.redirects ?? [])]) alias.set(r.from, r.to)
    const pages = new Map((data.query?.pages ?? []).map((p) => [p.title, p]))
    for (const n of batch) {
      let t = title.get(n)
      for (let k = 0; k < 5 && alias.has(t); k++) t = alias.get(t)
      const p = pages.get(t)
      const ii = p?.imageinfo?.[0]
      out.set(n, p && !p.missing && ii ? { url: ii.url, mime: ii.mime, size: ii.size, thumb: ii.thumburl } : null)
    }
    await sleep(1000)
  }
  return out
}

function pick(info) {
  const isSvg = info.mime === "image/svg+xml"
  const heavy = isSvg ? info.size > BIG_SVG : info.size > BIG_RASTER
  if (heavy && info.thumb) {
    const ext = info.thumb.split("?")[0].split(".").pop().toLowerCase()
    return { url: info.thumb, ext: ext === "jpeg" ? "jpg" : ext }
  }
  let ext = info.url.split("?")[0].split(".").pop().toLowerCase()
  if (ext === "jpeg") ext = "jpg"
  return { url: info.url, ext }
}

const slug = (name, ext) => createHash("sha1").update(canonName(name)).digest("hex").slice(0, 16) + "." + ext

// ── main ────────────────────────────────────────────────────────────────────
let ok = 0, gone = 0, failed = 0
const info = await resolve(todo)
for (const n of todo) {
  if (info.get(n) === null) {
    const c = canonName(n)
    missing[c] = { misses: (missing[c]?.misses ?? 0) + 1, last: new Date().toISOString().slice(0, 10) }
    gone++
  }
}
const downloads = todo.filter((n) => info.get(n))
process.on("SIGTERM", () => { save(); process.exit(0) })
process.on("SIGINT", () => { save(); process.exit(0) })

async function worker() {
  while (downloads.length && !stop) {
    const name = downloads.shift()
    const { url, ext } = pick(info.get(name))
    const res = await politeFetch(url, name)
    let buf = null
    if (res?.ok) {
      try {
        const b = Buffer.from(await res.arrayBuffer())
        const type = res.headers.get("content-type") || ""
        const looksSvg = ext !== "svg" || /<svg[\s>]/i.test(b.subarray(0, 4096).toString("utf8"))
        if (b.length >= 40 && type.startsWith("image/") && looksSvg) buf = b
      } catch { /* timed out mid-body; retried next run */ }
    } else if (res && res.status === 404) {
      const c = canonName(name)
      missing[c] = { misses: (missing[c]?.misses ?? 0) + 1, last: new Date().toISOString().slice(0, 10) }
    }
    if (buf) {
      const file = slug(name, ext)
      writeFileSync(`${OUT}/${file}`, buf)
      manifest[name] = "/cf/" + file
      delete missing[canonName(name)]
      ok++
    } else failed++
    if ((ok + failed) % 20 === 0) {
      save()
      console.log(`  progress: ${ok} saved, ${failed} failed, ${downloads.length} left`)
    }
    await sleep(GAP_MS + Math.random() * 200)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
save()

const left = queue.length - ok - gone
const summary = `Downloaded ${ok}, not on Commons ${gone}, failed ${failed}${stop ? " (stopped early: throttled)" : ""}. Still to host: ${left}.`
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Self-host flags\n${summary}\n`)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `saved=${ok}\nleft=${left}\n`)

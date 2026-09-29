// Finds every Wikimedia flag the app would still hotlink and adds its Commons
// filename to files.txt (the download target list). Two passes:
//   1. Runtime: imports every src/data/*.ts module and walks its exports for
//      Wikimedia URLs, and for `file` fields that fp() would resolve remotely.
//   2. Static: scans src/**/*.{ts,tsx} for literal Wikimedia URLs and
//      fp("…") / wiki("…") calls (catches components and screen-level calls).
// Run (needs the TS loader):
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/flags/cf/collect.mjs
// Add --dry to print counts without touching files.txt.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { FILES, canonName, commonsFileOf } from "./common.mjs"

const ROOT = process.cwd()
const DRY = process.argv.includes("--dry")
// Not player-facing: the diagnostics tool lists candidate replacements for
// missing flags, and the two generated maps are resolver tables, not usages.
const SKIP = new Set(["src/data/flagDiagnostics.ts", "src/data/hostedFlags.ts", "src/components/FlagDiagnosticsScreen.tsx"])
const IMG = /\.(svg|png|jpe?g|gif|webp|tiff?)$/i

const { commonsFlag } = await import(pathToFileURL(path.join(ROOT, "src/data/flagUrl.ts")).href)

/** source -> Map(canon -> raw name) */
const bySource = new Map()
function add(source, rawName) {
  if (!bySource.has(source)) bySource.set(source, new Map())
  const m = bySource.get(source)
  const c = canonName(rawName)
  if (!m.has(c)) m.set(c, rawName)
}
const remoteFileOf = (url) => (typeof url === "string" ? commonsFileOf(url) : null)

// ── 1. runtime walk of data modules ─────────────────────────────────────────
const dataDir = path.join(ROOT, "src/data")
let subRemote = 0, subTotal = 0, cityRemote = 0, cityTotal = 0
for (const f of readdirSync(dataDir).filter((f) => f.endsWith(".ts")).sort()) {
  const rel = `src/data/${f}`
  if (SKIP.has(rel)) continue
  let mod
  try {
    mod = await import(pathToFileURL(path.join(dataDir, f)).href)
  } catch (e) {
    console.warn(`! could not import ${rel}: ${e.message.split("\n")[0]}`)
    continue
  }
  const seen = new Set()
  const walk = (v, depth) => {
    if (depth > 12 || v == null) return
    if (typeof v === "string") {
      const n = remoteFileOf(v)
      if (n) add(rel, n)
      return
    }
    if (typeof v !== "object" || seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v)) { for (const x of v) walk(x, depth + 1); return }
    if (typeof v.file === "string" && IMG.test(v.file) && !v.file.startsWith("/")) {
      const n = v.file.startsWith("http") ? remoteFileOf(v.file) : remoteFileOf(commonsFlag(v.file))
      if (n) add(rel, n)
    }
    for (const x of Object.values(v)) walk(x, depth + 1)
  }
  for (const v of Object.values(mod)) walk(v, 0)
  if (f === "subdivisions.ts") {
    subTotal = mod.SUB_FLAGS.length
    subRemote = mod.SUB_FLAGS.filter((s) => remoteFileOf(s.flagUrl)).length
  }
  if (f === "usCityFlags.ts") {
    cityTotal = mod.US_CITY_FLAGS.length
    cityRemote = mod.US_CITY_FLAGS.filter((s) => remoteFileOf(s.flagUrl)).length
  }
}

// ── 2. static scan of every source file ─────────────────────────────────────
const URL_RE = /https?:\/\/(?:commons|upload)\.wikimedia\.org\/[^"'`\s]+/g
const CALL_RE = /\b(?:fp|wiki|cf)\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1\s*\)/g
function* walkDir(d) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f)
    if (statSync(p).isDirectory()) yield* walkDir(p)
    else if (/\.(ts|tsx)$/.test(f)) yield p
  }
}
for (const p of walkDir(path.join(ROOT, "src"))) {
  const rel = path.relative(ROOT, p).split(path.sep).join("/")
  if (SKIP.has(rel)) continue
  const text = readFileSync(p, "utf8")
  for (const [u] of text.matchAll(URL_RE)) {
    const f = commonsFileOf(u)
    const n = f && IMG.test(f) ? remoteFileOf(commonsFlag(f)) : null
    if (n) add(`${rel} (literal)`, n)
  }
  for (const m of text.matchAll(CALL_RE)) {
    if (m[2].includes("${")) continue
    const n = remoteFileOf(commonsFlag(m[2]))
    if (n) add(`${rel} (call)`, n)
  }
}

// ── merge into files.txt ────────────────────────────────────────────────────
const existing = existsSync(FILES) ? readFileSync(FILES, "utf8").split("\n").filter(Boolean) : []
const have = new Set(existing.map(canonName))
const all = new Map()
for (const m of bySource.values()) for (const [c, raw] of m) if (!all.has(c)) all.set(c, raw)
const fresh = [...all].filter(([c]) => !have.has(c)).map(([, raw]) => raw)

console.log("Remote Wikimedia flags still hotlinked, by source (unique files):")
for (const [src, m] of [...bySource].sort((a, b) => b[1].size - a[1].size)) console.log(`  ${String(m.size).padStart(5)}  ${src}`)
console.log(`SUB_FLAGS hotlinked: ${subRemote} / ${subTotal}`)
console.log(`US_CITY_FLAGS hotlinked: ${cityRemote} / ${cityTotal}`)
console.log(`Unique remote files: ${all.size}; already in files.txt: ${all.size - fresh.length}; new: ${fresh.length}`)
if (!DRY && fresh.length) {
  writeFileSync(FILES, [...existing, ...fresh].join("\n") + "\n")
  console.log(`files.txt now lists ${existing.length + fresh.length} files`)
}

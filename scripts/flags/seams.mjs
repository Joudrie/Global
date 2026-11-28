// Usage: node scripts/flags/seams.mjs [code…] [--dir=public/flags] [--dpr=1,2,2.625,3] [--widths=64,120,260] [--json=out.json]
//
// Finds hairline seams in flag SVGs: the thin light or dark line where two
// stripes meet when a boundary lands between device pixels (e.g. 2.625× Android
// phones). Each flag is drawn as an <img> at the sizes the app uses (natural 4:3
// and object-fit: cover in a 3:2 tile), at each device pixel ratio, and checked
// two ways:
//   bleed  the page shows through: a pixel inside the flag, with opaque flag on
//          both sides, that is not fully opaque (shapes that only abut, each
//          edge anti-aliased against the background).
//   blend  a pixel that is not a blend of the colours that meet there, judged
//          against a 4× supersampled render (two shapes abut on top of a third,
//          which bleeds through: a blend of the wrong colours).
// Only pixels on straight lines at least a sixth of the tile long count, so the
// fine detail of coats of arms isn't reported; seams along curves aren't either.
// A thin outline along a straight edge of a shield can still show up (Bermuda,
// Turks and Caicos…); stripes, bands, cantons and triangles were all clean in
// Nov 2026, and scripts/flagseams.test.mjs guards the files repaired then.
// --no-blend skips the slower second check. Exits 1 when any flag has a seam.
import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { basename, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import zlib from "node:zlib"

const ROOT = resolve(new URL("../../", import.meta.url).pathname)
const HOST = "http://seams.test/"

// ── PNG (8-bit RGB/RGBA, as Playwright writes them) ──────────────────────────
export function decodePng(buf) {
  let p = 8, w = 0, h = 0, ct = 0
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8)
    const d = buf.subarray(p + 8, p + 8 + len)
    if (type === "IHDR") {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]
      if (d[8] !== 8 || d[12] !== 0 || (ct !== 2 && ct !== 6)) throw new Error("unsupported PNG")
    } else if (type === "IDAT") idat.push(d)
    else if (type === "IEND") break
    p += 12 + len
  }
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const out = new Uint8Array(w * h * 4)
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], o = y * (stride + 1) + 1
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0
      let x = raw[o + i]
      if (f === 1) x += a
      else if (f === 2) x += b
      else if (f === 3) x += (a + b) >> 1
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c)
        x += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[i] = x & 255
    }
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 4
      out[q] = cur[x * bpp]; out[q + 1] = cur[x * bpp + 1]; out[q + 2] = cur[x * bpp + 2]
      out[q + 3] = bpp === 4 ? cur[x * bpp + 3] : 255
    }
    ;[prev, cur] = [cur, prev]
  }
  return { w, h, data: out }
}

export function encodePng({ w, h, data }) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1)
  const chunk = (type, body) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length)
    const tb = Buffer.concat([Buffer.from(type, "ascii"), body])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(tb) >>> 0)
    return Buffer.concat([len, tb, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])
}

// ── Rendering ────────────────────────────────────────────────────────────────
const viewBoxOf = (svg) => {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? ""
  const vb = /viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(root)
  if (vb) return [+vb[1], +vb[2]]
  const w = /\bwidth=["']([\d.]+)/.exec(root), h = /\bheight=["']([\d.]+)/.exec(root)
  return w && h ? [+w[1], +h[1]] : [640, 480]
}

/** Box (CSS px) and where the flag is drawn inside it, for one tile variant. */
export function variantGeometry(W, mode, [vw, vh]) {
  if (mode === "natural") return { bw: W, bh: (W * vh) / vw, dx: 0, dy: 0, dw: W, dh: (W * vh) / vw }
  const bw = W, bh = (W * 2) / 3, s = Math.max(bw / vw, bh / vh)
  return { bw, bh, dx: (bw - vw * s) / 2, dy: (bh - vh * s) / 2, dw: vw * s, dh: vh * s }
}

export async function openBrowser() {
  const require = createRequire(import.meta.url)
  let pw
  try { pw = require("playwright") } catch { pw = require("/opt/node22/lib/node_modules/playwright") }
  return pw.chromium.launch()
}

/** A page at one device pixel ratio that serves `files` (name → path) from HOST. */
export async function openPage(browser, dpr, files, viewport = { width: 1280, height: 960 }) {
  const ctx = await browser.newContext({ deviceScaleFactor: dpr, viewport })
  const page = await ctx.newPage()
  await page.route(HOST + "**", (r) => {
    const name = decodeURIComponent(new URL(r.request().url()).pathname.slice(1))
    if (!name) return r.fulfill({ body: "<!doctype html><html></html>", contentType: "text/html" })
    const f = files.get(name)
    return f ? r.fulfill({ body: readFileSync(f), contentType: "image/svg+xml" }) : r.fulfill({ status: 404 })
  })
  await page.goto(HOST)
  return page
}

/** Lay `cells` ({name, x, y, g}) out as <img>s and screenshot them on a transparent page. */
export async function shoot(page, cells) {
  const html = cells.map(({ name, x, y, g }) =>
    `<img src="${HOST}${encodeURIComponent(name)}" style="position:absolute;left:${x}px;top:${y}px;` +
    `width:${g.bw}px;height:${g.bh}px;object-fit:cover;display:block">`).join("")
  await page.setContent(`<!doctype html><html style="background:transparent"><body style="margin:0;background:transparent">${html}</body></html>`)
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  return decodePng(await page.screenshot({ omitBackground: true, fullPage: true }))
}

// ── Checks ───────────────────────────────────────────────────────────────────
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]]

/** Bleed pixels in one cell of a screenshot: not opaque, with opaque flag on both sides. */
export function bleedPixels(img, x0, y0, x1, y1, margin = 2) {
  const A = (x, y) => img.data[(y * img.w + x) * 4 + 3]
  const out = []
  const xa = Math.ceil(x0) + margin, xb = Math.floor(x1) - 1 - margin
  const ya = Math.ceil(y0) + margin, yb = Math.floor(y1) - 1 - margin
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
    const a = A(x, y)
    if (a >= 250) continue
    const both = DIRS.some(([dx, dy]) => {
      let l = false, r = false
      for (let k = 1; k <= 2; k++) {
        if (A(x - k * dx, y - k * dy) >= 254) l = true
        if (A(x + k * dx, y + k * dy) >= 254) r = true
      }
      return l && r
    })
    if (both) out.push([x - Math.ceil(x0), y - Math.ceil(y0), a])
  }
  return out
}

/**
 * The pixels of `pts` that lie on straight lines at least `minLen` pixels long
 * (any angle; gaps of up to 2 pixels allowed). A seam follows a straight edge
 * between stripes, bars or triangles across much of the flag; misfits inside a
 * detailed emblem (thin outlines, three colours meeting) don't line up like
 * that. Found with a Hough transform, then checked run by run.
 */
export function straightSeams(pts, minLen) {
  if (pts.length < minLen) return []
  const NT = 360, R = Math.ceil(Math.hypot(...pts.reduce((m, p) => [Math.max(m[0], p[0]), Math.max(m[1], p[1])], [0, 0]))) + 2
  const cos = [], sin = []
  for (let t = 0; t < NT; t++) { cos.push(Math.cos((t * Math.PI) / NT)); sin.push(Math.sin((t * Math.PI) / NT)) }
  const acc = new Uint32Array(NT * (2 * R + 1))
  for (const [x, y] of pts) for (let t = 0; t < NT; t++) acc[t * (2 * R + 1) + Math.round(x * cos[t] + y * sin[t]) + R]++
  const peaks = []
  for (let i = 0; i < acc.length; i++) if (acc[i] >= minLen) peaks.push(i)
  peaks.sort((a, b) => acc[b] - acc[a])
  const key = (p) => p[0] * 65536 + p[1]
  const kept = new Map()
  let longest = 0
  for (const i of peaks.slice(0, 400)) {
    const t = Math.floor(i / (2 * R + 1)), rho = (i % (2 * R + 1)) - R
    const on = pts.filter(([x, y]) => !kept.has(key([x, y])) && Math.abs(x * cos[t] + y * sin[t] - rho) <= 1)
      .map((p) => [p, -p[0] * sin[t] + p[1] * cos[t]]).sort((a, b) => a[1] - b[1])
    let run = []
    const flush = () => {
      const len = run.length ? run[run.length - 1][1] - run[0][1] + 1 : 0
      if (len >= minLen) {
        for (const [p] of run) kept.set(key(p), p)
        longest = Math.max(longest, len)
      }
      run = []
    }
    for (const e of on) {
      if (run.length && e[1] - run[run.length - 1][1] > 3) flush()
      run.push(e)
    }
    flush()
  }
  return Object.assign([...kept.values()], { longest })
}

// Runs inside the page: draws each flag on a canvas at the tile's device size and
// at 4× that. Where the 4× render shows a clean edge between two flat colours, a
// pixel that differs from the 4× render box-filtered down by more than `T` must
// still be a blend of those two colours: an honest edge mixes the colours that
// meet there, a seam adds a third. (Skia quantises vertical coverage to
// quarters, so a plain difference from the reference isn't enough.)
export async function blendInPage({ jobs, s, T, margin }) {
  const cache = new Map()
  const load = async (url) => {
    if (cache.has(url)) return cache.get(url)
    let svg = await (await fetch(url)).text()
    svg = svg.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height)=["'][^"']*["']/g, ""))
    const vb = /viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(svg)
    svg = svg.replace(/<svg\b/, `<svg width="${vb ? vb[1] : 640}" height="${vb ? vb[2] : 480}"`)
    const im = new Image()
    im.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
    await im.decode()
    cache.set(url, im)
    return im
  }
  // Premultiplied RGBA, 0–255.
  const draw = (im, w, h, g) => {
    const c = new OffscreenCanvas(w, h), x = c.getContext("2d")
    x.drawImage(im, g.dx, g.dy, g.dw, g.dh)
    const d = x.getImageData(0, 0, w, h).data
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 255) {
      const a = d[i + 3] / 255
      d[i] *= a; d[i + 1] *= a; d[i + 2] *= a
    }
    return d
  }
  const segDist = (p, a, b) => {
    let ab = 0, ap = 0
    for (let c = 0; c < 4; c++) { ab += (b[c] - a[c]) ** 2; ap += (p[c] - a[c]) * (b[c] - a[c]) }
    const t = ab ? Math.max(0, Math.min(1, ap / ab)) : 0
    let d = 0
    for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(p[c] - a[c] - t * (b[c] - a[c])))
    return d
  }
  const out = []
  for (const { url, dpr, g } of jobs) {
    const im = await load(url)
    const W = Math.floor(g.bw * dpr), H = Math.floor(g.bh * dpr), SW = W * s, SH = H * s
    const k = (f) => ({ dx: g.dx * dpr * f, dy: g.dy * dpr * f, dw: g.dw * dpr * f, dh: g.dh * dpr * f })
    const t = draw(im, W, H, k(1)), r = draw(im, SW, SH, k(s))
    const same = (i, j) => Math.abs(r[i] - r[j]) <= 2 && Math.abs(r[i + 1] - r[j + 1]) <= 2 && Math.abs(r[i + 2] - r[j + 2]) <= 2 && Math.abs(r[i + 3] - r[j + 3]) <= 2
    const pure = (x, y) => {
      if (x < 1 || y < 1 || x >= SW - 1 || y >= SH - 1) return false
      const i = (y * SW + x) * 4
      return same(i, i - 4) && same(i, i + 4) && same(i, i - SW * 4) && same(i, i + SW * 4)
    }
    const bad = []
    const ref = [0, 0, 0, 0], p = [0, 0, 0, 0]
    for (let y = margin; y < H - margin; y++) for (let x = margin; x < W - margin; x++) {
      const q = (y * W + x) * 4
      ref[0] = ref[1] = ref[2] = ref[3] = 0
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
        const o = ((y * s + j) * SW + x * s + i) * 4
        ref[0] += r[o]; ref[1] += r[o + 1]; ref[2] += r[o + 2]; ref[3] += r[o + 3]
      }
      let d = 0
      for (let c = 0; c < 4; c++) { p[c] = t[q + c]; d = Math.max(d, Math.abs(p[c] - ref[c] / (s * s))) }
      if (d <= T) continue
      // Only judge clean edges: the 4× render around the pixel is two flat
      // colours (pure sub-pixels, at least 3 in 5) with a single edge between
      // them. Coats of arms, lettering and hairlines don't qualify.
      const cols = [], counts = []
      let n = 0
      for (let j = (y - 1) * s; j < (y + 2) * s; j++) for (let i = (x - 1) * s; i < (x + 2) * s; i++) {
        if (!pure(i, j)) continue
        n++
        const o = (j * SW + i) * 4
        const e = cols.findIndex((e) => Math.abs(e[0] - r[o]) <= 3 && Math.abs(e[1] - r[o + 1]) <= 3 && Math.abs(e[2] - r[o + 2]) <= 3 && Math.abs(e[3] - r[o + 3]) <= 3)
        if (e >= 0) counts[e]++
        else { cols.push([r[o], r[o + 1], r[o + 2], r[o + 3]]); counts.push(1) }
      }
      if (cols.length !== 2 || n < 0.6 * 9 * s * s || Math.min(...counts) < 2 * s) continue
      // A thin outline drawn along the edge is a third colour too, but the 4×
      // render shows as much of it as the pixel does; a seam is mostly gone there.
      const off = segDist(p, cols[0], cols[1])
      if (off > T && off > 2.5 * segDist(ref.map((v) => v / (s * s)), cols[0], cols[1])) bad.push([x, y])
    }
    out.push(bad)
  }
  return out
}

/**
 * Scans `files` (name → path) at every device pixel ratio, width and mode.
 * Returns {name: {bleed, blend, minAlpha, worst, variants, error?}}: seam pixels
 * summed over every variant, and the variant with the most.
 */
export async function scan(files, { dprs = [1, 2, 2.625, 3], widths = [64, 120, 260], modes = ["natural", "cover"], blend = true, log = () => {} } = {}) {
  const names = [...files.keys()]
  const vbs = new Map(names.map((n) => [n, viewBoxOf(readFileSync(files.get(n), "utf8"))]))
  const res = Object.fromEntries(names.map((n) => [n, { bleed: 0, blend: 0, minAlpha: 255, worst: null, variants: {} }]))
  const browser = await openBrowser()
  try {
    // One page per device pixel ratio, run side by side.
    await Promise.all(dprs.map(async (dpr) => {
      let page = await openPage(browser, dpr, files)
      const reopen = async () => { await page.context().close().catch(() => {}); page = await openPage(browser, dpr, files) }
      const check = async (tag, chunk, img) => {
        const blends = blend
          ? await page.evaluate(blendInPage, { jobs: chunk.map((c) => ({ url: HOST + encodeURIComponent(c.name), dpr, g: c.g })), s: 4, T: 12, margin: 2 })
          : chunk.map(() => [])
        chunk.forEach((c, k) => {
          // A seam must run straight for at least a sixth of the tile's shorter side.
          const side = Math.min(c.g.bw, c.g.bh) * dpr, minLen = Math.max(8, Math.round(side / 6))
          const b = straightSeams(bleedPixels(img, c.x * dpr, c.y * dpr, (c.x + c.g.bw) * dpr, (c.y + c.g.bh) * dpr), minLen)
          const m = straightSeams(blends[k], minLen)
          const r = res[c.name], n = b.length + m.length
          r.bleed += b.length
          r.blend += m.length
          for (const [, , a] of b) r.minAlpha = Math.min(r.minAlpha, a)
          if (n) r.variants[tag] = { bleed: b.length, blend: m.length, at: (b[0] ?? m[0]).slice(0, 2), bleedLen: +(b.longest / side).toFixed(2), blendLen: +(m.longest / side).toFixed(2) }
          if (n && (!r.worst || n > r.variants[r.worst].bleed + r.variants[r.worst].blend)) r.worst = tag
        })
      }
      for (const W of widths) for (const mode of modes) {
        const tag = `${dpr}x ${W}px ${mode}`
        log(tag)
        // Cells on an 8px grid so every tile starts on a whole device pixel at 2.625×.
        const cell = (n) => variantGeometry(W, mode, vbs.get(n))
        const px = Math.ceil((W + 8) / 8) * 8, py = Math.ceil((Math.max(...names.map((n) => cell(n).bh)) + 8) / 8) * 8
        const cols = Math.max(1, Math.floor(1272 / px)), rows = Math.max(1, Math.floor(2000 / py))
        for (let i = 0; i < names.length; i += cols * rows) {
          const chunk = names.slice(i, i + cols * rows).map((name, k) => ({ name, x: 8 + (k % cols) * px, y: 8 + Math.floor(k / cols) * py, g: cell(name) }))
          try {
            await check(tag, chunk, await shoot(page, chunk))
          } catch {
            // Heavy files (multi-megabyte seals) can make a whole sheet fail to
            // capture or crash the page; then each flag is drawn on its own.
            await reopen()
            for (const c of chunk) {
              const one = { ...c, x: 8, y: 8 }
              try { await check(tag, [one], await shoot(page, [one])) } catch { res[c.name].error = `could not render at ${tag}`; await reopen() }
            }
          }
        }
      }
      await page.context().close()
    }))
  } finally {
    await browser.close()
  }
  return res
}

/** name → path for every .svg in `dir`, optionally only the given codes. */
export function svgFiles(dir, only = []) {
  const want = new Set(only.map((c) => c.toLowerCase().replace(/\.svg$/, "")))
  return new Map(readdirSync(dir).filter((f) => f.endsWith(".svg") && (!want.size || want.has(f.slice(0, -4).toLowerCase())))
    .sort().map((f) => [f, join(dir, f)]))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d
  const dir = resolve(ROOT, opt("dir", "public/flags"))
  const files = svgFiles(dir, args.filter((a) => !a.startsWith("--")))
  const t0 = Date.now()
  const res = await scan(files, {
    dprs: opt("dpr", "1,2,2.625,3").split(",").map(Number),
    widths: opt("widths", "64,120,260").split(",").map(Number),
    blend: !args.includes("--no-blend"),
    log: (m) => process.stderr.write(`\r${m}        `),
  })
  process.stderr.write("\n")
  const bad = Object.entries(res).filter(([, r]) => r.bleed || r.blend || r.error)
  for (const [name, r] of Object.entries(res)) if (r.error) console.log(`${basename(name, ".svg").padEnd(10)} ${r.error}`)
  for (const [name, r] of bad) if (r.worst)
    console.log(`${basename(name, ".svg").padEnd(10)} bleed ${String(r.bleed).padStart(6)}  blend ${String(r.blend).padStart(6)}  min alpha ${String(r.minAlpha).padStart(3)}  ` +
      `${Object.keys(r.variants).length} variants, worst ${r.worst} at ${r.variants[r.worst].at}`)
  const seamy = bad.filter(([, r]) => r.worst).length, failed = bad.filter(([, r]) => r.error).length
  console.log(`${seamy} of ${files.size} flags have seams${failed ? `, ${failed} could not be rendered` : ""} (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
  const json = opt("json")
  if (json) writeFileSync(resolve(json), JSON.stringify(res, null, 1))
  process.exitCode = bad.length ? 1 : 0
}

// "Save my card": the profile as one 1080×1350 picture (the size phones use
// for posts and stories), drawn on a canvas in the site's look: the banner
// (a preset, or a flag under its light tan wash),
// the round picture, pinned badges, the name, badge, bio and key stats, and
// globalio.app. drawProfileCard is plain drawing on any 2D context, so tests
// run it with a fake one; renderProfileCard loads the fonts and images first.
import { T, FONT, tint } from "../ui/tokens"

export const CARD_W = 1080
export const CARD_H = 1350

export interface CardData {
  name: string
  badge: string | null
  /** The explorer title (from flags learned) and "Playing since …", already worded. */
  rank: string
  since: string | null
  bio: string
  flags: number
  flagsOf: number
  tiles: { label: string; value: number }[]
  bests: { title: string; value: number }[]
  pinned: string[]
  /** What the footer points to: globalio.app, or the profile's own link. */
  link: string
}

export interface CardImages {
  banner?: CanvasImageSource | null
  /** The banner image's size (a preset is 1200×400; a flag, its own). */
  bannerSize?: { w: number; h: number } | null
  /** A colour laid over the banner (the light tan over a flag banner). */
  bannerWash?: string | null
  picture?: { img: CanvasImageSource; w: number; h: number } | null
  /** One per pinned badge (its icon), in order. */
  pins?: (CanvasImageSource | null)[]
}

/** The parts of a 2D context the card uses (a real canvas, or a test's fake). */
export type Ctx = Pick<CanvasRenderingContext2D,
  "fillStyle" | "strokeStyle" | "lineWidth" | "font" | "textAlign" | "textBaseline" |
  "fillRect" | "fillText" | "measureText" | "beginPath" | "closePath" | "moveTo" | "lineTo" | "arc" | "arcTo" |
  "fill" | "stroke" | "save" | "restore" | "clip" | "drawImage" | "rect">

const display = FONT.display
const body = FONT.mono // Inter
const nf = new Intl.NumberFormat("en-US")
const fmt = (n: number) => nf.format(Math.max(0, Math.round(n)))

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Shrink the font until `text` fits `width` (down to `min`), then cut it with an ellipsis. */
function fit(ctx: Ctx, text: string, width: number, weight: string, family: string, size: number, min: number): { text: string; size: number } {
  let s = size
  for (; s > min; s -= 4) {
    ctx.font = `${weight} ${s}px ${family}`
    if (ctx.measureText(text).width <= width) return { text, size: s }
  }
  ctx.font = `${weight} ${min}px ${family}`
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return { text: t === text ? t : `${t}…`, size: min }
}

function wrap(ctx: Ctx, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= width || !line) line = next
    else { lines.push(line); line = w }
  }
  if (line) lines.push(line)
  if (lines.length > max) {
    const kept = lines.slice(0, max)
    let last = kept[max - 1]
    while (last.length > 1 && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1)
    kept[max - 1] = `${last.trimEnd()}…`
    return kept
  }
  return lines.map(l => {
    let t = l
    while (t.length > 1 && ctx.measureText(t).width > width) t = t.slice(0, -1)
    return t === l ? l : `${t}…`
  })
}

/** Draw an image to cover a box (cropped, centred). */
function cover(ctx: Ctx, img: CanvasImageSource, iw: number, ih: number, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / iw, h / ih)
  const dw = iw * s, dh = ih * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

export function drawProfileCard(ctx: Ctx, d: CardData, im: CardImages = {}): void {
  const PAD = 72, INNER = CARD_W - PAD * 2
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "left"

  // Paper, then the banner across the top.
  ctx.fillStyle = T.bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  const BH = 300
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, CARD_W, BH); ctx.clip()
  ctx.fillStyle = T.void
  ctx.fillRect(0, 0, CARD_W, BH)
  if (im.banner) cover(ctx, im.banner, im.bannerSize?.w ?? 1200, im.bannerSize?.h ?? 400, 0, 0, CARD_W, BH)
  if (im.bannerWash) { ctx.fillStyle = im.bannerWash; ctx.fillRect(0, 0, CARD_W, BH) }
  ctx.restore()
  ctx.fillStyle = T.line
  ctx.fillRect(0, BH, CARD_W, 2)

  // The round picture, over the banner's bottom edge.
  const R = 110, cx = PAD + R, cy = BH
  ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI * 2); ctx.fillStyle = T.bg; ctx.fill()
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = T.surfaceHi
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
  if (im.picture) cover(ctx, im.picture.img, im.picture.w, im.picture.h, cx - R, cy - R, R * 2, R * 2)
  ctx.restore()
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.strokeStyle = T.lineHi; ctx.lineWidth = 3; ctx.stroke()

  // Pinned badges: right, under the banner.
  const pins = d.pinned.slice(0, 3)
  pins.forEach((_, i) => {
    const r = 44, x = CARD_W - PAD - r - (pins.length - 1 - i) * (r * 2 + 20), y = BH + 64
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = tint(T.gold, 0.14); ctx.fill()
    ctx.strokeStyle = tint(T.gold, 0.55); ctx.lineWidth = 3; ctx.stroke()
    const icon = im.pins?.[i]
    if (icon) ctx.drawImage(icon, x - 26, y - 26, 52, 52)
  })

  // Name, badge, explorer title and "Playing since".
  let y = BH + R + 84
  const name = fit(ctx, d.name, INNER, "700", display, 84, 48)
  ctx.font = `700 ${name.size}px ${display}`
  ctx.fillStyle = T.text
  ctx.fillText(name.text, PAD, y)

  y += 30
  if (d.badge) {
    ctx.font = `600 28px ${body}`
    const label = fit(ctx, d.badge, INNER - 40, "600", body, 28, 22)
    ctx.font = `600 ${label.size}px ${body}`
    const w = ctx.measureText(label.text).width + 40
    roundRect(ctx, PAD, y, w, 50, 25)
    ctx.fillStyle = tint(T.gold, 0.12); ctx.fill()
    ctx.strokeStyle = tint(T.gold, 0.4); ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = T.gold
    ctx.fillText(label.text, PAD + 20, y + 35)
    y += 50 + 18
  }
  ctx.font = `500 30px ${body}`
  ctx.fillStyle = T.muted
  const line = [d.rank, d.since ? `Playing since ${d.since}` : ""].filter(Boolean).join("  ·  ")
  y += 30
  ctx.fillText(fit(ctx, line, INNER, "500", body, 30, 22).text, PAD, y)

  if (d.bio) {
    ctx.font = `400 32px ${body}`
    ctx.fillStyle = T.text
    for (const l of wrap(ctx, d.bio, INNER, 2)) { y += 48; ctx.fillText(l, PAD, y) }
  }

  // Flags learned, with a bar.
  y += 84
  ctx.font = `800 64px ${body}`
  ctx.fillStyle = T.text
  const big = fmt(d.flags)
  ctx.fillText(big, PAD, y)
  const bw = ctx.measureText(big).width
  ctx.font = `500 30px ${body}`
  ctx.fillStyle = T.muted
  ctx.fillText(`of ${fmt(d.flagsOf)} flags learned`, PAD + bw + 16, y)
  y += 26
  roundRect(ctx, PAD, y, INNER, 14, 7); ctx.fillStyle = tint(T.text, 0.08); ctx.fill()
  const pct = d.flagsOf ? Math.min(1, d.flags / d.flagsOf) : 0
  if (pct > 0) { roundRect(ctx, PAD, y, Math.max(14, INNER * pct), 14, 7); ctx.fillStyle = T.cyan; ctx.fill() }

  // Six stat tiles, three across.
  y += 40
  const GAP = 16, TW = (INNER - GAP * 2) / 3, TH = 112
  d.tiles.slice(0, 6).forEach((t, i) => {
    const x = PAD + (i % 3) * (TW + GAP), ty = y + Math.floor(i / 3) * (TH + GAP)
    roundRect(ctx, x, ty, TW, TH, 16)
    ctx.fillStyle = T.surface; ctx.fill()
    ctx.strokeStyle = T.line; ctx.lineWidth = 2; ctx.stroke()
    const v = fit(ctx, fmt(t.value), TW - 40, "800", body, 52, 30)
    ctx.font = `800 ${v.size}px ${body}`
    ctx.fillStyle = T.text
    ctx.fillText(v.text, x + 22, ty + 60)
    const l = fit(ctx, t.label.toUpperCase(), TW - 40, "600", body, 20, 14)
    ctx.font = `600 ${l.size}px ${body}`
    ctx.fillStyle = T.muted
    ctx.fillText(l.text, x + 22, ty + 94)
  })
  y += Math.ceil(Math.min(6, d.tiles.length) / 3) * (TH + GAP)

  // Best scores, one per line, as many as fit above the footer (none if not one).
  const footerY = CARD_H - 60
  const ROW = 42, last = footerY - 60
  const rows = Math.max(0, Math.min(3, d.bests.length, Math.floor((last - (y + 36)) / ROW)))
  if (rows > 0) {
    y += 36
    ctx.font = `600 20px ${body}`
    ctx.fillStyle = T.muted
    ctx.fillText("BEST SCORES", PAD, y)
    d.bests.slice(0, rows).forEach((b, i) => {
      const by = y + ROW * (i + 1)
      ctx.font = `700 28px ${body}`
      const v = fmt(b.value), vw = ctx.measureText(v).width
      ctx.fillStyle = T.text
      ctx.textAlign = "right"
      ctx.fillText(v, CARD_W - PAD, by)
      ctx.textAlign = "left"
      ctx.font = `500 28px ${body}`
      ctx.fillText(fit(ctx, b.title, INNER - vw - 24, "500", body, 28, 20).text, PAD, by)
    })
  }

  // Footer: the wordmark and the link.
  ctx.fillStyle = T.line
  ctx.fillRect(PAD, footerY - 44, INNER, 2)
  ctx.font = `700 36px ${display}`
  ctx.fillStyle = T.text
  ctx.fillText("Globalio", PAD, footerY)
  ctx.font = `500 26px ${body}`
  ctx.fillStyle = T.muted
  ctx.textAlign = "right"
  const link = fit(ctx, d.link, INNER - 220, "500", body, 26, 18)
  ctx.font = `500 ${link.size}px ${body}`
  ctx.fillText(link.text, CARD_W - PAD, footerY)
  ctx.textAlign = "left"
}

// ── In the browser ──────────────────────────────────────────────────────────

/** Load an image from a URL or SVG text. Null if it can't be loaded. */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.decoding = "async"
    if (/^https?:/.test(src)) img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** An SVG file made safe to draw: browsers need its width and height set. */
export function sizedSvg(text: string, w: number, h: number): string {
  return text.replace(/<svg\b([^>]*)>/, (_m, attrs: string) =>
    `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} width="${w}" height="${h}" preserveAspectRatio="none">`)
}

export const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

export interface CardSources { banner: string | null; bannerWash?: string | null; picture: string | null; pins: string[] }

/** The finished card as a canvas. Images that can't load are left out. */
export async function renderProfileCard(d: CardData, src: CardSources): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([
      document.fonts.load(`700 84px ${display}`), document.fonts.load(`800 64px ${body}`),
      document.fonts.load(`500 30px ${body}`), document.fonts.load(`600 20px ${body}`),
    ])
  } catch { /* system fonts */ }
  const [banner, picture, ...pins] = await Promise.all([src.banner ? loadImage(src.banner) : null, src.picture ? loadImage(src.picture) : null, ...src.pins.map(loadImage)])
  const canvas = document.createElement("canvas")
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("no canvas")
  drawProfileCard(ctx, d, {
    banner,
    bannerSize: banner ? { w: banner.naturalWidth || 1200, h: banner.naturalHeight || 400 } : null,
    bannerWash: src.bannerWash ?? null,
    picture: picture ? { img: picture, w: picture.naturalWidth || 300, h: picture.naturalHeight || 200 } : null,
    pins,
  })
  return canvas
}

export const canvasPng = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error("card failed"))), "image/png"))

/** Share the picture where the device can (phones), else download it.
 *  "shared", "saved" (downloaded) or "cancelled". */
export async function shareOrSave(blob: Blob, filename: string, title: string): Promise<"shared" | "saved" | "cancelled"> {
  const file = typeof File === "function" ? new File([blob], filename, { type: "image/png" }) : null
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (file && typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title })
      return "shared"
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled"
      // NotAllowedError (the tap was too long ago) and the rest: download instead.
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  return "saved"
}

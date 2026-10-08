// The nation card: one 1200×630 image (the size social sites preview) with
// the flag, the nation's name and its motto, for sharing a made-up country.
import { T } from "../ui/tokens"
import { composeFull, FLAG_W } from "./flagStudio"
import type { Design } from "./flagStudio"

export const CARD_W = 1200
export const CARD_H = 630

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("flag image failed")) }
    img.src = url
  })
}

// Break text into at most `max` lines that fit `width`, shrinking the last one with an ellipsis.
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
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
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1)
    kept[max - 1] = `${last.trimEnd()}…`
    return kept
  }
  return lines
}

export async function nationCard(baseText: string, design: Design): Promise<HTMLCanvasElement> {
  const display = "'Playfair Display', Georgia, serif"
  const body = "Inter, system-ui, sans-serif"
  try { await Promise.all([document.fonts.load(`700 60px ${display}`), document.fonts.load(`500 22px ${body}`)]) } catch { /* fall back to system fonts */ }

  const canvas = document.createElement("canvas")
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext("2d")!

  // Parchment with a faint drafting-table grid, like the studio.
  ctx.fillStyle = T.bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  ctx.strokeStyle = "rgba(31,58,60,0.06)"
  ctx.lineWidth = 1
  for (let x = 0; x <= CARD_W; x += 30) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, CARD_H); ctx.stroke() }
  for (let y = 0; y <= CARD_H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(CARD_W, y + 0.5); ctx.stroke() }

  // The flag, fitted into the left half with a soft shadow.
  const { svg, h } = composeFull(baseText, design)
  const img = await loadImage(svg)
  const boxW = 560, boxH = 420, boxX = 70, boxY = (CARD_H - boxH) / 2
  const scale = Math.min(boxW / FLAG_W, boxH / h)
  const fw = FLAG_W * scale, fh = h * scale
  const fx = boxX + (boxW - fw) / 2, fy = boxY + (boxH - fh) / 2
  ctx.save()
  ctx.shadowColor = "rgba(31,58,60,0.35)"
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 12
  ctx.fillStyle = "#fff"
  ctx.fillRect(fx, fy, fw, fh)
  ctx.restore()
  ctx.drawImage(img, fx, fy, fw, fh)

  // Name, motto and credit on the right.
  const tx = 690, tw = CARD_W - tx - 70
  ctx.fillStyle = T.muted
  ctx.font = `600 18px ${body}`
  ctx.textBaseline = "alphabetic"
  const eyebrow = "THE NATION OF"
  let y = 190
  ctx.fillText(eyebrow.split("").join(String.fromCharCode(8202)), tx, y)

  const name = design.name.trim() || "My flag"
  let size = 64
  let lines: string[] = []
  for (; size >= 40; size -= 4) {
    ctx.font = `700 ${size}px ${display}`
    lines = wrap(ctx, name, tw, 3)
    if (lines.length <= 2 || size === 40) break
  }
  ctx.fillStyle = T.text
  y += 22
  for (const l of lines) { y += size * 1.08; ctx.fillText(l, tx, y) }

  const motto = design.motto?.trim()
  if (motto) {
    ctx.font = `500 26px ${display}`
    ctx.fillStyle = T.muted
    y += 26
    for (const l of wrap(ctx, `“${motto}”`, tw, 2)) { y += 36; ctx.fillText(l, tx, y) }
  }

  ctx.fillStyle = T.chartreuse
  ctx.fillRect(tx, CARD_H - 104, 48, 3)
  ctx.fillStyle = T.muted
  ctx.font = `500 20px ${body}`
  ctx.fillText("Made in Flag Studio · globalio.app", tx, CARD_H - 70)
  return canvas
}

export const canvasBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error("card failed"))), "image/png"))

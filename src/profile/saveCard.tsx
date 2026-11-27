// Putting the card together in the browser: the banner, the picture (a flag
// file or a drawn design) and the pinned badges' icons, then share or save
// the PNG. Loaded when "Save my card" is pressed.
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { LineIcon } from "../components/icons"
import { flagSources } from "../components/FlagImage"
import { achievementById } from "../data/achievements"
import { T } from "../ui/tokens"
import { bannerSvg } from "./banners"
import { renderProfileCard, canvasPng, shareOrSave, sizedSvg, svgUri } from "./card"
import type { CardData } from "./card"

export type CardPicture = { kind: "flag"; code: string } | { kind: "design"; design: string | Record<string, unknown> } | null

/** A LineIcon as standalone SVG text (drawn once, off screen). */
function iconSvg(name: string, color: string): string {
  const div = document.createElement("div")
  const root = createRoot(div)
  flushSync(() => root.render(<LineIcon name={name} size={52} color={color} />))
  const html = div.innerHTML
  root.unmount()
  return /xmlns=/.test(html) ? html : html.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
}

/** A flag as an image the canvas can draw: our own SVG, sized, or a PNG copy. */
async function flagPicture(code: string): Promise<string | null> {
  const [own, png] = flagSources(code)
  try {
    const res = await fetch(own)
    const text = res.ok ? await res.text() : ""
    if (text.includes("<svg")) {
      const vb = text.match(/viewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number)
      const ratio = vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0 ? vb[2] / vb[3] : 1.5
      return svgUri(sizedSvg(text, 600, Math.round(600 / ratio)))
    }
  } catch { /* try the copy */ }
  return png ?? null
}

async function pictureSrc(p: CardPicture): Promise<string | null> {
  if (!p) return null
  if (p.kind === "flag") return flagPicture(p.code)
  try { return await (await import("./designs")).designImage(p.design) } catch { return null }
}

/** Make the card and share or download it. */
export async function saveProfileCard(data: CardData, banner: string, picture: CardPicture, filename: string) {
  const pins = data.pinned.map(id => achievementById(id)).filter(a => !!a).map(a => svgUri(iconSvg(a!.icon, T.gold)))
  const canvas = await renderProfileCard(data, { banner: svgUri(bannerSvg(banner)), picture: await pictureSrc(picture), pins })
  const blob = await canvasPng(canvas)
  return shareOrSave(blob, filename, `${data.name} on Globalio`)
}

export const cardFileName = (name: string) =>
  `globalio-${(name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profile").slice(0, 40)}.png`

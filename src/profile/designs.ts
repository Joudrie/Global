// Flag Studio designs on a profile: turning a saved design into the share
// code a public profile carries, and drawing a design (the player's own, or
// one from someone's public profile) as an image. Loaded only when a profile
// shows a design, because it brings Flag Studio's code with it. Read-only use
// of src/utils/flagStudio.ts: nothing here changes the studio or its saves.
import { composeFull, decodeDesign, encodeDesign, ensureEmblems, loadBase, svgDataUri } from "../utils/flagStudio"
import type { Design } from "../utils/flagStudio"

/** A saved design as its share code, without its name or motto (uploaded
 *  pictures are never in a share code; callers skip those designs anyway). */
export function encodeForProfile(d: Record<string, unknown>): string {
  return encodeDesign({ ...(d as unknown as Design), name: "", motto: undefined })
}

const cache = new Map<string, Promise<string>>()

async function draw(d: Design): Promise<string> {
  const [text] = await Promise.all([loadBase(d), ensureEmblems(d)])
  return svgDataUri(composeFull(text, d).svg)
}

/** An image (data URI) of a design given as a share code or a saved design. */
export function designImage(design: string | Record<string, unknown>): Promise<string> {
  const key = typeof design === "string" ? design : JSON.stringify(design)
  let p = cache.get(key)
  if (!p) {
    const d = typeof design === "string" ? decodeDesign(design) : (design as unknown as Design)
    p = d && typeof d.base === "string" ? draw({ ...d, parts: d.parts ?? {}, overlays: Array.isArray(d.overlays) ? d.overlays : [] }) : Promise.reject(new Error("not a design"))
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

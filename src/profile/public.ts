// What a player's public profile holds, worked out from their save. Sent to
// public.profiles when they sync (only once they have a username); other
// players read it with public.get_player(), and only while the profile is
// public. Nothing here is private: no email, no account id, no design names.
import type { Snapshot } from "../utils/mergeProgress"
import { FLAGS } from "../data/flags"
import { MAX_DESIGNS, profileOf } from "./local"
import { statsOf } from "./stats"
import type { ProfileStats } from "./stats"
import { studioDesigns } from "./save"

/** A design as the public profile carries it: Flag Studio's share code
 *  (src/utils/flagStudio.ts → encodeDesign), without its name or motto. */
export type PublicPicture = { kind: "flag"; code: string } | { kind: "design"; design: string }

export interface PublicRow {
  picture: PublicPicture | null
  banner: string
  bio: string | null
  pinned: string[]
  designs: string[]
  stats: ProfileStats
}

export const DESIGN_CODE_MAX = 8000
const CODE = /^[A-Za-z0-9_-]+$/

/** The designs a profile can offer: the newest MAX_DESIGNS saved ones. */
export function offeredDesigns(snap: Snapshot): Record<string, unknown>[] {
  return studioDesigns(snap)
    .filter(d => typeof d.id === "string")
    .sort((a, b) => (Number(b.updated) || 0) - (Number(a.updated) || 0))
    .slice(0, MAX_DESIGNS)
}

/** A design with an uploaded picture in it can't go on a public profile. */
export const hasUpload = (d: Record<string, unknown>) =>
  Array.isArray(d.overlays) && d.overlays.some(o => !!o && typeof o === "object" && (o as { kind?: unknown }).kind === "image")

/** The public row for a save. `encode` turns a design into its share code
 *  (Flag Studio's encodeDesign, passed in so this file doesn't load the studio). */
export function publicRowOf(snap: Snapshot, encode: (design: Record<string, unknown>) => string): PublicRow {
  const p = profileOf(snap)
  const offered = offeredDesigns(snap).filter(d => !hasUpload(d))
  const code = (d: Record<string, unknown>) => {
    try {
      const c = encode({ ...d, name: "", motto: undefined })
      return typeof c === "string" && CODE.test(c) && c.length <= DESIGN_CODE_MAX ? c : null
    } catch { return null }
  }
  let picture: PublicPicture | null = null
  if (p.picture?.kind === "flag") picture = p.picture
  else if (p.picture?.kind === "design") {
    const d = offered.find(x => x.id === (p.picture as { id: string }).id)
    const c = d && code(d)
    if (c) picture = { kind: "design", design: c }
  }
  const designs = p.designs.map(id => offered.find(d => d.id === id)).flatMap(d => (d ? [code(d)] : [])).filter((c): c is string => !!c)
  return { picture, banner: p.banner, bio: p.bio || null, pinned: p.pinned, designs, stats: statsOf(snap) }
}

/** A picture read from the server: kept only if it's well formed. */
export function readPicture(v: unknown): PublicPicture | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  if (o.kind === "flag" && typeof o.code === "string" && FLAGS.some(f => f.code === o.code)) return { kind: "flag", code: o.code }
  if (o.kind === "design" && typeof o.design === "string" && o.design.length <= DESIGN_CODE_MAX && CODE.test(o.design)) return { kind: "design", design: o.design }
  return null
}

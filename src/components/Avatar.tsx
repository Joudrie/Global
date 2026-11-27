import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { T } from "../ui/tokens"
import { LineIcon } from "./icons"
import FlagImage from "./FlagImage"
import type { Picture } from "../profile/local"
import type { Snapshot } from "../utils/mergeProgress"
import { studioDesigns } from "../profile/save"

/* A profile picture in a circle: a country flag, a Flag Studio design (drawn
   by src/profile/designs.ts, which loads only when a design is shown), or a
   plain person icon. */

export type AvatarSource =
  | { kind: "flag"; code: string }
  | { kind: "design"; design: string | Record<string, unknown> }
  | null

/** A saved picture as the avatar draws it (a design is looked up among the saved ones). */
export function avatarFor(p: Picture | null, snap: Snapshot): AvatarSource {
  if (!p) return null
  if (p.kind === "flag") return p
  const d = studioDesigns(snap).find(x => x.id === p.id)
  return d ? { kind: "design", design: d } : null
}

export function DesignImage({ design, style, alt = "" }: { design: string | Record<string, unknown>; style?: CSSProperties; alt?: string }) {
  const [uri, setUri] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  // A saved design arrives as a new object on every render; key it by content.
  const key = typeof design === "string" ? design : JSON.stringify(design)
  useEffect(() => {
    let live = true
    setUri(null); setFailed(false)
    const d = typeof design === "string" ? design : JSON.parse(key) as Record<string, unknown>
    import("../profile/designs").then(m => m.designImage(d)).then(u => { if (live) setUri(u) }, () => { if (live) setFailed(true) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!uri) {
    return (
      <span aria-hidden={!failed} role={failed ? "img" : undefined} aria-label={failed ? "Design couldn’t load" : undefined}
        style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", background: T.surfaceHi, color: T.dim }}>
        {failed && <LineIcon name="flagstudio" size={18} />}
      </span>
    )
  }
  return <img src={uri} alt={alt} style={style} draggable={false} />
}

export default function Avatar({ source, size, ring = 0, label }: { source: AvatarSource; size: number; ring?: number; label?: string }) {
  const fill: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" }
  return (
    <span role={label ? "img" : undefined} aria-label={label}
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: T.surfaceHi, border: `1px solid ${T.lineHi}`,
        boxShadow: ring ? `0 0 0 ${ring}px ${T.surface}` : undefined,
      }}>
      {source?.kind === "flag" && <FlagImage code={source.code} style={fill} />}
      {source?.kind === "design" && <DesignImage design={source.design} style={fill} />}
      {!source && <LineIcon name="profile" size={Math.round(size * 0.48)} color={T.muted} />}
    </span>
  )
}

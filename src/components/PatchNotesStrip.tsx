import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react"
import { CHANGELOG } from "../data/changelog"
import { REGISTRY } from "../ui/registry"
import { T } from "../ui/tokens"
import { todayString } from "../utils/prng"
import { headline, loadSeen, unseenCount, SEEN_KEY } from "../utils/patchNotes"
import { LineIcon } from "./icons"

const NAMES = REGISTRY.map(r => r.title)

/* ── What's new: one slim row at the top of Today that sums up the week's
   changes and opens the patch notes. A dot on its icon means there are entries
   the player hasn't read; it sits over the icon, so clearing it moves nothing. */
export default function PatchNotesStrip({ onOpen }: { onOpen: () => void }) {
  const [unseen, setUnseen] = useState(() => unseenCount(CHANGELOG, loadSeen()))
  // Read on another device (account sync) or in another tab.
  useEffect(() => {
    const reread = (e: StorageEvent) => { if (e.key === null || e.key === SEEN_KEY) setUnseen(unseenCount(CHANGELOG, loadSeen())) }
    window.addEventListener("storage", reread)
    return () => window.removeEventListener("storage", reread)
  }, [])

  // Two names when they fit on the line, else one ("Demonyms and 18 more")
  // rather than a name cut off mid-word. Measured before paint, so no flicker.
  const [fit, setFit] = useState(2)
  const [measure, remeasure] = useReducer((n: number) => n + 1, 0)
  const namesRef = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = namesRef.current
    if (el && fit > 1 && el.scrollWidth > el.clientWidth + 1) setFit(f => f - 1)
  }, [fit, measure])
  useEffect(() => {
    const retry = () => { setFit(2); remeasure() }
    window.addEventListener("resize", retry)
    document.fonts?.ready.then(retry).catch(() => { /* measured with the fallback font */ })
    return () => window.removeEventListener("resize", retry)
  }, [])

  if (!CHANGELOG.length) return null
  const { label, names, more } = headline(CHANGELOG, todayString(), NAMES, fit)
  return (
    <button onClick={onOpen} className="geo-row geo-note"
      aria-label={`Patch notes. ${label}: ${names}${more}.${unseen ? ` ${unseen} you haven't read.` : ""}`}
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 44, padding: "0 12px",
        borderRadius: 12, textAlign: "left", cursor: "pointer" }}>
      <span aria-hidden style={{ position: "relative", display: "flex", flexShrink: 0 }}>
        <LineIcon name="scroll" size={16} color={T.muted} />
        <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: 999,
          background: T.warm, border: `1.5px solid ${T.surface}`, opacity: unseen ? 1 : 0 }} />
      </span>
      <span aria-hidden style={{ flex: 1, minWidth: 0, display: "flex", fontSize: 12.5, lineHeight: 1.3, whiteSpace: "nowrap" }}>
        <span style={{ flexShrink: 0, fontWeight: 600, color: T.text }}>{label}:&nbsp;</span>
        <span ref={namesRef} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", color: T.muted }}>{names}</span>
        {more && <span style={{ flexShrink: 0, color: T.muted, whiteSpace: "pre" }}>{more}</span>}
      </span>
      <LineIcon name="chevronright" size={16} color={T.dim} />
    </button>
  )
}

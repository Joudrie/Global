import { useState, useRef, useEffect } from "react"
import { FLAGS } from "../data/flags"
import { SUB_FLAGS } from "../data/subdivisions"
import { HISTORICAL_FLAGS } from "../data/historicalFlags"
import { IDENTITY_FLAGS } from "../data/identityFlags"
import { CODEX } from "../data/codex"
import { T, tint } from "../ui/tokens"
import { ChevronLeftIcon } from "./icons"

interface Props { onBack: () => void }

// Nazi swastika is not celebrated here; .gif flags are skipped (heavy/animated).
const EXCLUDE = (url: string) => url.includes("German_Reich") || /\.gif(\?|$)/i.test(url)

function gatherFlagUrls(): string[] {
  const urls = new Set<string>()
  FLAGS.forEach(f => urls.add(f.flagUrl))
  SUB_FLAGS.forEach(s => urls.add(s.flagUrl))
  HISTORICAL_FLAGS.forEach(h => urls.add(h.flagUrl))
  IDENTITY_FLAGS.forEach(i => urls.add(i.flagUrl))
  Object.values(CODEX).forEach(entry => {
    entry.flagHistory.forEach(hf => {
      urls.add(hf.flagUrl)
      hf.parallel?.forEach(p => urls.add(p.flagUrl))
    })
  })
  return [...urls].filter(u => !EXCLUDE(u)).sort(() => Math.random() - 0.5)
}

// The wall renders thousands of ~60px tiles; full-size Wikimedia files (some
// coat-of-arms SVGs are megabytes) flooded the network and stalled loading.
// FilePath supports ?width= for a small raster render — same image, ~50x
// lighter. Self-hosted /flags/ SVGs are already tiny and stay untouched.
const thumb = (u: string) =>
  u.includes("Special:FilePath") && !u.includes("?") ? `${u}?width=240` : u

const GAP = 3
const PAD = 6
const MIN_TILE = 56
const BUFFER_ROWS = 4
const MAX_W = 720
const colWidth = () => Math.min(window.innerWidth, MAX_W)

export default function MegaCodexScreen({ onBack }: Props) {
  const [urls] = useState(gatherFlagUrls)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  // The wall sits in a column capped at MAX_W, so size the grid to that column,
  // not the window (on desktop the row maths overshot and left blank gaps).
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? colWidth() : 390))
  const [vh, setVh] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 800))
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const onResize = () => { setVw(colWidth()); setVh(window.innerHeight) }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Uniform grid geometry
  const cols = Math.max(2, Math.floor((vw - PAD * 2 + GAP) / (MIN_TILE + GAP)))
  const tileW = (vw - PAD * 2 - GAP * (cols - 1)) / cols
  const rowH = tileW * (2 / 3) + GAP
  const totalRows = Math.ceil(urls.length / cols)
  const totalHeight = totalRows * rowH + PAD * 2

  const startRow = Math.max(0, Math.floor(scrollTop / rowH) - BUFFER_ROWS)
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + vh) / rowH) + BUFFER_ROWS)
  const startIdx = startRow * cols
  const endIdx = Math.min(urls.length, endRow * cols)
  const visible = urls.slice(startIdx, endIdx)

  const onScroll = () => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop)
    })
  }

  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: MAX_W, margin: "0 auto", background: T.void, color: T.text, zIndex: 1 }}>
      <button onClick={onBack} aria-label="Back" className="geo-tap"
        style={{
          position: "fixed", top: 12, left: 12, zIndex: 50,
          width: 44, height: 44, borderRadius: 999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: tint(T.surface, 0.85), color: T.muted,
          border: `1px solid ${T.line}`, backdropFilter: "blur(6px)", cursor: "pointer",
        }}>
        <ChevronLeftIcon size={22} color={T.muted} strokeWidth={1.8} />
      </button>

      <div ref={scrollRef} onScroll={onScroll}
        style={{ position: "absolute", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {/* Full-height spacer so the scrollbar represents the whole wall */}
        <div style={{ height: totalHeight, position: "relative" }}>
          {/* Only the visible rows are mounted */}
          <div style={{
            position: "absolute", left: PAD, right: PAD, top: PAD + startRow * rowH,
            display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP,
          }}>
            {visible.map((u, k) => (
              <img
                key={startIdx + k}
                src={thumb(u)}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ width: "100%", aspectRatio: "3 / 2", objectFit: "cover", borderRadius: 3, display: "block", background: T.surface }}
                onError={e => {
                  const el = e.target as HTMLImageElement
                  const t = Number(el.dataset.t || "0")
                  if (t < 2) {
                    el.dataset.t = String(t + 1)
                    el.removeAttribute("src")
                    // first retry the thumb, then fall back to the original file
                    window.setTimeout(() => { el.src = t === 0 ? thumb(u) : u }, 500 + t * 800 + Math.random() * 600)
                  } else {
                    el.style.visibility = "hidden"
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

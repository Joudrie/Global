import { useState, useRef } from "react"
import type { ReactNode, CSSProperties } from "react"
import { Compass, BookOpen } from "lucide-react"
import { T, ACCENT, tint, FONT } from "../ui/tokens"
import EarthLogo from "./EarthLogo"
import FlagImage from "./FlagImage"

export const ONBOARDED_KEY = "globalio_onboarded"

// Crawlers (Google, AdSense's reviewer) see the page itself, not the first-run
// intro slides laid over it.
const BOT_UA = /bot|crawl|spider|slurp|Mediapartners|AdsBot|Google-InspectionTool|Lighthouse/i

export function hasOnboarded(): boolean {
  if (typeof navigator !== "undefined" && BOT_UA.test(navigator.userAgent)) return true
  try { return localStorage.getItem(ONBOARDED_KEY) === "1" } catch { return true }
}
function markOnboarded() {
  try { localStorage.setItem(ONBOARDED_KEY, "1") } catch { /* ignore */ }
}

// Two visually-distinct "vanity" flags flank the Codex slide — the Estelada
// Blava (Catalan independence) and the Kanaka Maoli (Native Hawaiian) flag.
// Our self-hosted copies (what fp() resolves Estelada_blava.svg and
// Kanaka_Maoli_flag.svg to), written out so no flag table is pulled into the
// first-run path. scripts/bundle.test.mjs checks they match fp().
const ESTELADA = "/flags/wm/estelada-blava.svg"
const KANAKA = "/cf/cd525d0600b2308d.svg"

const FLANK: CSSProperties = {
  width: 36, height: 24, objectFit: "cover", borderRadius: 4,
  border: `1px solid ${tint(T.text, 0.18)}`, boxShadow: `0 5px 12px -7px ${tint(T.text, 0.55)}`,
}

type Slide = { center: ReactNode; left?: ReactNode; right?: ReactNode; title: string; body: string }

const SLIDES: Slide[] = [
  {
    center: <EarthLogo size={92} />,
    left: <FlagImage code="br" style={FLANK} />,
    right: <FlagImage code="vu" style={FLANK} />,
    title: "Welcome to Globalio",
    body: "Learn every flag in the world through 50+ quick games — and a flag codex that doubles as a real reference tool.",
  },
  {
    center: <Compass size={62} strokeWidth={1.5} color={ACCENT.codex} absoluteStrokeWidth />,
    title: "A new challenge daily",
    body: "Daily quizzes and Flagle-style puzzles. Build a streak, beat your best, and share your score with one tap.",
  },
  {
    center: <BookOpen size={58} strokeWidth={1.5} color={ACCENT.codex} absoluteStrokeWidth />,
    left: <img src={ESTELADA} alt="" style={FLANK} />,
    right: <img src={KANAKA} alt="" style={FLANK} />,
    title: "Explore the Codex",
    body: "Search 4,500+ flags — countries, historical states, regions, peoples and more. Tap any flag to learn its story.",
  },
]

// Lightweight first-run intro. Rendered above the app on first launch; skippable
// instantly, and dismissing (Skip or Start) sets the onboarded flag for good.
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const finish = () => { markOnboarded(); onDone() }
  const next = () => { if (last) finish(); else setI(i + 1) }
  const prev = () => setI(p => Math.max(0, p - 1))
  const s = SLIDES[i]

  // Swipe to advance / go back — threshold-based so taps on Skip/Next still
  // register. Swipe left = next, swipe right = previous.
  const touchX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 45) return
    if (dx < 0) next(); else prev()
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: tint(T.bg, 0.97),
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0, touchAction: "pan-y" }}>
        <button onClick={finish} aria-label="Skip"
          style={{ position: "absolute", top: 16, right: 18, background: "transparent", border: "none", color: T.muted, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Skip
        </button>

        <div key={i} className="carto-onb-slide" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, minHeight: 92, marginBottom: 22 }}>
            {s.left && <div style={{ transform: "rotate(-8deg)" }}>{s.left}</div>}
            <div style={{ lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.center}</div>
            {s.right && <div style={{ transform: "rotate(8deg)" }}>{s.right}</div>}
          </div>
          <h1 className="geo-display" style={{ color: T.text, fontWeight: 800, fontSize: 26, margin: 0, marginBottom: 12, fontFamily: FONT.display }}>{s.title}</h1>
          <p style={{ color: T.muted, fontSize: 15, lineHeight: 1.55, margin: 0, marginBottom: 28 }}>{s.body}</p>
        </div>
        <style>{`.carto-onb-slide{animation:onbSlide .28s ease}@keyframes onbSlide{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}@media (prefers-reduced-motion:reduce){.carto-onb-slide{animation:none}}`}</style>

        {/* progress dots */}
        <div style={{ display: "flex", gap: 7, marginBottom: 26 }}>
          {SLIDES.map((_, k) => (
            <span key={k} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 999,
              background: k === i ? ACCENT.codex : tint(T.muted, 0.4), transition: "width 0.2s ease" }} />
          ))}
        </div>

        <button onClick={next}
          className="active:scale-95"
          style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
            background: ACCENT.codex, color: T.onAccent, fontWeight: 800, fontSize: 15, transition: "transform 0.1s ease" }}>
          {last ? "Start playing" : "Next"}
        </button>
      </div>
    </div>
  )
}

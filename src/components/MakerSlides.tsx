import { useEffect } from "react"
import { Crown } from "lucide-react"

// Hero-carousel slides for Sean's other projects. Each one deliberately wears
// its own app's look (not Globalio's), so it reads as "something else to try".
// Their webfonts load only when the home carousel mounts.

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IM+Fell+English&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap"

function useMakerFonts() {
  useEffect(() => {
    if (document.querySelector(`link[data-maker-fonts]`)) return
    const l = document.createElement("link")
    l.rel = "stylesheet"; l.href = FONT_HREF; l.setAttribute("data-maker-fonts", "")
    document.head.appendChild(l)
  }, [])
}

const stop = (e: React.PointerEvent) => e.stopPropagation()

/* ── WordUp: pop art. White paper, 2.5px ink outlines, hard offset shadows. ── */
const WU = { ink: "#16161d", paper: "#ffffff", brand: "#6c3ce1", yellow: "#ffd23f", pink: "#ffb3c7", coral: "#ff6b4a", font: "'Bricolage Grotesque', system-ui, sans-serif" }

export function WordUpSlide() {
  useMakerFonts()
  const sticker = (bg: string, rotate: number) => ({
    display: "inline-block", padding: "4px 10px", background: bg, color: WU.ink,
    border: `2.5px solid ${WU.ink}`, boxShadow: `3px 3px 0 ${WU.ink}`, borderRadius: 8,
    fontFamily: WU.font, fontWeight: 800, fontSize: 13, transform: `rotate(${rotate}deg)`,
  }) as const
  return (
    <div style={{ height: "100%", borderRadius: 16, overflow: "hidden", background: WU.yellow, padding: 10 }}>
      <div style={{ height: "100%", background: WU.paper, border: `2.5px solid ${WU.ink}`, boxShadow: `5px 5px 0 ${WU.ink}`, borderRadius: 12,
        padding: "14px 16px", display: "flex", flexDirection: "column", fontFamily: WU.font, color: WU.ink }}>
        <div style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Also by the maker of Globalio</div>
        <div style={{ fontWeight: 800, fontSize: 38, lineHeight: 1, marginTop: 6, letterSpacing: "-0.03em" }}>
          Word<span style={{ color: WU.brand }}>Up</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35, marginTop: 6 }}>
          Type any word. See where it came from.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span style={sticker(WU.pink, -3)}>nausea</span>
          <span style={{ ...sticker(WU.paper, 2), fontWeight: 600 }}>Greek for "ship"</span>
        </div>
        <a href="https://joudrie.github.io/WordUp/" target="_blank" rel="noopener" onPointerDown={stop}
          style={{ marginTop: "auto", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", minHeight: 44,
            background: WU.brand, color: "#fff", border: `2.5px solid ${WU.ink}`, boxShadow: `4px 4px 0 ${WU.ink}`, borderRadius: 10,
            fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
          Try WordUp <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  )
}

/* ── Crown & Succession: parchment, old-print serif, crimson crown badge. ── */
const CS = { paper: "#f1ece2", card: "#faf7f1", ink: "#231f1a", muted: "#6b6256", crimson: "#8a1c2b", rule: "#ddd4c4",
  head: "'IM Fell English', 'Iowan Old Style', Georgia, serif", body: "'Source Serif 4', 'Iowan Old Style', Georgia, serif" }

export function ReignSlide() {
  useMakerFonts()
  return (
    <div style={{ height: "100%", borderRadius: 16, overflow: "hidden", background: CS.paper, padding: 10 }}>
      <div style={{ height: "100%", background: CS.card, borderRadius: 14, border: `1px solid ${CS.rule}`, padding: "14px 16px",
        display: "flex", flexDirection: "column", color: CS.ink }}>
        <div style={{ fontFamily: CS.body, fontWeight: 600, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: CS.crimson, marginBottom: 8 }}>Also by the maker of Globalio</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 9, background: CS.crimson, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Crown size={24} color="#e8c46a" strokeWidth={1.8} aria-hidden />
          </span>
          <div style={{ fontFamily: CS.head, fontSize: 26, lineHeight: 1.05 }}>Crown &amp; Succession</div>
        </div>
        <div style={{ fontFamily: CS.body, fontSize: 14, lineHeight: 1.45, color: CS.muted, marginTop: 10 }}>
          Every ruler of 48 countries and empires, from the first pharaohs to today, one card at a time.
        </div>
        <a href="https://joudrie.github.io/reign/" target="_blank" rel="noopener" onPointerDown={stop}
          style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44, padding: "10px 16px",
            background: CS.ink, color: "#fff", borderRadius: 10, boxShadow: `0 0 0 2px ${CS.card}, 0 0 0 3px ${CS.crimson}`,
            fontFamily: CS.body, fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
          Start reading <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  )
}

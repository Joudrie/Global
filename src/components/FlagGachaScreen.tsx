import { useState, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { todayString } from "../utils/prng"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"
import { LineIcon } from "./icons"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void }

// ── rarity ──────────────────────────────────────────────────────────────────
const LEGENDARY = new Set(["NR", "TV", "KI", "FM", "MH", "PW", "ST", "KM", "VU", "SB", "TO", "WS", "DM", "KN", "VC", "AG", "LC", "GD", "SC", "MV", "BT", "SM", "AD", "MC", "LI", "BN"])
function rarity(code: string): "legendary" | "rare" | "common" {
  if (LEGENDARY.has(code)) return "legendary"
  // deterministic ~28% "rare"
  let h = 0; for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 100 < 28 ? "rare" : "common"
}
// Palette tokens only: ochre, sky and ink-grey.
const RARITY_COLOR = { legendary: T.gold, rare: T.cyan, common: T.muted }
const RARITY_LABEL = { legendary: "Legendary", rare: "Rare", common: "Common" }

// Continent grouping for the collection view (completionist sort).
const REGION_ORDER = ["Africa", "Americas", "Asia", "Europe", "Middle East", "Oceania"]
const byContinent = (() => {
  const map = new Map<string, FlagRecord[]>()
  for (const f of FLAGS) { const k = f.region ?? "Other"; (map.get(k) ?? map.set(k, []).get(k)!).push(f) }
  const keys = [...map.keys()].sort((a, b) => {
    const ia = REGION_ORDER.indexOf(a), ib = REGION_ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  return keys.map(k => ({ region: k, flags: [...map.get(k)!].sort((a, b) => a.name.localeCompare(b.name)) }))
})()

// ── persistence ──────────────────────────────────────────────────────────────
const KEY = "globalio_gacha"
interface Save { collected: string[]; xp: number; tokens: number; lastDaily: string; seeded?: boolean }
function load(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    const s: Save = raw ? JSON.parse(raw) : { collected: [], xp: 0, tokens: 0, lastDaily: "", seeded: true }
    // Exactly one free pull per day — it does not stockpile.
    if (s.lastDaily !== todayString()) { s.tokens = 1; s.lastDaily = todayString(); s.seeded = true }
    return s
  } catch { return { collected: [], xp: 0, tokens: 1, lastDaily: todayString(), seeded: true } }
}
function persist(s: Save) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ } }

export default function FlagGachaScreen({ onBack }: Props) {
  const [save, setSave] = useState<Save>(load)
  const [reveal, setReveal] = useState<null | { flag: FlagRecord; dupe: boolean }>(null)
  // Open on the pull when today's pull is waiting; otherwise straight into the
  // collection, so "Gacha Collection" is one tap to the grid. New players (no
  // pulls yet) start on pulls.
  const [browse, setBrowse] = useState(() => save.collected.length > 0 && save.tokens <= 0)
  const collected = useMemo(() => new Set(save.collected), [save.collected])

  const pull = () => {
    if (save.tokens <= 0) return
    const flag = FLAGS[Math.floor(Math.random() * FLAGS.length)]
    const dupe = collected.has(flag.code)
    const next: Save = {
      ...save,
      tokens: save.tokens - 1,
      xp: save.xp + (dupe ? 15 : 25),
      collected: dupe ? save.collected : [...save.collected, flag.code],
    }
    setSave(next); persist(next); setReveal({ flag, dupe })
  }

  const pct = Math.round((save.collected.length / FLAGS.length) * 100)

  // ── reveal card ──
  if (reveal) {
    const r = rarity(reveal.flag.code)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
        <ScreenHeader title="Flag Gacha" subtitle="Your pull" onBack={onBack}
          right={<HeaderStat accent={ACCENT.codex}>{save.xp} XP</HeaderStat>} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <ResultHeader icon="gift" accent={RARITY_COLOR[r]}
            eyebrow={`${RARITY_LABEL[r]} · ${reveal.dupe ? "Duplicate" : "New"}`}
            title={reveal.flag.name}
            score={reveal.dupe ? "+15 XP (already collected)" : `${save.collected.length} of ${FLAGS.length} collected`} />
          <div className="carto-rise" style={{ width: 260, borderRadius: 16, overflow: "hidden", border: `2px solid ${RARITY_COLOR[r]}`, background: T.surface }}>
            <div style={{ height: 168 }}><FlagImage code={reveal.flag.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
            <div style={{ padding: "12px 16px", color: T.muted, fontSize: 12, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{reveal.flag.funFact}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
            {save.tokens > 0
              ? <PrimaryButton onClick={pull} accent={ACCENT.codex}>Pull again ({save.tokens})</PrimaryButton>
              : <PrimaryButton onClick={() => setReveal(null)} accent={ACCENT.codex}>Done</PrimaryButton>}
            <SecondaryButton onClick={() => { setReveal(null); setBrowse(true) }}>Collection</SecondaryButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Flag Gacha" subtitle="One free pull a day" onBack={onBack}
        right={<HeaderStat accent={ACCENT.codex}>{save.xp} XP</HeaderStat>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 18px 24px", gap: 16 }}>
        {/* progress */}
        <div style={{ borderRadius: 14, padding: 16, background: T.surface, border: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="geo-display" style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Collection</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 13, color: ACCENT.codex }}>{save.collected.length}<span style={{ color: T.dim }}>/{FLAGS.length}</span></span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: tint(ACCENT.codex, 0.12), marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: ACCENT.codex, transition: "width 0.5s" }} />
          </div>
        </div>

        {!browse ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
            <div style={{ width: 128, height: 128, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: tint(ACCENT.codex, 0.1), border: `2px dashed ${tint(ACCENT.codex, 0.4)}` }}><LineIcon name="gift" size={48} color={ACCENT.codex} /></div>
            {save.tokens > 0 ? (
              <>
                <PrimaryButton onClick={pull} accent={ACCENT.codex} style={{ maxWidth: 280 }}>Pull a flag</PrimaryButton>
                <div className="geo-mono" style={{ fontSize: 11, color: T.muted }}>{save.tokens} pull{save.tokens === 1 ? "" : "s"} available</div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div className="geo-display" style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Out of pulls</div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>Come back tomorrow for a free pull.</div>
              </div>
            )}
            <SecondaryButton onClick={() => setBrowse(true)} style={{ maxWidth: 280 }}>View collection →</SecondaryButton>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <button onClick={() => setBrowse(false)} className="geo-micro geo-tap" style={{ color: T.muted, background: "transparent", marginBottom: 12, minHeight: 44, fontSize: 12 }}>← Back to pulls</button>
            {byContinent.map(group => {
              const haveCount = group.flags.filter(f => collected.has(f.code)).length
              return (
                <div key={group.region} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                    <span className="geo-display" style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{group.region}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.dim }}>{haveCount}/{group.flags.length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(56px,1fr))", gap: 8 }}>
                    {group.flags.map(f => {
                      const have = collected.has(f.code)
                      const r = rarity(f.code)
                      return (
                        <div key={f.code} title={have ? f.name : "???"} role="img" aria-label={have ? f.name : "Not collected yet"} style={{ aspectRatio: "3/2", borderRadius: 6, overflow: "hidden", border: `1px solid ${have ? tint(RARITY_COLOR[r], 0.7) : T.line}`, background: have ? "#fff" : tint(T.muted, 0.08), position: "relative" }}>
                          {have
                            ? <FlagImage code={f.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 14 }}>?</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

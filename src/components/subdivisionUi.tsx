import type { ReactNode } from "react"
import { Check, ChevronRight, Globe2, X } from "lucide-react"
import type { SubFlag } from "../data/subdivisions"
import { NAMEABLE_FLAGS, PICK_CONTINENTS } from "../utils/subdivisionQuiz"
import type { Pool } from "../utils/subdivisionQuiz"
import { T, FONT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"

/* Pieces shared by Province Roulette and Subdivision Stumper: the picker for
   where the flags come from, the flag frame, the four (or eight) answer
   buttons and the end-of-game review list. */

// Hover and focus only change colour; nothing moves (and nothing animates
// under reduced motion).
export const SUB_STYLES = `
  .sp-tap { transition: border-color 150ms ease-out, background-color 150ms ease-out; }
  .sp-tap:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
  @media (hover: hover) {
    .sp-tap:not(:disabled):not([aria-checked="true"]):hover { border-color: ${T.lineHi}; background: ${T.surfaceHi}; }
  }
  @media (prefers-reduced-motion: reduce) { .sp-tap { transition: none; } }
`

// Storage can be missing or throw (private windows); the games work without it.
export const readJson = <V,>(key: string, fallback: V): V => {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback } catch { return fallback }
}
export const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* not saved */ }
}
/** { key: best } with anything that isn't a number dropped. */
export const readBests = (key: string): Record<string, number> => {
  const raw = readJson<Record<string, unknown>>(key, {})
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "number" && Number.isFinite(v))) as Record<string, number>
}

export const Micro = ({ id, children }: { id?: string; children: ReactNode }) => (
  <div id={id} className="geo-micro" style={{ fontSize: 11, color: T.muted }}>{children}</div>
)

/* ── Where the flags come from: a continent chip, then the whole continent or
   one of its countries. Tapping a row starts the game. ───────────────────── */
export function PoolPicker({ label, allowWorld, region, onRegion, onPick, bestFor, accent }: {
  label: string
  allowWorld: boolean
  region: string
  onRegion: (id: string) => void
  onPick: (pool: Pool) => void
  bestFor: (pool: Pool) => string | null
  accent: string
}) {
  const regions = [...(allowWorld ? [{ id: "world", name: "World" }] : []), ...PICK_CONTINENTS.map(c => ({ id: c.id, name: c.name }))]
  const cont = PICK_CONTINENTS.find(c => c.id === region)
  const showWorld = allowWorld && region === "world"
  const open = showWorld || !cont ? null : cont

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Micro id="sp-region">{label}</Micro>
      <div role="radiogroup" aria-labelledby="sp-region" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {regions.map(r => {
          const on = r.id === region
          return (
            <button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => onRegion(r.id)}
              className="sp-tap"
              style={{ height: 36, padding: "0 12px", borderRadius: 999, fontSize: 14, fontWeight: on ? 700 : 600, cursor: "pointer",
                background: on ? tint(accent, 0.12) : T.surface, color: on ? T.text : T.muted,
                border: `1px solid ${on ? accent : T.line}` }}>
              {r.name}
            </button>
          )
        })}
      </div>

      {showWorld && (
        <PoolRow title="The whole world" sub={`Every continent · ${NAMEABLE_FLAGS.length.toLocaleString("en")} flags`}
          best={bestFor({ kind: "world" })} accent={accent} onClick={() => onPick({ kind: "world" })} />
      )}
      {open && (
        <>
          {open.wholeContinent && (
            <PoolRow title={`All of ${open.name}`} sub={`${open.countries.length} countries · ${open.total.toLocaleString("en")} flags`}
              best={bestFor({ kind: "continent", id: open.id, name: open.name })} accent={accent}
              onClick={() => onPick({ kind: "continent", id: open.id, name: open.name })} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {open.countries.map(c => {
              const pool: Pool = { kind: "country", code: c.code, name: c.name, continentId: c.continentId }
              const best = bestFor(pool)
              return (
                <button key={c.code} type="button" onClick={() => onPick(pool)} className="sp-tap"
                  style={{ minHeight: 56, padding: "8px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 8, minWidth: 0,
                    background: T.surface, border: `1px solid ${T.line}`, color: T.text }}>
                  <FlagImage code={c.code} style={{ width: 28, height: 19, objectFit: "cover", borderRadius: 4, border: `1px solid ${T.line}`, flexShrink: 0 }} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, overflowWrap: "anywhere" }}>{c.name}</span>
                    <span className="geo-mono" style={{ fontSize: 12, color: T.muted }}>{c.total} flags{best ? ` · ${best}` : ""}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

function PoolRow({ title, sub, best, accent, onClick }:
  { title: string; sub: string; best: string | null; accent: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="sp-tap"
      style={{ minHeight: 64, padding: "12px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
        display: "flex", alignItems: "center", gap: 12, background: T.surface, border: `1px solid ${tint(accent, 0.5)}`, color: T.text }}>
      <Globe2 size={20} strokeWidth={1.6} color={accent} absoluteStrokeWidth aria-hidden style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="geo-display" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{title}</span>
        <span style={{ fontSize: 13, color: T.muted }}>{sub}</span>
      </span>
      {best && <span className="geo-mono" style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{best}</span>}
      <ChevronRight size={18} strokeWidth={1.8} color={T.muted} aria-hidden style={{ flexShrink: 0 }} />
    </button>
  )
}

/* ── The flag being asked about. ─────────────────────────────────────────── */
export function FlagFrame({ flag, accent, onLoad, onError }:
  { flag: SubFlag; accent: string; onLoad: () => void; onError: () => void }) {
  return (
    <div style={{ width: 280, maxWidth: "100%", height: 186, borderRadius: 14, overflow: "hidden", border: `2px solid ${tint(accent, 0.3)}`, boxShadow: `0 6px 18px -10px ${tint(T.text, 0.5)}`, background: T.surfaceHi }}>
      <img key={flag.code} src={flag.flagUrl} alt="subdivision flag"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 8 }}
        onLoad={onLoad} onError={onError} />
    </div>
  )
}

/** "🇺🇸 Oregon — United States", under the flag once it's answered. */
export function Reveal({ flag }: { flag: SubFlag }) {
  return (
    <div className="w-full max-w-sm" style={{ padding: "8px 16px", borderRadius: 12, fontSize: 14, textAlign: "center", background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>
      {flag.countryEmoji} <span style={{ color: T.text, fontWeight: 700 }}>{flag.name}</span> — {flag.countryName}
    </div>
  )
}

/* ── Answer buttons: one column of four, or two columns for the continents. */
export function Choices({ choices, answer, picked, onPick, columns = 1 }:
  { choices: string[]; answer: string; picked: string | null; onPick: (c: string) => void; columns?: 1 | 2 }) {
  const answered = picked !== null
  return (
    <div className="w-full max-w-sm" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8 }}>
      {choices.map(c => {
        const isAnswer = c === answer
        const isChosen = picked === c
        const color = answered && isAnswer ? T.green : answered && isChosen ? T.danger : null
        return (
          <button key={c} type="button" onClick={() => onPick(c)} disabled={answered}
            className="sp-tap"
            style={{ minHeight: 48, padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600, textAlign: "left",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: answered ? "default" : "pointer",
              background: color ? tint(color, 0.1) : T.surface, border: `2px solid ${color ?? T.line}`, color: T.text }}>
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{c}</span>
            {color && (isAnswer
              ? <Check size={16} strokeWidth={2.4} color={T.green} aria-label="right answer" style={{ flexShrink: 0 }} />
              : <X size={16} strokeWidth={2.4} color={T.danger} aria-label="your answer" style={{ flexShrink: 0 }} />)}
          </button>
        )
      })}
    </div>
  )
}

/* ── After a game: every flag that came up, with how each step went. ────── */
export function Review({ title, items }: { title: string; items: { flag: SubFlag; marks: { label: string; ok: boolean }[] }[] }) {
  if (!items.length) return null
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Micro>{title}</Micro>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(({ flag, marks }, i) => (
          <li key={`${flag.code}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}` }}>
            <img src={flag.flagUrl} alt="" loading="lazy"
              style={{ width: 48, height: 32, objectFit: "contain", flexShrink: 0, borderRadius: 4, background: T.surfaceHi }}
              onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, overflowWrap: "anywhere" }}>{flag.name}</span>
              <span style={{ fontSize: 12, color: T.muted }}>{flag.countryName} · {flag.continent}</span>
            </span>
            <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {marks.map(m => (
                <span key={m.label} title={`${m.label}: ${m.ok ? "right" : "wrong"}`}
                  style={{ width: 20, height: 20, borderRadius: 6, display: "grid", placeItems: "center", background: tint(m.ok ? T.green : T.danger, 0.13), border: `1px solid ${tint(m.ok ? T.green : T.danger, 0.4)}` }}>
                  {m.ok
                    ? <Check size={12} strokeWidth={2.6} color={T.green} aria-label={`${m.label} right`} />
                    : <X size={12} strokeWidth={2.6} color={T.danger} aria-label={`${m.label} wrong`} />}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ── A segmented switch (Stumper's two modes). ───────────────────────────── */
export function Segmented<V extends string>({ labelId, options, value, onChange }:
  { labelId: string; options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: T.surfaceHi, border: `1px solid ${T.line}` }}>
      {options.map(o => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} className="sp-tap"
            style={{ flex: 1, height: 40, borderRadius: 8, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT.display,
              background: on ? T.surface : "transparent", color: on ? T.text : T.muted,
              boxShadow: on ? `0 1px 4px -2px ${tint(T.text, 0.5)}` : "none" }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

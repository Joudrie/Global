import { useMemo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import {
  Ban, Bird, ChevronDown, CircleHelp, Circle, Crown, Landmark, Leaf, Map as MapIcon, Moon, Plus, RotateCcw,
  Rows3, Shield, Star, Sun, Sword, Triangle, Type, Check,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { FLAGS } from "../data/flags"
import { IDENTIFY_FLAGS } from "../data/flagIdentify"
import {
  LAYOUTS, COLOURS, DETAILS, IDENTIFY_CATEGORIES, CLOSE, NO_ANSWERS, hasAnswers, rankFlags,
} from "../utils/flagIdentify"
import type { Answers, ColourId, DetailId, LayoutId, Match } from "../utils/flagIdentify"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LayoutIcon } from "./LayoutIcon"
import FlagImage from "./FlagImage"

/* Flag Identifier — someone saw a flag (on the drive, on TV) and can't look
   it up, so they rebuild it from memory: its shape, its colours, then any
   other details. The list ranks every flag by how well it fits (one
   misremembered colour never hides the answer) and is one tap away at every
   step. A tool, not a game: nothing is scored. Data: data/flagIdentify.ts;
   ranking: utils/flagIdentify.ts. */

const ACC = ACCENT.play
const PAGE = 30   // results shown before "Show more"

type Step = 0 | 1 | 2 | 3
const STEPS = ["Shape", "Colours", "Details", "Matches"] as const

const DETAIL_ICON: Record<DetailId, LucideIcon> = {
  star: Star, crescent: Moon, sun: Sun, cross: Plus, emblem: Shield, crown: Crown, animal: Bird,
  plant: Leaf, weapon: Sword, building: Landmark, writing: Type, map: MapIcon, circle: Circle,
  triangle: Triangle, manystripes: Rows3,
}

const NAME = new Map(FLAGS.map(f => [f.code, f]))

// Motion: colour and border only, and only after a tap; none under reduced motion.
const STYLES = `
  .fi-tap { transition: background-color 160ms ease-out, border-color 160ms ease-out, color 160ms ease-out; }
  .fi-tap:focus-visible, .fi-link:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
  @media (hover: hover) {
    .fi-opt:not([aria-pressed="true"]):hover, .fi-row:hover, .fi-ghost:hover { border-color: ${T.lineHi}; background: ${T.surfaceHi}; }
    .fi-link:hover { color: ${T.text}; }
  }
  @media (prefers-reduced-motion: reduce) { .fi-tap { transition: none; } }
`

interface State extends Answers { unsure: [boolean, boolean, boolean] }
const START: State = { ...NO_ANSWERS, unsure: [false, false, false] }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default function FlagIdentifierScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>(0)
  const [s, setS] = useState<State>(START)
  const [open, setOpen] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)

  const ranked = useMemo(() => rankFlags(IDENTIFY_FLAGS, s), [s])
  const exact = ranked.filter(m => m.diff === 0)
  const close = ranked.filter(m => m.diff > 0 && m.diff <= CLOSE)
  const answered = hasAnswers(s)

  const go = (n: Step) => { setStep(n); setLimit(PAGE); setOpen(null); window.scrollTo(0, 0) }
  const reset = () => { setS(START); go(0) }
  const unsure = (i: 0 | 1 | 2, v: boolean): State["unsure"] => s.unsure.map((u, j) => j === i ? v : u) as State["unsure"]

  const toggleLayout = (id: LayoutId) => setS({ ...s, layouts: s.layouts.includes(id) ? s.layouts.filter(x => x !== id) : [...s.layouts, id], unsure: unsure(0, false) })
  const toggleColour = (id: ColourId) => setS({ ...s, colors: s.colors.includes(id) ? s.colors.filter(x => x !== id) : [...s.colors, id], unsure: unsure(1, false) })
  const toggleDetail = (id: DetailId) => setS({ ...s, details: s.details.includes(id) ? s.details.filter(x => x !== id) : [...s.details, id], noDetails: false, unsure: unsure(2, false) })
  const setNone = () => setS({ ...s, details: [], noDetails: !s.noDetails, unsure: unsure(2, false) })
  const setUnsure = (i: 0 | 1 | 2) => {
    const on = !s.unsure[i]
    if (i === 0) setS({ ...s, layouts: [], unsure: unsure(0, on) })
    else if (i === 1) setS({ ...s, colors: [], unsure: unsure(1, on) })
    else setS({ ...s, details: [], noDetails: false, unsure: unsure(2, on) })
  }

  const stepDone = [s.layouts.length > 0 || s.unsure[0], s.colors.length > 0 || s.unsure[1], s.details.length > 0 || s.noDetails || s.unsure[2]]
  const countLine = !answered
    ? `All ${FLAGS.length} flags fit so far`
    : exact.length ? `Fits ${plural(exact.length, "flag")}` : "No flag fits everything"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <style>{STYLES}</style>
      <ScreenHeader title="Flag Identifier" subtitle="Describe a flag, find it" onBack={onBack} />

      <div className="w-full max-w-md mx-auto" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 16px" }}>
        {/* Steps: tap any one to change that answer, in any order. */}
        <nav aria-label="Steps" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 4, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}` }}>
          {STEPS.map((label, i) => {
            const on = step === i
            const done = i < 3 && stepDone[i]
            return (
              <button key={label} onClick={() => go(i as Step)} className="fi-tap" aria-current={on ? "step" : undefined}
                style={{
                  minHeight: 44, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  fontSize: 13, fontWeight: on ? 700 : 600, color: on ? T.onAccent : done ? T.text : T.muted,
                  background: on ? ACC : "transparent", border: "none", cursor: "pointer", padding: "0 4px",
                }}>
                {done && !on && <Check size={13} strokeWidth={2.4} color={ACC} aria-hidden />}
                {label}
                {i === 3 && answered && <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{exact.length}</span>}
              </button>
            )
          })}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 0 20px", flex: 1 }}>
          {step === 0 && (
            <Question eyebrow="Step 1 of 3" title="Which shape was it closest to?"
              hint="To help identify your flag, start with its layout. Pick more than one if it had both, like stripes and a triangle."
              onReset={answered ? reset : undefined}>
              <Grid>
                {LAYOUTS.map(l => {
                  const on = s.layouts.includes(l.id)
                  return (
                    <Option key={l.id} on={on} label={l.label} onClick={() => toggleLayout(l.id)}>
                      <LayoutIcon id={l.id} width={64} ink={on ? ACC : T.muted} field={T.surface} line={on ? ACC : T.lineHi} />
                    </Option>
                  )
                })}
                <Option on={s.unsure[0]} label="Not sure" onClick={() => setUnsure(0)}>
                  <CircleHelp size={26} strokeWidth={1.6} color={s.unsure[0] ? ACC : T.muted} aria-hidden />
                </Option>
              </Grid>
            </Question>
          )}

          {step === 1 && (
            <Question eyebrow="Step 2 of 3" title="What colours was it?"
              hint="Tap every colour you remember. A close shade still counts as close."
              onReset={answered ? reset : undefined}>
              <Grid>
                {COLOURS.map(c => {
                  const on = s.colors.includes(c.id)
                  return (
                    <Option key={c.id} on={on} label={c.label} onClick={() => toggleColour(c.id)}>
                      <span aria-hidden style={{ width: 44, height: 30, borderRadius: 4, background: c.swatch, border: `1px solid ${c.id === "white" ? T.lineHi : tint(T.text, 0.15)}` }} />
                    </Option>
                  )
                })}
                <Option on={s.unsure[1]} label="Not sure" onClick={() => setUnsure(1)}>
                  <CircleHelp size={26} strokeWidth={1.6} color={s.unsure[1] ? ACC : T.muted} aria-hidden />
                </Option>
              </Grid>
            </Question>
          )}

          {step === 2 && (
            <Question eyebrow="Step 3 of 3" title="What else was on it?"
              hint="Stars, a sun, a coat of arms… Tap all you remember, or None if it was only colours and shapes."
              onReset={answered ? reset : undefined}>
              <Grid>
                {DETAILS.map(d => {
                  const on = s.details.includes(d.id)
                  const Icon = DETAIL_ICON[d.id]
                  return (
                    <Option key={d.id} on={on} label={d.label} onClick={() => toggleDetail(d.id)}>
                      <Icon size={26} strokeWidth={1.6} color={on ? ACC : T.muted} aria-hidden />
                    </Option>
                  )
                })}
                <Option on={s.noDetails} label="None" onClick={setNone}>
                  <Ban size={26} strokeWidth={1.6} color={s.noDetails ? ACC : T.muted} aria-hidden />
                </Option>
                <Option on={s.unsure[2]} label="Not sure" onClick={() => setUnsure(2)}>
                  <CircleHelp size={26} strokeWidth={1.6} color={s.unsure[2] ? ACC : T.muted} aria-hidden />
                </Option>
              </Grid>
            </Question>
          )}

          {step === 3 && (
            <Results s={s} ranked={ranked} exact={exact} close={close} answered={answered} countLine={countLine}
              open={open} setOpen={setOpen} limit={limit} setLimit={setLimit} go={go} reset={reset} />
          )}
        </div>
      </div>

      {/* Always visible: how many flags fit so far, and the way to the list. */}
      {step < 3 && (
        <div style={{ position: "sticky", bottom: 0, background: T.bg, borderTop: `1px solid ${T.line}` }}>
          <div className="w-full max-w-md mx-auto" style={{ padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => go(3)} className="fi-tap fi-row" aria-label={`${countLine}. See the list`}
              style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "6px 12px", borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
              <span style={{ display: "flex", gap: 3, flexShrink: 0 }} aria-hidden>
                {(exact.length ? exact : close).slice(0, 3).map(m => (
                  <FlagImage key={m.entry.code} code={m.entry.code} style={{ width: 30, height: 20, objectFit: "cover", borderRadius: 2, border: `1px solid ${T.line}`, display: "block" }} />
                ))}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span data-testid="fit-count" style={{ display: "block", fontWeight: 700, fontSize: 14, color: T.text, fontVariantNumeric: "tabular-nums" }}>{countLine}</span>
                {answered && close.length > 0 && <span style={{ display: "block", fontSize: 12, color: T.muted }}>{plural(close.length, "more is", "more are")} close</span>}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: ACC, flexShrink: 0 }}>See list</span>
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && <SecondaryButton onClick={() => go((step - 1) as Step)} style={{ flex: 1 }}>Back</SecondaryButton>}
              <PrimaryButton accent={ACC} onClick={() => go((step + 1) as Step)} style={{ flex: 2 }}>
                {step === 2 ? "See matches" : `Next: ${STEPS[step + 1]}`}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Question({ eyebrow, title, hint, onReset, children }:
  { eyebrow: string; title: string; hint: string; onReset?: () => void; children: ReactNode }) {
  return (
    <>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44 }}>
          <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>{eyebrow}</div>
          {onReset && <StartOver onClick={onReset} />}
        </div>
        <h2 className="geo-display" style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 22, lineHeight: 1.2, color: T.text }}>{title}</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5, color: T.muted }}>{hint}</p>
      </div>
      {children}
    </>
  )
}

function StartOver({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="fi-tap fi-ghost"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 12px", marginRight: -4, borderRadius: 999, fontSize: 13, fontWeight: 600, color: T.muted, background: "transparent", border: "1px solid transparent", cursor: "pointer" }}>
      <RotateCcw size={14} strokeWidth={1.8} aria-hidden /> Start over
    </button>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>{children}</div>
}

function Option({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className="fi-tap fi-opt"
      style={{
        position: "relative", minHeight: 92, padding: "12px 6px 10px", borderRadius: 12, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        background: on ? tint(ACC, 0.1) : T.surface, border: `1px solid ${on ? ACC : T.line}`,
        boxShadow: on ? `inset 0 0 0 1px ${ACC}` : "none",
      }}>
      <span style={{ height: 43, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</span>
      <span style={{ fontSize: 12.5, lineHeight: 1.25, fontWeight: on ? 700 : 500, color: T.text, textAlign: "center" }}>{label}</span>
      {on && (
        <span aria-hidden style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 999, background: ACC, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={12} strokeWidth={3} color={T.onAccent} />
        </span>
      )}
    </button>
  )
}

/* ── The list ─────────────────────────────────────────────────────────── */

function Results({ s, ranked, exact, close, answered, countLine, open, setOpen, limit, setLimit, go, reset }: {
  s: State; ranked: Match[]; exact: Match[]; close: Match[]; answered: boolean; countLine: string
  open: string | null; setOpen: (c: string | null) => void; limit: number; setLimit: (n: number) => void
  go: (n: Step) => void; reset: () => void
}) {
  const label = (ids: string[], all: { id: string; label: string }[]) => ids.map(id => all.find(x => x.id === id)!.label).join(", ")
  const summary: { step: Step; title: string; value: string }[] = [
    { step: 0, title: "Shape", value: s.layouts.length ? label(s.layouts, LAYOUTS) : "Not sure" },
    { step: 1, title: "Colours", value: s.colors.length ? label(s.colors, COLOURS) : "Not sure" },
    { step: 2, title: "Details", value: s.noDetails ? "None" : s.details.length ? label(s.details, DETAILS) : "Not sure" },
  ]
  // Nothing fits closely: show the nearest few anyway, so there is always somewhere to look.
  const further = exact.length + close.length < 5 ? ranked.slice(exact.length + close.length, 5) : []
  const shown = [...exact, ...close, ...further]
  const visible = shown.slice(0, limit)
  const category = IDENTIFY_CATEGORIES.length === 1 ? `${FLAGS.length} ${IDENTIFY_CATEGORIES[0].label.toLowerCase()}` : ""

  return (
    <>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44 }}>
          <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>Matches</div>
          {answered && <StartOver onClick={reset} />}
        </div>
        <div>
          <h2 data-testid="results-title" className="geo-display" style={{ margin: 0, fontWeight: 700, fontSize: 22, lineHeight: 1.2, color: T.text }}>
            {answered ? (exact.length ? `Your description fits ${plural(exact.length, "flag")}` : "No flag fits everything") : "Every flag, A to Z"}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5, color: T.muted }}>
            {answered
              ? exact.length ? `Best fit first. Searching ${category}.` : `These are the closest. Searching ${category}.`
              : `Answer a question or two to narrow it down. Searching ${category}.`}
          </p>
        </div>
      </div>

      {/* What was described: tap a line to change that answer. */}
      <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`, overflow: "hidden" }}>
        {summary.map((row, i) => (
          <button key={row.title} onClick={() => go(row.step)} className="fi-tap fi-row"
            style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "8px 12px", background: "transparent", border: "none", borderTop: i ? `1px solid ${T.line}` : "none", cursor: "pointer", textAlign: "left" }}>
            <span className="geo-micro" style={{ fontSize: 10.5, color: T.muted, width: 62, flexShrink: 0 }}>{row.title}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: row.value === "Not sure" ? T.dim : T.text }}>{row.value}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: ACC, flexShrink: 0 }}>Change</span>
          </button>
        ))}
      </div>

      <ol aria-label={countLine} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((m, i) => {
          const prev = visible[i - 1]
          const group = groupOf(m), heading = !prev || groupOf(prev) !== group
          return (
            <li key={m.entry.code} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {heading && answered && <GroupHeading group={group} count={group === "exact" ? exact.length : group === "close" ? close.length : further.length} />}
              <ResultRow m={m} open={open === m.entry.code} onToggle={() => setOpen(open === m.entry.code ? null : m.entry.code)} />
            </li>
          )
        })}
      </ol>
      {shown.length > limit && (
        <SecondaryButton onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, shown.length - limit)} more</SecondaryButton>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <SecondaryButton onClick={() => go(2)} style={{ flex: 1 }}>Back</SecondaryButton>
        <SecondaryButton onClick={reset} style={{ flex: 1 }}><RotateCcw size={16} strokeWidth={1.8} aria-hidden /> Start over</SecondaryButton>
      </div>
    </>
  )
}

const groupOf = (m: Match) => m.diff === 0 ? "exact" : m.diff <= CLOSE ? "close" : "further"

function GroupHeading({ group, count }: { group: "exact" | "close" | "further"; count: number }) {
  const text = group === "exact" ? "Fits your description" : group === "close" ? "Close: one detail differs" : "Further off"
  return (
    <h3 className="geo-micro" style={{ margin: "8px 0 0", fontSize: 11, color: group === "exact" ? ACC : T.muted, display: "flex", gap: 6 }}>
      {text}<span style={{ fontVariantNumeric: "tabular-nums" }}>· {count}</span>
    </h3>
  )
}

function ResultRow({ m, open, onToggle }: { m: Match; open: boolean; onToggle: () => void }) {
  const flag = NAME.get(m.entry.code)
  const why = m.diff === 0 ? flag?.region : m.misses.slice(0, 2).join(" · ")
  const panel = `fi-panel-${m.entry.code}`
  const box: CSSProperties = { borderRadius: 12, background: T.surface, border: `1px solid ${open ? T.lineHi : T.line}`, overflow: "hidden" }
  return (
    <div style={box}>
      <button onClick={onToggle} aria-expanded={open} aria-controls={panel} className="fi-tap fi-row"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <FlagImage code={m.entry.code} alt="" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 3, border: `1px solid ${T.line}`, display: "block", flexShrink: 0, background: "#fff" }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 15, color: T.text }}>{m.entry.name}</span>
          {why && <span style={{ display: "block", fontSize: 12.5, color: m.diff === 0 ? T.muted : T.dim, marginTop: 1 }}>{m.diff === 0 ? why : `Differs: ${why}`}</span>}
        </span>
        <ChevronDown size={18} color={T.muted} strokeWidth={1.8} aria-hidden style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div id={panel} style={{ padding: "4px 12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <FlagImage code={m.entry.code} alt={`Flag of ${m.entry.name}`} style={{ width: "100%", maxWidth: 320, height: "auto", borderRadius: 6, border: `1px solid ${T.line}`, display: "block" }} />
          {flag?.distinguishingTip && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: T.muted }}>{flag.distinguishingTip}</p>}
          <a href={`/flags/${m.entry.code.toLowerCase()}/`} className="fi-link"
            style={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontSize: 14, fontWeight: 700, color: ACC }}>
            {m.entry.name} flag: meaning and history
          </a>
        </div>
      )}
    </div>
  )
}

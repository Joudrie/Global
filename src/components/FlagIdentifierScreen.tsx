import { useMemo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import {
  Ban, Bird, Building2, ChevronDown, CircleHelp, Circle, Crown, Flag, Globe, Hourglass, Landmark, Leaf,
  Map as MapIcon, MapPin, Megaphone, Moon, Plus, Rainbow, RotateCcw, Rows3, Shield, Star, Sun, Sword,
  Triangle, Type, Check, UserRound, Key, Anchor, Hand, Heart, Grid3x3,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { FLAGS } from "../data/flags"
import { IDENTIFY_FLAGS } from "../data/flagIdentify"
import {
  LAYOUTS, COLOURS, DETAILS, IDENTIFY_CATEGORIES, CLOSE, NO_ANSWERS, hasAnswers, rankFlags, isKind,
} from "../utils/flagIdentify"
import type { Answers, ColourId, DetailId, IdentifyCategory, IdentifyEntry, LayoutId, Match } from "../utils/flagIdentify"
import { galleryThumb } from "../utils/commons"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LayoutIcon } from "./LayoutIcon"
import { LineIcon } from "./icons"
import FlagImage from "./FlagImage"

/* Flag Identifier — someone saw a flag (on the drive, on TV) and can't look
   it up, so they rebuild it from memory: what kind of flag it might be, its
   shape, its colours, then any other details. The list ranks every flag by
   how well it fits (one misremembered colour never hides the answer) and is
   one tap away at every step. Picking a kind puts those flags first; the
   others that fit are still listed below, in case the guess was wrong. A
   tool, not a game: nothing is scored. Data: data/flagIdentify.ts; ranking:
   utils/flagIdentify.ts. */

const ACC = ACCENT.play
const PAGE = 30   // results shown before "Show more"

type Step = 0 | 1 | 2 | 3 | 4
const STEPS = ["Kind", "Shape", "Colours", "Details", "Matches"] as const
const LAST = 4

// Lucide has no fleur-de-lis: one drawn the same way (24 grid, round 1.6 stroke).
const FleurDeLis = (({ size = 24, strokeWidth = 2, color = "currentColor", ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d="M12 3c-2.6 2.8-2.6 6.6 0 10 2.6-3.4 2.6-7.2 0-10Z" />
    <path d="M10.4 13.2C9 15.4 5.6 15.4 5 12.6c-.4-2 1.9-2.9 3-1.4" />
    <path d="M13.6 13.2c1.4 2.2 4.8 2.2 5.4-.6.4-2-1.9-2.9-3-1.4" />
    <path d="M8 14.5h8" /><path d="M12 14.5V20" /><path d="M9.8 20.5c.6-1.6 3.8-1.6 4.4 0" />
  </svg>
)) as LucideIcon

const DETAIL_ICON: Record<DetailId, LucideIcon> = {
  star: Star, crescent: Moon, sun: Sun, cross: Plus, emblem: Shield, crown: Crown, animal: Bird,
  plant: Leaf, weapon: Sword, building: Landmark, person: UserRound, writing: Type, map: MapIcon,
  fleur: FleurDeLis, key: Key, anchor: Anchor, hand: Hand, heart: Heart, checkers: Grid3x3,
  circle: Circle, triangle: Triangle, manystripes: Rows3,
}
const KIND_ICON: Record<IdentifyCategory, LucideIcon> = {
  country: Flag, region: MapPin, city: Building2, identity: Rainbow, movement: Megaphone,
  organization: Globe, historical: Hourglass,
}

const COUNTRY = new Map(FLAGS.map(f => [f.code, f]))
const TOTAL = IDENTIFY_FLAGS.length.toLocaleString("en-US")   // "1,192"
// The Codex's whole collection, as the home screen puts it ("Explore 5,000+
// flags"). The identifier covers most of it so far, and says so, so it never
// reads as if it searched everything.
const CODEX_TOTAL = "5,000+"
const SO_FAR = `${TOTAL} of the Codex's ${CODEX_TOTAL} flags so far`
// Only the kinds that have flags yet: a kind with none would be a dead choice.
const KINDS = IDENTIFY_CATEGORIES
  .map(c => ({ ...c, count: IDENTIFY_FLAGS.filter(e => isKind(e, c.id)).length }))
  .filter(c => c.count > 0)
const kindOf = (id: IdentifyCategory) => IDENTIFY_CATEGORIES.find(c => c.id === id)!

// Motion: colour and border only, and only after a tap; none under reduced motion.
const STYLES = `
  .fi-tap { transition: background-color 160ms ease-out, border-color 160ms ease-out, color 160ms ease-out; }
  .fi-tap:focus-visible, .fi-link:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
  @media (hover: hover) {
    .fi-opt:not([aria-pressed="true"]):not([aria-checked="true"]):hover, .fi-row:hover, .fi-ghost:hover { border-color: ${T.lineHi}; background: ${T.surfaceHi}; }
    .fi-link:hover { color: ${T.text}; }
  }
  @media (prefers-reduced-motion: reduce) { .fi-tap { transition: none; } }
`

interface State extends Answers { unsure: [boolean, boolean, boolean] }   // shape, colours, details
const START: State = { ...NO_ANSWERS, unsure: [false, false, false] }

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`

export default function FlagIdentifierScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>(0)
  const [s, setS] = useState<State>(START)
  const [open, setOpen] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)

  const ranked = useMemo(() => rankFlags(IDENTIFY_FLAGS, s), [s])
  const answered = hasAnswers(s)
  const described = hasAnswers({ ...s, kind: null })   // anything about the flag itself
  // With a kind picked, its flags come first; every other flag that fits is still listed after them.
  const mine = s.kind ? ranked.filter(m => isKind(m.entry, s.kind!)) : ranked
  const exact = mine.filter(m => m.diff === 0)
  const close = mine.filter(m => m.diff > 0 && m.diff <= CLOSE)
  const others = s.kind && described ? ranked.filter(m => !isKind(m.entry, s.kind!) && m.diff <= CLOSE) : []
  const othersFit = others.filter(m => m.diff === 0).length

  const go = (n: Step) => { setStep(n); setLimit(PAGE); setOpen(null); window.scrollTo(0, 0) }
  const reset = () => { setS(START); go(0) }
  const unsure = (i: 0 | 1 | 2, v: boolean): State["unsure"] => s.unsure.map((u, j) => j === i ? v : u) as State["unsure"]

  const setKind = (kind: IdentifyCategory | null) => setS({ ...s, kind })
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

  const stepDone = [s.kind !== null, s.layouts.length > 0 || s.unsure[0], s.colors.length > 0 || s.unsure[1], s.details.length > 0 || s.noDetails || s.unsure[2]]
  const countLine = !answered
    ? `${TOTAL} flags to search`
    : exact.length ? `Fits ${plural(exact.length, "flag")}` : "No flag fits everything"
  // Short: "3 more are close", or with a kind picked "41 close · 2 of other kinds" (flags that fit).
  const moreLine = othersFit > 0
    ? [close.length ? `${close.length.toLocaleString("en-US")} close` : "", `${othersFit.toLocaleString("en-US")} of other kinds`].filter(Boolean).join(" · ")
    : answered && close.length > 0 ? `${plural(close.length, "more is", "more are")} close`
    : !answered ? `Of the Codex's ${CODEX_TOTAL} so far` : ""
  const preview = (exact.length ? exact : close.length ? close : others).slice(0, 3)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <style>{STYLES}</style>
      <ScreenHeader title="Flag Identifier" subtitle="Describe a flag, find it" onBack={onBack} />

      <div className="w-full max-w-md mx-auto" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 16px" }}>
        {/* Steps: tap any one to change that answer, in any order. */}
        <nav aria-label="Steps" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.15fr 1.1fr 1.35fr", gap: 4, padding: 4, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}` }}>
          {STEPS.map((label, i) => {
            const on = step === i
            const done = i < LAST && stepDone[i]
            return (
              <button key={label} onClick={() => go(i as Step)} className="fi-tap" aria-current={on ? "step" : undefined}
                aria-label={done ? `${label} (answered)` : undefined}
                style={{
                  position: "relative", minHeight: 44, minWidth: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                  fontSize: 12.5, fontWeight: on ? 700 : 600, color: on ? T.onAccent : done ? T.text : T.muted,
                  background: on ? ACC : "transparent", border: "none", cursor: "pointer", padding: "0 2px",
                }}>
                {label}
                {i === LAST && answered && <span style={{ fontFamily: FONT.mono, fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>{exact.length}</span>}
                {done && !on && <Check size={10} strokeWidth={3} color={ACC} aria-hidden style={{ position: "absolute", top: 4, right: 4 }} />}
              </button>
            )
          })}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 0 20px", flex: 1 }}>
          {step === 0 && (
            <Question eyebrow="Step 1 of 4 · optional" title="What kind of flag was it?"
              hint="If you think you know, pick it and those flags come first. Every other flag that fits still shows below, in case it was something else."
              onReset={answered ? reset : undefined}>
              <div role="radiogroup" aria-label="Kind of flag" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <KindOption on={s.kind === null} label="Not sure" note={`Search ${SO_FAR}`} icon={CircleHelp} onClick={() => setKind(null)} />
                {KINDS.map(k => (
                  <KindOption key={k.id} on={s.kind === k.id} label={k.label} note={plural(k.count, "flag")} icon={KIND_ICON[k.id]} onClick={() => setKind(k.id)} />
                ))}
              </div>
            </Question>
          )}

          {step === 1 && (
            <Question eyebrow="Step 2 of 4" title="Which shape was it closest to?"
              hint="Start with its layout. Pick more than one if it had both, like stripes and a triangle. A seal or coat of arms in a round frame counts as a circle in the middle."
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

          {step === 2 && (
            <Question eyebrow="Step 3 of 4" title="What colours was it?"
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

          {step === 3 && (
            <Question eyebrow="Step 4 of 4" title="What else was on it?"
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

          {step === LAST && (
            <Results s={s} ranked={mine} exact={exact} close={close} others={others} answered={answered} countLine={countLine}
              open={open} setOpen={setOpen} limit={limit} setLimit={setLimit} go={go} reset={reset} />
          )}
        </div>
      </div>

      {/* Always visible: how many flags fit so far, and the way to the list. */}
      {step < LAST && (
        <div style={{ position: "sticky", bottom: 0, background: T.bg, borderTop: `1px solid ${T.line}` }}>
          <div className="w-full max-w-md mx-auto" style={{ padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => go(LAST)} className="fi-tap fi-row" aria-label={`${countLine}. See the list`}
              style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "6px 12px", borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
              <span style={{ display: "flex", gap: 3, flexShrink: 0 }} aria-hidden>
                {preview.map(m => (
                  <FlagThumb key={m.entry.code} entry={m.entry} style={{ width: 30, height: 20, objectFit: "cover", borderRadius: 2, border: `1px solid ${T.line}`, display: "block" }} />
                ))}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span data-testid="fit-count" style={{ display: "block", fontWeight: 700, fontSize: 14, color: T.text, fontVariantNumeric: "tabular-nums" }}>{countLine}</span>
                {moreLine && <span style={{ display: "block", fontSize: 12, color: T.muted }}>{moreLine}</span>}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: ACC, flexShrink: 0 }}>See list</span>
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && <SecondaryButton onClick={() => go((step - 1) as Step)} style={{ flex: 1 }}>Back</SecondaryButton>}
              <PrimaryButton accent={ACC} onClick={() => go((step + 1) as Step)} style={{ flex: 2 }}>
                {step === LAST - 1 ? "See matches" : `Next: ${STEPS[step + 1]}`}
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
      {on && <Tick />}
    </button>
  )
}

/** One choice in the kind step: a single answer, so a radio. */
function KindOption({ on, label, note, icon: Icon, onClick }: { on: boolean; label: string; note: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button onClick={onClick} role="radio" aria-checked={on} className="fi-tap fi-opt"
      style={{
        display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
        background: on ? tint(ACC, 0.1) : T.surface, border: `1px solid ${on ? ACC : T.line}`,
        boxShadow: on ? `inset 0 0 0 1px ${ACC}` : "none",
      }}>
      <Icon size={22} strokeWidth={1.6} color={on ? ACC : T.muted} aria-hidden style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: on ? 700 : 600, color: T.text }}>{label}</span>
        <span style={{ display: "block", fontSize: 12.5, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{note}</span>
      </span>
      <span aria-hidden style={{
        width: 20, height: 20, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: on ? ACC : "transparent", border: `1.5px solid ${on ? ACC : T.lineHi}`,
      }}>
        {on && <Check size={12} strokeWidth={3} color={T.onAccent} />}
      </span>
    </button>
  )
}

function Tick() {
  return (
    <span aria-hidden style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 999, background: ACC, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Check size={12} strokeWidth={3} color={T.onAccent} />
    </span>
  )
}

/** A flag's picture: countries through FlagImage (with its fallbacks), every
 *  other flag from the image its own data uses, as the Codex shows it. */
function FlagThumb({ entry, style, alt = "", full = false }: { entry: IdentifyEntry; style: CSSProperties; alt?: string; full?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (!entry.img) return <FlagImage code={entry.code} alt={alt} style={style} />
  if (failed) {
    return (
      <span aria-hidden={!alt} role={alt ? "img" : undefined} aria-label={alt || undefined}
        style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", background: T.surfaceHi, color: T.dim }}>
        <LineIcon name="flag" size={18} />
      </span>
    )
  }
  return <img src={full ? entry.img : galleryThumb(entry.img)} alt={alt} loading="lazy" decoding="async"
    onError={() => setFailed(true)} style={{ objectFit: "contain", background: "#fff", ...style }} />
}

/* ── The list ─────────────────────────────────────────────────────────── */

// With a kind picked, other kinds that fit exactly come straight after that
// kind's own fits, before its close ones, so a wrong guess never buries them.
type Group = "exact" | "otherExact" | "close" | "further" | "otherClose"

function Results({ s, ranked, exact, close, others, answered, countLine, open, setOpen, limit, setLimit, go, reset }: {
  s: State; ranked: Match[]; exact: Match[]; close: Match[]; others: Match[]; answered: boolean; countLine: string
  open: string | null; setOpen: (c: string | null) => void; limit: number; setLimit: (n: number) => void
  go: (n: Step) => void; reset: () => void
}) {
  const label = (ids: string[], all: { id: string; label: string }[]) => ids.map(id => all.find(x => x.id === id)!.label).join(", ")
  const kind = s.kind ? kindOf(s.kind) : null
  const summary: { step: Step; title: string; value: string }[] = [
    { step: 0, title: "Kind", value: kind ? kind.label : "Not sure" },
    { step: 1, title: "Shape", value: s.layouts.length ? label(s.layouts, LAYOUTS) : "Not sure" },
    { step: 2, title: "Colours", value: s.colors.length ? label(s.colors, COLOURS) : "Not sure" },
    { step: 3, title: "Details", value: s.noDetails ? "None" : s.details.length ? label(s.details, DETAILS) : "Not sure" },
  ]
  // Nothing of that kind fits closely: show its nearest few anyway, so there is always somewhere to look.
  const further = exact.length + close.length < 5 ? ranked.slice(exact.length + close.length, 5) : []
  const otherExact = others.filter(m => m.diff === 0), otherClose = others.filter(m => m.diff > 0)
  const tag = (ms: Match[], g: Group) => ms.map(m => [m, g] as [Match, Group])
  const shown: [Match, Group][] = [
    ...tag(exact, "exact"), ...tag(otherExact, "otherExact"), ...tag(close, "close"),
    ...tag(further, "further"), ...tag(otherClose, "otherClose"),
  ]
  const visible = shown.slice(0, limit)
  const counts: Record<Group, number> = {
    exact: exact.length, otherExact: otherExact.length, close: close.length, further: further.length, otherClose: otherClose.length,
  }
  const fits = kind ? `${plural(exact.length, kind.one, kind.plural)}` : plural(exact.length, "flag")
  const where = kind ? `${kind.label} flags first; other kinds that fit are below.` : `Searching ${SO_FAR}.`

  return (
    <>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44 }}>
          <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>Matches</div>
          {answered && <StartOver onClick={reset} />}
        </div>
        <div>
          <h2 data-testid="results-title" className="geo-display" style={{ margin: 0, fontWeight: 700, fontSize: 22, lineHeight: 1.2, color: T.text }}>
            {answered ? (exact.length ? `Your description fits ${fits}` : "No flag fits everything") : `All ${TOTAL} searchable flags`}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5, color: T.muted }}>
            {answered
              ? exact.length ? `Best fit first. ${where}` : `These are the closest. ${where}`
              : `Answer a question or two to narrow it down. Searching ${SO_FAR}.`}
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
        {visible.map(([m, group], i) => {
          const heading = i === 0 || visible[i - 1][1] !== group
          return (
            <li key={m.entry.code} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {heading && answered && <GroupHeading group={group} count={counts[group]} kind={kind?.label} />}
              <ResultRow m={m} open={open === m.entry.code} onToggle={() => setOpen(open === m.entry.code ? null : m.entry.code)} />
            </li>
          )
        })}
      </ol>
      {shown.length > limit && (
        <SecondaryButton onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, shown.length - limit)} more</SecondaryButton>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <SecondaryButton onClick={() => go(3)} style={{ flex: 1 }}>Back</SecondaryButton>
        <SecondaryButton onClick={reset} style={{ flex: 1 }}><RotateCcw size={16} strokeWidth={1.8} aria-hidden /> Start over</SecondaryButton>
      </div>
    </>
  )
}

function GroupHeading({ group, count, kind }: { group: Group; count: number; kind?: string }) {
  const text = group === "exact" ? "Fits your description"
    : group === "otherExact" ? "Other kinds of flag that fit"
    : group === "close" ? "Close: one detail differs"
    : group === "further" ? (kind ? `Nearest ${kind.toLowerCase()} flags` : "Further off")
    : "Other kinds, one detail differs"
  return (
    <h3 className="geo-micro" style={{ margin: "8px 0 0", fontSize: 11, color: group === "exact" || group === "otherExact" ? ACC : T.muted, display: "flex", gap: 6 }}>
      {text}<span style={{ fontVariantNumeric: "tabular-nums" }}>· {count}</span>
    </h3>
  )
}

function ResultRow({ m, open, onToggle }: { m: Match; open: boolean; onToggle: () => void }) {
  const e = m.entry
  const country = e.category === "country" ? COUNTRY.get(e.code) : undefined
  const kindLine = country ? `${e.label} · ${country.region}` : e.label
  const why = m.diff > 0 ? m.misses.slice(0, 2).join(" · ") : ""
  const panel = `fi-panel-${e.code}`
  const href = country ? `/flags/${e.code.toLowerCase()}/` : e.href
  const note = country ? country.distinguishingTip : e.note
  const box: CSSProperties = { borderRadius: 12, background: T.surface, border: `1px solid ${open ? T.lineHi : T.line}`, overflow: "hidden" }
  return (
    <div style={box}>
      <button onClick={onToggle} aria-expanded={open} aria-controls={panel} className="fi-tap fi-row"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <FlagThumb entry={e} style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 3, border: `1px solid ${T.line}`, display: "block", flexShrink: 0, background: "#fff" }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 15, color: T.text }}>{e.name}</span>
          <span data-testid="kind-label" style={{ display: "block", fontSize: 12.5, color: T.muted, marginTop: 1 }}>{kindLine}</span>
          {why && <span style={{ display: "block", fontSize: 12.5, color: T.dim, marginTop: 1 }}>Differs: {why}</span>}
        </span>
        <ChevronDown size={18} color={T.muted} strokeWidth={1.8} aria-hidden style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div id={panel} style={{ padding: "4px 12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <FlagThumb entry={e} full alt={`Flag of ${e.name}`} style={{ width: "100%", maxWidth: 320, height: "auto", maxHeight: 240, borderRadius: 6, border: `1px solid ${T.line}`, display: "block", objectFit: "contain" }} />
          {note && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: T.muted }}>{note}</p>}
          {href && (
            <a href={href} className="fi-link"
              style={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontSize: 14, fontWeight: 700, color: ACC }}>
              {e.name} flag: meaning and history
            </a>
          )}
        </div>
      )}
    </div>
  )
}

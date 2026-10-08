import { useState, useEffect, useRef } from "react"
import { Lock, Landmark, TreePalm, Castle, Sun, Mountain, Sailboat, Globe } from "lucide-react"
import { CHALLENGE_CONTINENTS } from "../data/challenges"
import type { ChallengeContinent, ChallengeCountry, SubRegion } from "../data/challenges"
import { FLAGS } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton, HeaderStat } from "./gameUi"
import { LineIcon } from "./icons"

interface Props { onBack: () => void }

type Phase = "continents" | "countries" | "quiz" | "result"

const ACC = ACCENT.challenge

// Distinct region icon per continent (no more identical globes everywhere).
const CONTINENT_ICON: Record<string, typeof Castle> = {
  "north-america": Landmark, "south-america": TreePalm, "europe": Castle,
  "africa": Sun, "asia": Mountain, "oceania": Sailboat,
}
const continentIcon = (id: string) => CONTINENT_ICON[id] ?? Globe
const flagOf = (code: string) => FLAGS.find(f => f.code === code)?.flagUrl ?? `/flags/${code.toLowerCase()}.svg`

// A country's real flag thumbnail — replaces flag emojis that some devices
// render as bare 2-letter codes.
function CountryFlag({ code, name }: { code: string; name: string }) {
  return (
    <div style={{ width: 34, height: 23, borderRadius: 4, overflow: "hidden", border: `1px solid ${T.line}`, flexShrink: 0, background: T.surfaceHi }}>
      <img src={flagOf(code)} alt={name} loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />
    </div>
  )
}

interface ChallengeQ {
  target: SubRegion
  choices: SubRegion[]
  correctIndex: number
}

// Only regions with a real flag image can be quizzed.
const flaggedRegions = (country: ChallengeCountry) => country.subRegions.filter(s => s.flagUrl && !s.noFlag)
const isPlayable = (country: ChallengeCountry) => !country.locked && flaggedRegions(country).length >= 4

function buildQuiz(subRegions: SubRegion[]): ChallengeQ[] {
  if (new Set(subRegions.map(r => r.flagUrl)).size < 4) return []
  const count = Math.min(10, subRegions.length)
  const shuffled = [...subRegions].sort(() => Math.random() - 0.5).slice(0, count)
  return shuffled.map(target => {
    // No two choices with the same picture: some regions share a flag (Sharjah
    // and Ras al-Khaimah, Cork and Louth), and the twin would be marked wrong.
    const seen = new Set([target.flagUrl])
    const distractors: SubRegion[] = []
    for (const r of [...subRegions].sort(() => Math.random() - 0.5)) {
      if (distractors.length >= 3) break
      if (r.code === target.code || seen.has(r.flagUrl)) continue
      seen.add(r.flagUrl)
      distractors.push(r)
    }
    const allChoices = [target, ...distractors].sort(() => Math.random() - 0.5)
    const correctIndex = allChoices.findIndex(r => r.code === target.code)
    return { target, choices: allChoices, correctIndex }
  })
}

export default function ChallengeScreen({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>("continents")
  const [activeContinent, setActiveContinent] = useState<ChallengeContinent | null>(null)
  const [activeCountry, setActiveCountry] = useState<ChallengeCountry | null>(null)
  const [questions, setQuestions] = useState<ChallengeQ[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<("correct" | "wrong")[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [animating, setAnimating] = useState<number | null>(null)
  const [imgError, setImgError] = useState<Record<string, boolean>>({})

  const handleContinentClick = (c: ChallengeContinent) => {
    if (c.locked) return
    setActiveContinent(c)
    setPhase("countries")
  }

  const handleCountryClick = (country: ChallengeCountry) => {
    if (!isPlayable(country)) return
    setActiveCountry(country)
    const qs = buildQuiz(flaggedRegions(country))
    setQuestions(qs)
    setIdx(0)
    setAnswers([])
    setSelected(null)
    setAnimating(null)
    setImgError({})
    setPhase("quiz")
  }

  const q = questions[idx]
  const answered = selected !== null
  const score = answers.filter(a => a === "correct").length
  const total = questions.length

  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current) }, [])

  const handleAnswer = (i: number) => {
    if (answered) return
    const isCorrect = i === q.correctIndex
    setSelected(i)
    setAnimating(i)
    if (animTimer.current) clearTimeout(animTimer.current)
    animTimer.current = setTimeout(() => setAnimating(null), 500)
    setAnswers(prev => [...prev, isCorrect ? "correct" : "wrong"])
  }

  const handleNext = () => {
    if (idx + 1 >= questions.length) { setPhase("result"); return }
    setIdx(i => i + 1)
    setSelected(null)
    setAnimating(null)
  }

  const bgColor = (i: number) => {
    if (!answered) return T.surface
    if (i === q.correctIndex) return tint(T.green, 0.13)
    if (i === selected && i !== q.correctIndex) return tint(T.danger, 0.13)
    return T.surface
  }
  const borderColor = (i: number) => {
    if (!answered) return T.line
    if (i === q.correctIndex) return T.green
    if (i === selected && i !== q.correctIndex) return T.danger
    return T.line
  }
  const textColor = (i: number) => {
    if (!answered) return T.text
    if (i === q.correctIndex) return T.green
    if (i === selected && i !== q.correctIndex) return T.danger
    return T.muted
  }
  const animClass = (i: number) => {
    if (animating !== i) return ""
    return i === q.correctIndex ? "animate-correct-bounce" : "animate-wrong-shake"
  }

  if (phase === "continents") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Challenge Mode" subtitle="Master sub-national flags by region" onBack={onBack} />
        <div className="px-5 pb-10 space-y-3" style={{ zIndex: 1, position: "relative" }}>
          {CHALLENGE_CONTINENTS.map(c => (
            <button key={c.id} onClick={() => handleContinentClick(c)} disabled={c.locked}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${c.locked ? "opacity-40 cursor-not-allowed" : "active:scale-[0.98] hover:brightness-95"}`}
              style={{ background: T.surface, border: `1px solid ${c.locked ? T.line : tint(ACC, 0.35)}` }}>
              <div className="flex items-center gap-3">
                {(() => { const Icon = continentIcon(c.id); return <Icon size={22} color={c.locked ? T.dim : ACC} strokeWidth={1.6} absoluteStrokeWidth /> })()}
                <div className="text-left">
                  <div className="font-bold" style={{ color: T.text, fontFamily: FONT.display }}>{c.name}</div>
                  {c.locked
                    ? <div className="text-xs" style={{ color: T.muted }}>Coming soon</div>
                    : <div className="text-xs" style={{ color: ACC }}>
                        {(n => `${n} ${n === 1 ? "country" : "countries"} available`)(c.countries.filter(isPlayable).length)}
                      </div>
                  }
                </div>
              </div>
              <span style={{ color: c.locked ? T.dim : ACC, display: "flex" }}>
                {c.locked ? <Lock size={16} strokeWidth={1.6} absoluteStrokeWidth /> : "›"}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === "countries" && activeContinent) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title={activeContinent.name} subtitle="Select a country"
          onBack={() => setPhase("continents")} />
        <div className="px-5 pb-10 space-y-3" style={{ zIndex: 1, position: "relative" }}>
          {/* Only countries with a full round of region flags are listed; the
              rest stay hidden rather than showing as locked tiles. */}
          {activeContinent.countries.filter(isPlayable).map(country => (
            <button key={country.code} onClick={() => handleCountryClick(country)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all active:scale-[0.98] hover:brightness-95"
              style={{ background: T.surface, border: `1px solid ${tint(ACC, 0.35)}` }}>
              <div className="flex items-center gap-3">
                <CountryFlag code={country.code} name={country.name} />
                <div className="text-left">
                  <div className="font-bold" style={{ color: T.text, fontFamily: FONT.display }}>{country.name}</div>
                  <div className="text-xs" style={{ color: T.muted }}>{country.subTitle}</div>
                </div>
              </div>
              <span style={{ color: ACC, display: "flex" }}>›</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === "result" && activeCountry) {
    const pct = Math.round((score / total) * 100)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title={activeCountry.name} subtitle="Results" onBack={() => setPhase("countries")} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3" style={{ zIndex: 1, position: "relative" }}>
          <ResultCard>
            <ResultHeader icon={pct >= 80 ? "trophy" : pct >= 50 ? "check" : "codex"} accent={pct >= 80 ? T.gold : ACC}
              title={`${score} of ${total} correct`} score={`${activeCountry.subTitle} · ${pct}%`} />
            <ResultDots results={answers.map(a => a === "correct")} />
          </ResultCard>
          <PrimaryButton onClick={() => handleCountryClick(activeCountry)} accent={ACC}>Play again</PrimaryButton>
          <SecondaryButton onClick={() => setPhase("countries")}>Other countries</SecondaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  if (phase === "quiz" && q) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title={activeCountry?.name ?? ""} subtitle={`${score} correct so far`}
          onBack={() => setPhase("countries")}
          right={<HeaderStat accent={ACC}>{idx + 1} / {total}</HeaderStat>} />

        <div className="mx-5 mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: T.line, zIndex: 1 }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(answers.length / total) * 100}%`, background: ACC }} />
        </div>

        <div className="flex-1 flex flex-col items-center px-5 py-4" style={{ zIndex: 1 }}>
          <div className="mb-4">
            <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${T.line}`, boxShadow: `0 8px 24px -10px ${tint(T.text, 0.35)}` }}>
              {imgError[q.target.code] || !q.target.flagUrl ? (
                <div className="flex items-center justify-center text-4xl"
                  style={{ width: 280, height: 175, background: T.surface, color: T.muted }}>
                  <LineIcon name="flags" size={48} color={T.muted} />
                </div>
              ) : (
                <img src={q.target.flagUrl} alt="flag" width={280} height={175}
                  className="object-contain" style={{ display: "block", background: T.surfaceHi }}
                  onError={() => setImgError(e => ({ ...e, [q.target.code]: true }))} />
              )}
            </div>
          </div>

          {answered && (
            <div className="w-full max-w-sm mb-3 px-4 py-3 rounded-xl animate-slide-up"
              style={{ background: T.surface, border: `1px solid ${tint(selected === q.correctIndex ? T.green : T.danger, 0.4)}` }}>
              <div className="text-xs font-semibold" style={{ color: selected === q.correctIndex ? T.green : T.danger }}>
                {selected === q.correctIndex ? `✓ Correct — ${q.target.name}` : `✗ That was ${q.target.name}`}
              </div>
            </div>
          )}

          <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-4">
            {q.choices.map((choice, i) => (
              <button key={choice.code} onClick={() => handleAnswer(i)} disabled={answered}
                className={`py-3.5 px-3 rounded-xl font-semibold text-sm transition-colors active:scale-95 ${animClass(i)}`}
                style={{ background: bgColor(i), border: `1.5px solid ${borderColor(i)}`, color: textColor(i), cursor: answered ? "default" : "pointer" }}>
                {choice.name}
              </button>
            ))}
          </div>

          {answered && (
            <PrimaryButton onClick={handleNext} accent={ACC} style={{ maxWidth: 384 }}>
              {idx + 1 >= questions.length ? "See results →" : "Next →"}
            </PrimaryButton>
          )}
        </div>
      </div>
    )
  }

  return null
}

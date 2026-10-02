import { useState, useEffect } from "react"
import { Trophy, ThumbsUp, BookOpen } from "lucide-react"
import { LANGUAGES, detectScript, scriptFont, languageNote } from "../data/languages"
import type { LanguageRecord, Difficulty } from "../data/languages"
import { shuffleWithSeed, seededRandom } from "../utils/prng"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { LineIcon } from "./icons"

interface Props { onBack: () => void }

type Phase = "menu" | "quiz" | "result"

const ACC = ACCENT.play

// Historic-script webfonts (cuneiform, hieroglyphs, Gothic, Coptic) so ancient
// languages render on every device. Only this game needs them, so they load
// here, once, instead of on every page of the site.
const HISTORIC_FONTS = "https://fonts.googleapis.com/css2?family=Noto+Sans+Cuneiform&family=Noto+Sans+Egyptian+Hieroglyphs&family=Noto+Sans+Gothic&family=Noto+Sans+Coptic&display=swap"
function loadHistoricFonts() {
  if (document.querySelector(`link[href="${HISTORIC_FONTS}"]`)) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = HISTORIC_FONTS
  document.head.appendChild(link)
}

// Build 3 distractors. We pull from ALL languages and strongly prefer the SAME writing
// system as the target, so you can't win just by recognising the alphabet.
function getChoices(target: LanguageRecord, all: LanguageRecord[], seed: string): LanguageRecord[] {
  const rng = seededRandom(seed + target.code)
  const targetScript = detectScript(target.sample)
  const pool = all.filter(l => l.code !== target.code)
  const picks: LanguageRecord[] = []
  const add = (l?: LanguageRecord) => { if (l && !picks.find(p => p.code === l.code)) picks.push(l) }
  const shuffled = (arr: LanguageRecord[]) => arr.sort(() => rng() - 0.5)

  if (target.difficulty === 'extreme') {
    // Extreme = a dead / ancient language. If the distractors are living
    // languages, "it's the only dead one" becomes the shortcut — so we keep the
    // distractors DEAD too, forcing actual recognition. Same script first (so
    // the alphabet isn't a giveaway either), then any other dead language.
    const dead = pool.filter(l => l.difficulty === 'extreme')
    for (const c of target.confusableWith) { const l = dead.find(p => p.code === c); add(l) }
    shuffled(dead.filter(l => detectScript(l.sample) === targetScript)).forEach(add)
    shuffled(dead).forEach(add)
    // Last resort only if there still aren't 3 dead options: same-script living.
    shuffled(pool.filter(l => detectScript(l.sample) === targetScript)).forEach(add)
  } else {
    // 1. Curated confusables first
    for (const c of target.confusableWith) add(pool.find(p => p.code === c))
    // 2. Same-script languages (the key anti-giveaway step)
    shuffled(pool.filter(l => detectScript(l.sample) === targetScript)).forEach(add)
  }
  // Final fallback so there are always 4 choices.
  shuffled(pool).forEach(add)

  return [target, ...picks.slice(0, 3)].sort(() => rng() - 0.5)
}

const DIFF_COLORS: Record<Difficulty, { bg: string; border: string; label: string }> = {
  easy:    { bg: tint(T.green, 0.12),  border: T.green,  label: "Easy" },
  medium:  { bg: tint(T.gold, 0.12),   border: T.gold,   label: "Medium" },
  hard:    { bg: tint(T.danger, 0.12), border: T.danger, label: "Hard" },
  extreme: { bg: tint(ACC, 0.12),      border: ACC,      label: "Extreme" },
}

export default function LanguageQuizScreen({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>("menu")
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [questions, setQuestions] = useState<{ target: LanguageRecord; choices: LanguageRecord[] }[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<("correct" | "wrong")[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [showRoman, setShowRoman] = useState(false)
  useEffect(loadHistoricFonts, [])

  const TOTAL = 10

  const startQuiz = (diff: Difficulty) => {
    setDifficulty(diff)
    const pool = LANGUAGES.filter(l => l.difficulty === diff)
    const seed = Date.now().toString() + diff
    const shuffled = shuffleWithSeed(pool, seed).slice(0, TOTAL)
    // Distractors are drawn from the whole language set (preferring the same script),
    // not just this difficulty — so e.g. Classical Chinese sits next to Mandarin.
    const qs = shuffled.map((t, i) => ({ target: t, choices: getChoices(t, LANGUAGES, seed + i) }))
    setQuestions(qs)
    setIdx(0)
    setAnswers([])
    setSelected(null)
    setShowRoman(false)
    setPhase("quiz")
  }

  const q = questions[idx]

  useEffect(() => { setSelected(null); setShowRoman(false) }, [idx])

  const handleAnswer = (choiceIdx: number) => {
    if (selected !== null) return
    setSelected(choiceIdx)
    const correct = q.choices[choiceIdx].code === q.target.code
    setAnswers(prev => [...prev, correct ? "correct" : "wrong"])
  }

  const handleNext = () => {
    if (idx + 1 >= questions.length) { setPhase("result"); return }
    setIdx(i => i + 1)
  }

  const score = answers.filter(a => a === "correct").length

  if (phase === "menu") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Guess the Language" onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5" style={{ zIndex: 1, position: "relative" }}>
          <LineIcon name="language" size={56} color={ACC} strokeWidth={1.3} />
          <div className="text-center">
            <h2 className="text-xl mb-2" style={{ color: T.text, fontFamily: FONT.display, fontWeight: 800 }}>Which language is this?</h2>
            <p className="text-sm" style={{ color: T.muted }}>Read a sentence and identify the language from 4 choices.</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            {(["easy", "medium", "hard", "extreme"] as Difficulty[]).map(d => (
              <button key={d} onClick={() => startQuiz(d)}
                className="w-full py-4 px-5 rounded-2xl text-left transition-all active:scale-95 hover:brightness-95"
                style={{ background: DIFF_COLORS[d].bg, border: `1px solid ${tint(DIFF_COLORS[d].border, 0.4)}`, color: T.text }}>
                <div className="font-bold text-base flex items-center gap-2" style={{ fontFamily: FONT.display }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: DIFF_COLORS[d].border, display: "inline-block" }} />
                  {DIFF_COLORS[d].label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: T.muted }}>
                  {d === "easy" && "Major world languages — Spanish, French, Mandarin…"}
                  {d === "medium" && "Familiar but tricky — Polish, Greek, Hebrew…"}
                  {d === "hard" && "Obscure & similar-looking — Basque, Georgian, Welsh…"}
                  {d === "extreme" && "Ancient & dead languages — Latin, Sanskrit, Gothic…"}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === "result") {
    const total = questions.length || TOTAL
    const pct = Math.round((score / total) * 100)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ background: T.bg, color: T.text }}>
        <div className="w-full max-w-sm" style={{ zIndex: 1, position: "relative" }}>
          <div className="rounded-2xl p-6 mb-4 text-center"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="mb-3 flex justify-center" style={{ color: pct >= 80 ? T.gold : ACC }}>
              {pct >= 80
                ? <Trophy size={44} strokeWidth={1.6} absoluteStrokeWidth />
                : pct >= 50
                  ? <ThumbsUp size={44} strokeWidth={1.6} absoluteStrokeWidth />
                  : <BookOpen size={44} strokeWidth={1.6} absoluteStrokeWidth />}
            </div>
            <div className="text-6xl mb-1" style={{ color: T.text, fontFamily: FONT.mono, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{score}/{total}</div>
            <div className="text-sm mb-3" style={{ color: T.muted }}>Guess the Language · {DIFF_COLORS[difficulty].label}</div>
            <div className="flex justify-center gap-1 mb-4">
              {answers.map((a, i) => (
                <span key={i} style={{ width: 14, height: 14, borderRadius: 3, background: a === "correct" ? T.green : T.danger, display: "inline-block" }} />
              ))}
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.line }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACC }} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => startQuiz(difficulty)}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: ACC, color: T.onAccent, fontFamily: FONT.display }}>Play Again</button>
            <button onClick={() => setPhase("menu")}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>Change Difficulty</button>
            <button onClick={onBack}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>&#8592; Home</button>
          </div>
        </div>
      </div>
    )
  }

  if (!q) return null

  const answered = selected !== null
  const correctIdx = q.choices.findIndex(c => c.code === q.target.code)
  const diff = DIFF_COLORS[difficulty]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Guess the Language" subtitle={DIFF_COLORS[difficulty].label} onBack={onBack}
        right={
          <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14, color: diff.border, padding: "5px 11px", borderRadius: 999, background: tint(diff.border, 0.1), border: `1px solid ${tint(diff.border, 0.3)}` }}>
            {idx + 1} / {questions.length}
          </span>
        } />

      <div className="mx-5 mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: T.line, zIndex: 1 }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(answers.length / questions.length) * 100}%`, background: diff.border }} />
      </div>

      <div className="flex-1 flex flex-col px-5 py-4" style={{ zIndex: 1, position: "relative" }}>
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: T.surface, border: `1px solid ${tint(diff.border, 0.3)}` }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: diff.border }}>
            <LineIcon name="language" size={13} color={diff.border} /> What language is this?
          </div>
          <p className="text-xl leading-relaxed font-semibold" style={{
            color: T.text,
            fontFamily: (showRoman && !q.target.isLatinScript) ? undefined : scriptFont(detectScript(q.target.sample)),
          }}>
            {showRoman && !q.target.isLatinScript ? q.target.romanized : q.target.sample}
          </p>
          {!q.target.isLatinScript && (
            <button onClick={() => setShowRoman(s => !s)}
              className="mt-3 text-xs px-3 py-1 rounded-full transition-all active:scale-95"
              style={{ background: tint(ACC, 0.12), color: ACC, border: `1px solid ${tint(ACC, 0.3)}` }}>
              {showRoman ? "Show original script" : "Aa Show Latin alphabet"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {q.choices.map((choice, i) => {
            let bg = T.surface
            let border = T.line
            let color = T.text
            if (answered) {
              if (i === correctIdx) { bg = tint(T.green, 0.13); border = T.green; color = T.green }
              else if (i === selected) { bg = tint(T.danger, 0.13); border = T.danger; color = T.danger }
            }
            return (
              <button key={choice.code} onClick={() => handleAnswer(i)} disabled={answered}
                className="py-4 px-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: bg, border: `1.5px solid ${border}`, color, cursor: answered ? "default" : "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{choice.name}</div>
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="rounded-xl p-4 mb-4 animate-slide-up"
            style={{ background: T.surface, border: `1px solid ${tint(selected === correctIdx ? T.green : T.danger, 0.4)}` }}>
            <div className="text-xs font-semibold mb-1" style={{ color: selected === correctIdx ? T.green : T.danger }}>
              {selected === correctIdx ? `✓ Correct — ${q.target.name}` : `✗ That was ${q.target.name}`}
            </div>
            <p className="text-sm" style={{ color: T.text }}>{languageNote(q.target)}</p>
          </div>
        )}

        {answered && (
          <button onClick={handleNext}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95 animate-slide-up"
            style={{ background: ACC, color: T.onAccent, fontFamily: FONT.display }}>
            {idx + 1 >= questions.length ? "See Results →" : "Next →"}
          </button>
        )}
      </div>
    </div>
  )
}

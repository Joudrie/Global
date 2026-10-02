import { useState, useCallback, useEffect, useLayoutEffect, useRef, lazy, Suspense, Component } from "react"
import type { ReactNode } from "react"
import Onboarding, { hasOnboarded } from "./components/Onboarding"
import MainTabs from "./components/MainTabs"
import { REGISTRY } from "./ui/registry"
import type { TabKey } from "./ui/registry"
import { T } from "./ui/tokens"
import EarthLogo from "./components/EarthLogo"
import type { HistoricalRegion } from "./data/historicalFlags"

// Every game/destination screen is code-split so the initial load only ships
// the dashboard shell — each screen's JS is fetched the first time it's opened.
const FlagsScreen = lazy(() => import("./components/FlagsScreen"))
const QuizScreen = lazy(() => import("./components/QuizScreen"))
const ReverseQuizScreen = lazy(() => import("./components/ReverseQuizScreen"))
const CapitalQuizScreen = lazy(() => import("./components/CapitalQuizScreen"))
const ChallengeScreen = lazy(() => import("./components/ChallengeScreen"))
const ResultScreen = lazy(() => import("./components/ResultScreen"))
const AchievementsScreen = lazy(() => import("./components/AchievementsScreen"))
const ProfileScreen = lazy(() => import("./components/ProfileScreen"))
const FlashcardsScreen = lazy(() => import("./components/FlashcardsScreen"))
const LanguageQuizScreen = lazy(() => import("./components/LanguageQuizScreen"))
const CodexScreen = lazy(() => import("./components/CodexScreen"))
const GeoQuizScreen = lazy(() => import("./components/GeoQuizScreen"))
const GauntletScreen = lazy(() => import("./components/GauntletScreen"))
const SettingsScreen = lazy(() => import("./components/SettingsScreen"))
const TierListScreen = lazy(() => import("./components/TierListScreen"))
const OddOneOutScreen = lazy(() => import("./components/OddOneOutScreen"))
const ConnectionsScreen = lazy(() => import("./components/ConnectionsScreen"))
const TheCropScreen = lazy(() => import("./components/TheCropScreen"))
const FlagDNAScreen = lazy(() => import("./components/FlagDNAScreen"))
const BuildFlagScreen = lazy(() => import("./components/BuildFlagScreen"))
const GeoPaintScreen = lazy(() => import("./components/GeoPaintScreen"))
const SketchFlagScreen = lazy(() => import("./components/SketchFlagScreen"))
const SpotErrorScreen = lazy(() => import("./components/SpotErrorScreen"))
const FlagOutlineScreen = lazy(() => import("./components/FlagOutlineScreen"))
const ThePeelScreen = lazy(() => import("./components/ThePeelScreen"))
const ConfusablesScreen = lazy(() => import("./components/ConfusablesScreen"))
const TheComposerScreen = lazy(() => import("./components/TheComposerScreen"))
const SilhouetteScreen = lazy(() => import("./components/SilhouetteScreen"))
const FlagFamiliesScreen = lazy(() => import("./components/FlagFamiliesScreen"))
const FunFactScreen = lazy(() => import("./components/FunFactScreen"))
const ProgressMapScreen = lazy(() => import("./components/ProgressMapScreen"))
const HistoricalFlagScreen = lazy(() => import("./components/HistoricalFlagScreen"))
const IdentityFlagScreen = lazy(() => import("./components/IdentityFlagScreen"))
const ProvinceRouletteScreen = lazy(() => import("./components/ProvinceRouletteScreen"))
const SubdivisionStumperScreen = lazy(() => import("./components/SubdivisionStumperScreen"))
const LineageScreen = lazy(() => import("./components/LineageScreen"))
const SubdivisionStatsScreen = lazy(() => import("./components/SubdivisionStatsScreen"))
const MegaCodexScreen = lazy(() => import("./components/MegaCodexScreen"))
const FlagDiagnosticsScreen = lazy(() => import("./components/FlagDiagnosticsScreen"))
const FlagleScreen = lazy(() => import("./components/FlagleScreen"))
const HigherLowerScreen = lazy(() => import("./components/HigherLowerScreen"))
const DeadOrAliveScreen = lazy(() => import("./components/DeadOrAliveScreen"))
const FrankenflagScreen = lazy(() => import("./components/FrankenflagScreen"))
const DescribeItScreen = lazy(() => import("./components/DescribeItScreen"))
const FlagBracketScreen = lazy(() => import("./components/FlagBracketScreen"))
const RealOrBotScreen = lazy(() => import("./components/RealOrBotScreen"))
const ForgeryScreen = lazy(() => import("./components/ForgeryScreen"))
const FlagTimelineScreen = lazy(() => import("./components/FlagTimelineScreen"))
const BorderMapScreen = lazy(() => import("./components/BorderMapScreen"))
const BorderChainScreen = lazy(() => import("./components/BorderChainScreen"))
const FlagGachaScreen = lazy(() => import("./components/FlagGachaScreen"))
const PrideRouletteScreen = lazy(() => import("./components/PrideRouletteScreen"))
const SymbolHuntScreen = lazy(() => import("./components/SymbolHuntScreen"))
const TwoTruthsScreen = lazy(() => import("./components/TwoTruthsScreen"))
const CapitalMatchScreen = lazy(() => import("./components/CapitalMatchScreen"))
const OddBorderOutScreen = lazy(() => import("./components/OddBorderOutScreen"))
const ContinentSortScreen = lazy(() => import("./components/ContinentSortScreen"))
const StatClashScreen = lazy(() => import("./components/StatClashScreen"))
const USCityFlagScreen = lazy(() => import("./components/USCityFlagScreen"))
const WorldCupScreen = lazy(() => import("./components/WorldCupScreen"))
const SupporterScreen = lazy(() => import("./components/SupporterScreen"))
import { setSupporterHandler } from "./utils/supporterNav"
import { FLAGS } from "./data/flags"
import type { FlagRecord } from "./data/flags"
import { loadState, saveState, markFlagLearned, markSubLearned, recordDailyResult, awardCrown, saveShareResult, setPremium, recordGamePlayed } from "./utils/storage"
import type { AppState, ShareResult } from "./utils/storage"
import { buildDailyQuiz, buildSetQuiz } from "./utils/quiz"
import type { Question } from "./utils/quiz"
import { todayString } from "./utils/prng"

type Screen = "splash" | "home" | "flags" | "quiz" | "reversequiz" | "result" | "achievements" | "profile" | "flashcards" | "language" | "capitalquiz" | "challenge" | "codex" | "geo" | "gauntlet" | "tierlist" | "settings" | "oddoneout" | "thecrop" | "flagdna" | "buildflag" | "geopaint" | "sketchflag" | "spoterror" | "flagoutline" | "thepeel" | "lookalikes" | "composer" | "silhouette" | "flagfamilies" | "funfact" | "progressmap" | "historical" | "identity" | "provinceroulette" | "substumper" | "lineage" | "substats" | "megacodex" | "flagle" | "higherlower" | "deadoralive" | "frankenflag" | "describeit" | "flagbracket" | "realorbot" | "forgery" | "timeline" | "bordermap" | "borderchain" | "gacha" | "symbolhunt" | "twotruths" | "capitalmatch" | "oddborder" | "continentsort" | "statclash" | "uscityflags" | "prideroulette" | "flagdiag" | "worldcup" | "supporter" | "connections"

interface ActiveQuiz {
  questions: Question[]
  title: string
  isDaily: boolean
  setId: string
  setFlags: FlagRecord[]
  backTo: Screen // where the quiz's back button goes: Flag Sets only when started there
}

// A failed lazy chunk (flaky network, stale deploy) used to white-screen the
// whole app. Catch it and offer a reload instead.
class ScreenErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: T.bg, color: T.text, padding: 24, textAlign: "center" }}>
        <EarthLogo size={46} />
        <div style={{ fontWeight: 700, fontSize: 17 }}>That screen failed to load</div>
        <div style={{ color: T.muted, fontSize: 13, maxWidth: 260 }}>Usually a connection blip or a fresh update. Reloading fixes it.</div>
        <button onClick={() => window.location.reload()}
          style={{ marginTop: 6, padding: "10px 22px", borderRadius: 999, background: T.amber, color: T.onAccent, fontWeight: 700, fontSize: 14 }}>
          Reload
        </button>
      </div>
    )
  }
}

// Brief placeholder while a code-split screen's chunk loads (usually a blink).
function ScreenFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ opacity: 0.6, animation: "geoPulse 1s ease-in-out infinite" }}>
        <EarthLogo size={46} />
      </div>
      <style>{`@keyframes geoPulse{0%,100%{opacity:0.35}50%{opacity:0.85}}`}</style>
    </div>
  )
}

// Deep link straight into a game: globalio.app/?play=realorbot (any registry
// id), ?play=daily or ?play=quickplay. Lets a social post or bio link drop a
// new player into the exact game they just saw instead of the dashboard.
function readDeepLink(): string | null {
  try {
    const id = new URLSearchParams(window.location.search).get("play")?.toLowerCase()
    if (!id) return null
    if (id === "daily" || id === "quickplay") return id
    return REGISTRY.some(r => r.id === id) ? id : null
  } catch { return null }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash")
  const [appState, setAppState] = useState<AppState>(() => loadState())
  const [showIntro, setShowIntro] = useState<boolean>(() => !hasOnboarded())
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null)
  const [lastResult, setLastResult] = useState<{ score: number; total: number; answers: ("correct" | "wrong")[] } | null>(null)
  const [histRegion, setHistRegion] = useState<HistoricalRegion | undefined>(undefined)
  const [tab, setTab] = useState<TabKey>("today")
  // Deep-link target for the full-screen Codex (e.g. from the World Cup explorer)
  const [codexInitial, setCodexInitial] = useState<string | null>(null)

  // Persist on change — but SKIP the first run. The initial appState is exactly
  // what we just loaded, so re-saving it can only ever hurt: if that load hit a
  // transient localStorage error (iOS eviction, private mode, quota) loadState
  // returns defaults, and an immediate save would overwrite intact data with an
  // empty profile — the "my account reset" bug. Only write after a real change.
  const firstSave = useRef(true)
  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return }
    saveState(appState)
  }, [appState])

  // Keep state in sync when the same profile is open in another tab, or when the
  // tab is restored after the OS evicted+reloaded it. Re-reading on focus means
  // an external write (or recovery) is picked up instead of being clobbered.
  useEffect(() => {
    const resync = () => { if (document.visibilityState === "visible") setAppState(loadState()) }
    const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === "dailyglobe_v1") setAppState(loadState()) }
    document.addEventListener("visibilitychange", resync)
    window.addEventListener("storage", onStorage)
    return () => { document.removeEventListener("visibilitychange", resync); window.removeEventListener("storage", onStorage) }
  }, [])

  // Let any ad component open the Supporter screen without prop-drilling.
  useEffect(() => {
    setSupporterHandler(() => setScreen("supporter"))
    return () => setSupporterHandler(null)
  }, [])

  // The page body behind the app column (visible in the desktop gutters and
  // during screen transitions) follows the active palette — the old hardcoded
  // purple gradient in index.css belonged to the retired "original" skin.
  useEffect(() => { document.body.style.background = T.void }, [])

  // Desktop: make every horizontal rail mouse-draggable. Rails hide their
  // scrollbars and rely on touch swiping, which leaves a plain mouse with no
  // way to scroll sideways. Dragging any .carto-rail scrolls it; a real drag
  // swallows the click so tiles don't launch when you were just scrolling.
  useEffect(() => {
    if (!window.matchMedia?.("(pointer: fine)").matches) return
    let rail: HTMLElement | null = null
    let startX = 0, startLeft = 0, moved = false
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return
      const r = (e.target as HTMLElement).closest?.(".carto-rail") as HTMLElement | null
      if (!r || r.scrollWidth <= r.clientWidth + 4) return
      rail = r; startX = e.clientX; startLeft = r.scrollLeft; moved = false
    }
    const move = (e: PointerEvent) => {
      if (!rail) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) < 6) return
      moved = true
      rail.scrollLeft = startLeft - dx
    }
    const up = () => {
      if (moved && rail) {
        const r = rail
        const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault() }
        r.addEventListener("click", swallow, { capture: true, once: true })
        window.setTimeout(() => r.removeEventListener("click", swallow, { capture: true }), 0)
      }
      rail = null
    }
    document.addEventListener("pointerdown", down, true)
    document.addEventListener("pointermove", move, true)
    document.addEventListener("pointerup", up, true)
    document.addEventListener("pointercancel", up, true)
    return () => {
      document.removeEventListener("pointerdown", down, true)
      document.removeEventListener("pointermove", move, true)
      document.removeEventListener("pointerup", up, true)
      document.removeEventListener("pointercancel", up, true)
    }
  }, [])

  const startDaily = useCallback(() => {
    const questions = buildDailyQuiz(todayString(), 10)
    setActiveQuiz({ questions, title: "Daily Game", isDaily: true, setId: "daily", setFlags: FLAGS, backTo: "home" })
    setScreen("quiz")
  }, [])

  const startSet = useCallback((setId: string, flags: FlagRecord[], backTo: Screen = "flags") => {
    const seed = `${setId}-${Date.now()}`
    const questions = buildSetQuiz(flags, seed, flags.length)
    const label = setId.charAt(0).toUpperCase() + setId.slice(1).replace(/-/g, " ")
    setActiveQuiz({ questions, title: label, isDaily: false, setId, setFlags: flags, backTo })
    setScreen("quiz")
  }, [])

  const startQuickPlay = useCallback(() => {
    const seed = Date.now().toString()
    const questions = buildSetQuiz(FLAGS, seed, 10)
    setActiveQuiz({ questions, title: "Quick Play", isDaily: false, setId: "quickplay", setFlags: FLAGS, backTo: "home" })
    setScreen("quiz")
  }, [])

  const startReverseQuiz = useCallback(() => {
    const seed = Date.now().toString()
    const questions = buildSetQuiz(FLAGS, seed, 10)
    setActiveQuiz({ questions, title: "Flag ID Challenge", isDaily: false, setId: "reversequiz", setFlags: FLAGS, backTo: "home" })
    setScreen("reversequiz")
  }, [])

  const finishSplash = useCallback(() => {
    const link = readDeepLink()
    // Drop the param so a later refresh lands on the dashboard, not the game again.
    if (link) try { window.history.replaceState(null, "", window.location.pathname) } catch { /* ignore */ }
    if (link === "daily") startDaily()
    else if (link === "quickplay") startQuickPlay()
    else if (link === "reversequiz") startReverseQuiz()
    else setScreen(link ? link as Screen : "home")
  }, [startDaily, startQuickPlay, startReverseQuiz])

  // Open straight onto the dashboard (or a ?play= deep link) before the first
  // paint. There used to be a 1.6-second logo splash here; it held back the
  // page for every visitor and crawler, so it's gone.
  const booted = useRef(false)
  useLayoutEffect(() => {
    if (booted.current) return
    booted.current = true
    finishSplash()
  }, [finishSplash])

  const handleQuizFinish = useCallback((answers: ("correct" | "wrong")[]) => {
    if (!activeQuiz) return
    const score = answers.filter(a => a === "correct").length
    const total = answers.length
    let newState = { ...appState }
    activeQuiz.questions.forEach((q, i) => {
      if (answers[i] === "correct") newState = markFlagLearned(newState, q.target.code)
    })
    if (activeQuiz.isDaily) {
      newState = recordDailyResult(newState, { score, total, date: todayString(), answers })
    }
    const allLearned = activeQuiz.setFlags.every(f => newState.learnedFlags.includes(f.code))
    if (allLearned && !activeQuiz.isDaily) newState = awardCrown(newState, activeQuiz.setId)
    newState = recordGamePlayed(newState)
    setAppState(newState)
    setLastResult({ score, total, answers })
    setScreen("result")
  }, [activeQuiz, appState])

  const handleSubLearned = useCallback((code: string) => {
    setAppState(s => markSubLearned(s, code))
  }, [])

  const handleRetry = useCallback(() => {
    if (!activeQuiz) return
    if (activeQuiz.setId === "quickplay") { startQuickPlay(); return }
    if (activeQuiz.setId === "reversequiz") { startReverseQuiz(); return }
    startSet(activeQuiz.setId, activeQuiz.setFlags, activeQuiz.backTo)
  }, [activeQuiz, startQuickPlay, startReverseQuiz, startSet])

  return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      {/* Persistent home logo — fixed top-right on every screen except splash/home.
          Tapping it always jumps back to the home page. On phones it's hidden
          (see .geo-home-pill in index.css): it sat on top of the score, round
          counter and best score in most game headers, and every game already
          has its own back button that goes home. */}
      {screen !== "splash" && screen !== "home" && screen !== "megacodex" && screen !== "flagdiag" && (
        <button
          onClick={() => setScreen("home")}
          aria-label="Home"
          title="Home"
          className="geo-home-pill"
          style={{
            position: "fixed", top: 10, right: 12, zIndex: 50,
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px 6px 8px", borderRadius: 999,
            background: `${T.surface}EB`,
            border: `1px solid ${T.line}`,
            boxShadow: "0 1px 2px rgba(31,58,60,0.05), 0 8px 20px -14px rgba(31,58,60,0.25)",
            backdropFilter: "blur(6px)", cursor: "pointer",
          }}
        >
          <EarthLogo size={24} />
          <span style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>Home</span>
        </button>
      )}

      <ScreenErrorBoundary>
      <Suspense fallback={<ScreenFallback />}>
      {screen === "home" && (
        <MainTabs state={appState} tab={tab} onTab={setTab}
          intro={showIntro ? <Onboarding onDone={() => setShowIntro(false)} /> : null}
          onNavigate={(s) => setScreen(s as Screen)}
          onQuickPlay={startQuickPlay} onStartDaily={startDaily} onReverseQuiz={startReverseQuiz}
          onSetUsername={name => setAppState(s => ({ ...s, username: name }))} />
      )}

      {screen === "flags" && (
        <FlagsScreen state={appState} onBack={() => setScreen("home")} onStartSet={(id, flags) => startSet(id, flags, "flags")}
          onStartHistorical={(region) => { setHistRegion(region); setScreen("historical") }}
          onGoIdentity={() => setScreen("identity")} />
      )}

      {screen === "flashcards" && (
        <FlashcardsScreen onBack={() => setScreen("home")} onQuizSet={flags => startSet("flashcards-all", flags, "home")} />
      )}

      {screen === "language" && <LanguageQuizScreen onBack={() => setScreen("home")} />}
      {screen === "capitalquiz" && <CapitalQuizScreen onBack={() => setScreen("home")} />}
      {screen === "challenge" && <ChallengeScreen onBack={() => setScreen("home")} />}
      {screen === "codex" && <CodexScreen onBack={() => { setCodexInitial(null); setScreen("home") }} initialCode={codexInitial} />}
      {screen === "geo" && <GeoQuizScreen onBack={() => setScreen("home")} />}
      {screen === "gauntlet" && <GauntletScreen onBack={() => setScreen("home")} />}
      {screen === "tierlist" && <TierListScreen onBack={() => setScreen("home")} />}
      {screen === "settings"   && <SettingsScreen onBack={() => setScreen("home")} onMegaCodex={() => setScreen("megacodex")} onFlagCheck={() => setScreen("flagdiag")} />}
      {screen === "oddoneout"  && <OddOneOutScreen  onBack={() => setScreen("home")} />}
      {screen === "connections" && <ConnectionsScreen onBack={() => setScreen("home")} onFinish={() => setAppState(s => recordGamePlayed(s))} />}
      {screen === "thecrop"    && <TheCropScreen    onBack={() => setScreen("home")} />}
      {screen === "flagdna"    && <FlagDNAScreen     onBack={() => setScreen("home")} />}
      {screen === "buildflag"    && <BuildFlagScreen    onBack={() => setScreen("home")} />}
      {screen === "geopaint"     && <GeoPaintScreen     onBack={() => setScreen("home")} />}
      {screen === "sketchflag"   && <SketchFlagScreen   onBack={() => setScreen("home")} />}
      {screen === "spoterror"    && <SpotErrorScreen    onBack={() => setScreen("home")} />}
      {screen === "flagoutline"  && <FlagOutlineScreen  onBack={() => setScreen("home")} />}
      {screen === "thepeel"      && <ThePeelScreen      onBack={() => setScreen("home")} />}
      {screen === "lookalikes"   && <ConfusablesScreen  onBack={() => setScreen("home")} />}
      {screen === "composer"     && <TheComposerScreen  onBack={() => setScreen("home")} />}
      {screen === "silhouette"   && <SilhouetteScreen   onBack={() => setScreen("home")} />}
      {screen === "flagfamilies" && <FlagFamiliesScreen onBack={() => setScreen("home")} />}
      {screen === "funfact"      && (
        <FunFactScreen state={appState} onBack={() => setScreen("home")}
          onStateChange={setAppState} />
      )}
      {screen === "profile" && (
        <ProfileScreen state={appState} onBack={() => setScreen("home")}
          onSetUsername={name => setAppState(s => ({ ...s, username: name }))} />
      )}
      {screen === "achievements" && <AchievementsScreen state={appState} onBack={() => setScreen("home")} />}
      {screen === "progressmap" && <ProgressMapScreen state={appState} onBack={() => setScreen("home")} />}
      {screen === "historical" && <HistoricalFlagScreen onBack={() => setScreen("home")} region={histRegion} />}
      {screen === "identity" && <IdentityFlagScreen onBack={() => setScreen("home")} />}
      {screen === "provinceroulette" && <ProvinceRouletteScreen onBack={() => setScreen("home")} onSubLearned={handleSubLearned} />}
      {screen === "substumper" && <SubdivisionStumperScreen onBack={() => setScreen("home")} onSubLearned={handleSubLearned} />}
      {screen === "lineage" && <LineageScreen onBack={() => setScreen("home")} />}
      {screen === "substats" && <SubdivisionStatsScreen state={appState} onBack={() => setScreen("home")} />}
      {screen === "megacodex" && <MegaCodexScreen onBack={() => setScreen("settings")} />}
      {screen === "flagdiag"  && <FlagDiagnosticsScreen onBack={() => setScreen("settings")} />}
      {screen === "flagle"       && <FlagleScreen       onBack={() => setScreen("home")} />}
      {screen === "higherlower"  && <HigherLowerScreen  onBack={() => setScreen("home")} />}
      {screen === "deadoralive"  && <DeadOrAliveScreen  onBack={() => setScreen("home")} />}
      {screen === "frankenflag"  && <FrankenflagScreen  onBack={() => setScreen("home")} />}
      {screen === "describeit"   && <DescribeItScreen   onBack={() => setScreen("home")} />}
      {screen === "flagbracket"  && <FlagBracketScreen  onBack={() => setScreen("home")} />}
      {screen === "realorbot"    && <RealOrBotScreen    onBack={() => setScreen("home")} />}
      {screen === "forgery"      && <ForgeryScreen      onBack={() => setScreen("home")} />}
      {screen === "timeline"     && <FlagTimelineScreen onBack={() => setScreen("home")} />}
      {screen === "bordermap"    && <BorderMapScreen    onBack={() => setScreen("home")} />}
      {screen === "borderchain"  && <BorderChainScreen  onBack={() => setScreen("home")} />}
      {screen === "gacha"        && <FlagGachaScreen    onBack={() => setScreen("home")} />}
      {screen === "prideroulette" && <PrideRouletteScreen onBack={() => setScreen("home")} />}
      {screen === "symbolhunt"   && <SymbolHuntScreen   onBack={() => setScreen("home")} />}
      {screen === "twotruths"    && <TwoTruthsScreen    onBack={() => setScreen("home")} />}
      {screen === "capitalmatch" && <CapitalMatchScreen onBack={() => setScreen("home")} />}
      {screen === "oddborder"    && <OddBorderOutScreen onBack={() => setScreen("home")} />}
      {screen === "continentsort"&& <ContinentSortScreen onBack={() => setScreen("home")} />}
      {screen === "statclash"    && <StatClashScreen    onBack={() => setScreen("home")} />}
      {screen === "uscityflags"  && <USCityFlagScreen   onBack={() => setScreen("home")} />}
      {screen === "worldcup"     && <WorldCupScreen     onBack={() => setScreen("home")} onOpenCodex={(code) => { setCodexInitial(code); setScreen("codex") }} />}
      {screen === "supporter"    && (
        <SupporterScreen onBack={() => setScreen("home")}
          premium={appState.premium}
          onSetPremium={(on) => setAppState(s => setPremium(s, on))} />
      )}

      {screen === "quiz" && activeQuiz && (
        <QuizScreen questions={activeQuiz.questions} title={activeQuiz.title}
          onFinish={handleQuizFinish} onBack={() => setScreen(activeQuiz.backTo)} />
      )}

      {screen === "reversequiz" && activeQuiz && (
        <ReverseQuizScreen questions={activeQuiz.questions} title={activeQuiz.title}
          onFinish={handleQuizFinish} onBack={() => setScreen("home")} />
      )}

      {screen === "result" && lastResult && activeQuiz && (
        <ResultScreen score={lastResult.score} total={lastResult.total} answers={lastResult.answers}
          isDaily={activeQuiz.isDaily} setLabel={activeQuiz.title}
          streak={appState.currentStreak}
          onHome={() => {
            // The daily is the day's ritual — landing on Play afterwards rolls
            // straight into "one more game" instead of a dead end.
            if (activeQuiz.isDaily) setTab("play")
            setScreen("home")
          }}
          onRetry={activeQuiz.isDaily ? undefined : handleRetry}
          onSaveShare={(r: ShareResult) => setAppState(s => saveShareResult(s, r))} />
      )}
      </Suspense>
      </ScreenErrorBoundary>

      {/* Boxed ad break over the result screen (dormant until ads are live) */}
    </div>
  )
}

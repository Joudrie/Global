import { lazy, Suspense, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { LineIcon, CrownIcon } from "./icons"
import ProfileView, { CardTool, cardLink, fmt, playerData } from "./ProfileView"
import YouProfile, { useProfileTick } from "./YouProfile"
import AdBox from "./AdBox"
import { AD_SLOTS, SUPPORTER_LIVE } from "../ads"
import { FLAGS } from "../data/flags"
import { achievementById } from "../data/achievements"
import { groupsFor } from "../ui/registry"
import type { AppState } from "../utils/storage"
import { gameSnapshot } from "../utils/backup"
import { MAIN_KEY } from "../utils/mergeProgress"
import type { Snapshot } from "../utils/mergeProgress"
import { openSupporter } from "../utils/supporterNav"
import { accountsVisible, hasStoredSession, profilesVisible, SIGN_IN_ERROR, SIGN_IN_RETURN } from "../accounts"
import { useAccount } from "../account/useAccount"
import { unlocksOf } from "../profile/achievements"
import { bestsList, statsOf } from "../profile/stats"
import { demoProfile } from "../profile/demo"
import { demoOn, leaveDemo } from "../profile/link"

/* The You tab: your profile first (./YouProfile.tsx), then one calm "Your
   progress" list (World mastery, Trophy shelf, Daily log, best scores,
   activity, the Collection tools and Gacha), a slim sign-in row while signed
   out (nothing once signed in: the sync status is in Settings), Find a player
   while profiles are on, and Support and Send feedback as small rows. With
   ?demo=1 the sample profile "Bob" shows first, labelled, and read-only. */

const FindPlayer = lazy(() => import("./FindPlayer"))
const AccountCard = lazy(() => import("./AccountCard"))

const FEEDBACK_HREF = "mailto:sjoudrie@gmail.com?subject=" + encodeURIComponent("Globalio feedback") +
  "&body=" + encodeURIComponent("What I love / what I'd change / an idea:\n\n")

const CROWN_SETS = [
  { id: "world", label: "World" }, { id: "europe", label: "Europe" }, { id: "africa", label: "Africa" }, { id: "asia", label: "Asia" },
  { id: "americas", label: "Americas" }, { id: "oceania", label: "Oceania" }, { id: "middle-east", label: "Mid-East" },
]
const REGIONS = ["Europe", "Africa", "Asia", "Americas", "Middle East", "Oceania"] as const

const Loading = ({ text }: { text: string }) => (
  <div role="status" aria-busy="true" style={{ padding: "16px 0", fontSize: 13, color: T.muted }}>{text}</div>
)

const card = { borderRadius: 12, background: T.surface, border: `1px solid ${T.line}` } as const

// ── Rows ────────────────────────────────────────────────────────────────────

function RowFace({ icon, title, value, end }: { icon: string; title: string; value?: ReactNode; end: ReactNode }) {
  return (
    <>
      <LineIcon name={icon} size={18} color={T.muted} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{title}</span>
      {value != null && <span style={{ flexShrink: 0, fontSize: 13, color: T.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</span>}
      <span aria-hidden style={{ display: "flex", flexShrink: 0 }}>{end}</span>
    </>
  )
}

const rowStyle = { width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: 12, padding: "4px 12px", background: "transparent", border: "1px solid transparent", borderRadius: 12, textAlign: "left", cursor: "pointer", textDecoration: "none" } as const

/** A row that opens a screen. */
function NavRow({ icon, title, value, onClick }: { icon: string; title: string; value?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="pf-row" style={rowStyle}>
      <RowFace icon={icon} title={title} value={value} end={<LineIcon name="chevronright" size={16} color={T.dim} />} />
    </button>
  )
}

/** A row that folds open in place. */
function FoldRow({ icon, title, value, open, onToggle, children, id }: {
  icon: string; title: string; value?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode; id: string
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="pf-row" style={rowStyle}>
        <RowFace icon={icon} title={title} value={value}
          end={<span style={{ display: "flex", transform: open ? "rotate(180deg)" : undefined }}><LineIcon name="chevrondown" size={16} color={T.dim} /></span>} />
      </button>
      {open && <div id={id} style={{ padding: "4px 12px 12px 42px" }}>{children}</div>}
    </div>
  )
}

const Divider = () => <div aria-hidden style={{ height: 1, background: T.line, margin: "0 12px" }} />

function List({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean)
  return (
    <div style={{ ...card, padding: 0 }}>
      {items.map((c, i) => <div key={i}>{i > 0 && <Divider />}{c}</div>)}
    </div>
  )
}

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="geo-display" style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: T.text }}>{children}</h2>
)

const when = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
/** "24 Nov" for a "2026-11-24" Daily Game, read as that local day (not UTC
 *  midnight, which is the day before west of London). */
const dayText = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

// ── "Your progress" ─────────────────────────────────────────────────────────

function Progress({ state, onNavigate, stats, unlocks }: {
  state: AppState; onNavigate: (s: string) => void
  stats: ReturnType<typeof statsOf>; unlocks: Record<string, number>
}) {
  const [open, setOpen] = useState("")
  const fold = (id: string) => ({ open: open === id, onToggle: () => setOpen(o => (o === id ? "" : id)), id: `you-${id}` })
  const learned = state.learnedFlags.length
  const pct = FLAGS.length ? Math.round((learned / FLAGS.length) * 100) : 0
  const crowns = state.crowns.filter(id => CROWN_SETS.some(c => c.id === id)).length
  const regions = REGIONS.map(region => {
    const inRegion = FLAGS.filter(f => f.region === region)
    const got = inRegion.filter(f => state.learnedFlags.includes(f.code)).length
    return { region, got, total: inRegion.length, done: inRegion.length > 0 && got >= inRegion.length }
  })
  const days = Object.keys(state.dailyHistory).sort().slice(-7)
  const bests = bestsList(stats)
  const activity = Object.entries(unlocks).sort((a, b) => b[1] - a[1]).filter(([id]) => achievementById(id))
  let gacha = 0
  try { const raw = localStorage.getItem("globalio_gacha"); gacha = new Set<string>(raw ? (JSON.parse(raw).collected ?? []) : []).size } catch { /* none */ }
  const tools = groupsFor("you").flatMap(g => g.entries)

  return (
    <section aria-label="Your progress">
      <H>Your progress</H>
      <List>
        {[
          <FoldRow key="mastery" icon="globe" title="World mastery" value={`${pct}% · ${learned}/${FLAGS.length}`} {...fold("mastery")}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {regions.map(r => (
                <li key={r.region} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 92, flexShrink: 0, fontSize: 13, color: T.text, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {r.region}{r.done && <CrownIcon size={12} color={T.gold} strokeWidth={1.7} aria-label="complete" />}
                  </span>
                  <span style={{ flex: 1, height: 4, borderRadius: 2, overflow: "hidden", background: tint(T.text, 0.08) }}>
                    <span style={{ display: "block", width: `${r.total ? (r.got / r.total) * 100 : 0}%`, height: "100%", background: r.done ? T.gold : ACCENT.learn }} />
                  </span>
                  <span style={{ width: 48, flexShrink: 0, textAlign: "right", fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontSize: 12, color: T.muted }}>{r.got}/{r.total}</span>
                </li>
              ))}
            </ul>
          </FoldRow>,
          <FoldRow key="crowns" icon="crown" title="Trophy shelf" value={`${crowns} of ${CROWN_SETS.length} crowns`} {...fold("crowns")}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
              {CROWN_SETS.map(c => {
                const got = state.crowns.includes(c.id)
                return (
                  <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: got ? T.gold : T.dim }}>
                    <CrownIcon size={14} color={got ? T.gold : T.dim} strokeWidth={1.6} />{c.label}
                  </li>
                )
              })}
            </ul>
          </FoldRow>,
          days.length > 0 && (
            <FoldRow key="daily" icon="today" title="Daily log" value={`Last ${days.length} ${days.length === 1 ? "day" : "days"}`} {...fold("daily")}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {days.map(day => {
                  const r = state.dailyHistory[day]
                  const ratio = r && r.total ? r.score / r.total : 0
                  const c = ratio >= 0.8 ? T.green : ratio >= 0.5 ? T.amber : T.danger
                  return (
                    <li key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ minWidth: 44, padding: "4px 8px", borderRadius: 8, textAlign: "center", fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontSize: 12, fontWeight: 600, color: c, border: `1px solid ${tint(c, 0.4)}` }}>{r.score}/{r.total}</span>
                      <span style={{ fontSize: 11, color: T.muted, fontFamily: FONT.mono }}>{dayText(day)}</span>
                    </li>
                  )
                })}
              </ul>
            </FoldRow>
          ),
          bests.length > 0 && (
            <FoldRow key="bests" icon="trophy" title="Best scores" value={`${bests.length} ${bests.length === 1 ? "game" : "games"}`} {...fold("bests")}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {bests.map(b => (
                  <li key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, fontSize: 14 }}>
                    <span style={{ flex: 1, minWidth: 0, color: T.text, overflowWrap: "anywhere" }}>{b.title}</span>
                    <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 600, color: T.text }}>{fmt(b.value)}</span>
                  </li>
                ))}
              </ul>
            </FoldRow>
          ),
          activity.length > 0 && (
            <FoldRow key="activity" icon="history" title="Activity" value={`${activity.length} unlocked`} {...fold("activity")}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {activity.map(([id, at]) => (
                  <li key={id} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, fontSize: 14 }}>
                    <span style={{ flex: 1, minWidth: 0, color: T.text, overflowWrap: "anywhere" }}>Unlocked <strong style={{ fontWeight: 600 }}>{achievementById(id)!.title}</strong></span>
                    <span style={{ flexShrink: 0, fontSize: 12, color: T.dim, fontVariantNumeric: "tabular-nums" }}>{when(at)}</span>
                  </li>
                ))}
              </ul>
            </FoldRow>
          ),
          ...tools.map(e => {
            const p = e.progress?.(state)
            return <NavRow key={e.id} icon={e.id} title={e.title} value={p ? `${fmt(p.done)}/${fmt(p.total)}` : undefined} onClick={() => onNavigate(e.id)} />
          }),
          <NavRow key="gacha" icon="gacha" title="Gacha collection" value={gacha ? `${gacha}/${FLAGS.length}` : "Daily pull"} onClick={() => onNavigate("gacha")} />,
        ]}
      </List>
    </section>
  )
}

// ── Sign in, find a player, the sample profile ──────────────────────────────

function SignInRow({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { view } = useAccount()
  const [seen, setSeen] = useState(open)
  if (open && !seen) setSeen(true)
  const signedIn = view?.ready ? view.signedIn : hasStoredSession()
  // Signed in: nothing here (the sync status is in Settings), unless the
  // player just signed in from this row, so they see that it worked.
  if (signedIn && !seen) return null
  return (
    <div id="pf-signin" style={card}>
      <FoldRow icon="profile" title={signedIn ? "Your account" : "Sign in to keep your progress on every device"} open={open} onToggle={onToggle} id="you-signin">
        <div style={{ marginLeft: -30 }}>
          <Suspense fallback={<Loading text="Loading sign-in…" />}><AccountCard compact /></Suspense>
        </div>
      </FoldRow>
    </div>
  )
}

/** Bob, as another player's profile would show. Built fresh; never saved. */
function demoData() {
  const d = demoProfile()
  return playerData(d.player, { name: d.name, unlocks: d.unlocks })
}

function DemoLabel({ onLeave }: { onLeave: () => void }) {
  return (
    <div role="note" aria-label="Example profile" style={{ ...card, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="geo-micro" style={{ fontSize: 11, color: ACCENT.learn }}>Example profile</span>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: T.muted }}>
        Sample data. Bob isn’t a real player and nothing is saved.{" "}
        <button type="button" onClick={onLeave} className="pf-link" style={{ padding: 0, minHeight: 0, background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: ACCENT.learn, cursor: "pointer" }}>Show my profile</button>
      </p>
    </div>
  )
}

export default function YouTab({ state, onNavigate, onSetName, onOpenPlayer }: {
  state: AppState
  onNavigate: (s: string) => void
  onSetName: (name: string) => void
  onOpenPlayer: (username: string) => void
}) {
  const tick = useProfileTick()
  const [accounts] = useState(accountsVisible)
  const [publicOn] = useState(profilesVisible)
  const [demo, setDemo] = useState(demoOn)
  const [signInOpen, setSignInOpen] = useState(() => SIGN_IN_RETURN || !!SIGN_IN_ERROR)
  const [findOpen, setFindOpen] = useState(false)
  const snap = useMemo<Snapshot>(() => ({ ...gameSnapshot(), [MAIN_KEY]: JSON.stringify(state) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, tick])
  const demoView = useMemo(() => (demo ? demoData() : null), [demo])
  const stats = statsOf(snap)
  const unlocks = unlocksOf(snap)
  const openSignIn = () => {
    setSignInOpen(true)
    window.requestAnimationFrame(() => document.getElementById("pf-signin")?.scrollIntoView({ block: "center" }))
  }

  return (
    <div className="carto-slide-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {demoView ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DemoLabel onLeave={() => { leaveDemo(); setDemo(false) }} />
          <ProfileView data={demoView} tools={<CardTool data={demoView} link={cardLink(null)} />} />
        </div>
      ) : (
        <YouProfile state={state} snap={snap} onSetName={onSetName} onNavigate={onNavigate} onSignIn={openSignIn} />
      )}

      <Progress state={state} onNavigate={onNavigate} stats={stats} unlocks={unlocks} />

      {(accounts || publicOn) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {accounts && <SignInRow open={signInOpen} onToggle={() => setSignInOpen(o => !o)} />}
          {publicOn && (
            <div style={card}>
              <FoldRow icon="search" title="Find a player" open={findOpen} onToggle={() => setFindOpen(o => !o)} id="you-find">
                <div style={{ marginLeft: -30 }}>
                  <Suspense fallback={<Loading text="Loading search…" />}><FindPlayer onOpen={onOpenPlayer} /></Suspense>
                </div>
              </FoldRow>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SUPPORTER_LIVE && !state.premium && (
          <div style={card}><NavRow icon="heart" title="Support Globalio" value="$2 one-time" onClick={openSupporter} /></div>
        )}
        <a href={FEEDBACK_HREF} className="pf-row" style={{ ...rowStyle, ...card }}>
          <RowFace icon="mail" title="Send feedback or ideas" end={<LineIcon name="chevronright" size={16} color={T.dim} />} />
        </a>
      </div>

      <AdBox slot={AD_SLOTS.youFooter} />
    </div>
  )
}

import { lazy, Suspense, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { LineIcon, CrownIcon } from "./icons"
import ProfileLook, { CardTool, EditPill, lookFromView } from "./ProfileLooks"
import type { LookData, OwnControls } from "./ProfileLooks"
import { cardLink, fmt, rankFor } from "./ProfileView"
import { avatarFor, clampName, UsernameSection, useProfileTick } from "./YouProfile"
import AdBox from "./AdBox"
import { AD_SLOTS, SUPPORTER_LIVE } from "../ads"
import { FLAGS } from "../data/flags"
import { achievementById } from "../data/achievements"
import { groupsFor } from "../ui/registry"
import type { AppState } from "../utils/storage"
import { gameSnapshot } from "../utils/backup"
import { MAIN_KEY } from "../utils/mergeProgress"
import type { Snapshot } from "../utils/mergeProgress"
import { todayString } from "../utils/prng"
import { openSupporter } from "../utils/supporterNav"
import { accountsVisible, hasStoredSession, profilesVisible, SIGN_IN_ERROR, SIGN_IN_RETURN } from "../accounts"
import { useAccount } from "../account/useAccount"
import { unlocksOf } from "../profile/achievements"
import { monthName, profileOf, saveProfile } from "../profile/local"
import { bestsList, shownStreak, statsOf } from "../profile/stats"
import { hasUpload, offeredDesigns } from "../profile/public"
import { demoProfile } from "../profile/demo"
import { LOOK_NAMES, LOOKS, demoOn, leaveDemo, setLook } from "../profile/look"
import type { Look } from "../profile/look"

/* The You tab with a trial layout chosen (?look=a|b|c): the profile first, in
   that layout, then one calm "Your progress" list (World mastery, Trophy
   shelf, Daily log, best scores, activity, the Collection tools and Gacha),
   a slim sign-in row while signed out (nothing once signed in: the sync
   status is in Settings), Find a player while profiles are on, a small
   layout switch for the trial, and Send feedback as a small row. With
   ?demo=1 the sample profile "Bob" shows first, labelled, and read-only. */

const ProfileEditor = lazy(() => import("./ProfileEditor"))
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
    <button type="button" onClick={onClick} className="look-row" style={rowStyle}>
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
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="look-row" style={rowStyle}>
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

// ── "Your progress" ─────────────────────────────────────────────────────────

function Progress({ state, look, onNavigate, stats, unlocks }: {
  state: AppState; look: Look; onNavigate: (s: string) => void
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
                      <span style={{ fontSize: 11, color: T.muted, fontFamily: FONT.mono }}>{day.slice(5)}</span>
                    </li>
                  )
                })}
              </ul>
            </FoldRow>
          ),
          look !== "b" && bests.length > 0 && (
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

// ── Sign in, find a player, the trial switch, feedback ──────────────────────

function SignInRow({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { view } = useAccount()
  const [seen, setSeen] = useState(open)
  if (open && !seen) setSeen(true)
  const signedIn = view?.ready ? view.signedIn : hasStoredSession()
  // Signed in: nothing here (the sync status is in Settings), unless the
  // player just signed in from this row, so they see that it worked.
  if (signedIn && !seen) return null
  return (
    <div id="look-signin" style={card}>
      <FoldRow icon="profile" title={signedIn ? "Your account" : "Sign in to keep your progress on every device"} open={open} onToggle={onToggle} id="you-signin">
        <div style={{ marginLeft: -30 }}>
          <Suspense fallback={<Loading text="Loading sign-in…" />}><AccountCard compact /></Suspense>
        </div>
      </FoldRow>
    </div>
  )
}

function LookSwitch({ look, onLook, compact = false }: { look: Look; onLook: (l: Look | null) => void; compact?: boolean }) {
  const choose = (l: Look | null) => { setLook(l); onLook(l) }
  return (
    <div role="group" aria-label="Profile layout (trial)" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
      {!compact && <span style={{ fontSize: 13, color: T.muted, marginRight: 4 }}>Profile layout (trial)</span>}
      {LOOKS.map(l => (
        <button key={l} type="button" aria-pressed={look === l} onClick={() => choose(l)} title={LOOK_NAMES[l]} aria-label={`Layout ${l.toUpperCase()}: ${LOOK_NAMES[l]}`} className="look-hit"
          style={{ minWidth: 40, minHeight: 44, padding: 0, background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <span className="look-face" style={{ width: 32, height: 32, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
            color: look === l ? T.onAccent : T.text, background: look === l ? ACCENT.learn : T.surface, border: `1px solid ${look === l ? ACCENT.learn : T.line}` }}>{l.toUpperCase()}</span>
        </button>
      ))}
      {!compact && <EditPill text="Current profile" onClick={() => choose(null)} />}
    </div>
  )
}

// ── Your own profile ────────────────────────────────────────────────────────

function NameField({ name, onSave }: { name: string; onSave: (n: string) => void }) {
  const [draft, setDraft] = useState(name)
  const [said, setSaid] = useState("")
  const clean = clampName(draft.trim())
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 className="geo-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Name</h3>
      <form onSubmit={e => { e.preventDefault(); onSave(clean); setDraft(clean); setSaid(clean ? "Name saved." : "Name removed.") }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label htmlFor="look-name" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Your name</label>
        <input id="look-name" value={draft} placeholder="Explorer" autoComplete="nickname" onChange={e => { setDraft(clampName(e.target.value)); setSaid("") }}
          style={{ flex: 1, minWidth: 0, height: 44, padding: "0 12px", borderRadius: 10, fontSize: 16, background: T.surface, border: `1px solid ${T.line}`, color: T.text, outline: "none" }} />
        <button type="submit" disabled={clean === name.trim()} className="look-row"
          style={{ flexShrink: 0, height: 44, padding: "0 16px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: clean === name.trim() ? "not-allowed" : "pointer",
            color: clean === name.trim() ? T.dim : T.text, background: T.surface, border: `1px solid ${T.line}` }}>Save</button>
      </form>
      <span role="status" className="text-xs" style={{ color: T.green, minHeight: 16 }}>{said}</span>
    </section>
  )
}

function OwnProfile({ state, look, onSetName, onNavigate, onSignIn, snap }: {
  state: AppState; look: Look; onSetName: (n: string) => void; onNavigate: (s: string) => void; onSignIn: () => void; snap: Snapshot
}) {
  const [publicOn] = useState(profilesVisible)
  const [editing, setEditing] = useState<null | { startAt?: "designs" }>(null)
  const { svc, view } = useAccount()
  const profile = profileOf(snap)
  const stats = statsOf(snap)
  const unlocks = unlocksOf(snap)
  const signedIn = !!view?.ready && view.signedIn
  const mine = publicOn && signedIn ? view?.profile.mine ?? null : null
  const offered = offeredDesigns(snap).filter(d => !hasUpload(d))
  const designs = profile.designs.map(id => offered.find(d => d.id === id)).filter((d): d is Record<string, unknown> => !!d)
  const name = state.username.trim() || "Explorer"

  const data: LookData = {
    name,
    handle: mine?.username ?? null,
    badge: signedIn ? view?.badge ?? null : null,
    rank: rankFor(stats.flags),
    since: monthName(stats.since),
    bio: profile.bio,
    banner: profile.banner,
    picture: avatarFor(profile.picture, snap),
    pinned: profile.pinned.filter(id => unlocks[id]),
    stats,
    streak: shownStreak(stats, todayString()),
    activity: stats.activity,
    designs,
    unlocks,
    allKnown: true,
  }
  const own: OwnControls = {
    onEdit: () => setEditing({}),
    onPin: pinned => { saveProfile({ pinned }) },
    onMakeFlag: () => onNavigate("flagstudio"),
    onChooseFlags: () => setEditing({ startAt: "designs" }),
    hasDesigns: offered.length > 0,
  }
  // The card carries the username once there is one, as before.
  const link = cardLink(mine && mine.isPublic && !mine.hidden ? mine.username : null)
  return (
    <>
      <ProfileLook look={look} data={data} own={own} tools={<CardTool data={{ ...data, name: mine?.username ?? name }} link={link} />} />
      {editing && (
        <Suspense fallback={null}>
          <ProfileEditor onClose={() => setEditing(null)} showDesignChoice startAt={editing.startAt}
            designTitle="Published flags"
            designNote={publicOn
              ? "Choose which of your Flag Studio designs show under Published flags. Anyone can see them on your public profile. Their names stay private."
              : "Choose which of your Flag Studio designs show under Published flags on your profile. Their names stay private."}
            top={<>
              <NameField name={state.username} onSave={onSetName} />
              {publicOn && <UsernameSection svc={svc} signedIn={view?.ready ? view.signedIn : hasStoredSession()} ready={!!view?.ready}
                onSignIn={() => { setEditing(null); onSignIn() }} />}
            </>} />
        </Suspense>
      )}
    </>
  )
}

/** Bob, as another player's profile would show. Built fresh; never saved. */
function demoData(): LookData {
  const d = demoProfile()
  const p = d.player
  return lookFromView({
    name: d.name, badge: p.badge, rank: rankFor(p.stats.flags), since: monthName(p.stats.since), bio: p.bio, banner: p.banner,
    picture: p.picture, pinned: p.pinned, stats: p.stats, streak: shownStreak(p.stats, todayString()), activity: p.stats.activity, designs: p.designs,
  }, { handle: p.username, unlocks: d.unlocks })
}

function DemoLabel({ look, onLook, onLeave }: { look: Look; onLook: (l: Look | null) => void; onLeave: () => void }) {
  return (
    <div role="note" aria-label="Example profile" style={{ ...card, padding: "0 4px 4px 12px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span className="geo-micro" style={{ fontSize: 11, color: ACCENT.learn }}>Example profile</span>
        <LookSwitch look={look} onLook={onLook} compact />
      </div>
      <p style={{ margin: 0, paddingRight: 8, fontSize: 13, lineHeight: 1.5, color: T.muted }}>
        Sample data for layout {look.toUpperCase()}, {LOOK_NAMES[look]}. Bob isn’t a real player and nothing is saved.{" "}
        <button type="button" onClick={onLeave} className="look-link" style={{ padding: 0, minHeight: 0, background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: ACCENT.learn, cursor: "pointer" }}>Show my profile</button>
      </p>
    </div>
  )
}

export default function YouLooks({ state, look, onLook, onNavigate, onSetName, onOpenPlayer }: {
  state: AppState
  look: Look
  onLook: (l: Look | null) => void
  onNavigate: (s: string) => void
  onSetName: (name: string) => void
  onOpenPlayer: (username: string) => void
}) {
  const tick = useProfileTick()
  const [accounts] = useState(accountsVisible)
  const [publicOn] = useState(profilesVisible)
  const [demo, setDemo] = useState(() => demoOn(look))
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
    window.requestAnimationFrame(() => document.getElementById("look-signin")?.scrollIntoView({ block: "center" }))
  }

  return (
    <div className="carto-slide-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {demoView ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DemoLabel look={look} onLook={onLook} onLeave={() => { leaveDemo(); setDemo(false) }} />
          <ProfileLook look={look} data={demoView} tools={<CardTool data={demoView} link={cardLink(null)} />} />
        </div>
      ) : (
        <OwnProfile state={state} look={look} snap={snap} onSetName={onSetName} onNavigate={onNavigate} onSignIn={openSignIn} />
      )}

      <Progress state={state} look={look} onNavigate={onNavigate} stats={stats} unlocks={unlocks} />

      {(accounts || publicOn) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {accounts && <SignInRow open={signInOpen} onToggle={() => setSignInOpen(o => !o)} />}
          {publicOn && (
            <div style={card}>
              <FoldRow icon="search" title="Find a player" open={findOpen} onToggle={() => setFindOpen(o => !o)} id="you-find">
                <div style={{ marginLeft: -30 }}>
                  <Suspense fallback={<Loading text="Loading search…" />}><FindPlayer bare onOpen={onOpenPlayer} /></Suspense>
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
        <a href={FEEDBACK_HREF} className="look-row" style={{ ...rowStyle, ...card }}>
          <RowFace icon="mail" title="Send feedback or ideas" end={<LineIcon name="chevronright" size={16} color={T.dim} />} />
        </a>
        {!demoView && <LookSwitch look={look} onLook={onLook} />}
      </div>

      <AdBox slot={AD_SLOTS.youFooter} />
    </div>
  )
}

import { lazy, Suspense, useEffect, useMemo, useReducer, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon, PencilIcon } from "./icons"
import ProfileView, { cardLink, rankFor, SaveCardButton } from "./ProfileView"
import type { ProfileViewData } from "./ProfileView"
import type { AvatarSource } from "./Avatar"
import { ACHIEVEMENTS } from "../data/achievements"
import type { Achievement } from "../data/achievements"
import type { AppState } from "../utils/storage"
import { gameSnapshot } from "../utils/backup"
import { MAIN_KEY } from "../utils/mergeProgress"
import type { Snapshot } from "../utils/mergeProgress"
import { todayString } from "../utils/prng"
import { hasStoredSession, profilesVisible } from "../accounts"
import { useAccount } from "../account/useAccount"
import { ACHIEVEMENTS_EVENT, unlocksOf } from "../profile/achievements"
import type { Unlocks } from "../profile/achievements"
import { MAX_PINNED, PROFILE_EVENT, PROFILE_KEY, monthName, profileOf, saveProfile } from "../profile/local"
import type { Picture } from "../profile/local"
import { shownStreak, statsOf } from "../profile/stats"
import { studioDesigns } from "../profile/save"
import { usernameProblem, USERNAME_MESSAGE, USERNAME_MAX } from "../profile/text"
import { profileLink } from "../profile/link"

/* The top of the You tab: the player's own profile. The picture, banner, bio,
   pinned badges, achievements and the saved card all work on this device
   with no account. Usernames, the public switch and "Find a player" show
   only while profiles are on (src/accounts.ts → profilesVisible). */

const ProfileEditor = lazy(() => import("./ProfileEditor"))
const FindPlayer = lazy(() => import("./FindPlayer"))

type Svc = NonNullable<ReturnType<typeof useAccount>["svc"]>

/** Re-render when the profile, achievements or another tab's save change. */
export function useProfileTick(): number {
  const [tick, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === PROFILE_KEY || e.key.startsWith("globalio_")) bump() }
    window.addEventListener(PROFILE_EVENT, bump)
    window.addEventListener(ACHIEVEMENTS_EVENT, bump)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(PROFILE_EVENT, bump)
      window.removeEventListener(ACHIEVEMENTS_EVENT, bump)
      window.removeEventListener("storage", onStorage)
    }
  }, [])
  return tick
}

/** The picture as the avatar draws it (a design is looked up among the saved ones). */
export function avatarFor(p: Picture | null, snap: Snapshot): AvatarSource {
  if (!p) return null
  if (p.kind === "flag") return p
  const d = studioDesigns(snap).find(x => x.id === p.id)
  return d ? { kind: "design", design: d } : null
}

// Names are capped by what a reader sees as characters, so an emoji or an
// accented letter counts once and is never cut in half.
export const NAME_MAX = 24
export function clampName(s: string): string {
  const chars = typeof Intl !== "undefined" && Intl.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s), g => g.segment)
    : Array.from(s)
  return chars.length > NAME_MAX ? chars.slice(0, NAME_MAX).join("") : s
}

/** The name on this device (no account needed): tap to edit. */
function LocalName({ name, onSave }: { name: string; onSave: (n: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const save = () => { onSave(clampName(draft.trim())); setEditing(false) }
  const shown = name.trim() || "Explorer"
  if (editing) return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <input autoFocus value={draft} placeholder="Your name" aria-label="Your name"
        onChange={e => setDraft(clampName(e.target.value))}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
        style={{ flex: "1 1 150px", minWidth: 0, padding: "8px 12px", borderRadius: 10, fontSize: 17, fontWeight: 700,
          fontFamily: FONT.display, background: T.surfaceHi, border: `1px solid ${tint(ACCENT.learn, 0.4)}`, color: T.text, outline: "none" }} />
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={save} className="geo-row"
          style={{ padding: "8px 16px", minHeight: 44, borderRadius: 999, background: ACCENT.learn, border: `1px solid ${ACCENT.learn}`, color: T.onAccent, fontFamily: FONT.display, fontWeight: 700, fontSize: 13 }}>
          Save
        </button>
        <button onClick={() => setEditing(false)} className="geo-row"
          style={{ padding: "8px 16px", minHeight: 44, borderRadius: 999, background: "transparent", border: `1px solid ${T.line}`, color: T.muted, fontFamily: FONT.display, fontWeight: 600, fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  )
  return (
    <button onClick={() => { setDraft(name); setEditing(true) }} aria-label={`Edit your name: ${shown}`}
      style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: "100%", minHeight: 44, background: "transparent", padding: 0, textAlign: "left", border: "none", cursor: "pointer" }}>
      <span className="geo-display" style={{ minWidth: 0, overflowWrap: "anywhere", color: T.text, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{shown}</span>
      <span style={{ display: "flex", flexShrink: 0 }}><PencilIcon size={14} color={ACCENT.learn} strokeWidth={1.6} /></span>
    </button>
  )
}

const Note = ({ children, color = T.muted }: { children: ReactNode; color?: string }) => (
  <p className="text-xs" style={{ margin: 0, lineHeight: 1.6, color }}>{children}</p>
)
const Box = ({ children, label }: { children: ReactNode; label: string }) => (
  <div aria-label={label} role="group" style={{ borderRadius: 12, padding: 12, background: T.surfaceHi, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
)

function Switch({ on, busy, onChange, children }: { on: boolean; busy: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-busy={busy} disabled={busy} onClick={() => onChange(!on)}
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 44, background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: busy ? "wait" : "pointer" }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>{children}</span>
      <span aria-hidden style={{ width: 44, height: 26, borderRadius: 999, flexShrink: 0, position: "relative", background: on ? ACCENT.learn : T.line, border: `1px solid ${on ? ACCENT.learn : T.lineHi}` }}>
        <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: T.surface }} />
      </span>
    </button>
  )
}

/** Claim a username, or (once claimed) the public switch. Signed-in only.
 *  `onSignIn`: where "Sign in" goes when the account card isn't below (the
 *  trial layouts keep sign-in in a row on the You tab). */
export function UsernameSection({ svc, signedIn, ready, onSignIn }: { svc: Svc | null; signedIn: boolean; ready: boolean; onSignIn?: () => void }) {
  const view = svc?.getView()
  const p = view?.profile
  const [draft, setDraft] = useState("")
  const [touched, setTouched] = useState(false)
  const [changing, setChanging] = useState(false)
  const [busy, setBusy] = useState<"" | "claim" | "public">("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")

  if (!signedIn) return (
    <Box label="Username">
      <Note>Sign in to claim a username, so friends can find your profile. <a href="#account" style={{ color: ACCENT.learn, fontWeight: 600 }}
        onClick={e => { e.preventDefault(); if (onSignIn) onSignIn(); else document.getElementById("account")?.scrollIntoView({ block: "center" }) }}>{onSignIn ? "Sign in" : "Sign in below"}</a></Note>
    </Box>
  )
  if (!svc || !p || !ready || p.status === "loading" || p.status === "off") return (
    <Box label="Username"><div role="status" aria-busy="true"><Note>Checking your profile…</Note></div></Box>
  )
  if (p.status === "unavailable") return <Box label="Username"><Note>Profiles aren’t available yet.</Note></Box>
  if (p.status === "offline") return (
    <Box label="Username">
      <Note>Couldn’t load your profile. Check your connection.</Note>
      <SecondaryButton onClick={() => void svc.refreshProfile()}>Try again</SecondaryButton>
    </Box>
  )

  const mine = p.mine
  const problem = draft ? usernameProblem(draft) : "format"
  const shownProblem = touched && draft && problem ? USERNAME_MESSAGE[problem] : ""
  const claim = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (problem) { setError(USERNAME_MESSAGE[problem]); return }
    setBusy("claim"); setError("")
    const message = await svc.claimUsername(draft)
    setBusy("")
    if (message) setError(message)
    else { setChanging(false); setDraft(""); setTouched(false) }
  }

  if (!mine || changing) return (
    <Box label="Username">
      <form onSubmit={claim} noValidate style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="geo-display" style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{mine ? "Change your username" : "Claim a username"}</div>
        <label htmlFor="profile-tag" className="text-xs" style={{ color: T.muted, lineHeight: 1.5 }}>
          3–{USERNAME_MAX} letters, numbers or _. Friends find you by it.
        </label>
        <input id="profile-tag" value={draft} maxLength={USERNAME_MAX}
          onChange={e => { setDraft(e.target.value.replace(/\s/g, "")); setError("") }} onBlur={() => setTouched(true)}
          autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode="text" enterKeyHint="done"
          placeholder="e.g. map_lover" aria-invalid={!!(shownProblem || error)} aria-describedby="profile-tag-help"
          style={{ width: "100%", height: 48, padding: "0 12px", borderRadius: 10, fontSize: 16, background: T.surface, border: `1px solid ${shownProblem || error ? T.danger : T.line}`, color: T.text, outline: "none" }} />
        <div id="profile-tag-help" role="alert">{(error || shownProblem) && <Note color={T.danger}>{error || shownProblem}</Note>}</div>
        {!mine && <Note>Your profile is public once you claim one: anyone can find it by your username. Only your username, picture, banner, bio, badges, stats and the designs you choose are shown. Never your email. You can make it private at any time.</Note>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PrimaryButton type="submit" accent={ACCENT.learn} disabled={busy === "claim" || !draft} aria-busy={busy === "claim"} style={{ flex: "1 1 140px", width: "auto" }}>
            {busy === "claim" ? "Saving…" : mine ? "Save" : "Claim"}
          </PrimaryButton>
          {mine && <SecondaryButton onClick={() => { setChanging(false); setDraft(""); setError(""); setTouched(false) }} style={{ flex: "1 1 120px", width: "auto" }}>Cancel</SecondaryButton>}
        </div>
      </form>
    </Box>
  )

  const link = profileLink(mine.username, window.location.origin, window.location.pathname)
  const copy = async () => {
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
      if (typeof nav.share === "function" && window.matchMedia?.("(pointer: coarse)").matches) await nav.share({ url: link, title: `${mine.username} on Globalio` })
      else { await navigator.clipboard.writeText(link); setCopied("Link copied.") }
    } catch { /* cancelled */ }
  }
  return (
    <Box label="Username">
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="text-xs" style={{ color: T.muted }}>Username</span>
        <span className="geo-display" style={{ fontWeight: 700, fontSize: 16, color: T.text, overflowWrap: "anywhere", minWidth: 0 }}>{mine.username}</span>
        <button type="button" onClick={() => { setChanging(true); setDraft(mine.username); setError("") }} className="text-xs font-semibold"
          style={{ marginLeft: "auto", minHeight: 44, padding: "0 8px", color: ACCENT.learn, background: "transparent", border: "none", cursor: "pointer" }}>Change</button>
      </div>
      <Switch on={mine.isPublic} busy={busy === "public"} onChange={async on => {
        setBusy("public"); setError("")
        const message = await svc.setProfilePublic(on)
        setBusy("")
        if (message) setError(message)
      }}>Public profile: anyone can find you by username</Switch>
      <Note>{mine.isPublic
        ? "Shown to anyone: your username, picture, banner, bio, badges, stats and the designs you choose. Never your email."
        : "Private: only you can see your profile. Nobody can find it or open its link."}</Note>
      {mine.hidden && <Note color={T.danger}>Your profile has been hidden by Globalio, so nobody else can see it. Email sjoudrie@gmail.com if you think that’s a mistake.</Note>}
      {p.note && <Note color={T.danger}>{p.note}</Note>}
      {error && <div role="alert"><Note color={T.danger}>{error}</Note></div>}
      {mine.isPublic && !mine.hidden && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <SecondaryButton onClick={copy}><LineIcon name="link" size={16} color={T.muted} />Share my profile link</SecondaryButton>
          <div role="status" aria-live="polite"><Note>{copied}</Note></div>
        </div>
      )}
    </Box>
  )
}

/** Every achievement: unlocked ones with a pin, locked ones greyed with how to get them. */
function AchievementsList({ unlocks, pinned }: { unlocks: Unlocks; pinned: string[] }) {
  const [all, setAll] = useState(false)
  const done = ACHIEVEMENTS.filter(a => unlocks[a.id])
  const locked = ACHIEVEMENTS.filter(a => !unlocks[a.id])
  // Folded: a few, unlocked first, then the next goals.
  const list = all ? ACHIEVEMENTS : [...done, ...locked].slice(0, 5)
  const groups: { group: string; items: Achievement[] }[] = []
  for (const a of list) {
    let g = groups.find(x => x.group === a.group)
    if (!g) { g = { group: a.group, items: [] }; groups.push(g) }
    g.items.push(a)
  }
  const togglePin = (id: string) => {
    const next = pinned.includes(id) ? pinned.filter(x => x !== id) : [...pinned, id].slice(0, MAX_PINNED)
    saveProfile({ pinned: next })
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 className="geo-micro" style={{ margin: 0, fontSize: 10, color: T.muted, display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden style={{ width: 12, height: 1.5, background: T.muted, opacity: 0.7 }} />
        Achievements · {done.length} of {ACHIEVEMENTS.length}
      </h3>
      <Note>Pin up to {MAX_PINNED} to show them on your profile and card.</Note>
      {groups.map(g => (
        <div key={g.group} style={{ display: "flex", flexDirection: "column" }}>
          {all && <div className="text-xs font-semibold" style={{ color: T.muted, padding: "8px 0 4px" }}>{g.group}</div>}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {g.items.map((a, i) => {
              const at = unlocks[a.id]
              const isPinned = pinned.includes(a.id)
              const full = !isPinned && pinned.length >= MAX_PINNED
              return (
                <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <span aria-hidden style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    ...(at ? { background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.45)}` } : { border: `1px dashed ${T.lineHi}` }) }}>
                    <LineIcon name={at ? a.icon : "lock"} size={16} color={at ? T.gold : T.dim} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: at ? 700 : 600, color: at ? T.text : T.dim, overflowWrap: "anywhere" }}>{a.title}</span>
                    <span style={{ display: "block", fontSize: 12, color: at ? T.muted : T.dim, lineHeight: 1.4 }}>
                      {at ? `Unlocked ${new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : a.how}
                    </span>
                  </span>
                  {at && (
                    <button type="button" aria-pressed={isPinned} disabled={full} onClick={() => togglePin(a.id)} className="geo-row"
                      aria-label={`${isPinned ? "Unpin" : "Pin"} ${a.title}`} title={full ? `Unpin one first (up to ${MAX_PINNED})` : undefined}
                      style={{ flexShrink: 0, minHeight: 44, minWidth: 72, padding: "0 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: full ? "not-allowed" : "pointer",
                        color: isPinned ? T.onAccent : full ? T.dim : T.text, background: isPinned ? T.gold : "transparent", border: `1px solid ${isPinned ? T.gold : T.line}` }}>
                      <LineIcon name="pushpin" size={13} color={isPinned ? T.onAccent : full ? T.dim : T.muted} />
                      {isPinned ? "Pinned" : "Pin"}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <button type="button" onClick={() => setAll(v => !v)} className="text-xs font-semibold"
        style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", color: ACCENT.learn, background: "transparent", border: "none", cursor: "pointer" }}>
        {all ? "Show fewer" : `Show all ${ACHIEVEMENTS.length} achievements`}
      </button>
    </div>
  )
}

export default function YouProfile({ state, onSetName, onOpenPlayer }: {
  state: AppState
  onSetName: (name: string) => void
  onOpenPlayer: (username: string) => void
}) {
  const tick = useProfileTick()
  const [publicOn] = useState(profilesVisible)
  const [editing, setEditing] = useState(false)
  const { svc, view } = useAccount()
  // The save as it is now (the main save from the app, which may be newer than storage).
  const snap = useMemo<Snapshot>(() => ({ ...gameSnapshot(), [MAIN_KEY]: JSON.stringify(state) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, tick])
  const profile = profileOf(snap)
  const stats = statsOf(snap)
  const unlocks = unlocksOf(snap)
  const signedIn = !!view?.ready && view.signedIn
  const mine = publicOn && signedIn ? view?.profile.mine ?? null : null
  const name = mine?.username ?? (state.username.trim() || "Explorer")

  const data: ProfileViewData = {
    name,
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
  }
  const link = cardLink(mine && mine.isPublic && !mine.hidden ? mine.username : null)
  const anyUnlocked = Object.keys(unlocks).length > 0

  return (
    <>
      <ProfileView data={data} who="You"
        nameSlot={mine ? undefined : <LocalName name={state.username} onSave={onSetName} />}
        pinnedSlot={data.pinned.length === 0 && anyUnlocked ? <span className="text-xs" style={{ color: T.dim, maxWidth: 150, textAlign: "right", lineHeight: 1.4 }}>Pin badges from your achievements below</span> : undefined}
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 140px", minWidth: 0 }}>
              <SecondaryButton onClick={() => setEditing(true)} style={{ padding: "0 12px" }}><LineIcon name="edit" size={16} color={T.muted} />Edit profile</SecondaryButton>
            </div>
            <div style={{ flex: "1 1 140px", minWidth: 0, display: "flex" }}><SaveCardButton data={data} link={link} /></div>
          </div>
        }>
        {publicOn && <UsernameSection svc={svc} signedIn={view?.ready ? view.signedIn : hasStoredSession()} ready={!!view?.ready} />}
        <AchievementsList unlocks={unlocks} pinned={profile.pinned} />
      </ProfileView>
      {editing && (
        <Suspense fallback={null}>
          <ProfileEditor onClose={() => setEditing(false)} showDesignChoice={publicOn} />
        </Suspense>
      )}
      {publicOn && (
        <Suspense fallback={null}>
          <FindPlayer onOpen={onOpenPlayer} />
        </Suspense>
      )}
    </>
  )
}

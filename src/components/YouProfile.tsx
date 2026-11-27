import { lazy, Suspense, useEffect, useReducer, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { T, ACCENT } from "../ui/tokens"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from "./icons"
import ProfileView, { CardTool, cardLink, rankFor } from "./ProfileView"
import type { OwnControls, ProfileData } from "./ProfileView"
import { avatarFor } from "./Avatar"
import type { AppState } from "../utils/storage"
import type { Snapshot } from "../utils/mergeProgress"
import { todayString } from "../utils/prng"
import { hasStoredSession, profilesVisible } from "../accounts"
import { useAccount } from "../account/useAccount"
import { ACHIEVEMENTS_EVENT, unlocksOf } from "../profile/achievements"
import { PROFILE_EVENT, PROFILE_KEY, monthName, profileOf, saveProfile } from "../profile/local"
import { shownStreak, statsOf } from "../profile/stats"
import { hasUpload, offeredDesigns } from "../profile/public"
import { usernameProblem, USERNAME_MESSAGE, USERNAME_MAX } from "../profile/text"
import { profileLink } from "../profile/link"

/* The top of the You tab: the player's own profile, in the one profile layout
   (./ProfileView.tsx) with its edit controls, and Edit profile (name,
   username, picture, banner, bio, published flags). The picture, banner, bio,
   pinned badges, achievements and the saved card all work on this device with
   no account. Usernames and the public switch show only while profiles are on
   (src/accounts.ts → profilesVisible). */

const ProfileEditor = lazy(() => import("./ProfileEditor"))

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

// Names are capped by what a reader sees as characters, so an emoji or an
// accented letter counts once and is never cut in half.
const NAME_MAX = 24
function clampName(s: string): string {
  const chars = typeof Intl !== "undefined" && Intl.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s), g => g.segment)
    : Array.from(s)
  return chars.length > NAME_MAX ? chars.slice(0, NAME_MAX).join("") : s
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
 *  `onSignIn` opens the sign-in row on the You tab. */
function UsernameSection({ svc, signedIn, ready, onSignIn }: { svc: Svc | null; signedIn: boolean; ready: boolean; onSignIn: () => void }) {
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
      <Note>Sign in to claim a username, so friends can find your profile. <a href="#pf-signin" style={{ color: ACCENT.learn, fontWeight: 600 }}
        onClick={e => { e.preventDefault(); onSignIn() }}>Sign in</a></Note>
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
        <input id="profile-tag" className="pf-input" value={draft} maxLength={USERNAME_MAX}
          onChange={e => { setDraft(e.target.value.replace(/\s/g, "")); setError("") }} onBlur={() => setTouched(true)}
          autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode="text" enterKeyHint="done"
          placeholder="e.g. map_lover" aria-invalid={!!(shownProblem || error)} aria-describedby="profile-tag-help"
          style={{ width: "100%", height: 48, padding: "0 12px", borderRadius: 10, fontSize: 16, background: T.surface, border: `1px solid ${shownProblem || error ? T.danger : T.line}`, color: T.text }} />
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
        : "Private: only you and your friends can see your profile. Nobody else can find it or open its link."}</Note>
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

function NameField({ name, onSave }: { name: string; onSave: (n: string) => void }) {
  const [draft, setDraft] = useState(name)
  const [said, setSaid] = useState("")
  const clean = clampName(draft.trim())
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 className="geo-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Name</h3>
      <form onSubmit={e => { e.preventDefault(); onSave(clean); setDraft(clean); setSaid(clean ? "Name saved." : "Name removed.") }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label htmlFor="pf-name" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Your name</label>
        <input id="pf-name" className="pf-input" value={draft} placeholder="Explorer" autoComplete="nickname" onChange={e => { setDraft(clampName(e.target.value)); setSaid("") }}
          style={{ flex: 1, minWidth: 0, height: 44, padding: "0 12px", borderRadius: 10, fontSize: 16, background: T.surface, border: `1px solid ${T.line}`, color: T.text }} />
        <button type="submit" disabled={clean === name.trim()} className="pf-row"
          style={{ flexShrink: 0, height: 44, padding: "0 16px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: clean === name.trim() ? "not-allowed" : "pointer",
            color: clean === name.trim() ? T.dim : T.text, background: T.surface, border: `1px solid ${T.line}` }}>Save</button>
      </form>
      <span role="status" className="text-xs" style={{ color: T.green, marginTop: said ? 0 : -8 }}>{said}</span>
    </section>
  )
}

export default function YouProfile({ state, snap, onSetName, onNavigate, onSignIn }: {
  state: AppState
  /** The save as it is now (the main save from the app, which may be newer than storage). */
  snap: Snapshot
  onSetName: (n: string) => void
  onNavigate: (s: string) => void
  /** Open the sign-in row on the You tab. */
  onSignIn: () => void
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

  const data: ProfileData = {
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
  // The card carries the username once there is one.
  const link = cardLink(mine && mine.isPublic && !mine.hidden ? mine.username : null)
  return (
    <>
      <ProfileView data={data} own={own} tools={<CardTool data={{ ...data, name: mine?.username ?? name }} link={link} />} />
      {editing && (
        <Suspense fallback={null}>
          <ProfileEditor onClose={() => setEditing(null)} startAt={editing.startAt} publicOn={publicOn}
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

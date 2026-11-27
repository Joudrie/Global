import { useEffect, useState } from "react"
import { T } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { SecondaryButton } from "./gameUi"
import { LineIcon } from "./icons"
import ProfileView, { cardLink, rankFor, SaveCardButton } from "./ProfileView"
import type { ProfileViewData } from "./ProfileView"
import { loadAccountService, loadedAccountService } from "../accounts"
import type { PlayerProfile } from "../account/profiles"
import { monthName } from "../profile/local"
import { shownStreak } from "../profile/stats"
import { profileLink } from "../profile/link"
import { todayString } from "../utils/prng"

/* Someone else's profile, read-only: the same layout as your own, with no
   edit controls. Opened from "Find a player" or a link (?u=username). No
   follow, no messages, no comments: you can only look, and save their card. */

type State =
  | { kind: "loading" }
  | { kind: "found"; player: PlayerProfile }
  | { kind: "missing"; mine: boolean }
  | { kind: "error"; message: string; unavailable: boolean }

export function viewData(p: PlayerProfile): ProfileViewData {
  return {
    name: p.username,
    badge: p.badge,
    rank: rankFor(p.stats.flags),
    since: monthName(p.stats.since) ?? monthName(p.createdAt?.slice(0, 7)),
    bio: p.bio,
    banner: p.banner,
    picture: p.picture,
    pinned: p.pinned,
    stats: p.stats,
    streak: shownStreak(p.stats, todayString()),
    activity: p.stats.activity,
    designs: p.designs,
  }
}

export default function PlayerScreen({ username, onBack }: { username: string; onBack: () => void }) {
  const [state, setState] = useState<State>({ kind: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState("")

  useEffect(() => {
    let live = true
    setState({ kind: "loading" })
    loadAccountService()
      .then(svc => svc.getPlayer(username))
      .then(res => {
        if (!live) return
        if (!res.ok) { setState({ kind: "error", message: res.message, unavailable: res.kind === "unavailable" }); return }
        if (res.value) { setState({ kind: "found", player: res.value }); return }
        const mine = loadedAccountService()?.getView().profile.mine
        setState({ kind: "missing", mine: !!mine && mine.username.toLowerCase() === username.toLowerCase() })
      }, () => { if (live) setState({ kind: "error", message: "Couldn’t reach the server. Check your connection and try again.", unavailable: false }) })
    return () => { live = false }
  }, [username, attempt])

  const shareLink = async (name: string) => {
    const link = profileLink(name, window.location.origin, window.location.pathname)
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
      if (typeof nav.share === "function" && window.matchMedia?.("(pointer: coarse)").matches) await nav.share({ url: link, title: `${name} on Globalio` })
      else { await navigator.clipboard.writeText(link); setCopied("Link copied.") }
    } catch { /* cancelled */ }
  }

  const found = state.kind === "found" ? state.player : null
  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, maxWidth: 720, margin: "0 auto" }}>
      <ScreenHeader title={found?.username ?? username} subtitle="Player profile" onBack={onBack} />
      <main style={{ padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        {state.kind === "loading" && (
          <div role="status" aria-busy="true" style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 14 }}>Looking up {username}…</div>
        )}
        {state.kind === "error" && (
          <div role="alert" style={{ borderRadius: 16, padding: 16, background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, color: T.text, fontSize: 14, lineHeight: 1.5 }}>{state.message}</p>
            {!state.unavailable && <SecondaryButton onClick={() => setAttempt(a => a + 1)}>Try again</SecondaryButton>}
          </div>
        )}
        {state.kind === "missing" && (
          <div style={{ borderRadius: 16, padding: 16, background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="geo-display" style={{ margin: 0, fontSize: 17, fontWeight: 700, overflowWrap: "anywhere" }}>
              {state.mine ? "Your profile is private" : `No public profile called ${username}`}
            </h2>
            <p style={{ margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 }}>
              {state.mine ? "Only you can see it. Turn on Public profile on the You tab to let friends find it." : "Check the spelling. The player may also have made their profile private."}
            </p>
          </div>
        )}
        {found && (
          <ProfileView data={viewData(found)} who={found.username}
            actions={
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: "1 1 140px", minWidth: 0, display: "flex" }}><SaveCardButton data={viewData(found)} link={cardLink(found.username)} label="Save card" /></div>
                <div style={{ flex: "1 1 140px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <SecondaryButton onClick={() => void shareLink(found.username)}><LineIcon name="link" size={16} color={T.muted} />Share link</SecondaryButton>
                  <div role="status" aria-live="polite" className="text-xs" style={{ color: T.muted }}>{copied}</div>
                </div>
              </div>
            } />
        )}
      </main>
    </div>
  )
}

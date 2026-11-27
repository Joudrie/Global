import { useEffect, useMemo, useState } from "react"
import { T } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { SecondaryButton } from "./gameUi"
import ProfileView, { CardTool, ShareTool, cardLink, playerData } from "./ProfileView"
import { FriendPanel } from "./Friends"
import { loadAccountService, loadedAccountService } from "../accounts"
import { useAccount } from "../account/useAccount"
import type { PlayerProfile } from "../account/profiles"
import { relationOf } from "../profile/friends"

/* Someone else's profile, read-only: the same layout as your own, with no
   edit controls. Opened from "Find a player", your friends list or a link
   (?u=username). Signed in, it has the friend button (src/components/
   Friends.tsx), and a friend's profile adds "You vs them". A private profile
   opens only for a friend. No followers, messages or comments. */

type State =
  | { kind: "loading" }
  | { kind: "found"; player: PlayerProfile; private: boolean }
  | { kind: "missing"; mine: boolean }
  | { kind: "error"; message: string; unavailable: boolean }

export default function PlayerScreen({ username, onBack, onPlay }: { username: string; onBack: () => void; onPlay?: (gameId: string) => void }) {
  const [state, setState] = useState<State>({ kind: "loading" })
  const [attempt, setAttempt] = useState(0)
  const { view } = useAccount()

  useEffect(() => {
    let live = true
    setState({ kind: "loading" })
    loadAccountService()
      .then(async svc => {
        const res = await svc.getPlayer(username)
        if (!live) return
        if (!res.ok) { setState({ kind: "error", message: res.message, unavailable: res.kind === "unavailable" }); return }
        if (res.value) { setState({ kind: "found", player: res.value, private: false }); return }
        // No public profile: a friend can still open a private one.
        const v = svc.getView()
        if (v.signedIn && v.friends.status !== "off" && v.friends.status !== "unavailable") {
          const fr = await svc.getFriend(username)
          if (!live) return
          if (fr.ok && fr.value) { setState({ kind: "found", player: fr.value, private: true }); return }
        }
        const mine = loadedAccountService()?.getView().profile.mine
        setState({ kind: "missing", mine: !!mine && mine.username.toLowerCase() === username.toLowerCase() })
      })
      .catch(() => { if (live) setState({ kind: "error", message: "Couldn’t reach the server. Check your connection and try again.", unavailable: false }) })
    return () => { live = false }
  }, [username, attempt])

  const found = state.kind === "found" ? state.player : null
  // A private profile you could see as a friend, once you're no longer friends.
  const f = view?.friends
  const isPrivate = state.kind === "found" && state.private
  const unfriended = isPrivate && f?.status === "ready" && relationOf(f, username) === "none"
  const data = useMemo(() => (found ? playerData(found) : null), [found])
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
        {(state.kind === "missing" || unfriended) && (
          <div style={{ borderRadius: 16, padding: 16, background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="geo-display" style={{ margin: 0, fontSize: 17, fontWeight: 700, overflowWrap: "anywhere" }}>
              {state.kind === "missing" && state.mine ? "Your profile is private" : `No public profile called ${username}`}
            </h2>
            <p style={{ margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 }}>
              {state.kind === "missing" && state.mine
                ? "Only you and your friends can see it. Turn on Public profile in Edit profile to let anyone find it."
                : "Check the spelling. The player may also have made their profile private."}
            </p>
            {!(state.kind === "missing" && state.mine) && (
              <div style={{ paddingTop: 8 }}>
                <FriendPanel player={{ username, picture: null, badge: null }} stats={null} missing />
              </div>
            )}
          </div>
        )}
        {found && data && !unfriended && (
          <ProfileView data={data}
            // A private profile's link opens for nobody else, so it isn't offered.
            tools={<>{!isPrivate && <ShareTool username={found.username} />}<CardTool data={data} link={cardLink(isPrivate ? null : found.username)} /></>}
            extra={<FriendPanel player={found} stats={found.stats} privateProfile={isPrivate} onPlay={onPlay} />} />
        )}
      </main>
    </div>
  )
}

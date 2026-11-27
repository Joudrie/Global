import { useEffect, useMemo, useState } from "react"
import { T } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { SecondaryButton } from "./gameUi"
import ProfileView, { CardTool, ShareTool, cardLink, playerData } from "./ProfileView"
import { loadAccountService, loadedAccountService } from "../accounts"
import type { PlayerProfile } from "../account/profiles"

/* Someone else's profile, read-only: the same layout as your own, with no
   edit controls. Opened from "Find a player" or a link (?u=username). No
   follow, no messages, no comments: you can only look, and save their card. */

type State =
  | { kind: "loading" }
  | { kind: "found"; player: PlayerProfile }
  | { kind: "missing"; mine: boolean }
  | { kind: "error"; message: string; unavailable: boolean }

export default function PlayerScreen({ username, onBack }: { username: string; onBack: () => void }) {
  const [state, setState] = useState<State>({ kind: "loading" })
  const [attempt, setAttempt] = useState(0)

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

  const found = state.kind === "found" ? state.player : null
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
        {found && data && (
          <ProfileView data={data} tools={<><ShareTool username={found.username} /><CardTool data={data} link={cardLink(found.username)} /></>} />
        )}
      </main>
    </div>
  )
}

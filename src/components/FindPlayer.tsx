import { useEffect, useRef, useState } from "react"
import { T, ACCENT, tint } from "../ui/tokens"
import { LineIcon, SearchIcon } from "./icons"
import Avatar from "./Avatar"
import { BadgeChip } from "./ProfileView"
import { loadAccountService } from "../accounts"
import type { PlayerCard } from "../account/profiles"

/* "Find a player" (a folding row on the You tab, which names it): type the
   start of a username, see up to 10 public profiles, tap one to open it. No
   following, no messages: just a look at someone's profile. Works signed out too. */

type State =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "done"; q: string; players: PlayerCard[] }
  | { kind: "error"; message: string }

const MIN = 2

export default function FindPlayer({ onOpen }: { onOpen: (username: string) => void }) {
  const [q, setQ] = useState("")
  const [state, setState] = useState<State>({ kind: "idle" })
  const seq = useRef(0)

  useEffect(() => {
    const query = q.trim().replace(/^@/, "")
    if (query.length < MIN) { setState({ kind: "idle" }); return }
    if (!/^[A-Za-z0-9_]+$/.test(query)) { setState({ kind: "done", q: query, players: [] }); return }
    const n = ++seq.current
    setState({ kind: "searching" })
    const t = window.setTimeout(async () => {
      try {
        const svc = await loadAccountService()
        const res = await svc.findPlayers(query)
        if (n !== seq.current) return
        setState(res.ok ? { kind: "done", q: query, players: res.value } : { kind: "error", message: res.message })
      } catch {
        if (n === seq.current) setState({ kind: "error", message: "Couldn’t reach the server. Check your connection and try again." })
      }
    }, 300)
    return () => window.clearTimeout(t)
  }, [q])

  return (
    <section aria-label="Find a player" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="text-xs" style={{ margin: 0, color: T.muted, lineHeight: 1.6 }}>Look up a friend’s profile by the start of their username.</p>
      <div style={{ position: "relative" }}>
        <span aria-hidden style={{ position: "absolute", left: 12, top: 14, display: "flex" }}><SearchIcon size={18} color={T.muted} strokeWidth={1.7} /></span>
        <input id="player-search" className="pf-input" type="search" value={q} onChange={e => setQ(e.target.value.slice(0, 21))}
          aria-label="Find a player" placeholder="Search players" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          enterKeyHint="search" maxLength={21}
          style={{ width: "100%", height: 48, padding: "0 12px 0 40px", borderRadius: 10, fontSize: 16, background: T.surfaceHi, border: `1px solid ${T.line}`, color: T.text }} />
      </div>
      <div role="status" aria-live="polite">
        {state.kind === "idle" && q.trim().length > 0 && <p className="text-xs" style={{ margin: 0, color: T.dim }}>Keep typing: at least {MIN} characters.</p>}
        {state.kind === "searching" && <p className="text-xs" style={{ margin: 0, color: T.muted }}>Searching…</p>}
        {state.kind === "error" && <p className="text-xs" style={{ margin: 0, color: state.message.startsWith("Profiles") ? T.muted : T.danger }}>{state.message}</p>}
        {state.kind === "done" && state.players.length === 0 && (
          <p className="text-xs" style={{ margin: 0, color: T.muted, overflowWrap: "anywhere" }}>No public profiles start with “{state.q}”.</p>
        )}
      </div>
      {state.kind === "done" && state.players.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {state.players.map(p => (
            <li key={p.username}>
              <button type="button" onClick={() => onOpen(p.username)} className="geo-row"
                style={{ width: "100%", minHeight: 56, display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 12,
                  background: "transparent", border: `1px solid ${T.line}`, textAlign: "left", cursor: "pointer" }}>
                <Avatar source={p.picture} size={36} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span className="geo-display" style={{ fontWeight: 700, fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{p.username}</span>
                  {p.badge && <BadgeChip text={p.badge} />}
                </span>
                <span aria-hidden style={{ color: tint(ACCENT.learn, 0.9), display: "flex" }}><LineIcon name="profile" size={16} color={ACCENT.learn} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

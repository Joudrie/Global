import { useEffect, useMemo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { LineIcon } from "./icons"
import Avatar from "./Avatar"
import { BadgeChip, fmt } from "./ProfileView"
import { useAccount } from "../account/useAccount"
import type { PlayerCard } from "../account/profiles"
import { friendControls, friendHeadline, friendNews, relationOf, versus } from "../profile/friends"
import type { FriendAct, FriendRequest, Friend, VsRow } from "../profile/friends"
import type { ProfileStats } from "../profile/stats"
import { statsOf } from "../profile/stats"
import { gameSnapshot } from "../utils/backup"
import { REGISTRY } from "../ui/registry"

/* Friends, for signed-in players with a username: mutual, never followers.
   - FriendsSection, on the You tab: requests to you (Accept / Decline), your
     friends (picture, name, "Best streak 14 · 23 achievements"; tap one to
     open their profile) and the requests you sent (Cancel).
   - FriendPanel, on someone else's profile: Add friend / Requested (Cancel
     request) / Accept request (Decline) / Friends (Remove, after a
     confirm), and for a friend "You vs them": best scores side by side, with
     "Beat 14" where you're behind.
   Both draw nothing at all while friends aren't available (the SQL hasn't
   been run, see src/profile/friends.ts), so no control ever leads nowhere. */

const card: CSSProperties = { borderRadius: 12, background: T.surface, border: `1px solid ${T.line}` }

const Note = ({ children, color = T.muted, role }: { children: ReactNode; color?: string; role?: string }) => (
  <p role={role} style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color, overflowWrap: "anywhere" }}>{children}</p>
)

const Divider = () => <div aria-hidden style={{ height: 1, background: T.line, margin: "0 16px" }} />

const GroupLabel = ({ children }: { children: ReactNode }) => (
  <div className="geo-micro" style={{ padding: "12px 16px 4px", fontSize: 11, color: T.muted }}>{children}</div>
)

/** A small pill button, 44px tall. `kind`: filled (the main action), plain, or a text link. */
function Pill({ kind, onClick, busy, disabled, children, label }: {
  kind: "filled" | "plain" | "link"; onClick: () => void; busy?: boolean; disabled?: boolean; children: ReactNode; label?: string
}) {
  const off = disabled || busy
  const face: CSSProperties = kind === "filled"
    ? { background: off ? T.surfaceHi : ACCENT.learn, color: off ? T.dim : T.onAccent, border: `1px solid ${off ? T.line : ACCENT.learn}` }
    : kind === "plain"
      ? { background: T.surface, color: off ? T.dim : T.text, border: `1px solid ${T.line}` }
      : { background: "transparent", color: off ? T.dim : ACCENT.learn, border: "1px solid transparent", padding: "0 8px" }
  return (
    <button type="button" onClick={onClick} disabled={off} aria-busy={busy || undefined} aria-label={label}
      className={kind === "link" ? "pf-link" : "pf-row"}
      style={{ minHeight: 44, padding: "0 16px", borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
        fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", cursor: busy ? "wait" : off ? "not-allowed" : "pointer", flexShrink: 0, ...face }}>
      {children}
    </button>
  )
}

const shortDate = (iso: string | null) => {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""
}

// ── The You tab ─────────────────────────────────────────────────────────────

function RequestRow({ r, busy, error, onAnswer }: { r: FriendRequest; busy: boolean; error: string; onAnswer: (accept: boolean) => void }) {
  return (
    <li style={{ padding: "8px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <Avatar source={r.picture} size={40} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="geo-display" style={{ fontWeight: 700, fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{r.username}</span>
          <span style={{ fontSize: 13, color: T.muted }}>Wants to be friends{r.at ? ` · ${shortDate(r.at)}` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill kind="filled" onClick={() => onAnswer(true)} busy={busy} label={`Accept ${r.username}’s request`}>{busy ? "Saving…" : "Accept"}</Pill>
          <Pill kind="plain" onClick={() => onAnswer(false)} disabled={busy} label={`Decline ${r.username}’s request`}>Decline</Pill>
        </div>
        {error && <Note color={T.danger} role="alert">{error}</Note>}
      </div>
    </li>
  )
}

function FriendRow({ f, onOpen }: { f: Friend; onOpen: () => void }) {
  const news = f.since ? friendNews(f.stats, Date.now()) : null
  return (
    <li>
      <button type="button" onClick={onOpen} className="pf-row"
        style={{ width: "100%", minHeight: 60, display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "transparent", border: "1px solid transparent", borderRadius: 12, textAlign: "left", cursor: "pointer" }}>
        <Avatar source={f.picture} size={40} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span className="geo-display" style={{ fontWeight: 700, fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{f.username}</span>
            {f.badge && <BadgeChip text={f.badge} />}
          </span>
          <span style={{ fontSize: 13, color: T.muted, overflowWrap: "anywhere" }}>{f.since ? friendHeadline(f.stats) : "Friends now"}</span>
          {news && <span style={{ fontSize: 12, color: T.dim, overflowWrap: "anywhere" }}>Unlocked {news.title} · {shortDate(new Date(news.at).toISOString())}</span>}
        </span>
        <span aria-hidden style={{ display: "flex", flexShrink: 0 }}><LineIcon name="chevronright" size={16} color={T.dim} /></span>
      </button>
    </li>
  )
}

function SentRow({ r, busy, error, onCancel }: { r: FriendRequest; busy: boolean; error: string; onCancel: () => void }) {
  return (
    <li style={{ padding: "4px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar source={r.picture} size={32} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: T.text, overflowWrap: "anywhere" }}>{r.username}</span>
          <span style={{ fontSize: 12, color: T.muted }}>Request sent{r.at ? ` · ${shortDate(r.at)}` : ""}</span>
        </span>
        <Pill kind="link" onClick={onCancel} busy={busy} label={`Cancel your request to ${r.username}`}>{busy ? "Cancelling…" : "Cancel"}</Pill>
      </div>
      {error && <Note color={T.danger} role="alert">{error}</Note>}
    </li>
  )
}

/** Friends on the You tab. Nothing while signed out or before friends are
 *  available. `onFind` opens Find a player. */
export default function FriendsSection({ onOpen, onFind }: { onOpen: (username: string) => void; onFind: () => void }) {
  const { svc, view } = useAccount()
  const signedIn = !!view?.ready && view.signedIn
  const [errors, setErrors] = useState<Record<string, string>>({})
  useEffect(() => { if (svc && signedIn) void svc.refreshFriends({ maxAge: 15_000 }) }, [svc, signedIn])
  if (!svc || !view || !signedIn) return null
  const f = view.friends
  if (f.status === "off" || f.status === "unavailable" || view.profile.status === "unavailable") return null

  const busy = (u: string) => f.busy.includes(u.toLowerCase())
  const run = async (u: string, p: Promise<string | null>) => {
    setErrors(e => ({ ...e, [u]: "" }))
    const message = await p
    if (message) setErrors(e => ({ ...e, [u]: message }))
  }
  const count = f.friends?.length ?? 0
  const head = (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "0 0 8px" }}>
      <h2 id="you-friends" className="geo-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Friends</h2>
      {count > 0 && <span style={{ fontSize: 13, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{fmt(count)}</span>}
      {f.incoming.length > 0 && (
        <span style={{ fontSize: 12, fontWeight: 600, color: T.warm, padding: "2px 8px", borderRadius: 999, background: tint(T.warm, 0.1), border: `1px solid ${tint(T.warm, 0.35)}` }}>
          {f.incoming.length === 1 ? "1 request" : `${f.incoming.length} requests`}
        </span>
      )}
    </div>
  )

  let body: ReactNode
  if (f.status === "loading" || (f.status === "ready" && !f.friends)) {
    body = <div role="status" aria-busy="true" style={{ ...card, padding: 12 }}><Note>Loading your friends…</Note></div>
  } else if (f.status === "offline") {
    body = (
      <div role="alert" style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Note>Couldn’t load your friends. Check your connection.</Note>
        <Pill kind="plain" onClick={() => void svc.refreshFriends()}>Try again</Pill>
      </div>
    )
  } else {
    const friends = f.friends ?? []
    const empty = !friends.length && !f.incoming.length && !f.outgoing.length
    // Without a username nobody can add you (until the profile has loaded, assume there is one).
    const needsName = view.profile.status === "ready" && !view.profile.mine
    body = (
      <div style={{ ...card, padding: 0 }}>
        {f.incoming.length > 0 && (
          <>
            <GroupLabel>Friend requests</GroupLabel>
            <ul style={{ listStyle: "none", margin: 0, padding: "0 0 4px" }}>
              {f.incoming.map(r => (
                <RequestRow key={r.username} r={r} busy={busy(r.username)} error={errors[r.username] ?? ""}
                  onAnswer={accept => void run(r.username, svc.respondFriendRequest(r.username, accept))} />
              ))}
            </ul>
          </>
        )}
        {friends.length > 0 && (
          <>
            {f.incoming.length > 0 && <Divider />}
            <ul aria-labelledby="you-friends" style={{ listStyle: "none", margin: 0, padding: 4 }}>
              {friends.map(x => <FriendRow key={x.username} f={x} onOpen={() => onOpen(x.username)} />)}
            </ul>
          </>
        )}
        {empty && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            <Note color={T.text}>No friends yet.</Note>
            <Note>{!needsName
              ? "Open a player’s profile and tap Add friend. Once they accept, you can see each other’s stats and best scores, even on a private profile."
              : "Claim a username in Edit profile at the top of this tab, so friends can add you. Friends see each other’s stats and best scores, even on a private profile."}</Note>
            {!needsName && (
              <div><Pill kind="link" onClick={onFind}><LineIcon name="search" size={14} color={ACCENT.learn} />Find a player</Pill></div>
            )}
          </div>
        )}
        {f.outgoing.length > 0 && (
          <>
            {(friends.length > 0 || f.incoming.length > 0) && <Divider />}
            <GroupLabel>Sent</GroupLabel>
            <ul style={{ listStyle: "none", margin: 0, padding: "0 0 8px" }}>
              {f.outgoing.map(r => (
                <SentRow key={r.username} r={r} busy={busy(r.username)} error={errors[r.username] ?? ""}
                  onCancel={() => void run(r.username, svc.removeFriend(r.username))} />
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }
  return <section aria-labelledby="you-friends">{head}{body}</section>
}

// ── On someone else's profile ───────────────────────────────────────────────

/** The friend button, then (for a friend) You vs them. `missing`: there's no
 *  public profile by this name, which may be a private one: a request can
 *  still be sent. `onPlay` opens a game (for "Beat 14"). */
export function FriendPanel({ player, stats, missing, privateProfile, onPlay }: {
  player: PlayerCard; stats: ProfileStats | null; missing?: boolean; privateProfile?: boolean; onPlay?: (gameId: string) => void
}) {
  const { svc, view } = useAccount()
  const signedIn = !!view?.ready && view.signedIn
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { if (svc && signedIn) void svc.refreshFriends({ maxAge: 10_000 }) }, [svc, signedIn])
  if (!svc || !view || !signedIn) return null
  const f = view.friends
  if (f.status === "off" || f.status === "unavailable" || f.status === "offline" || view.profile.status === "unavailable") return null
  const mine = view.profile.mine
  if (mine && mine.username.toLowerCase() === player.username.toLowerCase()) return null
  const rel = f.status === "ready" ? relationOf(f, player.username) : null
  if (!rel || (!mine && view.profile.status !== "ready")) return <div role="status" aria-busy="true"><Note>Checking whether you’re friends…</Note></div>
  if (!mine) return <Note>Claim a username in Edit profile on the You tab to add friends.</Note>

  const name = player.username
  const c = friendControls(rel, name)
  const busy = f.busy.includes(name.toLowerCase())
  const act = async (a: FriendAct) => {
    setError(""); setConfirming(false)
    const message = a === "send" ? await svc.sendFriendRequest(player)
      : a === "accept" || a === "decline" ? await svc.respondFriendRequest(name, a === "accept")
      : await svc.removeFriend(name)
    if (message) setError(message)
  }
  const busyText = rel === "none" ? "Sending…" : "Saving…"
  const note = missing && rel === "none"
    ? `${name}’s profile may be private. You can still send a friend request: once they accept, you can see each other’s stats.`
    : c.note

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div role="group" aria-label="Friend" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {privateProfile && rel === "friends" && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span aria-hidden style={{ display: "flex", flexShrink: 0 }}><LineIcon name="lock" size={14} color={T.muted} /></span>
            <Note>Private profile. You can see it because you’re friends.</Note>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {c.primary && (
            <Pill kind="filled" onClick={() => void act(c.primary!.act)} busy={busy}>
              {busy ? busyText : <>{c.primary.act === "send" && <LineIcon name="plus" size={16} color={T.onAccent} />}{c.primary.label}</>}
            </Pill>
          )}
          {c.label && (
            // A label, not a button: flat, and shorter than the buttons beside it.
            <span style={{ height: 32, padding: "0 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600,
              color: rel === "friends" ? T.green : T.muted, background: rel === "friends" ? tint(T.green, 0.12) : tint(T.text, 0.06) }}>
              <LineIcon name={rel === "friends" ? "check" : "history"} size={16} color={rel === "friends" ? T.green : T.muted} />{c.label}
            </span>
          )}
          {c.secondary && !confirming && (
            <Pill kind={c.primary ? "plain" : "link"} disabled={busy}
              onClick={() => (c.confirm ? setConfirming(true) : void act(c.secondary!.act))}>
              {busy && !c.primary ? "Saving…" : c.secondary.label}
            </Pill>
          )}
        </div>
        {confirming && c.secondary && (
          <div role="group" aria-label="Confirm" style={{ ...card, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <Note color={T.text}>{c.confirm}</Note>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill kind="plain" onClick={() => void act(c.secondary!.act)}><span style={{ color: T.danger }}>{c.secondary.label}</span></Pill>
              <Pill kind="link" onClick={() => setConfirming(false)}>Keep {name}</Pill>
            </div>
          </div>
        )}
        {note && !confirming && <Note>{note}</Note>}
        {error && <Note color={T.danger} role="alert">{error}</Note>}
      </div>
      {rel === "friends" && stats && <VersusCard name={name} theirs={stats} onPlay={onPlay} />}
    </div>
  )
}

// ── You vs a friend ─────────────────────────────────────────────────────────

const PLAYABLE = new Set(REGISTRY.filter(r => !r.action).map(r => r.id))
const num = (n: number) => (n > 0 ? fmt(n) : "–")

function Result({ row, game, onPlay, name }: { row: VsRow; game: boolean; onPlay?: (id: string) => void; name: string }) {
  if (row.result === "ahead") return <span style={{ color: T.green, fontWeight: 600 }}>Ahead</span>
  if (row.result === "tied") return <span style={{ color: T.muted }}>Tied</span>
  if (!game) return <span style={{ color: T.muted }}>{fmt(row.theirs - row.mine)} behind</span>
  const text = `Beat ${fmt(row.beat ?? row.theirs)}`
  if (onPlay && PLAYABLE.has(row.id)) {
    return (
      <button type="button" onClick={() => onPlay(row.id)} className="pf-link" aria-label={`Play ${row.title} to beat ${name}’s ${fmt(row.theirs)}`}
        style={{ minHeight: 44, padding: 0, display: "inline-flex", alignItems: "center", gap: 2, background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: ACCENT.learn, cursor: "pointer", whiteSpace: "nowrap" }}>
        {text}<LineIcon name="chevronright" size={12} color={ACCENT.learn} />
      </button>
    )
  }
  return <span style={{ color: T.warm, fontWeight: 600 }}>{text}</span>
}

function VersusCard({ name, theirs, onPlay }: { name: string; theirs: ProfileStats; onPlay?: (id: string) => void }) {
  const mine = useMemo(() => statsOf(gameSnapshot()), [])
  const vs = useMemo(() => versus(mine, theirs), [mine, theirs])
  const cell: CSSProperties = { padding: "8px 0 8px 8px", fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontSize: 14, textAlign: "right", color: T.text }
  const rows = (list: VsRow[], game: boolean) => list.map(r => (
    <tr key={r.id} style={{ borderTop: `1px solid ${T.line}` }}>
      <th scope="row" style={{ padding: "8px 8px 8px 0", textAlign: "left", fontSize: 14, fontWeight: 400, color: T.text, overflowWrap: "anywhere" }}>{r.title}</th>
      <td style={{ ...cell, fontWeight: r.result === "ahead" ? 700 : 400 }}>{num(r.mine)}</td>
      <td style={{ ...cell, fontWeight: r.result === "behind" ? 700 : 400 }}>{num(r.theirs)}</td>
      <td style={{ padding: "0 0 0 8px", textAlign: "right", fontSize: 13 }}><Result row={r} game={game} onPlay={onPlay} name={name} /></td>
    </tr>
  ))
  const group = (label: string) => (
    <tr><th colSpan={4} scope="colgroup" className="geo-micro" style={{ padding: "12px 0 4px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.muted }}>{label}</th></tr>
  )
  const summary = vs.games.length
    ? vs.behind
      ? `${name} leads ${vs.behind} of ${vs.games.length} ${vs.games.length === 1 ? "game" : "games"}. Beat their best to take it.`
      : `You lead ${vs.ahead} of ${vs.games.length} ${vs.games.length === 1 ? "game" : "games"}.`
    : "No best scores to compare yet. Play a game and come back."
  return (
    <section aria-labelledby="vs-title" style={{ ...card, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <h3 id="vs-title" className="geo-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text, overflowWrap: "anywhere" }}>You vs {name}</h3>
      <Note>{summary}</Note>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup><col /><col style={{ width: 56 }} /><col style={{ width: 64 }} /><col style={{ width: 88 }} /></colgroup>
        <thead>
          <tr>
            <th scope="col" style={{ padding: "4px 0", textAlign: "left", fontSize: 12, fontWeight: 600, color: T.muted }}><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Game</span></th>
            <th scope="col" style={{ padding: "4px 0 4px 8px", textAlign: "right", fontSize: 12, fontWeight: 600, color: T.muted }}>You</th>
            <th scope="col" title={name} style={{ padding: "4px 0 4px 8px", textAlign: "right", fontSize: 12, fontWeight: 600, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</th>
            <th scope="col" style={{ padding: "4px 0" }}><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Result</span></th>
          </tr>
        </thead>
        <tbody>
          {group("Overall")}
          {rows(vs.overall, false)}
          {vs.games.length > 0 && group("Best scores")}
          {rows(vs.games, true)}
        </tbody>
      </table>
    </section>
  )
}

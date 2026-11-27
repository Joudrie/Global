// Friends: mutual friendships between players who have a username. Both have
// to agree (no followers). Friends see each other's stats and profile, even a
// private one; nobody else does, and a friend list is only ever shown to its
// owner.
//
// The database side is supabase/migrations/20261127200000_friends.sql: six
// functions, for signed-in players only (send_friend_request,
// respond_friend_request, remove_friend, list_friends, friend_requests,
// get_friend). Until the owner runs supabase/friends-setup.sql those calls
// fail with "function not found" (PGRST202, a 404). The app then hides every
// friends control and remembers that for this page load only, so Friends
// switches itself on at the next load once the SQL is there.
//
// No page code here: the account service (src/account/service.ts) passes in
// the Supabase client, and tests pass a fake one. Nothing is kept in storage.
import type { SupabaseClient } from "@supabase/supabase-js"
import { asCard, asPlayer } from "../account/profiles"
import type { PlayerCard, PlayerProfile } from "../account/profiles"
import { EMPTY_STATS, readStats, shownStreak } from "./stats"
import type { ProfileStats } from "./stats"
import { REGISTRY } from "../ui/registry"
import { achievementById } from "../data/achievements"

export interface Friend extends PlayerCard {
  stats: ProfileStats
  /** When you became friends (from the server), or null for one just added here. */
  since: string | null
}

export interface FriendRequest extends PlayerCard {
  /** incoming: they asked you. outgoing: you asked them. */
  direction: "incoming" | "outgoing"
  at: string | null
}

/** Where you stand with another player. */
export type Relation = "none" | "outgoing" | "incoming" | "friends"

export interface FriendsState {
  /** off: signed out, or profiles aren't shown. unavailable: the SQL hasn't
   *  been run (every friends control hides). offline: the first load failed. */
  status: "off" | "loading" | "ready" | "unavailable" | "offline"
  /** null until the list has loaded (at app start only the requests load). */
  friends: Friend[] | null
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  /** Usernames (lower case) with a change on its way. */
  busy: string[]
  /** When the last load finished (ms since 1970), 0 before one has. */
  checked: number
}

export const FRIENDS_OFF: FriendsState = { status: "off", friends: null, incoming: [], outgoing: [], busy: [], checked: 0 }

export const MAX_FRIENDS = 500
export const MAX_PENDING = 50

// ── Errors ──────────────────────────────────────────────────────────────────

export type FriendErrorKind =
  | "unavailable" | "offline" | "not_found" | "self" | "limit" | "rate_limited"
  | "needs_username" | "not_allowed" | "signed_out" | "error"

export const FRIEND_MESSAGE: Record<FriendErrorKind, string> = {
  unavailable: "Friends aren’t available yet.",
  offline: "Couldn’t reach the server. Check your connection and try again.",
  not_found: "There’s no player with that username.",
  self: "That’s you.",
  limit: "That’s more than Globalio allows.",
  rate_limited: "That’s a lot of friend requests. Try again tomorrow.",
  needs_username: "Claim a username first, so they know who’s asking.",
  not_allowed: "Your profile is hidden, so you can’t add friends.",
  signed_out: "Sign in again to add friends.",
  error: "Something went wrong. Try again.",
}

const LIMIT_MESSAGE: Record<string, string> = {
  pending: `You have ${MAX_PENDING} requests waiting. Cancel one, or wait for an answer.`,
  theirs: "They have too many requests waiting. Try again later.",
  friends: `You have ${MAX_FRIENDS} friends, the most Globalio allows.`,
  their_friends: `They have ${MAX_FRIENDS} friends, the most Globalio allows.`,
}

export class FriendError extends Error {
  kind: FriendErrorKind
  constructor(kind: FriendErrorKind, message = FRIEND_MESSAGE[kind]) {
    super(message)
    this.kind = kind
  }
}

interface PgError { code?: string; message?: string; details?: string | null; hint?: string | null }

/** The friend functions aren't in the database yet: PostgREST can't find the
 *  function (PGRST202) or table, Postgres doesn't know it, or a bare 404. */
export function isMissing(err: PgError | null | undefined, status: number): boolean {
  const code = err?.code ?? ""
  return ["PGRST202", "PGRST205", "42883", "42P01", "3F000"].includes(code) || (status === 404 && !code)
}

/** Turn a failed call into a FriendError a player can read. */
export function friendError(err: PgError | null | undefined, status: number): FriendError {
  const code = err?.code ?? ""
  const text = `${err?.message ?? ""} ${err?.details ?? ""} ${err?.hint ?? ""}`
  if (status === 0 || /failed to fetch|networkerror|network request|load failed/i.test(text)) return new FriendError("offline")
  if (isMissing(err, status)) return new FriendError("unavailable")
  const limit = /friend_limit: (\w+)/.exec(text)
  if (limit) return new FriendError("limit", LIMIT_MESSAGE[limit[1]] ?? FRIEND_MESSAGE.limit)
  if (/friend_rate_limited/.test(text)) return new FriendError("rate_limited")
  if (/friend_not_found/.test(text)) return new FriendError("not_found")
  if (/friend_self/.test(text)) return new FriendError("self")
  if (/friend_needs_username/.test(text)) return new FriendError("needs_username")
  if (/friend_not_allowed/.test(text)) return new FriendError("not_allowed")
  if (code === "42501" || status === 401 || status === 403) return new FriendError("signed_out")
  if (status >= 500) return new FriendError("offline")
  return new FriendError("error")
}

/** A failure of any kind, in words for the player. */
export const messageOf = (e: unknown) => (e instanceof FriendError ? e.message : FRIEND_MESSAGE.offline)

// The one thing remembered: the functions were missing on this page load.
let missing = false
export const friendsMissing = () => missing
/** For tests (a page load always starts afresh). */
export function forgetFriendsMissing() { missing = false }

// ── Reading the server's rows ───────────────────────────────────────────────

const key = (username: string) => username.trim().replace(/^@/, "").toLowerCase()
const USERNAME_SHAPE = /^[A-Za-z0-9_]{3,20}$/
const byName = (a: PlayerCard, b: PlayerCard) => key(a.username).localeCompare(key(b.username))
const newestFirst = (a: FriendRequest, b: FriendRequest) => (b.at ?? "").localeCompare(a.at ?? "")

export function asFriend(row: unknown): Friend | null {
  const card = asCard(row)
  if (!card) return null
  const r = row as Record<string, unknown>
  return { ...card, stats: readStats(r.stats), since: typeof r.friends_since === "string" ? r.friends_since : null }
}

export function asRequest(row: unknown): FriendRequest | null {
  const card = asCard(row)
  if (!card) return null
  const r = row as Record<string, unknown>
  if (r.direction !== "incoming" && r.direction !== "outgoing") return null
  return { ...card, direction: r.direction, at: typeof r.sent_at === "string" ? r.sent_at : null }
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v ? [v] : [])

/** The friend calls. Methods throw a FriendError. */
export interface FriendsBackend {
  list(): Promise<Friend[]>
  requests(): Promise<FriendRequest[]>
  /** pending: asked. accepted: they had asked you, so now you're friends. */
  send(username: string): Promise<"pending" | "accepted">
  respond(username: string, accept: boolean): Promise<"accepted" | "none">
  remove(username: string): Promise<void>
  /** A friend's whole profile (even a private one), or null if not a friend. */
  profile(username: string): Promise<PlayerProfile | null>
}

type Res<T> = { data: T; error: PgError | null; status: number }
// Only the part of the Supabase client used here, so tests can fake it.
type Client = Pick<SupabaseClient, "rpc">

export function supabaseFriends(c: Client): FriendsBackend {
  const call = async (fn: string, args: Record<string, unknown> = {}): Promise<unknown> => {
    if (missing) throw new FriendError("unavailable")
    const res = await c.rpc(fn, args) as Res<unknown>
    if (res.error) {
      const err = friendError(res.error, res.status)
      if (err.kind === "unavailable") missing = true
      throw err
    }
    return res.data
  }
  const player = (username: string) => {
    const u = username.trim().replace(/^@/, "")
    if (!USERNAME_SHAPE.test(u)) throw new FriendError("not_found")
    return u
  }
  return {
    async list() {
      return list(await call("list_friends")).map(asFriend).filter((f): f is Friend => !!f).slice(0, MAX_FRIENDS).sort(byName)
    },
    async requests() {
      return list(await call("friend_requests")).map(asRequest).filter((r): r is FriendRequest => !!r).slice(0, 250).sort(newestFirst)
    },
    async send(username) {
      return (await call("send_friend_request", { player: player(username) })) === "accepted" ? "accepted" : "pending"
    },
    async respond(username, accept) {
      return (await call("respond_friend_request", { player: player(username), accept })) === "accepted" ? "accepted" : "none"
    },
    async remove(username) {
      await call("remove_friend", { player: player(username) })
    },
    async profile(username) {
      const u = username.trim().replace(/^@/, "")
      if (!USERNAME_SHAPE.test(u)) return null
      const row = list(await call("get_friend", { player: u }))[0]
      return row ? asPlayer(row) : null
    },
  }
}

// ── Where you stand, and what the button says ───────────────────────────────

/** You and `username`, from the lists; null while the friends list hasn't
 *  loaded (so no button guesses "Add friend" for someone who is a friend). */
export function relationOf(s: Pick<FriendsState, "friends" | "incoming" | "outgoing">, username: string): Relation | null {
  const k = key(username)
  if (s.friends?.some(f => key(f.username) === k)) return "friends"
  if (s.incoming.some(r => key(r.username) === k)) return "incoming"
  if (s.outgoing.some(r => key(r.username) === k)) return "outgoing"
  return s.friends ? "none" : null
}

export type FriendAct = "send" | "accept" | "decline" | "cancel" | "remove"

export interface FriendControls {
  /** The main button, or null when there is only a label. */
  primary: { label: string; act: FriendAct } | null
  /** A plain label (not a button): "Requested", "Friends". */
  label: string | null
  /** A quieter second action. */
  secondary: { label: string; act: FriendAct } | null
  /** Asked before the secondary action runs. */
  confirm: string | null
  /** A line under the buttons. */
  note: string | null
}

/** The friend button on `name`'s profile. */
export function friendControls(rel: Relation, name: string): FriendControls {
  switch (rel) {
    case "none": return { primary: { label: "Add friend", act: "send" }, label: null, secondary: null, confirm: null, note: "Friends can see each other’s stats, even on a private profile." }
    case "outgoing": return { primary: null, label: "Requested", secondary: { label: "Cancel request", act: "cancel" }, confirm: null, note: `Waiting for ${name} to accept.` }
    case "incoming": return { primary: { label: "Accept request", act: "accept" }, label: null, secondary: { label: "Decline", act: "decline" }, confirm: null, note: `${name} wants to be friends.` }
    case "friends": return { primary: null, label: "Friends", secondary: { label: "Remove", act: "remove" }, confirm: `Remove ${name} from your friends? They won’t be told, and you’ll stop seeing each other’s stats.`, note: null }
  }
}

// ── Words for the friends list ──────────────────────────────────────────────

const nf = new Intl.NumberFormat("en-US")
const fmt = (n: number) => nf.format(n)
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`

/** "Best streak 14 · 23 achievements" (or what there is to say). */
export function friendHeadline(s: ProfileStats): string {
  const parts: string[] = []
  if (s.bestStreak > 0) parts.push(`Best streak ${fmt(s.bestStreak)}`)
  if (s.achievements > 0) parts.push(plural(s.achievements, "achievement", "achievements"))
  if (!parts.length) parts.push(s.flags > 0 ? plural(s.flags, "flag learned", "flags learned") : "Just getting started")
  return parts.join(" · ")
}

const WEEK = 7 * 24 * 60 * 60 * 1000

/** Their newest achievement, if it came in the last week. */
export function friendNews(s: ProfileStats, now: number): { title: string; at: number } | null {
  let top: [string, number] | null = null
  for (const a of s.activity) if (!top || a[1] > top[1]) top = a
  if (!top || now - top[1] > WEEK || top[1] > now + WEEK) return null
  const a = achievementById(top[0])
  return a ? { title: a.title, at: top[1] } : null
}

/** A live streak, as of `today` (0 once it has lapsed). */
export const friendStreak = (s: ProfileStats, today: string) => shownStreak(s, today)

// ── You vs a friend ─────────────────────────────────────────────────────────

export type VsResult = "ahead" | "behind" | "tied"

export interface VsRow {
  id: string
  title: string
  mine: number
  theirs: number
  result: VsResult
  /** Behind: the score to beat (theirs). */
  beat: number | null
}

export interface Versus {
  /** Flags learned, best streak, achievements, Daily Games. */
  overall: VsRow[]
  /** Best score per game either of you has played: behind first, then
   *  tied, then ahead, each in the order games are listed. */
  games: VsRow[]
  /** Games you lead, and games they lead. */
  ahead: number
  behind: number
}

const row = (id: string, title: string, mine: number, theirs: number): VsRow => {
  const result: VsResult = mine > theirs ? "ahead" : mine < theirs ? "behind" : "tied"
  return { id, title, mine, theirs, result, beat: result === "behind" ? theirs : null }
}
const ORDER: Record<VsResult, number> = { behind: 0, tied: 1, ahead: 2 }

export function versus(mine: ProfileStats, theirs: ProfileStats): Versus {
  const overall = [
    row("flags", "Flags learned", mine.flags, theirs.flags),
    row("bestStreak", "Best streak", mine.bestStreak, theirs.bestStreak),
    row("achievements", "Achievements", mine.achievements, theirs.achievements),
    row("dailies", "Daily Games", mine.dailies, theirs.dailies),
  ]
  const games = REGISTRY
    .filter(r => (mine.bests[r.id] ?? 0) > 0 || (theirs.bests[r.id] ?? 0) > 0)
    .map((r, i) => ({ i, v: row(r.id, r.title, mine.bests[r.id] ?? 0, theirs.bests[r.id] ?? 0) }))
    .sort((a, b) => ORDER[a.v.result] - ORDER[b.v.result] || a.i - b.i)
    .map(x => x.v)
  return { overall, games, ahead: games.filter(g => g.result === "ahead").length, behind: games.filter(g => g.result === "behind").length }
}

// ── The friends on this device, kept up to date ─────────────────────────────

/** The friends list and requests, loaded from `backend`, with changes shown
 *  straight away and put back if the server refuses them. `emit` runs after
 *  every change (the account service publishes it to the page). */
export class FriendsStore {
  state: FriendsState
  private rev = 0
  private loading: { list: boolean; rev: number; done: Promise<void> } | null = null
  private b: FriendsBackend
  private emit: (s: FriendsState) => void
  private now: () => number

  constructor(backend: FriendsBackend, emit: (s: FriendsState) => void, now: () => number = Date.now) {
    this.b = backend
    this.emit = emit
    this.now = now
    this.state = { ...FRIENDS_OFF, status: missing ? "unavailable" : "loading" }
  }

  private set(patch: Partial<FriendsState>) {
    this.state = { ...this.state, ...patch }
    this.emit(this.state)
  }

  /** Load the requests, and the friends list unless `list` is false. With
   *  `maxAge`, only when the last load is older than that (ms). */
  refresh(opts: { list?: boolean; maxAge?: number } = {}): Promise<void> {
    const wantList = opts.list ?? true
    if (missing) {
      if (this.state.status !== "unavailable") this.set({ status: "unavailable", friends: null, incoming: [], outgoing: [] })
      return Promise.resolve()
    }
    const s = this.state
    if (opts.maxAge != null && s.status === "ready" && this.now() - s.checked < opts.maxAge && (!wantList || s.friends)) return Promise.resolve()
    // One load at a time, unless something changed since it started.
    if (this.loading && this.loading.rev === this.rev && (this.loading.list || !wantList)) return this.loading.done
    const rev = this.rev
    if (s.status !== "ready") this.set({ status: "loading" })
    const mine = { list: wantList, rev, done: Promise.resolve() }
    this.loading = mine
    mine.done = (async () => {
      try {
        const [requests, friends] = await Promise.all([this.b.requests(), wantList ? this.b.list() : Promise.resolve(null)])
        if (rev !== this.rev) return // something changed meanwhile; that change loads again
        this.set({
          status: "ready",
          incoming: requests.filter(r => r.direction === "incoming"),
          outgoing: requests.filter(r => r.direction === "outgoing"),
          friends: friends ?? this.state.friends,
          checked: this.now(),
        })
      } catch (e) {
        const kind = e instanceof FriendError ? e.kind : "offline"
        if (kind === "unavailable") { this.set({ status: "unavailable", friends: null, incoming: [], outgoing: [] }); return }
        if (rev !== this.rev) return
        // Shown already: keep it, the next load tries again. Nothing yet: say so.
        if (this.state.status !== "ready") this.set({ status: "offline" })
      } finally {
        if (this.loading === mine) this.loading = null
      }
    })()
    return mine.done
  }

  isBusy = (username: string) => this.state.busy.includes(key(username))

  /** Run `change` on the server after showing `optimistic`; put that player's
   *  rows back if the server refuses. An error message, or null when done. */
  private async change(username: string, optimistic: Partial<FriendsState>, run: () => Promise<unknown>): Promise<string | null> {
    const k = key(username)
    if (this.state.status !== "ready" || this.state.busy.includes(k)) return null
    const before = this.state
    this.rev++
    this.set({ ...optimistic, busy: [...this.state.busy, k] })
    try {
      await run()
      this.set({ busy: this.state.busy.filter(x => x !== k) })
      void this.refresh() // the server's rows (a new friend's stats, their picture)
      return null
    } catch (e) {
      const is = (p: PlayerCard) => key(p.username) === k
      const not = (p: PlayerCard) => key(p.username) !== k
      if (e instanceof FriendError && e.kind === "unavailable") {
        this.set({ status: "unavailable", friends: null, incoming: [], outgoing: [], busy: [] })
        return e.message
      }
      this.set({
        friends: this.state.friends && [...this.state.friends.filter(not), ...(before.friends ?? []).filter(is)].sort(byName),
        incoming: [...this.state.incoming.filter(not), ...before.incoming.filter(is)].sort(newestFirst),
        outgoing: [...this.state.outgoing.filter(not), ...before.outgoing.filter(is)].sort(newestFirst),
        busy: this.state.busy.filter(x => x !== k),
      })
      return messageOf(e)
    }
  }

  private asFriendNow(card: PlayerCard): Friend {
    return { username: card.username, picture: card.picture, badge: card.badge, stats: { ...EMPTY_STATS }, since: null }
  }

  /** Ask a player (or, if they asked you, accept). */
  send(card: PlayerCard): Promise<string | null> {
    const k = key(card.username)
    const s = this.state
    if (s.friends?.some(f => key(f.username) === k) || s.outgoing.some(r => key(r.username) === k)) return Promise.resolve(null)
    const theirs = s.incoming.find(r => key(r.username) === k)
    const optimistic: Partial<FriendsState> = theirs
      ? { incoming: s.incoming.filter(r => r !== theirs), friends: s.friends && [...s.friends, this.asFriendNow(theirs)].sort(byName) }
      : { outgoing: [{ username: card.username, picture: card.picture, badge: card.badge, direction: "outgoing" as const, at: new Date(this.now()).toISOString() }, ...s.outgoing] }
    return this.change(card.username, optimistic, () => this.b.send(card.username))
  }

  /** Accept or decline a request they sent you. */
  respond(username: string, accept: boolean): Promise<string | null> {
    const k = key(username)
    const s = this.state
    const theirs = s.incoming.find(r => key(r.username) === k)
    const optimistic: Partial<FriendsState> = {
      incoming: s.incoming.filter(r => key(r.username) !== k),
      ...(accept && theirs && s.friends ? { friends: [...s.friends, this.asFriendNow(theirs)].sort(byName) } : {}),
    }
    return this.change(username, optimistic, () => this.b.respond(username, accept))
  }

  /** Unfriend, cancel your request, or decline theirs. */
  remove(username: string): Promise<string | null> {
    const not = (p: PlayerCard) => key(p.username) !== key(username)
    const s = this.state
    return this.change(username, { friends: s.friends && s.friends.filter(not), incoming: s.incoming.filter(not), outgoing: s.outgoing.filter(not) }, () => this.b.remove(username))
  }
}

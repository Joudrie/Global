// Public profiles on the account: claiming a username, the public switch,
// keeping the public row up to date, and reading other players' profiles.
//
// The table is public.profiles (supabase/migrations/20261127100000_profiles.sql).
// A player reads and writes only their own row (row level security); everyone,
// signed in or not, reads other players only through public.find_players()
// and public.get_player(), which return public profiles only and never an
// account id or email. Until the owner has run the SQL those calls fail with
// "not found", and the app says profiles aren't available yet.
//
// It knows nothing about the page: service.ts passes in the Supabase client
// (tests pass a fake one).
import type { SupabaseClient } from "@supabase/supabase-js"
import { usernameProblem, USERNAME_MESSAGE, bioProblem, BIO_MESSAGE } from "../profile/text"
import type { UsernameProblem } from "../profile/text"
import { readStats } from "../profile/stats"
import type { ProfileStats } from "../profile/stats"
import { readPicture, DESIGN_CODE_MAX } from "../profile/public"
import type { PublicPicture, PublicRow } from "../profile/public"
import { BANNERS } from "../profile/banners"
import { achievementById } from "../data/achievements"
import { MAX_PINNED, MAX_DESIGNS } from "../profile/local"

export interface MyProfile {
  username: string
  isPublic: boolean
  /** The owner hid this profile (it isn't shown to anyone). */
  hidden: boolean
  createdAt: string | null
}

export interface PlayerCard { username: string; picture: PublicPicture | null; badge: string | null }

export interface PlayerProfile extends PlayerCard {
  banner: string
  bio: string
  pinned: string[]
  designs: string[]
  stats: ProfileStats
  createdAt: string | null
}

export type ProfileErrorKind = "unavailable" | "offline" | "taken" | "not_allowed" | "invalid" | "signed_out" | "error"

type Reason = UsernameProblem | "bio" | "exists"

export class ProfileError extends Error {
  kind: ProfileErrorKind
  /** For "not_allowed": which rule (a username that is offensive or reserved,
   *  or a bio). "exists": the player's row was already there. */
  reason?: Reason
  constructor(kind: ProfileErrorKind, message: string, reason?: Reason) {
    super(message)
    this.kind = kind
    this.reason = reason
  }
}

export const PROFILE_MESSAGE: Record<ProfileErrorKind, string> = {
  unavailable: "Profiles aren’t available yet.",
  offline: "Couldn’t reach the server. Check your connection and try again.",
  taken: USERNAME_MESSAGE.taken,
  not_allowed: "That isn’t allowed. Try something else.",
  invalid: "That doesn’t look right. Check it and try again.",
  signed_out: "Sign in again to change your profile.",
  error: "Something went wrong. Try again.",
}

interface PgError { code?: string; message?: string; details?: string | null; hint?: string | null }

/** Turn a failed request into a ProfileError a player can read. */
export function profileError(err: PgError | null | undefined, status: number): ProfileError {
  const code = err?.code ?? ""
  const text = `${err?.message ?? ""} ${err?.details ?? ""} ${err?.hint ?? ""}`
  const make = (kind: ProfileErrorKind, reason?: Reason, message = PROFILE_MESSAGE[kind]) => new ProfileError(kind, message, reason)
  if (status === 0 || /failed to fetch|networkerror|network request|load failed/i.test(text)) return make("offline")
  // The SQL hasn't been run: PostgREST can't find the function or table.
  if (["PGRST202", "PGRST205", "42P01", "42883", "3F000"].includes(code) || (status === 404 && !code)) return make("unavailable")
  if (code === "23505") return /profiles_pkey/.test(text) ? make("error", "exists") : make("taken")
  if (/username_not_allowed/.test(text)) {
    const reason: UsernameProblem = /reserved/.test(text) ? "reserved" : "offensive"
    return make("not_allowed", reason, USERNAME_MESSAGE[reason])
  }
  if (/bio_not_allowed/.test(text)) return make("not_allowed", "bio", BIO_MESSAGE.offensive)
  if (code === "23514" || code === "22001" || code === "22P02") return make("invalid")
  if (code === "42501" || status === 401 || status === 403) return make("signed_out")
  if (status >= 500) return make("offline")
  return make("error")
}

type Res<T> = { data: T; error: PgError | null; status: number }
function check<T>(res: Res<T>): T {
  if (res.error) throw profileError(res.error, res.status)
  return res.data
}

const MINE = "username, is_public, hidden_by_owner, created_at"
const asMine = (row: Record<string, unknown> | null): MyProfile | null =>
  row && typeof row.username === "string"
    ? { username: row.username, isPublic: row.is_public !== false, hidden: row.hidden_by_owner === true, createdAt: typeof row.created_at === "string" ? row.created_at : null }
    : null

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "")
const USERNAME_SHAPE = /^[A-Za-z0-9_]{3,20}$/

function asCard(row: unknown): PlayerCard | null {
  if (!row || typeof row !== "object") return null
  const r = row as Record<string, unknown>
  if (typeof r.username !== "string" || !USERNAME_SHAPE.test(r.username)) return null
  const badge = typeof r.badge === "string" && r.badge.trim() ? r.badge.trim().slice(0, 40) : null
  return { username: r.username, picture: readPicture(r.picture), badge }
}

function asPlayer(row: unknown): PlayerProfile | null {
  const card = asCard(row)
  if (!card) return null
  const r = row as Record<string, unknown>
  const list = (v: unknown, max: number, ok: (s: string) => boolean) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && ok(x)).slice(0, max) : []
  return {
    ...card,
    banner: typeof r.banner === "string" && BANNERS.some(b => b.id === r.banner) ? r.banner : BANNERS[0].id,
    bio: text(r.bio, 200),
    pinned: list(r.pinned, MAX_PINNED, id => !!achievementById(id)),
    designs: list(r.designs, MAX_DESIGNS, c => c.length <= DESIGN_CODE_MAX && /^[A-Za-z0-9_-]+$/.test(c)),
    stats: readStats(r.stats),
    createdAt: typeof r.created_at === "string" ? r.created_at : null,
  }
}

/** The player's own row and the public lookups. Methods throw a ProfileError. */
export interface ProfileBackend {
  mine(): Promise<MyProfile | null>
  create(username: string, row: PublicRow): Promise<MyProfile>
  update(patch: Partial<PublicRow> & { username?: string; is_public?: boolean }): Promise<MyProfile | null>
  find(prefix: string): Promise<PlayerCard[]>
  get(username: string): Promise<PlayerProfile | null>
}

// Only the parts of the Supabase client used here, so tests can fake it.
type Client = Pick<SupabaseClient, "from" | "rpc">

/** The backend for the signed-in player `uid` (null: signed out, lookups only). */
export function supabaseProfiles(c: Client, uid: string | null): ProfileBackend {
  const me = () => {
    if (!uid) throw new ProfileError("signed_out", PROFILE_MESSAGE.signed_out)
    return uid
  }
  return {
    async mine() {
      const row = check(await c.from("profiles").select(MINE).eq("user_id", me()).maybeSingle() as Res<Record<string, unknown> | null>)
      return asMine(row)
    },
    async create(username, row) {
      const res = await c.from("profiles").insert({ user_id: me(), username, is_public: true, ...row }).select(MINE).single() as Res<Record<string, unknown> | null>
      const mine = asMine(check(res))
      if (!mine) throw new ProfileError("error", PROFILE_MESSAGE.error)
      return mine
    },
    async update(patch) {
      const row = check(await c.from("profiles").update(patch).eq("user_id", me()).select(MINE).maybeSingle() as Res<Record<string, unknown> | null>)
      return asMine(row)
    },
    async find(prefix) {
      const rows = check(await c.rpc("find_players", { prefix }) as Res<unknown[] | null>)
      return (Array.isArray(rows) ? rows : []).map(asCard).filter((x): x is PlayerCard => !!x).slice(0, 10)
    },
    async get(username) {
      const rows = check(await c.rpc("get_player", { player: username }) as Res<unknown[] | unknown | null>)
      const row = Array.isArray(rows) ? rows[0] : rows
      return row ? asPlayer(row) : null
    },
  }
}

// ── What the profile screens call ──────────────────────────────────────────

/** Claim (or change to) a username. Checks the rules here first; the
 *  database checks them again and keeps usernames unique (any case). */
export async function claimUsername(b: ProfileBackend, name: string, row: PublicRow, existing: MyProfile | null): Promise<MyProfile> {
  const problem = usernameProblem(name)
  if (problem) throw new ProfileError(problem === "format" ? "invalid" : "not_allowed", USERNAME_MESSAGE[problem], problem === "format" ? undefined : problem)
  const bad = row.bio ? bioProblem(row.bio) : null
  const safe: PublicRow = bad ? { ...row, bio: null } : row
  if (existing) {
    const mine = await b.update({ username: name })
    if (!mine) throw new ProfileError("error", PROFILE_MESSAGE.error)
    return mine
  }
  try {
    return await b.create(name, safe)
  } catch (e) {
    // Another device of this player made the row in the meantime.
    if (e instanceof ProfileError && e.reason === "exists") {
      const mine = await b.update({ username: name })
      if (mine) return mine
    }
    // The database refused the bio (a word only it knows): claim without it.
    if (e instanceof ProfileError && e.reason === "bio") return b.create(name, { ...safe, bio: null })
    throw e
  }
}

/** Players whose username starts with `prefix` (public profiles only, up to 10). */
export async function searchPlayers(b: ProfileBackend, prefix: string): Promise<PlayerCard[]> {
  const q = prefix.trim().replace(/^@/, "")
  if (!/^[A-Za-z0-9_]{1,20}$/.test(q)) return []
  return b.find(q)
}

/** A public profile by username (any case), or null if there's no public one. */
export async function viewPlayer(b: ProfileBackend, username: string): Promise<PlayerProfile | null> {
  const u = username.trim().replace(/^@/, "")
  if (!USERNAME_SHAPE.test(u)) return null
  return b.get(u)
}

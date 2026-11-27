// The player's own profile choices, kept on this device (and synced with the
// account like the rest of the save): picture, banner, bio, pinned badges and
// which Flag Studio designs to show. Usernames and the public switch live in
// the account (public.profiles), not here.
//
// globalio_profile: { picture, banner, bio, pinned, designs, date }. `date`
// is when it last changed (ISO time); when two devices differ, the later
// change wins (the "dated" rule in src/utils/mergeProgress.ts).
// globalio_first_seen: when this player first opened Globalio (ms); the
// earlier of two devices wins (the "min" rule).
import { FLAGS } from "../data/flags"
import type { Snapshot } from "../utils/mergeProgress"
import { DEFAULT_BANNER, bannerOf } from "./banners"
import { BIO_MAX, cleanBio } from "./text"
import { achievementById } from "../data/achievements"
import { mainOf } from "./save"

export const PROFILE_KEY = "globalio_profile"
export const FIRST_SEEN_KEY = "globalio_first_seen"
export const PROFILE_EVENT = "globalio:profile"
export const MAX_PINNED = 3
/** Flag Studio designs a profile can offer or show (the newest ones). */
export const MAX_DESIGNS = 32

export type Picture = { kind: "flag"; code: string } | { kind: "design"; id: string }

export interface LocalProfile {
  picture: Picture | null
  /** A preset id or "flag:<code>" (src/profile/banners.ts). */
  banner: string
  bio: string
  pinned: string[]
  /** Flag Studio design ids to show on the public profile. */
  designs: string[]
  date: string
}

export const EMPTY_PROFILE: LocalProfile = { picture: null, banner: DEFAULT_BANNER, bio: "", pinned: [], designs: [], date: "" }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const ids = (v: unknown, max: number, ok: (s: string) => boolean) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && ok(x)))].slice(0, max) : []

export function pictureOf(v: unknown): Picture | null {
  if (!isObj(v)) return null
  if (v.kind === "flag" && typeof v.code === "string" && FLAGS.some(f => f.code === v.code)) return { kind: "flag", code: v.code }
  if (v.kind === "design" && typeof v.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v.id)) return { kind: "design", id: v.id }
  return null
}

/** The profile in a save, with anything unknown or malformed dropped. */
export function profileOf(snap: Snapshot): LocalProfile {
  let raw: unknown
  try { raw = JSON.parse(snap?.[PROFILE_KEY] ?? "null") } catch { raw = null }
  if (!isObj(raw)) return { ...EMPTY_PROFILE }
  const bio = cleanBio(typeof raw.bio === "string" ? raw.bio : "")
  return {
    picture: pictureOf(raw.picture),
    banner: bannerOf(raw.banner),
    bio: Array.from(bio).slice(0, BIO_MAX).join(""),
    pinned: ids(raw.pinned, MAX_PINNED, id => !!achievementById(id)),
    designs: ids(raw.designs, MAX_DESIGNS, id => /^[A-Za-z0-9_-]{1,40}$/.test(id)),
    date: typeof raw.date === "string" ? raw.date : "",
  }
}

export function readProfile(): LocalProfile {
  try { return profileOf({ [PROFILE_KEY]: localStorage.getItem(PROFILE_KEY) ?? "null" }) } catch { return { ...EMPTY_PROFILE } }
}

/** Change some of the profile. False when the device's storage is full or blocked. */
export function saveProfile(patch: Partial<Omit<LocalProfile, "date">>): boolean {
  const next = { ...readProfile(), ...patch, date: new Date().toISOString() }
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)) } catch { return false }
  try { window.dispatchEvent(new Event(PROFILE_EVENT)) } catch { /* not a browser */ }
  return true
}

// ── Playing since ───────────────────────────────────────────────────────────

/** The earliest day this save knows of (ms): first opened, or the first Daily Game. */
export function firstSeenOf(snap: Snapshot): number | null {
  const stored = Number(snap?.[FIRST_SEEN_KEY])
  const days = Object.keys(mainOf(snap).dailyHistory).sort()
  const firstDaily = days.length ? Date.parse(`${days[0]}T12:00:00Z`) : NaN
  const all = [stored, firstDaily].filter(n => Number.isFinite(n) && n > Date.UTC(2020, 0, 1))
  return all.length ? Math.min(...all) : null
}

/** "2026-11": the month this player started, for the profile. */
export function sinceMonth(snap: Snapshot): string | null {
  const t = firstSeenOf(snap)
  if (t == null) return null
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
/** "November 2026" from "2026-11" (or null). */
export function monthName(ym: string | null | undefined): string | null {
  const m = typeof ym === "string" ? /^(\d{4})-(\d{2})$/.exec(ym) : null
  if (!m || +m[2] < 1 || +m[2] > 12) return null
  return `${MONTHS[+m[2] - 1]} ${m[1]}`
}

/** At app start: remember when this player first opened Globalio. */
export function noteFirstSeen(snap: Snapshot): void {
  try {
    const known = firstSeenOf(snap)
    const stored = Number(localStorage.getItem(FIRST_SEEN_KEY))
    const t = known ?? Date.now()
    if (!Number.isFinite(stored) || stored <= 0 || t < stored) localStorage.setItem(FIRST_SEEN_KEY, String(t))
  } catch { /* storage blocked: the profile just won't say */ }
}

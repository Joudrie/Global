// The sample profile for judging the trial layouts (?look=a|b|c&demo=1, see
// ./look.ts): "Bob", a made-up player with a banner, a flag picture, a bio,
// three pinned badges, seven published Flag Studio designs (real share codes,
// drawn the way a public profile's are), twelve achievements and some stats.
//
// It is built fresh each time and shown read-only, like another player's
// profile. Nothing here reads or writes storage, and it imports nothing at
// run time, so it can never end up in a player's save.
import type { PlayerProfile } from "../account/profiles"
import type { ProfileStats } from "./stats"

export interface DemoProfile {
  /** The display name ("Bob"); the username is player.username. */
  name: string
  player: PlayerProfile
  /** { achievement id: unlock time } */
  unlocks: Record<string, number>
}

/** Share codes made with Flag Studio's encodeDesign (names left out, as on a public profile). */
export const DEMO_DESIGNS = [
  "eyJuIjoiIiwiYiI6ImxheW91dDpub3JkaWMiLCJwIjp7IjAiOnsiZiI6IiMxZDRlODkifSwiMSI6eyJmIjoiI2YyYzE0ZSJ9LCIyIjp7ImYiOiIjZjJjMTRlIn19LCJvIjpbXX0", // Fjordland
  "eyJuIjoiIiwiYiI6InN0cmlwZXMiLCJwIjp7IjAiOnsiZiI6IiMyZTZmNDAifSwiMSI6eyJmIjoiI2ZmZmZmZiJ9LCIyIjp7ImYiOiIjYzgxMDJlIn19LCJvIjpbWyJzdW4iLDUwMCwzMzQsMjYwLDAsIiNmMmE5MDAiXV0sInMiOnsiZCI6ImgiLCJ3IjpbMSwyLDFdfX0", // Sunreach
  "eyJuIjoiIiwiYiI6ImxheW91dDp0cmlhbmdsZSIsInAiOnsiMCI6eyJmIjoiI2Y0ZWZlMSJ9LCIxIjp7ImYiOiIjMmM1ZjdjIn0sIjIiOnsiZiI6IiNjMDg4M2EifX0sIm8iOltbInN0YXI1IiwxNjAsMzM0LDE1MCwwLCIjZmZmZmZmIl1dfQ", // Ochre Isles
  "eyJuIjoiIiwiYiI6ImxheW91dDpkaXNjIiwicCI6eyIwIjp7ImYiOiIjMTQyMTNkIn0sIjEiOnsiZiI6IiNlOWM0NmEifX0sIm8iOltdfQ", // Night Harbour
  "eyJuIjoiIiwiYiI6ImxheW91dDpkaWFnb25hbCIsInAiOnsiMCI6eyJmIjoiIzNhN2Q0NCJ9LCIxIjp7ImYiOiIjZmZmZmZmIn19LCJvIjpbWyJjcmVzY2VudHN0YXIiLDMwMCwyMzAsMjAwLDAsIiNjODEwMmUiXV19", // Two Rivers
  "eyJuIjoiIiwiYiI6InN0cmlwZXMiLCJwIjp7IjAiOnsiZiI6IiNhMzNiMjAifSwiMSI6eyJmIjoiI2ZmZmZmZiJ9fSwibyI6W1sibWFwbGUiLDc1MCwzMzQsMzAwLDAsIiNhMzNiMjAiXV0sInMiOnsiZCI6InYiLCJ3IjpbMSwxXX19", // Maplewood
  "eyJuIjoiIiwiYiI6ImxheW91dDpiaWNvbG91ciIsInAiOnsiMCI6eyJmIjoiIzVjOGNhOCJ9LCIxIjp7ImYiOiIjZjRlZmUxIn19LCJvIjpbWyJtb3VudGFpbnMiLDUwMCw0MjAsNTIwLDAsIiMxZjNhM2MiXSxbInN0YXI3Iiw1MDAsMTUwLDExMCwwLCIjZjJjMTRlIl1dfQ", // Seven Peaks
]

const DAY = 86_400_000
// Achievement, and how many days ago it unlocked (newest first).
const UNLOCKED: [string, number][] = [
  ["streak-30", 2], ["learn-100", 6], ["flagle-3", 9], ["realorbot-10", 15], ["crown-first", 21], ["studio-first", 30],
  ["daily-perfect", 38], ["learn-50", 52], ["flagle-win", 60], ["daily-10", 74], ["streak-7", 96], ["daily-first", 160],
]

const localDay = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const month = (t: number) => localDay(t).slice(0, 7)

/** Bob, as of `now`. Pure: the same `now` gives the same profile. */
export function demoProfile(now = Date.now()): DemoProfile {
  const unlocks = Object.fromEntries(UNLOCKED.map(([id, days]) => [id, now - days * DAY - 3_600_000]))
  const stats: ProfileStats = {
    v: 1, flags: 142, flagsOf: 197, crowns: 2, streak: 34, streakDay: localDay(now), bestStreak: 34,
    dailies: 41, games: 49, collection: 18,
    bests: { realorbot: 17, forgery: 12, higherlower: 23 },
    since: month(now - 170 * DAY),
    achievements: UNLOCKED.length,
    activity: UNLOCKED.map(([id]) => [id, unlocks[id]]),
  }
  return {
    name: "Bob",
    unlocks,
    player: {
      username: "bob_maps",
      picture: { kind: "flag", code: "NO" },
      badge: null,
      banner: "compass",
      bio: "Weekend cartographer. Learning every flag in Africa this year, one Daily Game at a time.",
      pinned: ["streak-30", "crown-first", "flagle-3"],
      designs: [...DEMO_DESIGNS],
      stats,
      createdAt: null,
    },
  }
}

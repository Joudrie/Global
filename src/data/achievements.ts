// Achievements: small goals across the games, shown on the profile. Each one
// unlocks once, for good, and the time it unlocked is kept on this device
// (globalio_achievements, synced with the account like the rest of the save;
// see src/profile/achievements.ts).
//
// Two kinds:
// - `check`: worked out from what the save already holds (flags learned,
//   streaks, best scores…). Checked when the app starts and whenever the
//   player comes back from a game, so progress made before achievements
//   existed counts too.
// - no `check`: the game itself reports the moment (a Flagle solved in three
//   guesses) by calling unlockAchievement(id) when the game ends.
//
// Adding one: give it a new id (ids are stored, so never reuse or rename
// one), an icon from LineIcon's map (src/components/icons.tsx), and either a
// check or an unlockAchievement call in its game.

/** What a check can look at. Built from the save by src/profile/achievements.ts. */
export interface AchievementFacts {
  learned: number
  totalFlags: number
  /** Set crowns (World and the six regions). */
  crowns: number
  longestStreak: number
  dailies: number
  /** A Daily Game scored full marks. */
  perfectDaily: boolean
  /** Games launched or finished, whichever count is higher. */
  games: number
  /** Flags pulled in Flag Gacha. */
  collected: number
  /** Designs saved in Flag Studio. */
  designs: number
  /** Best score for a game id (the highest of its tiers/modes), or 0. */
  best: (game: string, tier?: string) => number
  /** Gauntlet regions passed at least once ("world", "europe", …; utils/gauntlet.ts). */
  gauntlets: string[]
}

export interface Achievement {
  id: string
  title: string
  /** How to get it, shown under a locked one. */
  how: string
  /** A LineIcon name. */
  icon: string
  /** The game it belongs to (a registry id), or null for the whole site. */
  game: string | null
  /** The heading it's listed under. */
  group: string
  check?: (f: AchievementFacts) => boolean
}

export const SET_CROWNS = ["world", "europe", "africa", "asia", "americas", "oceania", "middle-east"]

export const ACHIEVEMENTS: Achievement[] = [
  // The Daily Game and streaks
  { id: "daily-first", title: "First expedition", how: "Finish a Daily Game.", icon: "compass", game: null, group: "Daily Game", check: f => f.dailies >= 1 },
  { id: "daily-perfect", title: "Flawless day", how: "Get every flag right in a Daily Game.", icon: "target", game: null, group: "Daily Game", check: f => f.perfectDaily },
  { id: "daily-10", title: "Regular", how: "Finish 10 Daily Games.", icon: "map", game: null, group: "Daily Game", check: f => f.dailies >= 10 },
  { id: "streak-7", title: "Week of flags", how: "Play the Daily Game 7 days in a row.", icon: "flame", game: null, group: "Daily Game", check: f => f.longestStreak >= 7 },
  { id: "streak-30", title: "Month of flags", how: "Play the Daily Game 30 days in a row.", icon: "flame", game: null, group: "Daily Game", check: f => f.longestStreak >= 30 },

  // Learning every flag
  { id: "learn-50", title: "Fifty flags", how: "Learn 50 country flags.", icon: "flag", game: null, group: "Flags", check: f => f.learned >= 50 },
  { id: "learn-100", title: "Centurion", how: "Learn 100 country flags.", icon: "flag", game: null, group: "Flags", check: f => f.learned >= 100 },
  { id: "learn-all", title: "Atlas complete", how: "Learn every country flag.", icon: "globe", game: null, group: "Flags", check: f => f.totalFlags > 0 && f.learned >= f.totalFlags },
  { id: "crown-first", title: "First crown", how: "Learn every flag in a Flag Set (World or a region).", icon: "crown", game: null, group: "Flags", check: f => f.crowns >= 1 },
  { id: "crown-all", title: "Crowned everywhere", how: "Earn all seven Flag Set crowns.", icon: "crown", game: null, group: "Flags", check: f => f.crowns >= SET_CROWNS.length },

  // Flagle (reported by the game)
  { id: "flagle-win", title: "Flagle solved", how: "Solve a Flagle.", icon: "flagle", game: "flagle", group: "Flagle" },
  { id: "flagle-3", title: "Sharp eye", how: "Solve a Flagle in 3 guesses or fewer.", icon: "flagle", game: "flagle", group: "Flagle" },
  { id: "flagle-2", title: "Flagle Master", how: "Solve a Flagle in 2 guesses or fewer.", icon: "trophy", game: "flagle", group: "Flagle" },

  // Real or Bot: the best is a run of right calls
  { id: "realorbot-10", title: "Bot spotter", how: "Call 10 flags right in a row in Real or Bot.", icon: "realorbot", game: "realorbot", group: "Real or Bot", check: f => f.best("realorbot") >= 10 },
  { id: "realorbot-25", title: "Real or Bot Master", how: "Call 25 flags right in a row in Real or Bot.", icon: "trophy", game: "realorbot", group: "Real or Bot", check: f => f.best("realorbot") >= 25 },

  // Cities Abroad (wins reported by the game)
  { id: "citiesabroad-win", title: "Well travelled", how: "Win a game of Cities Abroad (10 right).", icon: "citiesabroad", game: "citiesabroad", group: "Cities Abroad" },
  { id: "citiesabroad-hard", title: "Cities Abroad Master", how: "Win a game of Cities Abroad on Hard.", icon: "trophy", game: "citiesabroad", group: "Cities Abroad" },

  // Flag Fusion: 2,000 points is a perfect game
  { id: "flagfusion-first", title: "First fusion", how: "Finish a game of Flag Fusion.", icon: "flagfusion", game: "flagfusion", group: "Flag Fusion", check: f => f.best("flagfusion") > 0 },
  { id: "flagfusion-hard", title: "Fusion Master", how: "Score 1,200 points on Hard in Flag Fusion.", icon: "trophy", game: "flagfusion", group: "Flag Fusion", check: f => f.best("flagfusion", "hard") >= 1200 },

  // Connections (reported by the game)
  { id: "connections-win", title: "Connected", how: "Solve a Connections puzzle.", icon: "connections", game: "connections", group: "Connections" },
  { id: "connections-perfect", title: "Perfect Connections", how: "Solve Connections with no mistakes and no hints.", icon: "trophy", game: "connections", group: "Connections" },

  // Gauntlet: passed means every flag in a region with no mistake
  { id: "gauntlet-pass", title: "Survivor", how: "Pass any Gauntlet.", icon: "gauntlet", game: "gauntlet", group: "Gauntlet", check: f => f.gauntlets.length >= 1 },
  { id: "gauntlet-world", title: "Iron will", how: "Pass the World Gauntlet.", icon: "trophy", game: "gauntlet", group: "Gauntlet", check: f => f.gauntlets.includes("world") },

  // Other games
  { id: "forgery-20", title: "Forgery Expert", how: "Score 20 in Flag Forgery.", icon: "forgery", game: "forgery", group: "More games", check: f => f.best("forgery") >= 20 },
  { id: "gacha-25", title: "Collector", how: "Collect 25 flags in Flag Gacha.", icon: "gacha", game: "gacha", group: "More games", check: f => f.collected >= 25 },
  { id: "studio-first", title: "Flag designer", how: "Save a design in Flag Studio.", icon: "flagstudio", game: "flagstudio", group: "More games", check: f => f.designs >= 1 },
  { id: "games-50", title: "Seasoned player", how: "Play 50 games.", icon: "quickplay", game: null, group: "More games", check: f => f.games >= 50 },
]

export const achievementById = (id: string) => ACHIEVEMENTS.find(a => a.id === id)

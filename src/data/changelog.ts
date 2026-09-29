// What's new on Globalio, newest first. Shown on /whats-new/ and in the app's
// "Last updated" line. Add an entry whenever a change ships to players.
export interface ChangelogEntry { date: string; title: string; items: string[] }

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-29",
    title: "Connections, and a much harder Real or Bot",
    items: [
      "New daily game: Connections. Find four groups of four countries, with a new puzzle every day.",
      "Connections gives you six mistakes and three free hints.",
      "Real or Bot now has 900 computer-made flags, and fewer real flags with giveaway crests.",
      "Privacy policy and terms updated for visitors in Europe and US states.",
    ],
  },
  {
    date: "2026-09-28",
    title: "Bug fixes across the games",
    items: [
      "Challenge Mode only shows countries with enough region flags, so no more broken images.",
      "Region and city flag games skip a flag that fails to load instead of getting stuck.",
      "Flagle shows full country names on phones.",
      "Typing a name like Niger or Guinea and pressing Enter now works.",
      "Flags are no longer cropped in quizzes.",
      "The whole site now uses the same parchment look.",
    ],
  },
  {
    date: "2026-07-02",
    title: "Flag Forgery",
    items: [
      "New game: spot the real flag against a doctored copy, including Turkey and Jamaica.",
      "Wider layout on desktop and a Top Games shelf.",
    ],
  },
  {
    date: "2026-06-30",
    title: "The flag archive",
    items: [
      "A readable page for every one of the 197 countries, with its flag's history.",
      "Archives of historical states and identity flags.",
    ],
  },
  {
    date: "2026-06-20",
    title: "Four drawing and spotting games",
    items: [
      "New games: GeoPaint, Sketch the Flag, Spot the Error and Flag Outline.",
      "City flags and regional flag symbols added to the Codex.",
    ],
  },
]

export const LAST_UPDATED = CHANGELOG[0].date

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  return `${d} ${months[m - 1]} ${y}`
}

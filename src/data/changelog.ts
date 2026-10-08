// What's new on Globalio, newest first. Shown on /whats-new/ and in the app's
// "Last updated" line. Add an entry whenever a change ships to players.
export interface ChangelogEntry { date: string; title: string; items: string[] }

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-08",
    title: "Flag Studio: make your own flag",
    items: [
      "New: Flag Studio. Start from any real flag or a blank layout and make it your own.",
      "Tap any stripe, star or emblem to recolour it, or change a colour everywhere at once.",
      "Add stars, suns, crescents, crosses and more, then drag, resize and rotate them.",
      "Download your flag as a PNG up to 4K or as an SVG, or share it with a link.",
      "Every flag you make is saved on your device under My flags.",
      "Add real emblems to your flag, like Albania's eagle, Mexico's eagle or Spain's coat of arms, keep their colours or make them one colour, or download one on its own as a PNG.",
      "Pick your flag's shape: 1:1, 2:3, 3:5 or 1:2.",
      "Symbols snap to the centre of the flag as you drag them.",
      "A design check scores your flag against the classic rules of flag design.",
      "Real flags now open at their official shape, like 10:19 for the United States and 1:1 for Switzerland.",
      "Striped flags are fully editable: change the number of stripes, flip them, and drag a stripe to make it wider.",
      "Nine new symbols, including a maple leaf, shamrock, laurel wreath, wheel, chevron, crescent and star, Nordic cross and saltire.",
      "Resize and rotate symbols with handles on the flag, pinch with two fingers on a phone, or nudge them with the arrow keys. A layers list picks out anything hidden underneath.",
      "Make a nation card: your flag, name and motto in one image, ready to post.",
      "New Random button: a brand-new flag and nation name with one tap.",
    ],
  },
  {
    date: "2026-10-08",
    title: "A cleaner look across every game",
    items: [
      "Every game now has the same header: a round back button, the game's name and your score or round in one place.",
      "Next, Play again and the other main buttons look and feel the same in every game, and end screens share one clear layout.",
      "Emoji icons are gone from the game screens, replaced by simple line icons that match the rest of Globalio.",
    ],
  },
  {
    date: "2026-10-02",
    title: "What every flag means",
    items: [
      "Every country page now explains what its flag means: where the colours and symbols come from, who designed it and when it was adopted.",
      "Country pages also list the capital, population, area, flag colours and neighbouring countries, with links to their flags.",
      "Syria's page and games now describe its current green-white-black flag, and Taiwan has a full flag history.",
      "Fixed flag descriptions for Mauritania, Japan, Comoros, Antigua and Barbuda, and Guyana.",
      "Globalio opens straight to the home screen, and the welcome tips sit at the top of Today instead of covering it.",
    ],
  },
  {
    date: "2026-09-29",
    title: "Connections, and a much harder Real or Bot",
    items: [
      "New daily game: Connections. Find four groups of four countries, with a new puzzle every day.",
      "Connections gives you six mistakes and three free hints.",
      "Real or Bot now has 900 computer-made flags, and fewer real flags with giveaway crests.",
      "The first visit loads much less: about 0.4 MB of code instead of 1.9 MB.",
      "Every flag image is now served by Globalio itself, so flags no longer go missing when Wikimedia is slow.",
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

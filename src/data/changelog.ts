// What's new on Globalio, newest first. Shown on /whats-new/ and in the app's
// "Last updated" line. Add an entry whenever a change ships to players.
export interface ChangelogEntry { date: string; title: string; items: string[] }

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-08",
    title: "Connections, rebuilt",
    items: [
      "The daily Connections board now mixes four kinds of tile: countries, capitals, flags and what each country calls itself, like Deutschland, Nippon or Aotearoa.",
      "52 brand-new puzzles, from Union Jack flags and capitals on the Danube to capitals once named after a person.",
      "Every solved group spells out its answers, so Österreich shows as Austria and each flag gets its name.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Fairer games, everywhere",
    items: [
      "Every game was checked answer by answer. Flag Timeline now orders every country's flags by year, and flags adopted in the same year count either way round.",
      "Two Truths never calls a true statement the lie (Turkey really is in Asia), and tells you when you picked a truth.",
      "Typing a country works with other names and without accents in every game: USA, UK, Ivory Coast, Holland, Burma, Czechia, Sao Tome. \"UK\" is never Ukraine, and Enter never guesses for you.",
      "A quick double tap can no longer skip a question, cast two votes in Flag Bracket, or jump past a result.",
      "No more twin flags as wrong answers (Sharjah and Ras al-Khaimah), no Monaco vs Indonesia, and Frankenflag accepts any flag whose half looks the same.",
      "The suggestion lists in Silhouette, The Crop, The Peel and Composer show names only, so they no longer give the answer away.",
      "Your progress in long Flag Sets is saved as you go, the daily picks up where you left off, and the streak shows 0 after a missed day.",
      "The phone's Back button takes you home instead of leaving the site.",
      "The Codex keeps your search and place when you switch tabs, opens Flag of the Day right on its entry, and finds countries by any name.",
      "Screen readers hear \"Flag 2 of 4\" on picture answers, never the answer itself, and more buttons and fields have names.",
      "Flag facts checked flag by flag: stripes, stars, crescents, suns and colours are fixed in Flag DNA, Flagle, Describe It, Higher or Lower and Symbol Hunt (Kazakhstan has no crescent; Malawi's sun isn't a star).",
      "Odd One Out's odd one is always really odd: fuller country lists, no countries that arguably belong, and the answers spread across far more flags.",
      "Flag Families never has two right ways to sort, and Symbol Hunt no longer marks a right tap wrong.",
      "Corrected tips and facts for Turkey, Cyprus, Liechtenstein, Mozambique, Kazakhstan, Croatia, San Marino, Chile, Lebanon and more. Malay has its own sentence in Language Quiz, and Crimea is listed once.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Smoother on phones",
    items: [
      "The welcome card shows on your first visit only.",
      "The Trending deck on Play swipes with a quick flick, and the next card no longer slides back in.",
      "Real or Bot and Flag Forgery no longer let the page slide sideways on phones.",
      "The category buttons on Play are bigger and easier to tap.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Flag Studio: build a crest, add your own pictures",
    items: [
      "Build your own coat of arms: six blank shields, a crown, a mural crown, a scroll, a fleur-de-lis, a tower, an anchor, a sword and a cross pattée. Add a shield first and the other pieces fit around it.",
      "Upload your own picture, like a logo or a drawing, and put it on your flag. Pictures stay on your device.",
      "New symbols: mountains and waves.",
      "Saudi Arabia's emblem no longer leaves green specks on other flags.",
      "Selection boxes now hug each shape, Escape always deselects, and dragging the colour picker is one undo step.",
      "Much smoother on phones: dragging a symbol no longer redraws the whole flag, and a pinch works with your fingers on the symbol.",
      "Real flags show their true colours in the colour strip (no more stray black on the US, UK, Nepal or Brazil), and tapping picks the part under your finger.",
      "Changing the flag's shape keeps a crest together, undo keeps your flag's name and motto, and taps that change nothing no longer fill the undo list.",
      "Downloads wait for emblems, the nation card no longer puts a white box behind Nepal, edits save when you switch apps, and a broken flag link says so.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Bug fixes",
    items: [
      "Geography no longer skips a question or crashes when you switch between Choices and Type-in after answering, and Play again deals new countries.",
      "Flag Families: tap a flag in a group to move it back, so a wrong sort can always be fixed on a phone.",
      "Border Map: giving up now ends the round and shows your result.",
      "Typing a full country name and pressing Enter picks that country, so Sudan is no longer read as South Sudan, or Oman as Romania, in Border Map, Border Path and Lineage.",
      "The Daily Game and Flagle count once a day: coming back after finishing shows today's result instead of a fresh try.",
      "Frankenflag's score counts halves correctly, Identity Flags' Play again replays the same deck, and the Tier List lets you switch which flag is selected.",
      "World Cup 2026: the arrow buttons change nation again, and going back from a nation's Codex page returns to that nation.",
      "Browse all flags shows full-size tiles on a computer, and the trophy shelf labels no longer overlap on small phones.",
    ],
  },
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
      "A new Flag maker page explains Flag Studio, with example flags and five tips for designing a good one.",
      "Tap the red × on a selected symbol or emblem to delete it, and tap the empty table to deselect.",
      "Real or Bot has 600 new computer-made flags from Flag Studio's Random button, for 1,500 in all.",
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

// What's new on Globalio, newest first. Shown on /whats-new/ and in the app's
// "Last updated" line. Add an entry whenever a change ships to players.
export interface ChangelogEntry { date: string; title: string; items: string[] }

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-27",
    title: "Gauntlet progress, faster Dead or Alive, records in The Peel, fairer Real or Bot",
    items: [
      "Gauntlet: your best run in every region now shows as a progress bar, and clearing a region marks it Passed with the date. Two new achievements: Survivor and Iron will.",
      "Dead or Alive: after a right answer the next flag opens by itself; Next still skips ahead.",
      "The Peel: keeps your best streak and best streak points, with a streak counter and “New best!” when you beat them.",
      "Real or Bot: the fakes no longer give themselves away with hairline seams where their stripes and crosses meet.",
    ],
  },
  {
    date: "2026-11-27",
    title: "Lineage scores double when you type, and the Tier List gets eight new lists",
    items: [
      "Lineage: type the country instead of picking from four and every round scores double. Small spelling slips still count, and your results show which rounds you typed.",
      "Tier List Maker: the “Other” pile is now eight lists: Pride, Separatist, Regions, Peoples, Indigenous, Micronations, Organizations and Movements. Your old rankings moved over with them.",
    ],
  },
  {
    date: "2026-11-27",
    title: "A paint bucket for Sketch the Flag, and levels in Tile Flipper",
    items: [
      "Sketch the Flag has a paint bucket: tap an area to fill it, or tap the blank canvas to paint the background. Drawings are sharper on phones too.",
      "Tile Flipper now has levels: solve a flag and the next one hides under more, smaller tiles, from 3×3 up to 7×5, then trickier look-alike flags. Points grow with each level, your best level and best run are saved, and reaching level 5 earns “Tile master”.",
    ],
  },
  {
    date: "2026-11-27",
    title: "Flag Studio up front, and Connections in beta",
    items: [
      "Flag Studio now opens the carousel on Today, so making your own flag is one tap away.",
      "Connections is in beta while its categories are tuned: each puzzle now runs for two weeks instead of one day. Today's puzzle stays on until 11 December.",
      "Browse all 4,500+ flags moved from Settings to the bottom of the Codex.",
    ],
  },
  {
    date: "2026-11-27",
    title: "Sign in with an email link",
    items: [
      "No Google account? On the You tab or in Settings, enter your email and we'll send you a sign-in link from noreply@globalio.app. Open it and your progress syncs across your devices, just like with Google.",
    ],
  },
  {
    date: "2026-11-27",
    title: "Profiles: find a friend by username",
    items: [
      "Signed in? Claim a username on the You tab and your profile becomes public: anyone can look it up with Find a player or open it from a link like globalio.app/?u=yourname. Only your username, picture, banner, bio, badges, stats and the Flag Studio designs you choose are shown, never your email.",
      "Turn off Public profile at any time to keep it to yourself. There are no followers, messages or comments: just your stats, and a card you can save, for a friend's profile too.",
    ],
  },
  {
    date: "2026-11-27",
    title: "Fixes",
    items: [
      "Edit profile stays where you are: picking a picture, banner or design no longer jumps you back to your designs, and the keyboard no longer closes while you type.",
      "On small phones, Flag Outline's Guess button fits on the screen, and Flag Fusion's header keeps to one line, with bigger help and clear buttons.",
      "The Daily log on the You tab shows dates as 24 Nov, like the rest of your profile, and the text boxes there show a clear outline while you type.",
    ],
  },
  {
    date: "2026-11-27",
    title: "A cleaner profile",
    items: [
      "Your profile is calmer and more compact: a slim banner with your picture over its edge, your three pinned badges beside it (tap a dashed + to pin one), and three small counts under your name for flags learned, achievements and published flags. Tap a count to jump to it.",
      "Your published Flag Studio designs sit in a strip you can swipe, with See all, and achievements show as small badges. Tap one to see how to unlock it, or to pin it.",
      "New banners on the site's tan paper, each with a single colour and drawn after a flag: waves, a Nordic cross, a disc, a hoist triangle, a diagonal band, a saltire, a sun, a crescent and star, stripes or a star field. Or make any country's flag your banner. Your saved card shows it too.",
      "The rest of the You tab is shorter: World mastery, your crowns, the Daily log, best scores and the collection tools are now one list of rows that open in place.",
    ],
  },
  {
    date: "2026-11-27",
    title: "Profiles: your stats in one place, and 25 achievements",
    items: [
      "The You tab now opens on your profile. Pick any country's flag or one of your own Flag Studio designs as your picture, choose a banner and write a short bio. Underneath are your flags learned, crowns, streaks, Daily Games, games played, Gacha flags and your best score in every game you've played. The new button at the top right of the app opens it from anywhere.",
      "25 achievements to unlock across the Daily Game, Flagle, Real or Bot, Cities Abroad, Flag Fusion, Connections and more, from your first expedition to Real or Bot Master. Progress you've already made counts. Pin up to three as badges on your profile.",
      "Save my card turns your profile into a picture sized for posts and stories, ready to share or save.",
    ],
  },
  {
    date: "2026-11-26",
    title: "Accounts: keep your progress on every device",
    items: [
      "Sign in with Google (Settings → Your progress, or the You tab) and your flags, streaks, best scores and collections stay the same on your phone, tablet and computer. It's free and optional; we only use your email and your game progress.",
      "Nothing is ever overwritten: what's already on each device is combined with your account, keeping the best of both, and it keeps syncing in the background as you play, even after time offline.",
      "Supporters stay ad-free on every device they sign in on. You can sign out or delete your account at any time; your progress stays on your device.",
    ],
  },
  {
    date: "2026-11-26",
    title: "Combine backups: bring progress from your phone and computer together",
    items: [
      "Backed up on two devices? Restore in Settings now asks whether to combine the backup with this device or replace it. Combine keeps the best of both: every flag learned, the higher score in each game and your longest streaks. You can choose the backup file instead of pasting the code, and combine several backups one after another.",
    ],
  },
  {
    date: "2026-11-24",
    title: "New: Flag Identifier",
    items: [
      "Saw a flag on the drive or on TV and can't name it? Describe it and Globalio finds it. Pick its layout (stripes, a cross, a triangle at the pole, a circle in the middle…), the colours you remember, then anything on it, like stars, a sun, a crescent, a coat of arms or writing.",
      "Every country flag is ranked by how well it fits, so one colour remembered wrong doesn't hide the answer: that flag shows as close instead. The count of flags that fit is always on screen, and you can open the list or change an answer at any step.",
      "Tap a match to see the flag up close, how to tell it apart, and a link to its meaning and history.",
      "A new page, globalio.app/flag-identifier/, lists every flag by design: Nordic crosses, triangles at the hoist, suns, crescents, red, white and blue flags and more.",
    ],
  },
  {
    date: "2026-11-17",
    title: "New game: Flag Fusion",
    items: [
      "One flag, fused from three: a made-up flag takes its structure from one country, its emblem from a second and its colours from a third. Name all three.",
      "Brazil's diamond with Afghanistan's emblem, painted in Bhutan's yellow, orange and white, is one. A box you name turns green and stays; five wrong guesses are shared between the three boxes.",
      "Five flags a game on easy (famous flags), medium or hard (obscure ones), with a best score for each. After every flag you see the three real flags it was made from.",
      "When countries share a layout (the Nordic crosses, Czechia and the Philippines) or a set of colours (Germany and Belgium), every one of them counts. 91 layouts, 33 emblems and the colours of 41 countries.",
    ],
  },
  {
    date: "2026-11-14",
    title: "Two new games: Countries Abroad and Native Names",
    items: [
      "Countries Abroad: name the country from its name in another language. Allemagne, Niemcy, Saksa and Almanya are all Germany, Ruotsi is Sweden and Viro is Estonia. 1,900 names for 184 countries in 57 languages.",
      "Native Names: name the country from what it calls itself. Suomi is Finland, Magyarország is Hungary, Sakartvelo is Georgia and Druk Yul is Bhutan. 85 names for 68 countries in 64 languages, each in its own script with a Latin spelling under it.",
      "Both play like Cities Abroad: ten right before three strikes on easy, medium or hard. Typing scores double, and a hint (the region and the first letter) halves the points.",
      "Names spelled like the English one are left out, a small slip in spelling still counts, and look-alike countries never count for each other: Niger is not Nigeria and Austria is not Australia.",
    ],
  },
  {
    date: "2026-11-14",
    title: "New game: Cities Abroad",
    items: [
      "Name the city from its name in another language: Wien is Vienna, Benetke is Venice, Kaupmannahöfn is Copenhagen and Pietari is Saint Petersburg. Get ten right before three strikes.",
      "Capitals and famous cities alike, from New York and Istanbul to Cape Town, Kraków and Thessaloniki. Names spelled like the English one are left out, so every round makes you think.",
      "Easy keeps to sound-alikes such as Moskau and Londres, Medium strays further (Varsovia, Monaco di Baviera) and Hard brings Bécs, iKapa and the Cyrillic, Greek, Georgian, Armenian, Korean and Japanese scripts, with a Latin spelling under each.",
      "The stranger the name, the more it scores. Typing doubles the points, a hint halves them, and a small slip in spelling still counts.",
      "1,732 names for 310 cities in 57 languages, from Wikidata, each checked against that language's Wikipedia. The end of a game lists every name you saw.",
    ],
  },
  {
    date: "2026-10-26",
    title: "New game: Atlas",
    items: [
      "Explore a real world map printed between 1784 and 2015, read its borders and place names, then guess the year it was made. Printed dates are masked.",
      "The map fills the screen with the guess right under it: slide to a year or fine-tune with −10, −1, +1 and +10, then see your guess and the answer side by side on a timeline.",
      "One daily map for everyone, changing at midnight UK time, plus an archive of 197 maps from the Library of Congress and the David Rumsey Map Collection to practise on.",
      "Zoom in and the original scan sharpens tile by tile. After your guess, the clues explain which names and borders give the date away, with a link to the original.",
    ],
  },
  {
    date: "2026-10-09",
    title: "Flag Studio: mix two flags",
    items: [
      "New in Templates: \"Mix in its colours\". Pick a flag, then tap another to paint the first in the second's colours: Sweden in Poland's red and white, Saudi Arabia in Ireland's green and orange.",
      "\"Next mix\" cycles through the other ways the colours can pair up. Crests and emblems keep their own colours, and Undo takes the whole mix back.",
      "On phones you stay in the list while you mix, with your flag pinned at the top, so you can tap country after country to compare colour schemes.",
      "Flag Studio now opens on Barbados.",
    ],
  },
  {
    date: "2026-10-09",
    title: "Faster on phones, sharper forgeries",
    items: [
      "The Codex tab opens in a blink: each collection loads when you open it, instead of every flag up front.",
      "Geography, Border Map and the Progress Map draw the same country shapes from a fraction of the data.",
      "Historical Flag, Identity Flags, Dead or Alive, Challenge Mode and a dozen other games download up to four times less before they start.",
      "Flag Forgery's fakes are redrawn from the real flags, so they're as crisp as the genuine ones and only the doctored detail gives them away.",
      "Sharing a country page now shows that country's flag in the preview.",
      "Population and area for Switzerland, Kosovo, Bahrain, the Maldives, Saint Vincent and the Vatican, and French overseas regions show the flag they fly.",
    ],
  },
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
      "Change your mind mid-move: in Flag Timeline, tap a placed flag to take it back and put another in its place; in Build the Flag, tap a piece again to put it down or tap a placed piece to take it off; in Spot the Error, tap a band again to unpick it. Flag Bracket can undo your last pick (even the final), The Peel lets you go back to scratching, Capital Match works capital-first too, Describe It no longer charges a clue for a repeated guess, and Pride Roulette asks before 10/All restarts a run.",
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

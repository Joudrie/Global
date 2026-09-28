// The 52 daily Connections puzzles. Tiles are country names exactly as in
// FLAGS. Groups run easiest (0) to hardest (3).
//
// Every group carries a machine-checkable `rule` (see utils/connectionsRules)
// so `npm run check:connections` can prove each board has one answer: the
// four members fit, and no other country on the board fits, even arguably.
// `manual` groups (wordplay) are listed by the checker for review by eye.
import type { Rule } from "../utils/connectionsRules"
import type { Puzzle } from "../utils/connections"

export interface RuledGroup { name: string; why: string; rule: Rule; words: string[] }
export interface RuledPuzzle extends Puzzle { groups: RuledGroup[] }

export const PUZZLES: RuledPuzzle[] = [
  // #1
  { groups: [
    { name: "Borders Russia", why: "Each shares a land border with Russia; Poland's is with the Kaliningrad exclave.",
      rule: { type: "borders", code: "RU" }, words: ["Norway", "Poland", "China", "North Korea"] },
    { name: "Former Soviet republics", why: "All four were Soviet republics until 1991, yet none of them borders Russia.",
      rule: { type: "fact", id: "soviet" }, words: ["Armenia", "Moldova", "Kyrgyzstan", "Tajikistan"] },
    { name: "Crescent on the flag", why: "Each flag has a crescent moon; Singapore's sits beside five stars.",
      rule: { type: "fact", id: "flagCrescent" }, words: ["Turkey", "Tunisia", "Malaysia", "Singapore"] },
    { name: "Four-letter names", why: "Just four letters each.",
      rule: { type: "nameLength", n: 4 }, words: ["Cuba", "Peru", "Laos", "Oman"] },
  ] },
  // #2
  { groups: [
    { name: "Borders Saudi Arabia", why: "Each shares a land border with Saudi Arabia.",
      rule: { type: "borders", code: "SA" }, words: ["Yemen", "Oman", "Qatar", "Kuwait"] },
    { name: "Borders China", why: "Each shares a land border with China.",
      rule: { type: "borders", code: "CN" }, words: ["Nepal", "Bhutan", "Pakistan", "Myanmar"] },
    { name: "Borders Russia", why: "Each shares a land border with Russia.",
      rule: { type: "borders", code: "RU" }, words: ["Norway", "Finland", "Poland", "Lithuania"] },
    { name: "Borders Brazil", why: "Each shares a land border with Brazil.",
      rule: { type: "borders", code: "BR" }, words: ["Suriname", "Guyana", "Paraguay", "Uruguay"] },
  ] },
  // #3
  { groups: [
    { name: "Portuguese is official", why: "All four were Portuguese colonies and kept the language.",
      rule: { type: "official", lang: "pt" }, words: ["Angola", "Mozambique", "Cape Verde", "Timor-Leste"] },
    { name: "Spanish is official", why: "Spanish is the official language in all four.",
      rule: { type: "official", lang: "es" }, words: ["Mexico", "Uruguay", "Honduras", "Venezuela"] },
    { name: "On the Equator", why: "The Equator crosses their land.",
      rule: { type: "fact", id: "equator" }, words: ["Gabon", "Kenya", "Indonesia", "Somalia"] },
    { name: "Capital named after a person", why: "Monrovia (James Monroe), Wellington (the Duke), Georgetown (George III), Port Louis (Louis XV).",
      rule: { type: "fact", id: "capitalAfterPerson" }, words: ["Liberia", "New Zealand", "Guyana", "Mauritius"] },
  ] },
  // #4
  { groups: [
    { name: "Former Yugoslavia", why: "All four were part of Yugoslavia.",
      rule: { type: "fact", id: "yugoslavia" }, words: ["Slovenia", "Bosnia and Herzegovina", "Kosovo", "Montenegro"] },
    { name: "The Danube flows through", why: "The Danube runs through or along all four.",
      rule: { type: "fact", id: "danube" }, words: ["Slovakia", "Hungary", "Bulgaria", "Romania"] },
    { name: "Former Soviet republics", why: "All four were Soviet republics.",
      rule: { type: "fact", id: "soviet" }, words: ["Estonia", "Lithuania", "Belarus", "Armenia"] },
    { name: "Only two colours", why: "Each flag uses exactly two colours.",
      rule: { type: "fact", id: "twoColours" }, words: ["Albania", "Poland", "Greece", "Monaco"] },
  ] },
  // #5
  { groups: [
    { name: "Landlocked", why: "No coastline at all.",
      rule: { type: "fact", id: "landlocked" }, words: ["Mali", "Niger", "Ethiopia", "Uganda"] },
    { name: "Arabic is official", why: "Arabic is an official language, even in Comoros and Djibouti.",
      rule: { type: "official", lang: "ar" }, words: ["Morocco", "Mauritania", "Comoros", "Djibouti"] },
    { name: "A weapon on the flag", why: "Kenya's spears, Haiti's cannons, Guatemala's rifles, Mozambique's AK-47.",
      rule: { type: "fact", id: "flagWeapon" }, words: ["Guatemala", "Haiti", "Mozambique", "Kenya"] },
    { name: "Another country hides inside", why: "Romania holds Oman, Nigeria holds Niger, and both Guineas hold Guinea.",
      rule: { type: "containsCountry" }, words: ["Romania", "Nigeria", "Papua New Guinea", "Equatorial Guinea"] },
  ] },
  // #6
  { groups: [
    { name: "Portuguese is official", why: "Portuguese is an official language.",
      rule: { type: "official", lang: "pt" }, words: ["Brazil", "Mozambique", "Cape Verde", "Guinea-Bissau"] },
    { name: "French is official", why: "French is an official language.",
      rule: { type: "official", lang: "fr" }, words: ["Guinea", "Côte d'Ivoire", "Benin", "Madagascar"] },
    { name: "Arabic is official", why: "Arabic is an official language.",
      rule: { type: "official", lang: "ar" }, words: ["Egypt", "Sudan", "Libya", "Somalia"] },
    { name: "Named after a river", why: "The Gambia, Niger, Zambezi and Paraguay rivers.",
      rule: { type: "manual" }, words: ["Gambia", "Nigeria", "Zambia", "Paraguay"] },
  ] },
  // #7
  { groups: [
    { name: "Nordic cross flags", why: "A cross pushed toward the hoist: the Scandinavian design.",
      rule: { type: "fact", id: "nordicCross" }, words: ["Denmark", "Sweden", "Norway", "Iceland"] },
    { name: "Former Soviet republics", why: "All were part of the USSR until 1991.",
      rule: { type: "fact", id: "soviet" }, words: ["Ukraine", "Belarus", "Georgia", "Azerbaijan"] },
    { name: "Use the euro", why: "Montenegro and Kosovo use it without being in the EU; Bulgaria joined in 2026 and Croatia in 2023.",
      rule: { type: "fact", id: "euro" }, words: ["Montenegro", "Kosovo", "Bulgaria", "Croatia"] },
    { name: "Capital isn't the biggest city", why: "Bern is smaller than Zurich, Ankara than Istanbul, Ottawa than Toronto, Canberra than Sydney.",
      rule: { type: "fact", id: "capitalNotLargest" }, words: ["Switzerland", "Turkey", "Canada", "Australia"] },
  ] },
  // #8
  { groups: [
    { name: "English is official", why: "English is an official language.",
      rule: { type: "official", lang: "en" }, words: ["Ghana", "Nigeria", "Sierra Leone", "Gambia"] },
    { name: "Use the US dollar", why: "The US dollar is their official currency.",
      rule: { type: "fact", id: "usDollar" }, words: ["Ecuador", "El Salvador", "Panama", "Timor-Leste"] },
    { name: "Landlocked", why: "No coastline at all.",
      rule: { type: "fact", id: "landlocked" }, words: ["Mali", "Chad", "Burkina Faso", "Central African Republic"] },
    { name: "Has a Q in its name", why: "Iraq, Qatar, Mozambique and Equatorial Guinea are the only countries with a Q.",
      rule: { type: "nameContains", text: "q" }, words: ["Iraq", "Qatar", "Mozambique", "Equatorial Guinea"] },
  ] },
  // #9
  { groups: [
    { name: "The Mekong flows through", why: "The Mekong runs through or along all four.",
      rule: { type: "fact", id: "mekong" }, words: ["Laos", "Cambodia", "Vietnam", "Myanmar"] },
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Sri Lanka", "Maldives", "Singapore", "Philippines"] },
    { name: "Ends in -stan", why: "Persian for \"land of\".",
      rule: { type: "nameEnds", text: "stan" }, words: ["Kazakhstan", "Uzbekistan", "Tajikistan", "Pakistan"] },
    { name: "Five-letter names", why: "Five letters each.",
      rule: { type: "nameLength", n: 5 }, words: ["Nepal", "India", "Qatar", "Syria"] },
  ] },
  // #10
  { groups: [
    { name: "Borders France", why: "Each shares a land border with France.",
      rule: { type: "borders", code: "FR" }, words: ["Spain", "Belgium", "Luxembourg", "Andorra"] },
    { name: "Borders Poland", why: "Each shares a land border with Poland.",
      rule: { type: "borders", code: "PL" }, words: ["Belarus", "Ukraine", "Slovakia", "Czech Republic"] },
    { name: "Capital starts with V", why: "Vienna, Valletta, Vaduz, Vientiane.",
      rule: { type: "capitalStarts", letter: "V" }, words: ["Austria", "Malta", "Liechtenstein", "Laos"] },
    { name: "Only one neighbour", why: "Each has a land border with exactly one country.",
      rule: { type: "neighbours", n: 1 }, words: ["Portugal", "Denmark", "San Marino", "Ireland"] },
  ] },
  // #11
  { groups: [
    { name: "The Danube flows through", why: "The Danube runs through or along all four.",
      rule: { type: "fact", id: "danube" }, words: ["Austria", "Hungary", "Romania", "Bulgaria"] },
    { name: "Former Yugoslavia", why: "All four were republics or provinces of Yugoslavia.",
      rule: { type: "fact", id: "yugoslavia" }, words: ["Slovenia", "Bosnia and Herzegovina", "North Macedonia", "Montenegro"] },
    { name: "Still have a monarch", why: "A king, queen or grand duke is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Belgium", "Netherlands", "Luxembourg", "Norway"] },
    { name: "Ends in -land", why: "Not the Netherlands: its name ends in -lands.",
      rule: { type: "nameEnds", text: "land" }, words: ["Poland", "Switzerland", "Finland", "Ireland"] },
  ] },
  // #12
  { groups: [
    { name: "Only two colours", why: "Each flag uses exactly two colours.",
      rule: { type: "fact", id: "twoColours" }, words: ["Poland", "Indonesia", "Switzerland", "Denmark"] },
    { name: "Vertical tricolours", why: "Three vertical bands.",
      rule: { type: "fact", id: "verticalTricolour" }, words: ["Italy", "Ireland", "Mexico", "Mali"] },
    { name: "A sun on the flag", why: "Argentina's and Uruguay's Sun of May, Rwanda's sun, Nepal's sun and moon.",
      rule: { type: "fact", id: "flagSun" }, words: ["Argentina", "Uruguay", "Rwanda", "Nepal"] },
    { name: "Starts with LI", why: "Four countries start with Li-.",
      rule: { type: "nameStarts", text: "li" }, words: ["Liechtenstein", "Lithuania", "Liberia", "Libya"] },
  ] },
  // #13
  { groups: [
    { name: "French is official", why: "French is an official language in all four.",
      rule: { type: "official", lang: "fr" }, words: ["Senegal", "Côte d'Ivoire", "Cameroon", "Madagascar"] },
    { name: "On the Equator", why: "The Equator crosses their land.",
      rule: { type: "fact", id: "equator" }, words: ["Kenya", "São Tomé and Príncipe", "Ecuador", "Indonesia"] },
    { name: "Landlocked", why: "No coastline at all.",
      rule: { type: "fact", id: "landlocked" }, words: ["Zambia", "Malawi", "Botswana", "Zimbabwe"] },
    { name: "Another country hides inside", why: "Nigeria holds Niger, Guinea-Bissau holds Guinea, Romania holds Oman, the Dominican Republic holds Dominica.",
      rule: { type: "containsCountry" }, words: ["Nigeria", "Guinea-Bissau", "Romania", "Dominican Republic"] },
  ] },
  // #14
  { groups: [
    { name: "German is official", why: "German is an official language.",
      rule: { type: "official", lang: "de" }, words: ["Germany", "Austria", "Liechtenstein", "Luxembourg"] },
    { name: "Russian is official", why: "Russian is an official language.",
      rule: { type: "official", lang: "ru" }, words: ["Russia", "Belarus", "Kazakhstan", "Kyrgyzstan"] },
    { name: "Portuguese is official", why: "Portuguese is an official language.",
      rule: { type: "official", lang: "pt" }, words: ["Brazil", "Angola", "Mozambique", "Cape Verde"] },
    { name: "Swahili is official", why: "Swahili is an official language.",
      rule: { type: "official", lang: "sw" }, words: ["Kenya", "Tanzania", "Uganda", "Rwanda"] },
  ] },
  // #15
  { groups: [
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Jamaica", "Cuba", "Grenada", "Trinidad and Tobago"] },
    { name: "Use the US dollar", why: "The US dollar is their official currency.",
      rule: { type: "fact", id: "usDollar" }, words: ["Ecuador", "El Salvador", "Panama", "United States"] },
    { name: "Vertical tricolours", why: "Three vertical bands.",
      rule: { type: "fact", id: "verticalTricolour" }, words: ["Mexico", "Peru", "Guatemala", "Romania"] },
    { name: "World Cup winners", why: "Each has won the men's FIFA World Cup.",
      rule: { type: "fact", id: "worldCupWinner" }, words: ["Uruguay", "Argentina", "Brazil", "Spain"] },
  ] },
  // #16
  { groups: [
    { name: "Capital starts with K", why: "Kyiv, Kigali, Kathmandu, Kingston.",
      rule: { type: "capitalStarts", letter: "K" }, words: ["Ukraine", "Rwanda", "Nepal", "Jamaica"] },
    { name: "Capital starts with B", why: "Budapest, Bangkok, Bogotá, Beirut.",
      rule: { type: "capitalStarts", letter: "B" }, words: ["Hungary", "Thailand", "Colombia", "Lebanon"] },
    { name: "Capital starts with M", why: "Moscow, Madrid, Manila, Montevideo.",
      rule: { type: "capitalStarts", letter: "M" }, words: ["Russia", "Spain", "Philippines", "Uruguay"] },
    { name: "Capital starts with T", why: "Tokyo, Tehran, Tirana, Tbilisi.",
      rule: { type: "capitalStarts", letter: "T" }, words: ["Japan", "Iran", "Albania", "Georgia"] },
  ] },
  // #17
  { groups: [
    { name: "G20 members", why: "Members of the G20 group of major economies.",
      rule: { type: "fact", id: "g20" }, words: ["India", "Indonesia", "Saudi Arabia", "Turkey"] },
    { name: "Hosted the Summer Olympics", why: "Athens, Helsinki, Amsterdam and Antwerp.",
      rule: { type: "fact", id: "summerOlympics" }, words: ["Greece", "Finland", "Netherlands", "Belgium"] },
    { name: "Hosted the World Cup", why: "Each has hosted the men's FIFA World Cup.",
      rule: { type: "fact", id: "worldCupHost" }, words: ["Switzerland", "Qatar", "Chile", "Uruguay"] },
    { name: "Ends in I", why: "Malawi, Mali, Haiti, Fiji.",
      rule: { type: "nameEnds", text: "i" }, words: ["Malawi", "Mali", "Haiti", "Fiji"] },
  ] },
  // #18
  { groups: [
    { name: "Monarchies", why: "A king or queen is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Norway", "Sweden", "Jordan", "Bhutan"] },
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Iceland", "Madagascar", "Cuba", "Philippines"] },
    { name: "Use the euro", why: "The euro is their currency.",
      rule: { type: "fact", id: "euro" }, words: ["Finland", "Greece", "Portugal", "Austria"] },
    { name: "Ends in O", why: "Togo, Mexico, Burkina Faso, Republic of the Congo.",
      rule: { type: "nameEnds", text: "o" }, words: ["Togo", "Mexico", "Burkina Faso", "Republic of the Congo"] },
  ] },
  // #19
  { groups: [
    { name: "Crescent on the flag", why: "Each flag has a crescent moon.",
      rule: { type: "fact", id: "flagCrescent" }, words: ["Algeria", "Libya", "Maldives", "Azerbaijan"] },
    { name: "Vertical tricolours", why: "Three vertical bands, and two pairs of near-twins.",
      rule: { type: "fact", id: "verticalTricolour" }, words: ["Ireland", "Côte d'Ivoire", "Chad", "Romania"] },
    { name: "Only two colours", why: "Each flag uses exactly two colours.",
      rule: { type: "fact", id: "twoColours" }, words: ["Japan", "Poland", "Indonesia", "Ukraine"] },
    { name: "An animal on the flag", why: "Egypt's eagle, Uganda's crane, Bhutan's dragon, Sri Lanka's lion.",
      rule: { type: "fact", id: "flagAnimal" }, words: ["Egypt", "Uganda", "Bhutan", "Sri Lanka"] },
  ] },
  // #20
  { groups: [
    { name: "Capital starts with B", why: "Brussels, Budapest, Belgrade, Bucharest.",
      rule: { type: "capitalStarts", letter: "B" }, words: ["Belgium", "Hungary", "Serbia", "Romania"] },
    { name: "Capital shares the name", why: "Luxembourg City, Mexico City, Singapore and Djibouti City.",
      rule: { type: "fact", id: "capitalSameName" }, words: ["Luxembourg", "Mexico", "Singapore", "Djibouti"] },
    { name: "Capital isn't the biggest city", why: "Ankara, Canberra, Abuja and Rabat are all outgrown by another city.",
      rule: { type: "fact", id: "capitalNotLargest" }, words: ["Turkey", "Australia", "Nigeria", "Morocco"] },
    { name: "Capital named after a person", why: "Monrovia (James Monroe), Victoria (the queen), Georgetown (George III), Port Louis (Louis XV).",
      rule: { type: "fact", id: "capitalAfterPerson" }, words: ["Liberia", "Seychelles", "Guyana", "Mauritius"] },
  ] },
  // #21
  { groups: [
    { name: "English official, not Commonwealth", why: "English is official, but none of them is in the Commonwealth.",
      rule: { type: "official", lang: "en" }, words: ["United States", "Ireland", "Liberia", "Philippines"] },
    { name: "Commonwealth members", why: "Commonwealth members; Mozambique, Gabon and Togo were never British.",
      rule: { type: "fact", id: "commonwealth" }, words: ["Mozambique", "Gabon", "Togo", "Maldives"] },
    { name: "Monarchies", why: "A king or emperor is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Japan", "Thailand", "Bhutan", "Jordan"] },
    { name: "Starts and ends with the same letter", why: "A…a, every one.",
      rule: { type: "sameEnds" }, words: ["Albania", "Angola", "Austria", "Argentina"] },
  ] },
  // #22
  { groups: [
    { name: "Former Portuguese colonies", why: "All four were ruled from Lisbon.",
      rule: { type: "fact", id: "exPortuguese" }, words: ["Angola", "Mozambique", "Brazil", "Guinea-Bissau"] },
    { name: "Former Spanish colonies", why: "All four were ruled from Madrid.",
      rule: { type: "fact", id: "exSpanish" }, words: ["Philippines", "Cuba", "Peru", "Argentina"] },
    { name: "French is official", why: "French is an official language.",
      rule: { type: "official", lang: "fr" }, words: ["Comoros", "Senegal", "Madagascar", "Vanuatu"] },
    { name: "Two names joined by \"and\"", why: "Two places, one country.",
      rule: { type: "nameContains", text: " and" }, words: ["Bosnia and Herzegovina", "Antigua and Barbuda", "Saint Kitts and Nevis", "Saint Vincent and the Grenadines"] },
  ] },
  // #23
  { groups: [
    { name: "Over 200 million people", why: "Only seven countries have more than 200 million people.",
      rule: { type: "popAbove", m: 200 }, words: ["India", "Indonesia", "Pakistan", "Nigeria"] },
    { name: "World Cup winners", why: "Each has won the men's FIFA World Cup.",
      rule: { type: "fact", id: "worldCupWinner" }, words: ["Argentina", "Uruguay", "Spain", "Italy"] },
    { name: "On the Caspian Sea", why: "All four have a Caspian coast.",
      rule: { type: "fact", id: "caspian" }, words: ["Russia", "Iran", "Kazakhstan", "Azerbaijan"] },
    { name: "Only one neighbour", why: "Each has a land border with exactly one country.",
      rule: { type: "neighbours", n: 1 }, words: ["Portugal", "Denmark", "Lesotho", "South Korea"] },
  ] },
  // #24
  { groups: [
    { name: "A cross on the flag", why: "Danish, Greek, Swiss and Georgian crosses.",
      rule: { type: "fact", id: "flagCross" }, words: ["Denmark", "Greece", "Switzerland", "Georgia"] },
    { name: "Crescent on the flag", why: "Each flag has a crescent moon.",
      rule: { type: "fact", id: "flagCrescent" }, words: ["Turkey", "Pakistan", "Algeria", "Azerbaijan"] },
    { name: "An animal on the flag", why: "Albania's eagle, Mexico's eagle and snake, Uganda's crane, Sri Lanka's lion.",
      rule: { type: "fact", id: "flagAnimal" }, words: ["Albania", "Mexico", "Uganda", "Sri Lanka"] },
    { name: "Starts with MA", why: "Madagascar, Malawi, Mali, Mauritius.",
      rule: { type: "nameStarts", text: "ma" }, words: ["Madagascar", "Malawi", "Mali", "Mauritius"] },
  ] },
  // #25
  { groups: [
    { name: "Former Yugoslavia", why: "All four were part of Yugoslavia.",
      rule: { type: "fact", id: "yugoslavia" }, words: ["Slovenia", "North Macedonia", "Bosnia and Herzegovina", "Kosovo"] },
    { name: "Former Soviet republics", why: "All four were Soviet republics.",
      rule: { type: "fact", id: "soviet" }, words: ["Estonia", "Latvia", "Lithuania", "Belarus"] },
    { name: "Warsaw Pact, not Soviet", why: "Soviet-bloc allies that were never part of the USSR.",
      rule: { type: "fact", id: "warsawPact" }, words: ["Poland", "Hungary", "Romania", "Bulgaria"] },
    { name: "A cross on the flag", why: "Swiss, Greek, Finnish and Danish crosses.",
      rule: { type: "fact", id: "flagCross" }, words: ["Switzerland", "Greece", "Finland", "Denmark"] },
  ] },
  // #26
  { groups: [
    { name: "World Cup winners", why: "Each has won the men's FIFA World Cup.",
      rule: { type: "fact", id: "worldCupWinner" }, words: ["Brazil", "Germany", "France", "Argentina"] },
    { name: "Nordic cross flags", why: "The Scandinavian cross design.",
      rule: { type: "fact", id: "nordicCross" }, words: ["Denmark", "Norway", "Sweden", "Finland"] },
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Cuba", "Jamaica", "Malta", "Cyprus"] },
    { name: "Named after a person", why: "Columbus, Bolívar, the House of Saud, and El Salvador (\"the Saviour\").",
      rule: { type: "manual" }, words: ["Colombia", "Bolivia", "Saudi Arabia", "El Salvador"] },
  ] },
  // #27
  { groups: [
    { name: "A sun on the flag", why: "Argentina's and Uruguay's Sun of May, Japan's rising sun, the Philippines' eight-rayed sun.",
      rule: { type: "fact", id: "flagSun" }, words: ["Argentina", "Uruguay", "Japan", "Philippines"] },
    { name: "A cross on the flag", why: "Greek, Swiss, Georgian and Tongan crosses.",
      rule: { type: "fact", id: "flagCross" }, words: ["Greece", "Switzerland", "Georgia", "Tonga"] },
    { name: "A weapon on the flag", why: "Kenya's spears, Saudi Arabia's sword, Oman's daggers, Angola's machete.",
      rule: { type: "fact", id: "flagWeapon" }, words: ["Kenya", "Saudi Arabia", "Oman", "Angola"] },
    { name: "A plant on the flag", why: "Maple leaf, cedar, olive branches (Cyprus) and an olive wreath (Eritrea).",
      rule: { type: "fact", id: "flagPlant" }, words: ["Canada", "Lebanon", "Cyprus", "Eritrea"] },
  ] },
  // #28
  { groups: [
    { name: "On the Caspian Sea", why: "All four have a Caspian coast.",
      rule: { type: "fact", id: "caspian" }, words: ["Russia", "Iran", "Kazakhstan", "Turkmenistan"] },
    { name: "On the Mediterranean", why: "Each has a Mediterranean coast.",
      rule: { type: "fact", id: "mediterranean" }, words: ["Libya", "Tunisia", "Lebanon", "Croatia"] },
    { name: "The Nile flows through", why: "The White or Blue Nile runs through all four.",
      rule: { type: "fact", id: "nile" }, words: ["Sudan", "Ethiopia", "Uganda", "South Sudan"] },
    { name: "Starts and ends with the same letter", why: "A…a, every one.",
      rule: { type: "sameEnds" }, words: ["Austria", "Andorra", "Angola", "Armenia"] },
  ] },
  // #29
  { groups: [
    { name: "Spanish is official", why: "Spanish is the official language in all four.",
      rule: { type: "official", lang: "es" }, words: ["Spain", "Colombia", "Costa Rica", "Chile"] },
    { name: "Portuguese is official", why: "Portuguese is an official language in all four.",
      rule: { type: "official", lang: "pt" }, words: ["Brazil", "Portugal", "Angola", "São Tomé and Príncipe"] },
    { name: "Russian is official", why: "Russian is an official language (not just widely spoken).",
      rule: { type: "official", lang: "ru" }, words: ["Russia", "Belarus", "Kazakhstan", "Kyrgyzstan"] },
    { name: "French is official", why: "French is official, even in the Pacific (Vanuatu) and the Caribbean (Haiti).",
      rule: { type: "official", lang: "fr" }, words: ["Haiti", "Canada", "Vanuatu", "Madagascar"] },
  ] },
  // #30
  { groups: [
    { name: "The Alps run through", why: "The Alps cover part of all four.",
      rule: { type: "fact", id: "alps" }, words: ["France", "Italy", "Switzerland", "Liechtenstein"] },
    { name: "The Danube flows through", why: "The Danube runs through or along all four.",
      rule: { type: "fact", id: "danube" }, words: ["Hungary", "Slovakia", "Romania", "Bulgaria"] },
    { name: "Former Yugoslavia", why: "All four were part of Yugoslavia.",
      rule: { type: "fact", id: "yugoslavia" }, words: ["Bosnia and Herzegovina", "Kosovo", "Montenegro", "North Macedonia"] },
    { name: "Capital starts with L", why: "Lisbon, London, Luxembourg City, Lima.",
      rule: { type: "capitalStarts", letter: "L" }, words: ["Portugal", "United Kingdom", "Luxembourg", "Peru"] },
  ] },
  // #31
  { groups: [
    { name: "The Nile flows through", why: "The White or Blue Nile runs through all four.",
      rule: { type: "fact", id: "nile" }, words: ["Egypt", "Sudan", "South Sudan", "Ethiopia"] },
    { name: "The Mekong flows through", why: "The Mekong runs through or along all four.",
      rule: { type: "fact", id: "mekong" }, words: ["Laos", "Thailand", "Cambodia", "Vietnam"] },
    { name: "The Rhine flows through", why: "The Rhine runs through or along all four.",
      rule: { type: "fact", id: "rhine" }, words: ["Switzerland", "Liechtenstein", "Netherlands", "France"] },
    { name: "The Danube flows through", why: "Moldova touches the Danube for less than a kilometre, and it counts.",
      rule: { type: "fact", id: "danube" }, words: ["Moldova", "Ukraine", "Bulgaria", "Romania"] },
  ] },
  // #32
  { groups: [
    { name: "Former Soviet republics", why: "All four were Soviet republics.",
      rule: { type: "fact", id: "soviet" }, words: ["Estonia", "Latvia", "Lithuania", "Ukraine"] },
    { name: "Nordic cross flags", why: "The Scandinavian cross design.",
      rule: { type: "fact", id: "nordicCross" }, words: ["Denmark", "Sweden", "Norway", "Iceland"] },
    { name: "Landlocked", why: "No coastline at all.",
      rule: { type: "fact", id: "landlocked" }, words: ["Hungary", "Austria", "Serbia", "Czech Republic"] },
    { name: "Starts with BA", why: "Bahamas, Bahrain, Bangladesh, Barbados.",
      rule: { type: "nameStarts", text: "ba" }, words: ["Bahamas", "Bahrain", "Bangladesh", "Barbados"] },
  ] },
  // #33
  { groups: [
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Madagascar", "Cuba", "Sri Lanka", "Jamaica"] },
    { name: "Landlocked", why: "No coastline at all.",
      rule: { type: "fact", id: "landlocked" }, words: ["Bolivia", "Paraguay", "Laos", "Mongolia"] },
    { name: "Only one neighbour", why: "Each has a land border with exactly one country.",
      rule: { type: "neighbours", n: 1 }, words: ["Qatar", "Gambia", "Canada", "Portugal"] },
    { name: "Contains LAND", why: "Thai-land, Fin-land, Po-land, and Nether-lands.",
      rule: { type: "nameContains", text: "land" }, words: ["Thailand", "Finland", "Poland", "Netherlands"] },
  ] },
  // #34
  { groups: [
    { name: "Arabic is official", why: "Arabic is the official language.",
      rule: { type: "official", lang: "ar" }, words: ["Egypt", "Jordan", "Syria", "Lebanon"] },
    { name: "Ends in -stan", why: "Persian for \"land of\".",
      rule: { type: "nameEnds", text: "stan" }, words: ["Afghanistan", "Uzbekistan", "Tajikistan", "Turkmenistan"] },
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Japan", "Singapore", "Taiwan", "Cyprus"] },
    { name: "Four-letter names", why: "Just four letters. Iran is in the Middle East, but Persian, not Arabic, is its language.",
      rule: { type: "nameLength", n: 4 }, words: ["Iran", "Laos", "Peru", "Mali"] },
  ] },
  // #35
  { groups: [
    { name: "Borders Turkey", why: "Each shares a land border with Turkey.",
      rule: { type: "borders", code: "TR" }, words: ["Georgia", "Bulgaria", "Greece", "Azerbaijan"] },
    { name: "Arabic is official", why: "Arabic is the official language.",
      rule: { type: "official", lang: "ar" }, words: ["Egypt", "Lebanon", "Tunisia", "Yemen"] },
    { name: "OPEC members", why: "Members of the oil cartel OPEC.",
      rule: { type: "fact", id: "opec" }, words: ["Venezuela", "Nigeria", "Gabon", "Equatorial Guinea"] },
    { name: "Starts and ends with the same letter", why: "A…a, every one.",
      rule: { type: "sameEnds" }, words: ["Albania", "Austria", "Andorra", "Australia"] },
  ] },
  // #36
  { groups: [
    { name: "Borders Nigeria", why: "Each shares a land border with Nigeria.",
      rule: { type: "borders", code: "NG" }, words: ["Benin", "Niger", "Chad", "Cameroon"] },
    { name: "Swahili is official", why: "Swahili is an official language.",
      rule: { type: "official", lang: "sw" }, words: ["Kenya", "Tanzania", "Uganda", "Rwanda"] },
    { name: "Portuguese is official", why: "Portuguese is an official language.",
      rule: { type: "official", lang: "pt" }, words: ["Angola", "Mozambique", "Cape Verde", "São Tomé and Príncipe"] },
    { name: "Ends in I", why: "Malawi, Burundi, Djibouti, Eswatini.",
      rule: { type: "nameEnds", text: "i" }, words: ["Malawi", "Burundi", "Djibouti", "Eswatini"] },
  ] },
  // #37
  { groups: [
    { name: "Borders China", why: "Each shares a land border with China.",
      rule: { type: "borders", code: "CN" }, words: ["Mongolia", "Nepal", "Kyrgyzstan", "Vietnam"] },
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Taiwan", "Philippines", "Sri Lanka", "Singapore"] },
    { name: "Monarchies", why: "A king or sultan is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Thailand", "Cambodia", "Malaysia", "Saudi Arabia"] },
    { name: "Over 200 million people", why: "Only seven countries have more than 200 million people.",
      rule: { type: "popAbove", m: 200 }, words: ["China", "United States", "Brazil", "Nigeria"] },
  ] },
  // #38
  { groups: [
    { name: "The Andes run through", why: "The Andes run through all four.",
      rule: { type: "fact", id: "andes" }, words: ["Colombia", "Peru", "Bolivia", "Venezuela"] },
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Jamaica", "Trinidad and Tobago", "Barbados", "Cuba"] },
    { name: "Hosted the World Cup", why: "Each has hosted (or co-hosted) the men's FIFA World Cup.",
      rule: { type: "fact", id: "worldCupHost" }, words: ["United States", "Mexico", "Uruguay", "Canada"] },
    { name: "Starts with GU", why: "Guatemala, Guyana, Guinea, Guinea-Bissau.",
      rule: { type: "nameStarts", text: "gu" }, words: ["Guatemala", "Guyana", "Guinea", "Guinea-Bissau"] },
  ] },
  // #39
  { groups: [
    { name: "Borders South Africa", why: "Each shares a land border with South Africa.",
      rule: { type: "borders", code: "ZA" }, words: ["Namibia", "Lesotho", "Mozambique", "Zimbabwe"] },
    { name: "The Nile flows through", why: "The White or Blue Nile runs through all four.",
      rule: { type: "fact", id: "nile" }, words: ["Egypt", "Sudan", "Ethiopia", "Uganda"] },
    { name: "French is official", why: "French is an official language.",
      rule: { type: "official", lang: "fr" }, words: ["Senegal", "Madagascar", "Cameroon", "Djibouti"] },
    { name: "Another country hides inside", why: "Nigeria holds Niger, Somalia holds Mali, Guinea-Bissau holds Guinea, Romania holds Oman.",
      rule: { type: "containsCountry" }, words: ["Nigeria", "Somalia", "Guinea-Bissau", "Romania"] },
  ] },
  // #40
  { groups: [
    { name: "Borders Germany", why: "Each shares a land border with Germany.",
      rule: { type: "borders", code: "DE" }, words: ["Poland", "Austria", "Netherlands", "Belgium"] },
    { name: "Former Yugoslavia", why: "All four were part of Yugoslavia.",
      rule: { type: "fact", id: "yugoslavia" }, words: ["Slovenia", "Bosnia and Herzegovina", "North Macedonia", "Kosovo"] },
    { name: "A cross on the flag", why: "Swedish, Finnish, Icelandic and Greek crosses.",
      rule: { type: "fact", id: "flagCross" }, words: ["Sweden", "Finland", "Iceland", "Greece"] },
    { name: "Ends in Y", why: "Hungary, Italy, Turkey, Uruguay.",
      rule: { type: "nameEnds", text: "y" }, words: ["Hungary", "Italy", "Turkey", "Uruguay"] },
  ] },
  // #41
  { groups: [
    { name: "Borders Colombia", why: "Each shares a land border with Colombia.",
      rule: { type: "borders", code: "CO" }, words: ["Panama", "Ecuador", "Venezuela", "Peru"] },
    { name: "Drive on the left", why: "Traffic keeps left, like in Britain. Suriname learned it from the Dutch.",
      rule: { type: "fact", id: "driveLeft" }, words: ["Guyana", "Suriname", "Trinidad and Tobago", "Barbados"] },
    { name: "Monarchies", why: "A king or queen is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Belize", "Canada", "Spain", "Netherlands"] },
    { name: "Capital starts with S", why: "Santiago, San José, San Salvador, Santo Domingo.",
      rule: { type: "capitalStarts", letter: "S" }, words: ["Chile", "Costa Rica", "El Salvador", "Dominican Republic"] },
  ] },
  // #42
  { groups: [
    { name: "The Himalayas run through", why: "The Himalayas cross all four.",
      rule: { type: "fact", id: "himalaya" }, words: ["Nepal", "Bhutan", "India", "Pakistan"] },
    { name: "The Mekong flows through", why: "The Mekong runs through or along all four.",
      rule: { type: "fact", id: "mekong" }, words: ["Laos", "Cambodia", "Thailand", "Vietnam"] },
    { name: "Borders Russia", why: "Each shares a land border with Russia.",
      rule: { type: "borders", code: "RU" }, words: ["Mongolia", "North Korea", "Kazakhstan", "Georgia"] },
    { name: "Starts with MA", why: "Malaysia, Maldives, Madagascar, Mauritius.",
      rule: { type: "nameStarts", text: "ma" }, words: ["Malaysia", "Maldives", "Madagascar", "Mauritius"] },
  ] },
  // #43
  { groups: [
    { name: "Union Jack on the flag", why: "The British flag appears on each.",
      rule: { type: "fact", id: "unionJack" }, words: ["United Kingdom", "Australia", "New Zealand", "Tuvalu"] },
    { name: "Crescent on the flag", why: "Each flag has a crescent moon.",
      rule: { type: "fact", id: "flagCrescent" }, words: ["Turkey", "Pakistan", "Algeria", "Mauritania"] },
    { name: "Vertical tricolours", why: "Three vertical bands.",
      rule: { type: "fact", id: "verticalTricolour" }, words: ["France", "Guinea", "Mali", "Belgium"] },
    { name: "An animal on the flag", why: "Albania's eagle, Zambia's eagle, Dominica's parrot, Kiribati's frigatebird.",
      rule: { type: "fact", id: "flagAnimal" }, words: ["Albania", "Zambia", "Dominica", "Kiribati"] },
  ] },
  // #44
  { groups: [
    { name: "King Charles is head of state", why: "Commonwealth realms: the British monarch is their king too.",
      rule: { type: "fact", id: "realm" }, words: ["Jamaica", "Grenada", "Saint Lucia", "Belize"] },
    { name: "Use the US dollar", why: "The US dollar is their official currency.",
      rule: { type: "fact", id: "usDollar" }, words: ["Marshall Islands", "Micronesia", "El Salvador", "Ecuador"] },
    { name: "A monarch of their own", why: "Their own king or sultan is head of state.",
      rule: { type: "fact", id: "ownMonarch" }, words: ["Tonga", "Brunei", "Bhutan", "Eswatini"] },
    { name: "Ends in U", why: "Peru, Nauru, Vanuatu, Guinea-Bissau.",
      rule: { type: "nameEnds", text: "u" }, words: ["Peru", "Nauru", "Vanuatu", "Guinea-Bissau"] },
  ] },
  // #45
  { groups: [
    { name: "Communist states", why: "One-party communist states today.",
      rule: { type: "fact", id: "communist" }, words: ["China", "Vietnam", "Cuba", "Laos"] },
    { name: "The Andes run through", why: "The Andes run through all four.",
      rule: { type: "fact", id: "andes" }, words: ["Chile", "Peru", "Bolivia", "Colombia"] },
    { name: "On the Mediterranean", why: "Each has a Mediterranean coast.",
      rule: { type: "fact", id: "mediterranean" }, words: ["Spain", "Greece", "Egypt", "Lebanon"] },
    { name: "Has a Q in its name", why: "Iraq, Qatar, Mozambique and Equatorial Guinea are the only countries with a Q.",
      rule: { type: "nameContains", text: "q" }, words: ["Iraq", "Qatar", "Mozambique", "Equatorial Guinea"] },
  ] },
  // #46
  { groups: [
    { name: "OPEC members", why: "Members of the oil cartel OPEC.",
      rule: { type: "fact", id: "opec" }, words: ["Kuwait", "Iraq", "Venezuela", "Nigeria"] },
    { name: "G20 members", why: "Members of the G20 group of major economies.",
      rule: { type: "fact", id: "g20" }, words: ["South Korea", "Mexico", "Turkey", "Germany"] },
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Cuba", "Iceland", "Malta", "Sri Lanka"] },
    { name: "Also a first name", why: "Chad, Jordan, Georgia and Israel are all given names too.",
      rule: { type: "manual" }, words: ["Chad", "Jordan", "Georgia", "Israel"] },
  ] },
  // #47
  { groups: [
    { name: "On the Tropic of Cancer", why: "The Tropic of Cancer crosses their land.",
      rule: { type: "fact", id: "tropicCancer" }, words: ["Mexico", "Egypt", "India", "Saudi Arabia"] },
    { name: "On the Equator", why: "The Equator crosses their land (Equatorial Guinea's land sits just north and south of it).",
      rule: { type: "fact", id: "equator" }, words: ["Kenya", "Ecuador", "Indonesia", "Colombia"] },
    { name: "On the Tropic of Capricorn", why: "The Tropic of Capricorn crosses their land.",
      rule: { type: "fact", id: "tropicCapricorn" }, words: ["Chile", "Namibia", "Madagascar", "Australia"] },
    { name: "Every Guinea", why: "Guinea, Equatorial Guinea, Guinea-Bissau and Papua New Guinea.",
      rule: { type: "nameContains", text: "guinea" }, words: ["Guinea", "Equatorial Guinea", "Guinea-Bissau", "Papua New Guinea"] },
  ] },
  // #48
  { groups: [
    { name: "A weapon on the flag", why: "Saudi Arabia's sword, Oman's daggers, Kenya's and Eswatini's spears.",
      rule: { type: "fact", id: "flagWeapon" }, words: ["Saudi Arabia", "Oman", "Kenya", "Eswatini"] },
    { name: "A sun on the flag", why: "Japan's rising sun, Bangladesh's red sun, Kyrgyzstan's and Malawi's suns.",
      rule: { type: "fact", id: "flagSun" }, words: ["Japan", "Bangladesh", "Kyrgyzstan", "Malawi"] },
    { name: "A plant on the flag", why: "Lebanon's cedar, Cyprus's olive branches, Belize's mahogany tree, Eritrea's olive wreath.",
      rule: { type: "fact", id: "flagPlant" }, words: ["Lebanon", "Cyprus", "Belize", "Eritrea"] },
    { name: "Vertical tricolours", why: "Three vertical bands.",
      rule: { type: "fact", id: "verticalTricolour" }, words: ["Ireland", "Belgium", "Guinea", "Romania"] },
  ] },
  // #49
  { groups: [
    { name: "The Alps run through", why: "The Alps cover part of all four.",
      rule: { type: "fact", id: "alps" }, words: ["Austria", "Switzerland", "Slovenia", "Germany"] },
    { name: "The Himalayas run through", why: "The Himalayas cross all four.",
      rule: { type: "fact", id: "himalaya" }, words: ["Nepal", "Bhutan", "India", "Pakistan"] },
    { name: "The Andes run through", why: "The Andes cross all four.",
      rule: { type: "fact", id: "andes" }, words: ["Peru", "Chile", "Ecuador", "Venezuela"] },
    { name: "Named after a person", why: "Philip II of Spain, the House of Saud, Jean Moreau de Séchelles, Maurice of Nassau.",
      rule: { type: "manual" }, words: ["Philippines", "Saudi Arabia", "Seychelles", "Mauritius"] },
  ] },
  // #50
  { groups: [
    { name: "Communist states", why: "One-party communist states today.",
      rule: { type: "fact", id: "communist" }, words: ["China", "Vietnam", "Laos", "North Korea"] },
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Taiwan", "Philippines", "Sri Lanka", "Singapore"] },
    { name: "Monarchies", why: "A king or sultan is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Thailand", "Cambodia", "Bhutan", "Malaysia"] },
    { name: "Ends in -stan", why: "Persian for \"land of\".",
      rule: { type: "nameEnds", text: "stan" }, words: ["Pakistan", "Afghanistan", "Kazakhstan", "Tajikistan"] },
  ] },
  // #51
  { groups: [
    { name: "King Charles is head of state", why: "Commonwealth realms: the British monarch is their king too.",
      rule: { type: "fact", id: "realm" }, words: ["Jamaica", "Belize", "Tuvalu", "Papua New Guinea"] },
    { name: "A monarch of their own", why: "A king of their own is head of state.",
      rule: { type: "fact", id: "ownMonarch" }, words: ["Norway", "Thailand", "Eswatini", "Tonga"] },
    { name: "French is official", why: "French is an official language.",
      rule: { type: "official", lang: "fr" }, words: ["Haiti", "Senegal", "Benin", "Gabon"] },
    { name: "Four-letter names", why: "Four letters each, and all four once had kings.",
      rule: { type: "nameLength", n: 4 }, words: ["Iran", "Iraq", "Laos", "Fiji"] },
  ] },
  // #52
  { groups: [
    { name: "Borders Austria", why: "Each shares a land border with Austria.",
      rule: { type: "borders", code: "AT" }, words: ["Czech Republic", "Slovakia", "Hungary", "Slovenia"] },
    { name: "Former Soviet republics", why: "All four were Soviet republics.",
      rule: { type: "fact", id: "soviet" }, words: ["Estonia", "Latvia", "Lithuania", "Belarus"] },
    { name: "Nordic cross flags", why: "The Scandinavian cross design.",
      rule: { type: "fact", id: "nordicCross" }, words: ["Denmark", "Sweden", "Norway", "Finland"] },
    { name: "Starts with MO", why: "Monaco, Montenegro, Morocco, Mongolia.",
      rule: { type: "nameStarts", text: "mo" }, words: ["Monaco", "Montenegro", "Morocco", "Mongolia"] },
  ] },
]

export const PUZZLE_COUNT = PUZZLES.length

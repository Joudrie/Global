// The 52 daily Connections puzzles. Tiles are country names exactly as in
// FLAGS. Groups run easiest (0) to hardest (3):
//   0  something most people see at once (a region, a famous club of countries)
//   1  easy-medium (a big neighbour, a language, a flag feature)
//   2  medium (capitals, rivers, tropics, what the flag or traffic does)
//   3  the tricky one (wordplay or trivia)
//
// Every group carries a machine-checkable `rule` (see utils/connectionsRules)
// so `npm run check:connections` can prove each board has one answer: the
// four members fit, and no other country on the board fits, even arguably.
import type { Rule } from "../utils/connectionsRules"
import type { Puzzle } from "../utils/connections"

export interface RuledGroup { name: string; why: string; rule: Rule; words: string[] }
export interface RuledPuzzle extends Puzzle { groups: RuledGroup[] }

export const PUZZLES: RuledPuzzle[] = [
  // #1
  { groups: [
    { name: "South American countries", why: "All four are in South America.",
      rule: { type: "fact", id: "southAmerica" }, words: ["Argentina", "Peru", "Colombia", "Venezuela"] },
    { name: "Borders Germany", why: "Each shares a land border with Germany.",
      rule: { type: "borders", code: "DE" }, words: ["Poland", "Austria", "Switzerland", "Netherlands"] },
    { name: "Capital shares the country's name", why: "Mexico City, Kuwait City, Singapore and Guatemala City.",
      rule: { type: "fact", id: "capitalSameName" }, words: ["Mexico", "Kuwait", "Singapore", "Guatemala"] },
    { name: "Also an English word", why: "A turkey, fine china, a chad (the paper punched out of a ballot) and a guinea (an old gold coin).",
      rule: { type: "fact", id: "englishWord" }, words: ["Turkey", "China", "Chad", "Guinea"] },
  ] },
  // #2
  { groups: [
    { name: "Nordic countries", why: "Denmark, Finland, Iceland, Norway and Sweden are the five Nordic countries.",
      rule: { type: "fact", id: "nordic" }, words: ["Norway", "Denmark", "Finland", "Iceland"] },
    { name: "English is official", why: "English is an official language in all four.",
      rule: { type: "official", lang: "en" }, words: ["United Kingdom", "United States", "Canada", "Australia"] },
    { name: "Capital starts with the same letter", why: "Belgium (Brussels), South Korea (Seoul), Taiwan (Taipei) and Algeria (Algiers).",
      rule: { type: "capitalSameLetter" }, words: ["Belgium", "South Korea", "Taiwan", "Algeria"] },
    { name: "Another country hides inside", why: "Romania holds Oman, Dominican Republic holds Dominica, Equatorial Guinea holds Guinea and Guinea-Bissau holds Guinea.",
      rule: { type: "containsCountry" }, words: ["Romania", "Dominican Republic", "Equatorial Guinea", "Guinea-Bissau"] },
  ] },
  // #3
  { groups: [
    { name: "G7 members", why: "The Group of Seven: the US, Canada, the UK, France, Germany, Italy and Japan.",
      rule: { type: "fact", id: "g7" }, words: ["United States", "Canada", "France", "Germany"] },
    { name: "A crescent on the flag", why: "Each flag has a crescent moon.",
      rule: { type: "fact", id: "flagCrescent" }, words: ["Turkey", "Tunisia", "Algeria", "Azerbaijan"] },
    { name: "Drive on the left", why: "Traffic keeps to the left in all four.",
      rule: { type: "fact", id: "driveLeft" }, words: ["Australia", "India", "Ireland", "New Zealand"] },
    { name: "Four-letter names", why: "Just four letters each.",
      rule: { type: "nameLength", n: 4 }, words: ["Cuba", "Peru", "Iraq", "Oman"] },
  ] },
  // #4
  { groups: [
    { name: "Caribbean islands", why: "Island countries in the Caribbean Sea.",
      rule: { type: "fact", id: "caribbeanIsland" }, words: ["Cuba", "Jamaica", "Haiti", "Trinidad and Tobago"] },
    { name: "Former Soviet republics", why: "All four were part of the USSR until 1991.",
      rule: { type: "fact", id: "soviet" }, words: ["Ukraine", "Belarus", "Kazakhstan", "Estonia"] },
    { name: "Capital on the Danube", why: "Vienna, Bratislava, Budapest and Belgrade all stand on the Danube.",
      rule: { type: "fact", id: "capitalDanube" }, words: ["Austria", "Hungary", "Slovakia", "Serbia"] },
    { name: "Named after a person", why: "Colombia: Columbus; Bolivia: Simón Bolívar; the Philippines: Philip II of Spain; Saudi Arabia: the House of Saud.",
      rule: { type: "fact", id: "namedAfterPerson" }, words: ["Colombia", "Bolivia", "Philippines", "Saudi Arabia"] },
  ] },
  // #5
  { groups: [
    { name: "Ends in -stan", why: "\"-stan\" is Persian for \"land of\".",
      rule: { type: "nameEnds", text: "stan" }, words: ["Kazakhstan", "Uzbekistan", "Afghanistan", "Tajikistan"] },
    { name: "On the Mediterranean", why: "Each has a Mediterranean coast.",
      rule: { type: "fact", id: "mediterranean" }, words: ["Turkey", "Egypt", "Israel", "Lebanon"] },
    { name: "Hosted the Summer Olympics", why: "Each has hosted the Summer Games.",
      rule: { type: "fact", id: "summerOlympics" }, words: ["United States", "Japan", "Australia", "China"] },
    { name: "Named after a river", why: "Each takes a river's name: India (Indus), Paraguay, Nigeria (Niger), Zambia (Zambezi).",
      rule: { type: "fact", id: "namedAfterRiver" }, words: ["India", "Paraguay", "Nigeria", "Zambia"] },
  ] },
  // #6
  { groups: [
    { name: "On the Arabian Peninsula", why: "All four sit on the Arabian Peninsula.",
      rule: { type: "fact", id: "arabianPeninsula" }, words: ["Saudi Arabia", "Oman", "Yemen", "UAE"] },
    { name: "Landlocked", why: "No coastline at all.",
      rule: { type: "fact", id: "landlocked" }, words: ["Czech Republic", "Mongolia", "Nepal", "Bolivia"] },
    { name: "Capital starts with B", why: "Berlin, Brussels, Bangkok and Beijing.",
      rule: { type: "capitalStarts", letter: "B" }, words: ["Germany", "Belgium", "Thailand", "China"] },
    { name: "Starts and ends with A", why: "Australia, Albania, Algeria and Angola.",
      rule: { type: "nameStartsEnds", letter: "a" }, words: ["Australia", "Albania", "Algeria", "Angola"] },
  ] },
  // #7
  { groups: [
    { name: "Southeast Asian countries", why: "All four are in Southeast Asia.",
      rule: { type: "fact", id: "southeastAsia" }, words: ["Thailand", "Vietnam", "Indonesia", "Malaysia"] },
    { name: "Portuguese is official", why: "Portuguese is an official language in all four.",
      rule: { type: "official", lang: "pt" }, words: ["Brazil", "Portugal", "Angola", "Mozambique"] },
    { name: "Have nuclear weapons", why: "Each has tested or openly holds nuclear weapons.",
      rule: { type: "fact", id: "nuclear" }, words: ["Russia", "China", "France", "United Kingdom"] },
    { name: "Capital named after a person", why: "Wellington (the Duke), Monrovia (James Monroe), Georgetown (George III), Port Louis (Louis XV).",
      rule: { type: "fact", id: "capitalAfterPerson" }, words: ["New Zealand", "Liberia", "Guyana", "Mauritius"] },
  ] },
  // #8
  { groups: [
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Iceland", "Sri Lanka", "Cuba", "Madagascar"] },
    { name: "Former Yugoslavia", why: "All four were once part of Yugoslavia.",
      rule: { type: "fact", id: "yugoslavia" }, words: ["Croatia", "Serbia", "Slovenia", "Bosnia and Herzegovina"] },
    { name: "Only two colours on the flag", why: "Canada, Switzerland, Denmark and Poland: two colours each.",
      rule: { type: "fact", id: "twoColours" }, words: ["Canada", "Switzerland", "Denmark", "Poland"] },
    { name: "Capital named after a person", why: "Washington (George Washington), Monrovia (James Monroe), Georgetown (George III), Brazzaville (Pierre de Brazza).",
      rule: { type: "fact", id: "capitalAfterPerson" }, words: ["United States", "Liberia", "Guyana", "Republic of the Congo"] },
  ] },
  // #9
  { groups: [
    { name: "Permanent seat on the UN Security Council", why: "The five permanent members: the US, Russia, the UK, France and China.",
      rule: { type: "fact", id: "unscP5" }, words: ["United States", "Russia", "France", "China"] },
    { name: "The Andes run through", why: "The Andes cross all four.",
      rule: { type: "fact", id: "andes" }, words: ["Peru", "Chile", "Argentina", "Colombia"] },
    { name: "Still have a monarch", why: "A king, queen, emperor or sultan is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Netherlands", "Belgium", "Norway", "Sweden"] },
    { name: "A weapon on the flag", why: "Kenya's spears, Mozambique's rifle, Angola's machete, Sri Lanka's lion holds a sword.",
      rule: { type: "fact", id: "flagWeapon" }, words: ["Kenya", "Mozambique", "Angola", "Sri Lanka"] },
  ] },
  // #10
  { groups: [
    { name: "Central American countries", why: "All four sit on the land bridge between Mexico and Colombia.",
      rule: { type: "fact", id: "centralAmerica" }, words: ["Costa Rica", "Panama", "Guatemala", "Honduras"] },
    { name: "Borders Germany", why: "Each shares a land border with Germany.",
      rule: { type: "borders", code: "DE" }, words: ["France", "Belgium", "Czech Republic", "Luxembourg"] },
    { name: "Only one neighbour", why: "Each touches just one country: Portugal (Spain), Ireland (the UK), South Korea (North Korea) and Haiti (Dominican Republic).",
      rule: { type: "neighbours", n: 1 }, words: ["Portugal", "Ireland", "South Korea", "Haiti"] },
    { name: "Named after a river", why: "Each takes a river's name: Uruguay, Senegal, Jordan, Niger.",
      rule: { type: "fact", id: "namedAfterRiver" }, words: ["Uruguay", "Senegal", "Jordan", "Niger"] },
  ] },
  // #11
  { groups: [
    { name: "Won the men's World Cup", why: "World champions: Brazil, Germany, Italy and Argentina.",
      rule: { type: "fact", id: "worldCupWinner" }, words: ["Brazil", "Germany", "Italy", "Argentina"] },
    { name: "Borders China", why: "Each shares a land border with China.",
      rule: { type: "borders", code: "CN" }, words: ["India", "Russia", "Mongolia", "Vietnam"] },
    { name: "King Charles is head of state", why: "Commonwealth realms: the British monarch is their king too.",
      rule: { type: "fact", id: "realm" }, words: ["Canada", "Australia", "Jamaica", "Bahamas"] },
    { name: "Ends in -land", why: "Not the Netherlands: its name ends in -lands.",
      rule: { type: "nameEnds", text: "land" }, words: ["Poland", "Finland", "Iceland", "Ireland"] },
  ] },
  // #12
  { groups: [
    { name: "Ends in -stan", why: "\"-stan\" is Persian for \"land of\".",
      rule: { type: "nameEnds", text: "stan" }, words: ["Kazakhstan", "Uzbekistan", "Pakistan", "Afghanistan"] },
    { name: "Arabic is official", why: "Arabic is an official language in all four.",
      rule: { type: "official", lang: "ar" }, words: ["Morocco", "Iraq", "UAE", "Tunisia"] },
    { name: "Currency is the US dollar", why: "The US dollar is their official currency.",
      rule: { type: "fact", id: "usDollar" }, words: ["United States", "Ecuador", "El Salvador", "Panama"] },
    { name: "Once Siam, Persia, Ceylon and Burma", why: "Siam became Thailand (1939), Persia Iran (1935), Ceylon Sri Lanka (1972), Burma Myanmar (1989).",
      rule: { type: "fact", id: "oldName" }, words: ["Thailand", "Iran", "Sri Lanka", "Myanmar"] },
  ] },
  // #13
  { groups: [
    { name: "Over 200 million people", why: "Only seven countries have more than 200 million people.",
      rule: { type: "popAbove", m: 200 }, words: ["China", "India", "Indonesia", "Pakistan"] },
    { name: "Use the euro", why: "The euro is their currency.",
      rule: { type: "fact", id: "euro" }, words: ["Germany", "France", "Italy", "Spain"] },
    { name: "A sun on the flag", why: "Each flag shows a sun.",
      rule: { type: "fact", id: "flagSun" }, words: ["Japan", "Argentina", "Uruguay", "Bangladesh"] },
    { name: "Another country hides inside", why: "Romania holds Oman, Dominican Republic holds Dominica, South Sudan holds Sudan and Papua New Guinea holds Guinea.",
      rule: { type: "containsCountry" }, words: ["Romania", "Dominican Republic", "South Sudan", "Papua New Guinea"] },
  ] },
  // #14
  { groups: [
    { name: "A compass point in the name", why: "North or South is part of the name.",
      rule: { type: "fact", id: "compassName" }, words: ["North Korea", "South Korea", "South Sudan", "North Macedonia"] },
    { name: "The Himalayas run through", why: "The Himalayas cross all four.",
      rule: { type: "fact", id: "himalaya" }, words: ["Nepal", "India", "Bhutan", "Pakistan"] },
    { name: "Capital starts with B", why: "Budapest, Buenos Aires, Belgrade and Bogota.",
      rule: { type: "capitalStarts", letter: "B" }, words: ["Hungary", "Argentina", "Serbia", "Colombia"] },
    { name: "Four-letter names", why: "Just four letters each.",
      rule: { type: "nameLength", n: 4 }, words: ["Iran", "Laos", "Chad", "Togo"] },
  ] },
  // #15
  { groups: [
    { name: "Union Jack on the flag", why: "The British flag sits in the corner (or is the whole flag).",
      rule: { type: "fact", id: "unionJack" }, words: ["United Kingdom", "Australia", "New Zealand", "Tuvalu"] },
    { name: "In the Sahara", why: "The Sahara covers part of all four.",
      rule: { type: "fact", id: "sahara" }, words: ["Libya", "Algeria", "Tunisia", "Chad"] },
    { name: "An animal on the flag", why: "Each flag shows an animal or bird.",
      rule: { type: "fact", id: "flagAnimal" }, words: ["Mexico", "Albania", "Sri Lanka", "Bhutan"] },
    { name: "Commonwealth, never British", why: "They joined the Commonwealth without ever being ruled by Britain.",
      rule: { type: "fact", id: "commonwealthNeverBritish" }, words: ["Mozambique", "Rwanda", "Gabon", "Togo"] },
  ] },
  // #16
  { groups: [
    { name: "Spanish is official", why: "Spanish is the official language in all four.",
      rule: { type: "official", lang: "es" }, words: ["Spain", "Argentina", "Colombia", "Chile"] },
    { name: "On the Baltic Sea", why: "Each has a Baltic Sea coast.",
      rule: { type: "fact", id: "balticSea" }, words: ["Finland", "Poland", "Germany", "Denmark"] },
    { name: "Capital starts with the same letter", why: "Belgium (Brussels), Guyana (Georgetown), Mozambique (Maputo) and Maldives (Male).",
      rule: { type: "capitalSameLetter" }, words: ["Belgium", "Guyana", "Mozambique", "Maldives"] },
    { name: "Also a first name", why: "Chad, Jordan, Georgia and Kenya are all common first names.",
      rule: { type: "fact", id: "firstName" }, words: ["Chad", "Jordan", "Georgia", "Kenya"] },
  ] },
  // #17
  { groups: [
    { name: "South American countries", why: "All four are in South America.",
      rule: { type: "fact", id: "southAmerica" }, words: ["Chile", "Ecuador", "Bolivia", "Uruguay"] },
    { name: "Borders France", why: "Each shares a land border with mainland France.",
      rule: { type: "borders", code: "FR" }, words: ["Spain", "Italy", "Germany", "Switzerland"] },
    { name: "Drive on the left", why: "Traffic keeps to the left in all four.",
      rule: { type: "fact", id: "driveLeft" }, words: ["United Kingdom", "Japan", "South Africa", "Thailand"] },
    { name: "Starts and ends with A", why: "Austria, Albania, Algeria and Armenia.",
      rule: { type: "nameStartsEnds", letter: "a" }, words: ["Austria", "Albania", "Algeria", "Armenia"] },
  ] },
  // #18
  { groups: [
    { name: "Nordic countries", why: "Denmark, Finland, Iceland, Norway and Sweden are the five Nordic countries.",
      rule: { type: "fact", id: "nordic" }, words: ["Norway", "Sweden", "Denmark", "Finland"] },
    { name: "Communist states", why: "China, Cuba, Laos, North Korea and Vietnam are the one-party communist states left.",
      rule: { type: "fact", id: "communist" }, words: ["China", "Cuba", "Vietnam", "North Korea"] },
    { name: "On the Tropic of Capricorn", why: "The Tropic of Capricorn crosses their land.",
      rule: { type: "fact", id: "tropicCapricorn" }, words: ["Australia", "Brazil", "Chile", "South Africa"] },
    { name: "Every Guinea", why: "Guinea, Equatorial Guinea, Guinea-Bissau and Papua New Guinea.",
      rule: { type: "nameContains", text: "guinea" }, words: ["Guinea", "Equatorial Guinea", "Guinea-Bissau", "Papua New Guinea"] },
  ] },
  // #19
  { groups: [
    { name: "G7 members", why: "The Group of Seven: the US, Canada, the UK, France, Germany, Italy and Japan.",
      rule: { type: "fact", id: "g7" }, words: ["Canada", "United Kingdom", "Italy", "Japan"] },
    { name: "The Nile flows through", why: "The Nile (White or Blue) runs through all four.",
      rule: { type: "fact", id: "nile" }, words: ["Egypt", "Sudan", "South Sudan", "Uganda"] },
    { name: "OPEC members", why: "All four are in OPEC, the oil exporters' group.",
      rule: { type: "fact", id: "opec" }, words: ["Iran", "Iraq", "Kuwait", "UAE"] },
    { name: "Named after a person", why: "Colombia: Columbus; Bolivia: Simón Bolívar; Mauritius: Maurice of Nassau; Seychelles: Jean Moreau de Séchelles.",
      rule: { type: "fact", id: "namedAfterPerson" }, words: ["Colombia", "Bolivia", "Mauritius", "Seychelles"] },
  ] },
  // #20
  { groups: [
    { name: "Caribbean islands", why: "Island countries in the Caribbean Sea.",
      rule: { type: "fact", id: "caribbeanIsland" }, words: ["Cuba", "Jamaica", "Saint Lucia", "Grenada"] },
    { name: "The Alps run through", why: "The Alps cover part of all four.",
      rule: { type: "fact", id: "alps" }, words: ["Switzerland", "Austria", "Italy", "France"] },
    { name: "Capital shares the country's name", why: "Panama City, Luxembourg City, Djibouti City and Vatican City.",
      rule: { type: "fact", id: "capitalSameName" }, words: ["Panama", "Luxembourg", "Djibouti", "Vatican City"] },
    { name: "A weapon on the flag", why: "Kenya's spears, Saudi Arabia's sword, Oman's daggers, Eswatini's spears.",
      rule: { type: "fact", id: "flagWeapon" }, words: ["Kenya", "Saudi Arabia", "Oman", "Eswatini"] },
  ] },
  // #21
  { groups: [
    { name: "Ends in -stan", why: "\"-stan\" is Persian for \"land of\".",
      rule: { type: "nameEnds", text: "stan" }, words: ["Uzbekistan", "Tajikistan", "Kyrgyzstan", "Turkmenistan"] },
    { name: "Borders India", why: "Each shares a land border with India.",
      rule: { type: "borders", code: "IN" }, words: ["China", "Nepal", "Bangladesh", "Bhutan"] },
    { name: "The Danube flows through", why: "The Danube runs through or along all four.",
      rule: { type: "fact", id: "danube" }, words: ["Germany", "Austria", "Hungary", "Romania"] },
    { name: "Capital named after a person", why: "Washington (George Washington), Wellington (the Duke), Victoria (the Queen), Valletta (Jean de Valette).",
      rule: { type: "fact", id: "capitalAfterPerson" }, words: ["United States", "New Zealand", "Seychelles", "Malta"] },
  ] },
  // #22
  { groups: [
    { name: "On the Arabian Peninsula", why: "All four sit on the Arabian Peninsula.",
      rule: { type: "fact", id: "arabianPeninsula" }, words: ["Saudi Arabia", "Oman", "Qatar", "Kuwait"] },
    { name: "English is official", why: "English is an official language in all four.",
      rule: { type: "official", lang: "en" }, words: ["New Zealand", "Ireland", "Nigeria", "Ghana"] },
    { name: "On the Caspian Sea", why: "Each has a Caspian coast.",
      rule: { type: "fact", id: "caspian" }, words: ["Russia", "Iran", "Kazakhstan", "Azerbaijan"] },
    { name: "\"Republic\" in the name", why: "Czech Republic, Dominican Republic, Central African Republic, Republic of the Congo.",
      rule: { type: "nameContains", text: "republic" }, words: ["Czech Republic", "Dominican Republic", "Central African Republic", "Republic of the Congo"] },
  ] },
  // #23
  { groups: [
    { name: "Southeast Asian countries", why: "All four are in Southeast Asia.",
      rule: { type: "fact", id: "southeastAsia" }, words: ["Thailand", "Indonesia", "Singapore", "Cambodia"] },
    { name: "On the Black Sea", why: "Each has a Black Sea coast.",
      rule: { type: "fact", id: "blackSea" }, words: ["Ukraine", "Romania", "Bulgaria", "Georgia"] },
    { name: "Capital isn't the biggest city", why: "Washington < New York, Ottawa < Toronto, Canberra < Sydney, Brasília < São Paulo.",
      rule: { type: "fact", id: "capitalNotLargest" }, words: ["United States", "Canada", "Australia", "Brazil"] },
    { name: "Four-letter names", why: "Just four letters each.",
      rule: { type: "nameLength", n: 4 }, words: ["Cuba", "Peru", "Mali", "Fiji"] },
  ] },
  // #24
  { groups: [
    { name: "The six biggest countries", why: "By area: Russia, Canada, the US, China, Brazil and Australia.",
      rule: { type: "areaTop", n: 6 }, words: ["Russia", "United States", "China", "Brazil"] },
    { name: "Vertical tricolours", why: "Each flag has three vertical bands.",
      rule: { type: "fact", id: "verticalTricolour" }, words: ["France", "Italy", "Ireland", "Belgium"] },
    { name: "An animal on the flag", why: "Each flag shows an animal or bird.",
      rule: { type: "fact", id: "flagAnimal" }, words: ["Egypt", "Uganda", "Zambia", "Zimbabwe"] },
    { name: "Another country hides inside", why: "Dominican Republic holds Dominica, South Sudan holds Sudan, Equatorial Guinea holds Guinea and Guinea-Bissau holds Guinea.",
      rule: { type: "containsCountry" }, words: ["Dominican Republic", "South Sudan", "Equatorial Guinea", "Guinea-Bissau"] },
  ] },
  // #25
  { groups: [
    { name: "Permanent seat on the UN Security Council", why: "The five permanent members: the US, Russia, the UK, France and China.",
      rule: { type: "fact", id: "unscP5" }, words: ["United States", "Russia", "United Kingdom", "France"] },
    { name: "Portuguese is official", why: "Portuguese is an official language in all four.",
      rule: { type: "official", lang: "pt" }, words: ["Brazil", "Portugal", "Cape Verde", "Timor-Leste"] },
    { name: "The Danube flows through", why: "The Danube runs through or along all four.",
      rule: { type: "fact", id: "danube" }, words: ["Bulgaria", "Serbia", "Slovakia", "Croatia"] },
    { name: "Ends in -land", why: "Not the Netherlands: its name ends in -lands.",
      rule: { type: "nameEnds", text: "land" }, words: ["Poland", "Switzerland", "Thailand", "New Zealand"] },
  ] },
  // #26
  { groups: [
    { name: "Central American countries", why: "All four sit on the land bridge between Mexico and Colombia.",
      rule: { type: "fact", id: "centralAmerica" }, words: ["Panama", "Guatemala", "Nicaragua", "Belize"] },
    { name: "French is official", why: "French is an official language in all four.",
      rule: { type: "official", lang: "fr" }, words: ["Switzerland", "Senegal", "Haiti", "Côte d'Ivoire"] },
    { name: "Hosted the Summer Olympics", why: "Each has hosted the Summer Games.",
      rule: { type: "fact", id: "summerOlympics" }, words: ["United Kingdom", "Brazil", "Spain", "South Korea"] },
    { name: "Capital named after a person", why: "Wellington (the Duke), Monrovia (James Monroe), Georgetown (George III), Valletta (Jean de Valette).",
      rule: { type: "fact", id: "capitalAfterPerson" }, words: ["New Zealand", "Liberia", "Guyana", "Malta"] },
  ] },
  // #27
  { groups: [
    { name: "Won the men's World Cup", why: "World champions: Brazil, Germany, France and Spain.",
      rule: { type: "fact", id: "worldCupWinner" }, words: ["Brazil", "Germany", "France", "Spain"] },
    { name: "Former Yugoslavia", why: "All four were once part of Yugoslavia.",
      rule: { type: "fact", id: "yugoslavia" }, words: ["Croatia", "Montenegro", "North Macedonia", "Kosovo"] },
    { name: "Drive on the left", why: "Traffic keeps to the left in all four.",
      rule: { type: "fact", id: "driveLeft" }, words: ["Kenya", "Malta", "Cyprus", "Indonesia"] },
    { name: "Named after a river", why: "Each takes a river's name: Paraguay, Gambia, DR Congo (Congo), Congo.",
      rule: { type: "fact", id: "namedAfterRiver" }, words: ["Paraguay", "Gambia", "DR Congo", "Republic of the Congo"] },
  ] },
  // #28
  { groups: [
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Japan", "Philippines", "Jamaica", "Singapore"] },
    { name: "Borders Brazil", why: "Each shares a land border with Brazil.",
      rule: { type: "borders", code: "BR" }, words: ["Colombia", "Peru", "Venezuela", "Bolivia"] },
    { name: "Have nuclear weapons", why: "Each has tested or openly holds nuclear weapons.",
      rule: { type: "fact", id: "nuclear" }, words: ["United States", "India", "Pakistan", "North Korea"] },
    { name: "Starts and ends with A", why: "Austria, Angola, Armenia and Andorra.",
      rule: { type: "nameStartsEnds", letter: "a" }, words: ["Austria", "Angola", "Armenia", "Andorra"] },
  ] },
  // #29
  { groups: [
    { name: "Over 200 million people", why: "Only seven countries have more than 200 million people.",
      rule: { type: "popAbove", m: 200 }, words: ["India", "United States", "Nigeria", "Brazil"] },
    { name: "Former Soviet republics", why: "All four were part of the USSR until 1991.",
      rule: { type: "fact", id: "soviet" }, words: ["Georgia", "Latvia", "Lithuania", "Armenia"] },
    { name: "The Rhine flows through", why: "The Rhine runs through or along all four.",
      rule: { type: "fact", id: "rhine" }, words: ["Germany", "Netherlands", "Austria", "Liechtenstein"] },
    { name: "A weapon on the flag", why: "Saudi Arabia's sword, Mozambique's rifle, Guatemala's rifles, Haiti's cannons.",
      rule: { type: "fact", id: "flagWeapon" }, words: ["Saudi Arabia", "Mozambique", "Guatemala", "Haiti"] },
  ] },
  // #30
  { groups: [
    { name: "A compass point in the name", why: "North or South is part of the name.",
      rule: { type: "fact", id: "compassName" }, words: ["North Korea", "South Korea", "South Africa", "South Sudan"] },
    { name: "On the Mediterranean", why: "Each has a Mediterranean coast.",
      rule: { type: "fact", id: "mediterranean" }, words: ["Italy", "France", "Egypt", "Croatia"] },
    { name: "Only two colours on the flag", why: "Japan, Indonesia, Ukraine and Finland: two colours each.",
      rule: { type: "fact", id: "twoColours" }, words: ["Japan", "Indonesia", "Ukraine", "Finland"] },
    { name: "A weapon on the flag", why: "Oman's daggers, Angola's machete, Sri Lanka's lion holds a sword, Guatemala's rifles.",
      rule: { type: "fact", id: "flagWeapon" }, words: ["Oman", "Angola", "Sri Lanka", "Guatemala"] },
  ] },
  // #31
  { groups: [
    { name: "Union Jack on the flag", why: "The British flag sits in the corner (or is the whole flag).",
      rule: { type: "fact", id: "unionJack" }, words: ["United Kingdom", "Australia", "New Zealand", "Tuvalu"] },
    { name: "Landlocked", why: "No coastline at all.",
      rule: { type: "fact", id: "landlocked" }, words: ["Switzerland", "Austria", "Hungary", "Slovakia"] },
    { name: "Capital shares the country's name", why: "Mexico City, Kuwait City, Panama City and Monaco.",
      rule: { type: "fact", id: "capitalSameName" }, words: ["Mexico", "Kuwait", "Panama", "Monaco"] },
    { name: "Four-letter names", why: "Just four letters each.",
      rule: { type: "nameLength", n: 4 }, words: ["Iran", "Iraq", "Oman", "Togo"] },
  ] },
  // #32
  { groups: [
    { name: "Spanish is official", why: "Spanish is the official language in all four.",
      rule: { type: "official", lang: "es" }, words: ["Mexico", "Peru", "Cuba", "Venezuela"] },
    { name: "Horn of Africa", why: "Somalia, Ethiopia, Eritrea and Djibouti make up the Horn of Africa.",
      rule: { type: "fact", id: "hornOfAfrica" }, words: ["Somalia", "Ethiopia", "Eritrea", "Djibouti"] },
    { name: "In two continents", why: "Russia, Turkey and Kazakhstan reach into Europe and Asia; Egypt's Sinai is in Asia.",
      rule: { type: "fact", id: "transcontinental" }, words: ["Russia", "Turkey", "Egypt", "Kazakhstan"] },
    { name: "Named after a river", why: "Each takes a river's name: India (Indus), Nigeria (Niger), Zambia (Zambezi), Gambia.",
      rule: { type: "fact", id: "namedAfterRiver" }, words: ["India", "Nigeria", "Zambia", "Gambia"] },
  ] },
  // #33
  { groups: [
    { name: "South American countries", why: "All four are in South America.",
      rule: { type: "fact", id: "southAmerica" }, words: ["Argentina", "Paraguay", "Guyana", "Suriname"] },
    { name: "A crescent on the flag", why: "Each flag has a crescent moon.",
      rule: { type: "fact", id: "flagCrescent" }, words: ["Singapore", "Libya", "Maldives", "Uzbekistan"] },
    { name: "Still have a monarch", why: "A king, queen, emperor or sultan is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["United Kingdom", "Spain", "Denmark", "Japan"] },
    { name: "Capital isn't the biggest city", why: "Bern < Zurich, Abuja < Lagos, Beijing < Shanghai, Hanoi < Ho Chi Minh City.",
      rule: { type: "fact", id: "capitalNotLargest" }, words: ["Switzerland", "Nigeria", "China", "Vietnam"] },
  ] },
  // #34
  { groups: [
    { name: "Nordic countries", why: "Denmark, Finland, Iceland, Norway and Sweden are the five Nordic countries.",
      rule: { type: "fact", id: "nordic" }, words: ["Norway", "Denmark", "Finland", "Iceland"] },
    { name: "Arabic is official", why: "Arabic is an official language in all four.",
      rule: { type: "official", lang: "ar" }, words: ["Egypt", "Syria", "Jordan", "Libya"] },
    { name: "Hosted the men's World Cup", why: "Each has hosted (or co-hosted) the tournament.",
      rule: { type: "fact", id: "worldCupHost" }, words: ["Brazil", "Germany", "Italy", "Argentina"] },
    { name: "A weapon on the flag", why: "Kenya's spears, Mozambique's rifle, Haiti's cannons, Eswatini's spears.",
      rule: { type: "fact", id: "flagWeapon" }, words: ["Kenya", "Mozambique", "Haiti", "Eswatini"] },
  ] },
  // #35
  { groups: [
    { name: "G7 members", why: "The Group of Seven: the US, Canada, the UK, France, Germany, Italy and Japan.",
      rule: { type: "fact", id: "g7" }, words: ["United States", "United Kingdom", "France", "Germany"] },
    { name: "Borders Saudi Arabia", why: "Each shares a land border with Saudi Arabia.",
      rule: { type: "borders", code: "SA" }, words: ["Iraq", "Yemen", "UAE", "Qatar"] },
    { name: "A sun on the flag", why: "Each flag shows a sun.",
      rule: { type: "fact", id: "flagSun" }, words: ["Kazakhstan", "Philippines", "Nepal", "North Macedonia"] },
    { name: "Named after a river", why: "Each takes a river's name: Paraguay, Senegal, DR Congo (Congo), Congo.",
      rule: { type: "fact", id: "namedAfterRiver" }, words: ["Paraguay", "Senegal", "DR Congo", "Republic of the Congo"] },
  ] },
  // #36
  { groups: [
    { name: "Caribbean islands", why: "Island countries in the Caribbean Sea.",
      rule: { type: "fact", id: "caribbeanIsland" }, words: ["Haiti", "Dominican Republic", "Trinidad and Tobago", "Saint Lucia"] },
    { name: "Borders China", why: "Each shares a land border with China.",
      rule: { type: "borders", code: "CN" }, words: ["Pakistan", "Nepal", "Afghanistan", "Laos"] },
    { name: "Capital starts with B", why: "Baghdad, Beirut, Bucharest and Bratislava.",
      rule: { type: "capitalStarts", letter: "B" }, words: ["Iraq", "Lebanon", "Romania", "Slovakia"] },
    { name: "Starts and ends with A", why: "Australia, Austria, Albania and Andorra.",
      rule: { type: "nameStartsEnds", letter: "a" }, words: ["Australia", "Austria", "Albania", "Andorra"] },
  ] },
  // #37
  { groups: [
    { name: "Ends in -stan", why: "\"-stan\" is Persian for \"land of\".",
      rule: { type: "nameEnds", text: "stan" }, words: ["Kazakhstan", "Pakistan", "Kyrgyzstan", "Turkmenistan"] },
    { name: "Use the euro", why: "The euro is their currency.",
      rule: { type: "fact", id: "euro" }, words: ["Netherlands", "Portugal", "Ireland", "Greece"] },
    { name: "King Charles is head of state", why: "Commonwealth realms: the British monarch is their king too.",
      rule: { type: "fact", id: "realm" }, words: ["Canada", "New Zealand", "Belize", "Papua New Guinea"] },
    { name: "Four-letter names", why: "Just four letters each.",
      rule: { type: "nameLength", n: 4 }, words: ["Laos", "Chad", "Mali", "Fiji"] },
  ] },
  // #38
  { groups: [
    { name: "On the Arabian Peninsula", why: "All four sit on the Arabian Peninsula.",
      rule: { type: "fact", id: "arabianPeninsula" }, words: ["Yemen", "UAE", "Qatar", "Kuwait"] },
    { name: "On the Equator", why: "The Equator crosses their land.",
      rule: { type: "fact", id: "equator" }, words: ["Ecuador", "Colombia", "Kenya", "Uganda"] },
    { name: "Hosted the Summer Olympics", why: "Each has hosted the Summer Games.",
      rule: { type: "fact", id: "summerOlympics" }, words: ["Greece", "France", "Mexico", "Sweden"] },
    { name: "Another country hides inside", why: "Romania holds Oman, Nigeria holds Niger, South Sudan holds Sudan and Papua New Guinea holds Guinea.",
      rule: { type: "containsCountry" }, words: ["Romania", "Nigeria", "South Sudan", "Papua New Guinea"] },
  ] },
  // #39
  { groups: [
    { name: "Southeast Asian countries", why: "All four are in Southeast Asia.",
      rule: { type: "fact", id: "southeastAsia" }, words: ["Vietnam", "Philippines", "Laos", "Myanmar"] },
    { name: "Former Yugoslavia", why: "All four were once part of Yugoslavia.",
      rule: { type: "fact", id: "yugoslavia" }, words: ["Serbia", "Slovenia", "Bosnia and Herzegovina", "Montenegro"] },
    { name: "Capital shares the country's name", why: "Mexico City, Guatemala City, Luxembourg City and Djibouti City.",
      rule: { type: "fact", id: "capitalSameName" }, words: ["Mexico", "Guatemala", "Luxembourg", "Djibouti"] },
    { name: "Only one neighbour", why: "Each touches just one country: Dominican Republic (Haiti), Qatar (Saudi Arabia), Gambia (Senegal) and Lesotho (South Africa).",
      rule: { type: "neighbours", n: 1 }, words: ["Dominican Republic", "Qatar", "Gambia", "Lesotho"] },
  ] },
  // #40
  { groups: [
    { name: "The six biggest countries", why: "By area: Russia, Canada, the US, China, Brazil and Australia.",
      rule: { type: "areaTop", n: 6 }, words: ["Russia", "Canada", "China", "Australia"] },
    { name: "A crescent on the flag", why: "Each flag has a crescent moon.",
      rule: { type: "fact", id: "flagCrescent" }, words: ["Turkey", "Pakistan", "Tunisia", "Malaysia"] },
    { name: "OPEC members", why: "All four are in OPEC, the oil exporters' group.",
      rule: { type: "fact", id: "opec" }, words: ["Saudi Arabia", "Iraq", "Venezuela", "Nigeria"] },
    { name: "Capital named after a person", why: "Monrovia (James Monroe), Port Louis (Louis XV), Victoria (the Queen), Valletta (Jean de Valette).",
      rule: { type: "fact", id: "capitalAfterPerson" }, words: ["Liberia", "Mauritius", "Seychelles", "Malta"] },
  ] },
  // #41
  { groups: [
    { name: "Permanent seat on the UN Security Council", why: "The five permanent members: the US, Russia, the UK, France and China.",
      rule: { type: "fact", id: "unscP5" }, words: ["United States", "Russia", "United Kingdom", "China"] },
    { name: "In the Sahara", why: "The Sahara covers part of all four.",
      rule: { type: "fact", id: "sahara" }, words: ["Egypt", "Niger", "Mali", "Mauritania"] },
    { name: "On the Tropic of Capricorn", why: "The Tropic of Capricorn crosses their land.",
      rule: { type: "fact", id: "tropicCapricorn" }, words: ["Argentina", "Namibia", "Madagascar", "Botswana"] },
    { name: "Ends in -land", why: "Not the Netherlands: its name ends in -lands.",
      rule: { type: "nameEnds", text: "land" }, words: ["Finland", "Iceland", "Ireland", "Switzerland"] },
  ] },
  // #42
  { groups: [
    { name: "Central American countries", why: "All four sit on the land bridge between Mexico and Colombia.",
      rule: { type: "fact", id: "centralAmerica" }, words: ["Panama", "Guatemala", "Honduras", "Belize"] },
    { name: "On the Baltic Sea", why: "Each has a Baltic Sea coast.",
      rule: { type: "fact", id: "balticSea" }, words: ["Sweden", "Estonia", "Latvia", "Lithuania"] },
    { name: "A sun on the flag", why: "Each flag shows a sun.",
      rule: { type: "fact", id: "flagSun" }, words: ["Japan", "Argentina", "Uruguay", "Philippines"] },
    { name: "Ends in -land", why: "Not the Netherlands: its name ends in -lands.",
      rule: { type: "nameEnds", text: "land" }, words: ["Iceland", "Ireland", "Thailand", "New Zealand"] },
  ] },
  // #43
  { groups: [
    { name: "Won the men's World Cup", why: "World champions: Italy, Argentina, France and Uruguay.",
      rule: { type: "fact", id: "worldCupWinner" }, words: ["Italy", "Argentina", "France", "Uruguay"] },
    { name: "The Himalayas run through", why: "The Himalayas cross all four.",
      rule: { type: "fact", id: "himalaya" }, words: ["Nepal", "India", "China", "Pakistan"] },
    { name: "Still have a monarch", why: "A king, queen, emperor or sultan is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Thailand", "Saudi Arabia", "Morocco", "Jordan"] },
    { name: "Four-letter names", why: "Just four letters each.",
      rule: { type: "nameLength", n: 4 }, words: ["Cuba", "Peru", "Iran", "Laos"] },
  ] },
  // #44
  { groups: [
    { name: "Island nations", why: "Every bit of their land is on islands.",
      rule: { type: "fact", id: "island" }, words: ["Japan", "New Zealand", "Malta", "Cyprus"] },
    { name: "Communist states", why: "China, Cuba, Laos, North Korea and Vietnam are the one-party communist states left.",
      rule: { type: "fact", id: "communist" }, words: ["China", "Vietnam", "North Korea", "Laos"] },
    { name: "Capital starts with the same letter", why: "Sweden (Stockholm), South Korea (Seoul), Guyana (Georgetown) and Mozambique (Maputo).",
      rule: { type: "capitalSameLetter" }, words: ["Sweden", "South Korea", "Guyana", "Mozambique"] },
    { name: "Starts and ends with A", why: "Argentina, Albania, Angola and Armenia.",
      rule: { type: "nameStartsEnds", letter: "a" }, words: ["Argentina", "Albania", "Angola", "Armenia"] },
  ] },
  // #45
  { groups: [
    { name: "Over 200 million people", why: "Only seven countries have more than 200 million people.",
      rule: { type: "popAbove", m: 200 }, words: ["India", "Indonesia", "Pakistan", "Nigeria"] },
    { name: "Borders France", why: "Each shares a land border with mainland France.",
      rule: { type: "borders", code: "FR" }, words: ["Italy", "Belgium", "Luxembourg", "Monaco"] },
    { name: "An animal on the flag", why: "Each flag shows an animal or bird.",
      rule: { type: "fact", id: "flagAnimal" }, words: ["Serbia", "Kazakhstan", "Guatemala", "Papua New Guinea"] },
    { name: "Named after a person", why: "the Philippines: Philip II of Spain; Saudi Arabia: the House of Saud; Mauritius: Maurice of Nassau; Seychelles: Jean Moreau de Séchelles.",
      rule: { type: "fact", id: "namedAfterPerson" }, words: ["Philippines", "Saudi Arabia", "Mauritius", "Seychelles"] },
  ] },
  // #46
  { groups: [
    { name: "A compass point in the name", why: "North or South is part of the name.",
      rule: { type: "fact", id: "compassName" }, words: ["North Korea", "South Korea", "South Africa", "North Macedonia"] },
    { name: "Portuguese is official", why: "Portuguese is an official language in all four.",
      rule: { type: "official", lang: "pt" }, words: ["Portugal", "Angola", "Mozambique", "Cape Verde"] },
    { name: "On the Tropic of Cancer", why: "The Tropic of Cancer crosses their land.",
      rule: { type: "fact", id: "tropicCancer" }, words: ["Mexico", "Egypt", "India", "Bangladesh"] },
    { name: "Another country hides inside", why: "Romania holds Oman, Nigeria holds Niger, Dominican Republic holds Dominica and Papua New Guinea holds Guinea.",
      rule: { type: "containsCountry" }, words: ["Romania", "Nigeria", "Dominican Republic", "Papua New Guinea"] },
  ] },
  // #47
  { groups: [
    { name: "Union Jack on the flag", why: "The British flag sits in the corner (or is the whole flag).",
      rule: { type: "fact", id: "unionJack" }, words: ["Australia", "New Zealand", "Fiji", "Tuvalu"] },
    { name: "Borders Russia", why: "Each shares a land border with Russia.",
      rule: { type: "borders", code: "RU" }, words: ["Norway", "Finland", "Ukraine", "Mongolia"] },
    { name: "On the Tropic of Cancer", why: "The Tropic of Cancer crosses their land.",
      rule: { type: "fact", id: "tropicCancer" }, words: ["Saudi Arabia", "Oman", "UAE", "Algeria"] },
    { name: "Only one neighbour", why: "Each touches just one country: Portugal (Spain), Ireland (the UK), South Korea (North Korea) and Haiti (Dominican Republic).",
      rule: { type: "neighbours", n: 1 }, words: ["Portugal", "Ireland", "South Korea", "Haiti"] },
  ] },
  // #48
  { groups: [
    { name: "Spanish is official", why: "Spanish is the official language in all four.",
      rule: { type: "official", lang: "es" }, words: ["Spain", "Mexico", "Guatemala", "Ecuador"] },
    { name: "Borders Germany", why: "Each shares a land border with Germany.",
      rule: { type: "borders", code: "DE" }, words: ["Poland", "Austria", "Netherlands", "Denmark"] },
    { name: "Have nuclear weapons", why: "Each has tested or openly holds nuclear weapons.",
      rule: { type: "fact", id: "nuclear" }, words: ["Russia", "China", "United Kingdom", "North Korea"] },
    { name: "Four-letter names", why: "Just four letters each.",
      rule: { type: "nameLength", n: 4 }, words: ["Iraq", "Oman", "Chad", "Mali"] },
  ] },
  // #49
  { groups: [
    { name: "South American countries", why: "All four are in South America.",
      rule: { type: "fact", id: "southAmerica" }, words: ["Brazil", "Chile", "Peru", "Venezuela"] },
    { name: "On the Black Sea", why: "Each has a Black Sea coast.",
      rule: { type: "fact", id: "blackSea" }, words: ["Turkey", "Ukraine", "Bulgaria", "Russia"] },
    { name: "Still have a monarch", why: "A king, queen, emperor or sultan is head of state.",
      rule: { type: "fact", id: "monarchy" }, words: ["Spain", "Netherlands", "Belgium", "Bhutan"] },
    { name: "Only one neighbour", why: "Each touches just one country: Portugal (Spain), Ireland (the UK), Dominican Republic (Haiti) and Gambia (Senegal).",
      rule: { type: "neighbours", n: 1 }, words: ["Portugal", "Ireland", "Dominican Republic", "Gambia"] },
  ] },
  // #50
  { groups: [
    { name: "Nordic countries", why: "Denmark, Finland, Iceland, Norway and Sweden are the five Nordic countries.",
      rule: { type: "fact", id: "nordic" }, words: ["Norway", "Sweden", "Denmark", "Iceland"] },
    { name: "Vertical tricolours", why: "Each flag has three vertical bands.",
      rule: { type: "fact", id: "verticalTricolour" }, words: ["Mexico", "Peru", "Guinea", "Côte d'Ivoire"] },
    { name: "Capital starts with B", why: "Berlin, Budapest, Bangkok and Belgrade.",
      rule: { type: "capitalStarts", letter: "B" }, words: ["Germany", "Hungary", "Thailand", "Serbia"] },
    { name: "Named after a person", why: "Bolivia: Simón Bolívar; the Philippines: Philip II of Spain; Mauritius: Maurice of Nassau; Seychelles: Jean Moreau de Séchelles.",
      rule: { type: "fact", id: "namedAfterPerson" }, words: ["Bolivia", "Philippines", "Mauritius", "Seychelles"] },
  ] },
  // #51
  { groups: [
    { name: "G7 members", why: "The Group of Seven: the US, Canada, the UK, France, Germany, Italy and Japan.",
      rule: { type: "fact", id: "g7" }, words: ["Canada", "United Kingdom", "Italy", "Japan"] },
    { name: "A star on the flag", why: "Brazil, Vietnam, Turkey and Israel all fly a star.",
      rule: { type: "fact", id: "flagStar" }, words: ["Brazil", "Vietnam", "Turkey", "Israel"] },
    { name: "The Danube flows through", why: "The Danube runs through or along all four.",
      rule: { type: "fact", id: "danube" }, words: ["Hungary", "Bulgaria", "Ukraine", "Moldova"] },
    { name: "Ends in -land", why: "Not the Netherlands: its name ends in -lands.",
      rule: { type: "nameEnds", text: "land" }, words: ["Poland", "Finland", "Switzerland", "Thailand"] },
  ] },
  // #52
  { groups: [
    { name: "Caribbean islands", why: "Island countries in the Caribbean Sea.",
      rule: { type: "fact", id: "caribbeanIsland" }, words: ["Cuba", "Haiti", "Trinidad and Tobago", "Barbados"] },
    { name: "The Alps run through", why: "The Alps cover part of all four.",
      rule: { type: "fact", id: "alps" }, words: ["Switzerland", "Germany", "Slovenia", "Liechtenstein"] },
    { name: "Have nuclear weapons", why: "Each has tested or openly holds nuclear weapons.",
      rule: { type: "fact", id: "nuclear" }, words: ["Russia", "China", "India", "Pakistan"] },
    { name: "Capital named after a person", why: "Georgetown (George III), Port Louis (Louis XV), Victoria (the Queen), Brazzaville (Pierre de Brazza).",
      rule: { type: "fact", id: "capitalAfterPerson" }, words: ["Guyana", "Mauritius", "Seychelles", "Republic of the Congo"] },
  ] },
]

export const PUZZLE_COUNT = PUZZLES.length

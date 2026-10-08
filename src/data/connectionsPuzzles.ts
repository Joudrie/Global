// The 52 daily Connections puzzles. Every tile is one country shown one of
// four ways (see utils/connectionsTiles): its name, its capital, its flag,
// or its own name for itself. A group's four tiles are always the same kind,
// so the kind shows what to look for; each board mixes three kinds, and two
// of its groups share a kind, which is where the real sorting happens.
//
// Groups run easiest (0) to hardest (3):
//   0  seen at once (Union Jack flags, Nordic capitals, a famous region)
//   1  easy-medium
//   2  medium
//   3  the clever one
//
// Every group carries a machine-checkable `rule` (utils/connectionsRules) so
// `npm run check:connections` can prove each board has one answer: the four
// members fit, and no other tile of the same kind on the board fits, even
// arguably.
import type { Rule } from "../utils/connectionsRules"
import type { Group, Puzzle, TileKind } from "../utils/connections"

export interface RuledGroup extends Group { rule: Rule }
export interface RuledPuzzle extends Puzzle { groups: RuledGroup[] }

const g = (kind: TileKind, codes: string, name: string, why: string, rule: Rule): RuledGroup =>
  ({ name, why, rule, tiles: codes.trim().split(/\s+/).map(code => ({ kind, code })) })
const fact = (id: Extract<Rule, { type: "fact" }>["id"]): Rule => ({ type: "fact", id })
const b = (...groups: RuledGroup[]): RuledPuzzle => ({ groups })

const C = "country", K = "capital", F = "flag", N = "native"

export const PUZZLES: RuledPuzzle[] = [
  // #1
  b(
    g(F, "AU NZ FJ TV", "Union Jack in the corner", "Australia, New Zealand, Fiji and Tuvalu all carry the British flag in the top corner.", fact("unionJack")),
    g(N, "DK NO SE IS", "Nordic, in their own words", "Danmark, Norge, Sverige and Ísland: Denmark, Norway, Sweden and Iceland.", fact("nordic")),
    g(K, "AT SK HU RS", "Capitals on the Danube", "Vienna, Bratislava, Budapest and Belgrade all stand on the Danube.", fact("capitalDanube")),
    g(N, "DE HU HR AL", "A different first letter", "Deutschland (Germany), Magyarország (Hungary), Hrvatska (Croatia) and Shqipëria (Albania) start nothing like their English names.", { type: "nativeDiffLetter" }),
  ),
  // #2
  b(
    g(C, "AR PE CO VE", "South American countries", "All four are in South America.", fact("southAmerica")),
    g(F, "TR TN PK AZ", "A crescent moon", "Turkey, Tunisia, Pakistan and Azerbaijan all fly a crescent.", fact("flagCrescent")),
    g(F, "KZ KG MK UY", "A sun", "Kazakhstan, Kyrgyzstan, North Macedonia and Uruguay all have a sun on the flag.", fact("flagSun")),
    g(N, "KZ TJ UZ AM", "A -stan in their own language", "Qazaqstan, Tojikiston and O'zbekiston, and Armenia calls itself Hayastan. -stan means land of.", { type: "nameEnds", text: ["stan", "ston"] }),
  ),
  // #3
  b(
    g(K, "NO SE DK FI", "Nordic capitals", "Oslo, Stockholm, Copenhagen and Helsinki.", fact("nordic")),
    g(F, "FR IT IE BE", "Three vertical stripes", "France, Italy, Ireland and Belgium: three bands side by side.", fact("verticalTricolour")),
    g(C, "PL HU CZ RO", "In the EU, but no euro", "Poland, Hungary, the Czech Republic and Romania still use their own money.", fact("euNotEuro")),
    g(C, "MC ME XK SM", "The euro, but not the EU", "Monaco and San Marino by agreement, Montenegro and Kosovo on their own.", fact("euroNotEU")),
  ),
  // #4
  b(
    g(C, "CU JM HT TT", "Caribbean islands", "Cuba, Jamaica, Haiti and Trinidad and Tobago are island countries in the Caribbean.", fact("caribbeanIsland")),
    g(F, "AL EG MX ZM", "An eagle", "Albania's double-headed eagle, Egypt's eagle of Saladin, Mexico's golden eagle and Zambia's fish eagle.", fact("flagEagle")),
    g(K, "US NZ LR GY", "Capitals named after a person", "George Washington, the Duke of Wellington, President James Monroe (Monrovia) and King George III (Georgetown).", fact("capitalAfterPerson")),
    g(K, "ME CD TD NO", "Capitals once named after a person", "Podgorica was Titograd, Kinshasa was Léopoldville, N'Djamena was Fort-Lamy and Oslo was Christiania.", fact("capitalOnceAfterPerson")),
  ),
  // #5
  b(
    g(C, "CA FR DE JP", "G7 members", "Canada, France, Germany and Japan are in the Group of Seven, with the US, UK and Italy.", fact("g7")),
    g(F, "DK NO SE IS", "Nordic crosses", "Denmark, Norway, Sweden and Iceland: a cross pushed towards the pole.", fact("nordicCross")),
    g(F, "CH GR GE DO", "A cross, but not a Nordic one", "Switzerland, Greece, Georgia and the Dominican Republic have a cross that isn't off-centre.", fact("flagCrossOther")),
    g(N, "MA DZ JO YE", "Begins with Al-", "Al-Maghrib (Morocco), Al-Jaza'ir (Algeria), Al-Urdun (Jordan) and Al-Yaman (Yemen). Al- is Arabic for the.", { type: "nameStarts", text: "Al-" }),
  ),
  // #6
  b(
    g(C, "GT HN NI PA", "Central America", "Guatemala, Honduras, Nicaragua and Panama.", fact("centralAmerica")),
    g(K, "MU PG TT HT", "Port capitals", "Port Louis, Port Moresby, Port of Spain and Port-au-Prince.", { type: "nameStarts", text: "Port" }),
    g(K, "CR CL DO GD", "Saints' capitals", "San José, Santiago (Saint James), Santo Domingo and Saint George's.", { type: "nameStarts", text: ["San", "Saint"] }),
    g(F, "TD RO ID MC", "Flag twins", "Chad and Romania have almost the same flag, and so do Indonesia and Monaco.", fact("flagTwin")),
  ),
  // #7
  b(
    g(F, "JP CA PL CH", "Only red and white", "Japan, Canada, Poland and Switzerland use just red and white.", fact("flagRedWhite")),
    g(N, "EE LV LT UA", "Once in the Soviet Union", "Eesti, Latvija, Lietuva and Ukraina: Estonia, Latvia, Lithuania and Ukraine.", fact("soviet")),
    g(N, "FI NO SE DK", "Nordic, in their own words", "Suomi, Norge, Sverige and Danmark. Finnish is related to Estonian, but Finland was never Soviet.", fact("nordic")),
    g(K, "SE MZ NE DZ", "Capital shares the first letter", "Stockholm (Sweden), Maputo (Mozambique), Niamey (Niger) and Algiers (Algeria).", { type: "capitalSameLetter" }),
  ),
  // #8
  b(
    g(K, "JP IS CU MT", "Island capitals", "Tokyo, Reykjavík, Havana and Valletta are capitals of island countries.", fact("island")),
    g(F, "JP BD PW LA", "A plain disc", "Japan, Bangladesh, Palau and Laos each have a single circle.", fact("flagDisc")),
    g(C, "IN PY NG ZM", "Named after a river", "The Indus, the Paraguay, the Niger and the Zambezi.", fact("namedAfterRiver")),
    g(C, "CO BO PH SA", "Named after a person", "Columbus, Simón Bolívar, Philip II of Spain and the House of Saud.", fact("namedAfterPerson")),
  ),
  // #9
  b(
    g(C, "OM YE QA KW", "On the Arabian Peninsula", "Oman, Yemen, Qatar and Kuwait.", fact("arabianPeninsula")),
    g(N, "PL CZ HR RU", "Slavic languages", "Polska, Česko, Hrvatska and Rossiya: Polish, Czech, Croatian and Russian are all Slavic.", fact("slavic")),
    g(K, "CA AU NZ BS", "King Charles is their king", "Ottawa, Canberra, Wellington and Nassau: capitals of Commonwealth realms.", fact("realm")),
    g(K, "ES TH JP BE", "A monarch of their own", "Madrid, Bangkok, Tokyo and Brussels: Spain, Thailand, Japan and Belgium have their own kings and emperor.", fact("ownMonarch")),
  ),
  // #10
  b(
    g(F, "GB AU NZ TV", "The Union Jack", "The United Kingdom's own flag, and Australia, New Zealand and Tuvalu, which carry it in the corner.", fact("unionJack")),
    g(N, "AT PL EE HR", "In the European Union", "Österreich, Polska, Eesti and Hrvatska: Austria, Poland, Estonia and Croatia.", fact("eu")),
    g(K, "AT SK HU RS", "Capitals on the Danube", "Vienna, Bratislava, Budapest and Belgrade.", fact("capitalDanube")),
    g(N, "NO CH IS RS", "In Europe, outside the EU", "Norge, Schweiz, Ísland and Srbija: Norway, Switzerland, Iceland and Serbia.", fact("europeOutsideEU")),
  ),
  // #11
  b(
    g(F, "FR IT IE NG", "Three vertical stripes", "France, Italy, Ireland and Nigeria.", fact("verticalTricolour")),
    g(F, "DE NL RU HU", "Three horizontal stripes", "Germany, the Netherlands, Russia and Hungary.", fact("flagHorizontalTricolour")),
    g(C, "EC KE ID GA", "On the Equator", "The Equator crosses Ecuador, Kenya, Indonesia and Gabon.", fact("equator")),
    g(N, "LV RS SI MK", "Ends in -ija", "Latvija, Srbija, Slovenija and Severna Makedonija.", { type: "nameEnds", text: "ija" }),
  ),
  // #12
  b(
    g(K, "PE EC VE UY", "South American capitals", "Lima, Quito, Caracas and Montevideo.", fact("southAmerica")),
    g(F, "JP CA CH DK", "Only red and white", "Japan, Canada, Switzerland and Denmark.", fact("flagRedWhite")),
    g(C, "NO TR IS AL", "In NATO, not the EU", "Norway, Turkey, Iceland and Albania are NATO members outside the EU.", fact("natoNotEU")),
    g(C, "AT IE MT CY", "In the EU, not NATO", "Austria, Ireland, Malta and Cyprus are the EU members outside NATO.", fact("euNotNato")),
  ),
  // #13
  b(
    g(N, "CN JP KR KP", "East Asia, in their own words", "Zhongguo, Nippon, Hanguk and Choson: China, Japan, South Korea and North Korea.", fact("eastAsia")),
    g(F, "UA SE PW KZ", "Only blue and yellow", "Ukraine, Sweden, Palau and Kazakhstan.", fact("flagBlueYellow")),
    g(K, "EC CO ET BT", "Over 2,000 metres up", "Quito, Bogotá, Addis Ababa and Thimphu are among the world's highest capitals.", fact("capitalHigh")),
    g(K, "BR AU NG PK", "Built to be the capital", "Brasília, Canberra, Abuja and Islamabad were planned from scratch as new capitals.", fact("plannedCapital")),
  ),
  // #14
  b(
    g(F, "DK NO SE FI", "Nordic crosses", "Denmark, Norway, Sweden and Finland.", fact("nordicCross")),
    g(K, "TH VN PH ID", "Southeast Asian capitals", "Bangkok, Hanoi, Manila and Jakarta.", fact("southeastAsia")),
    g(C, "PL HU RO BG", "Warsaw Pact, never Soviet", "Poland, Hungary, Romania and Bulgaria were Soviet allies but never part of the USSR.", fact("warsawPact")),
    g(C, "UA BY LT MD", "Former Soviet republics", "Ukraine, Belarus, Lithuania and Moldova were part of the USSR until 1991.", fact("soviet")),
  ),
  // #15
  b(
    g(C, "FI IS PL TH", "Ends in -land", "Finland, Iceland, Poland and Thailand.", { type: "nameEnds", text: "land" }),
    g(K, "MX KW PA GT", "Country name plus City", "Mexico City, Kuwait City, Panama City and Guatemala City.", { type: "nameEnds", text: " City" }),
    g(N, "CN JP KR MN", "East Asia, in their own words", "Zhongguo, Nippon, Hanguk and Mongol Uls: China, Japan, South Korea and Mongolia.", fact("eastAsia")),
    g(N, "KZ TJ UZ AM", "A -stan in their own language", "Qazaqstan, Tojikiston, O'zbekiston, and Hayastan, which is Armenia.", { type: "nameEnds", text: ["stan", "ston"] }),
  ),
  // #16
  b(
    g(C, "SI HR RS BA", "Former Yugoslavia", "Slovenia, Croatia, Serbia and Bosnia and Herzegovina were all Yugoslav republics.", fact("yugoslavia")),
    g(F, "GB AU FJ TV", "The Union Jack", "The United Kingdom, Australia, Fiji and Tuvalu.", fact("unionJack")),
    g(F, "US LR MY TG", "Stars and stripes", "The United States, Liberia, Malaysia and Togo: stripes, with a star in the corner.", fact("flagStarsStripes")),
    g(N, "JP IN EG NZ", "A different first letter", "Nippon (Japan), Bharat (India), Misr (Egypt) and Aotearoa (New Zealand).", { type: "nativeDiffLetter" }),
  ),
  // #17
  b(
    g(N, "CH AT IT SI", "In the Alps", "Schweiz, Österreich, Italia and Slovenija: Switzerland, Austria, Italy and Slovenia.", fact("alps")),
    g(K, "BR US IN MM", "Built to be the capital", "Brasília, Washington, New Delhi and Naypyidaw were all planned as new capitals.", fact("plannedCapital")),
    g(C, "CA CM GH RW", "In the Commonwealth", "Canada, Cameroon, Ghana and Rwanda are members, and all four drive on the right.", fact("commonwealth")),
    g(C, "JP TH ID IE", "Drive on the left", "Japan, Thailand, Indonesia and Ireland keep left, and none is in the Commonwealth.", fact("driveLeft")),
  ),
  // #18
  b(
    g(F, "TR PK DZ MY", "A crescent moon", "Turkey, Pakistan, Algeria and Malaysia.", fact("flagCrescent")),
    g(K, "NO SE IS FI", "Nordic capitals", "Oslo, Stockholm, Reykjavík and Helsinki.", fact("nordic")),
    g(K, "EE LV BY GE", "Once Soviet capitals", "Tallinn, Riga, Minsk and Tbilisi were capitals of Soviet republics.", fact("soviet")),
    g(C, "TR CN TD GN", "Also an English word", "A turkey, fine china, a chad (paper punched from a ballot) and a guinea (an old gold coin).", fact("englishWord")),
  ),
  // #19
  b(
    g(C, "KZ UZ AF PK", "Ends in -stan", "Kazakhstan, Uzbekistan, Afghanistan and Pakistan. -stan is Persian for land of.", { type: "nameEnds", text: "stan" }),
    g(F, "AL EG ZM KZ", "An eagle", "Albania, Egypt, Zambia and Kazakhstan, whose steppe eagle flies under the sun.", fact("flagEagle")),
    g(F, "KE OM AO MZ", "A weapon", "Kenya's spears, Oman's swords, Angola's machete and Mozambique's rifle.", fact("flagWeapon")),
    g(N, "BT TH KH JP", "Asian kingdoms", "Druk Yul (Bhutan), Prathet Thai (Thailand), Kampuchea (Cambodia) and Nippon (Japan) all have a monarch.", fact("monarchy")),
  ),
  // #20
  b(
    g(F, "NO SE FI IS", "Nordic crosses", "Norway, Sweden, Finland and Iceland.", fact("nordicCross")),
    g(C, "MX CL CU ES", "Spanish speaking", "Spanish is official in Mexico, Chile, Cuba and Spain.", { type: "official", lang: "es" }),
    g(C, "BR AO MZ PT", "Portuguese speaking", "Portuguese is official in Brazil, Angola, Mozambique and Portugal.", { type: "official", lang: "pt" }),
    g(K, "TN GW MC ST", "Capital hidden in the country", "Tunis in Tunisia, Bissau in Guinea-Bissau, Monaco in Monaco and São Tomé in São Tomé and Príncipe.", { type: "capitalInName" }),
  ),
  // #21
  b(
    g(C, "JP CU IS MG", "Island countries", "Japan, Cuba, Iceland and Madagascar.", fact("island")),
    g(C, "AT MN NP PY", "Landlocked", "Austria, Mongolia, Nepal and Paraguay have no coastline.", fact("landlocked")),
    g(F, "AT LV PE CA", "Red, white, red", "Austria and Latvia across, Peru and Canada side by side.", fact("flagRedWhiteRed")),
    g(N, "SK SI RS UA", "Slavic languages", "Slovensko, Slovenija, Srbija and Ukraina: Slovakia, Slovenia, Serbia and Ukraine.", fact("slavic")),
  ),
  // #22
  b(
    g(K, "CR NI HN SV", "Central American capitals", "San José, Managua, Tegucigalpa and San Salvador.", fact("centralAmerica")),
    g(F, "JP DK PL ID", "Only red and white", "Japan, Denmark, Poland and Indonesia.", fact("flagRedWhite")),
    g(F, "UA SE PW KZ", "Only blue and yellow", "Ukraine, Sweden, Palau and Kazakhstan.", fact("flagBlueYellow")),
    g(C, "RO NG SS PG", "Another country hides inside", "Romania holds Oman, Nigeria holds Niger, South Sudan holds Sudan and Papua New Guinea holds Guinea.", { type: "containsCountry" }),
  ),
  // #23
  b(
    g(F, "GB NZ FJ TV", "The Union Jack", "The United Kingdom, New Zealand, Fiji and Tuvalu.", fact("unionJack")),
    g(C, "RO BG UA GE", "On the Black Sea", "Romania, Bulgaria, Ukraine and Georgia.", fact("blackSea")),
    g(C, "ES IT GR EG", "On the Mediterranean", "Spain, Italy, Greece and Egypt.", fact("mediterranean")),
    g(K, "MT SC MU CG", "Capitals named after a person", "Valletta (Jean de Valette), Victoria (the queen), Port Louis (Louis XV) and Brazzaville (Pierre de Brazza).", fact("capitalAfterPerson")),
  ),
  // #24
  b(
    g(F, "FR BE RO ML", "Three vertical stripes", "France, Belgium, Romania and Mali.", fact("verticalTricolour")),
    g(N, "MA DZ JO YE", "Begins with Al-", "Al-Maghrib, Al-Jaza'ir, Al-Urdun and Al-Yaman: Morocco, Algeria, Jordan and Yemen.", { type: "nameStarts", text: "Al-" }),
    g(N, "PL RU CZ SK", "Slavic languages", "Polska, Rossiya, Česko and Slovensko.", fact("slavic")),
    g(K, "MX YE ER CO", "Over 2,000 metres up", "Mexico City, Sana'a, Asmara and Bogotá all sit above 2,000 metres.", fact("capitalHigh")),
  ),
  // #25
  b(
    g(C, "SA AE OM YE", "On the Arabian Peninsula", "Saudi Arabia, the UAE, Oman and Yemen.", fact("arabianPeninsula")),
    g(K, "CA CH TR NZ", "Not the biggest city", "Ottawa, Bern, Ankara and Wellington are smaller than Toronto, Zurich, Istanbul and Auckland.", fact("capitalNotLargest")),
    g(K, "KR SE TN DZ", "Capital shares the first letter", "Seoul (South Korea), Stockholm (Sweden), Tunis (Tunisia) and Algiers (Algeria).", { type: "capitalSameLetter" }),
    g(F, "SA BR IQ IR", "Words on the flag", "Saudi Arabia's creed, Brazil's Ordem e Progresso, and God is great on Iraq's and Iran's.", fact("flagText")),
  ),
  // #26
  b(
    g(K, "PE CO AR CL", "South American capitals", "Lima, Bogotá, Buenos Aires and Santiago.", fact("southAmerica")),
    g(F, "JO SD AE KW", "Pan-Arab colours", "Jordan, Sudan, the UAE and Kuwait: red, black, white and green.", fact("flagPanArab")),
    g(F, "TR TN PK DZ", "A crescent moon", "Turkey, Tunisia, Pakistan and Algeria.", fact("flagCrescent")),
    g(C, "TH IR LK MM", "Once had another name", "Thailand was Siam, Iran was Persia, Sri Lanka was Ceylon and Myanmar was Burma.", fact("oldName")),
  ),
  // #27
  b(
    g(F, "NO SE FI IS", "Nordic crosses", "Norway, Sweden, Finland and Iceland.", fact("nordicCross")),
    g(C, "ES AD IT MC", "Borders France", "Spain, Andorra, Italy and Monaco.", { type: "borders", code: "FR" }),
    g(C, "PL CZ AT DK", "Borders Germany", "Poland, the Czech Republic, Austria and Denmark.", { type: "borders", code: "DE" }),
    g(K, "TJ MZ DO KZ", "Capitals once named after a person", "Dushanbe was Stalinabad, Maputo was Lourenço Marques, Santo Domingo was Ciudad Trujillo and Astana was Nur-Sultan.", fact("capitalOnceAfterPerson")),
  ),
  // #28
  b(
    g(N, "KR KP JP MN", "East Asia, in their own words", "Hanguk, Choson, Nippon and Mongol Uls: the two Koreas, Japan and Mongolia.", fact("eastAsia")),
    g(C, "EC KE ID CD", "On the Equator", "Ecuador, Kenya, Indonesia and DR Congo.", fact("equator")),
    g(C, "CL AR NA AU", "On the Tropic of Capricorn", "The southern tropic crosses Chile, Argentina, Namibia and Australia.", fact("tropicCapricorn")),
    g(F, "JP BD PW LA", "A plain disc", "Japan, Bangladesh, Palau and Laos.", fact("flagDisc")),
  ),
  // #29
  b(
    g(F, "DE NL RU BG", "Three horizontal stripes", "Germany, the Netherlands, Russia and Bulgaria.", fact("flagHorizontalTricolour")),
    g(K, "NZ PH CU MG", "Island capitals", "Wellington, Manila, Havana and Antananarivo.", fact("island")),
    g(K, "NP MN CH CZ", "Landlocked capitals", "Kathmandu, Ulaanbaatar, Bern and Prague: their countries have no coast.", fact("landlocked")),
    g(N, "GE AM HU AL", "A different first letter", "Sakartvelo (Georgia), Hayastan (Armenia), Magyarország (Hungary) and Shqipëria (Albania).", { type: "nativeDiffLetter" }),
  ),
  // #30
  b(
    g(F, "CH CA TR SG", "Only red and white", "Switzerland, Canada, Turkey and Singapore.", fact("flagRedWhite")),
    g(C, "AT HU RS RO", "On the Danube", "The Danube flows through Austria, Hungary, Serbia and Romania.", fact("danube")),
    g(C, "EG SD UG ET", "On the Nile", "Egypt, Sudan, Uganda and Ethiopia.", fact("nile")),
    g(N, "HR GR KR AM", "Starts with H in their own words", "Hrvatska (Croatia), Hellas (Greece), Hanguk (Korea) and Hayastan (Armenia).", { type: "nameStarts", text: "H" }),
  ),
  // #31
  b(
    g(C, "IE CH NZ FI", "Ends in -land", "Ireland, Switzerland, New Zealand and Finland.", { type: "nameEnds", text: "land" }),
    g(F, "CA LB CY ER", "A leaf, a tree or a branch", "Canada's maple leaf, Lebanon's cedar, and olive branches for Cyprus and Eritrea.", fact("flagPlant")),
    g(F, "KE AO SA OM", "A weapon", "Kenya's spears, Angola's machete, Saudi Arabia's sword and Oman's swords and dagger.", fact("flagWeapon")),
    g(K, "TN GW SG VA", "Capital hidden in the country", "Tunis, Bissau, Singapore and Vatican City.", { type: "capitalInName" }),
  ),
  // #32
  b(
    g(F, "CH GR TO GB", "A cross, but not a Nordic one", "Switzerland, Greece, Tonga and the United Kingdom.", fact("flagCrossOther")),
    g(N, "DE IT ES IE", "In the European Union", "Deutschland, Italia, España and Éire.", fact("eu")),
    g(N, "RU UA ME AL", "In Europe, outside the EU", "Rossiya, Ukraina, Crna Gora and Shqipëria: Russia, Ukraine, Montenegro and Albania.", fact("europeOutsideEU")),
    g(C, "CU PE IQ OM", "Four letters", "Cuba, Peru, Iraq and Oman.", { type: "nameLength", n: 4 }),
  ),
  // #33
  b(
    g(F, "FR IT MX PE", "Three vertical stripes", "France, Italy, Mexico and Peru.", fact("verticalTricolour")),
    g(K, "MU VU TT PG", "Port capitals", "Port Louis, Port Vila, Port of Spain and Port Moresby.", { type: "nameStarts", text: "Port" }),
    g(C, "AO BR GW TL", "Once Portuguese", "Angola, Brazil, Guinea-Bissau and Timor-Leste were Portuguese colonies.", fact("exPortuguese")),
    g(C, "NA TG CM TZ", "Once German", "Namibia, Togo, Cameroon and Tanzania were German colonies until the First World War.", fact("exGerman")),
  ),
  // #34
  b(
    g(N, "CH AT DE IT", "In the Alps", "Schweiz, Österreich, Deutschland and Italia.", fact("alps")),
    g(K, "MX KW LU DJ", "Country name plus City", "Mexico City, Kuwait City, Luxembourg City and Djibouti City.", { type: "nameEnds", text: " City" }),
    g(K, "TN GW ST MC", "Capital hidden in the country", "Tunis, Bissau, São Tomé and Monaco sit whole inside their country's name.", { type: "capitalInName" }),
    g(F, "AL RS ME MD", "An eagle", "Albania, Serbia and Montenegro's double-headed eagles, and Moldova's eagle.", fact("flagEagle")),
  ),
  // #35
  b(
    g(F, "TR PK MY UZ", "A crescent moon", "Turkey, Pakistan, Malaysia and Uzbekistan.", fact("flagCrescent")),
    g(C, "CR PA HN BZ", "Central America", "Costa Rica, Panama, Honduras and Belize.", fact("centralAmerica")),
    g(C, "AR BR PY UY", "Mercosur founders", "Argentina, Brazil, Paraguay and Uruguay founded the South American trade bloc in 1991.", fact("mercosur")),
    g(N, "CN GR HT KH", "A different first letter", "Zhongguo (China), Hellas (Greece), Ayiti (Haiti) and Kampuchea (Cambodia).", { type: "nativeDiffLetter" }),
  ),
  // #36
  b(
    g(C, "US GB DE IT", "G7 members", "The United States, the United Kingdom, Germany and Italy.", fact("g7")),
    g(F, "AR KG MK PH", "A sun", "Argentina, Kyrgyzstan, North Macedonia and the Philippines.", fact("flagSun")),
    g(F, "TD RO ID MC", "Flag twins", "Chad and Romania, and Indonesia and Monaco, have nearly identical flags.", fact("flagTwin")),
    g(K, "PG BB GY TW", "Capital shares the first letter", "Port Moresby (Papua New Guinea), Bridgetown (Barbados), Georgetown (Guyana) and Taipei (Taiwan).", { type: "capitalSameLetter" }),
  ),
  // #37
  b(
    g(F, "DE NL BG LT", "Three horizontal stripes", "Germany, the Netherlands, Bulgaria and Lithuania.", fact("flagHorizontalTricolour")),
    g(K, "UY PY GY SR", "South American capitals", "Montevideo, Asunción, Georgetown and Paramaribo.", fact("southAmerica")),
    g(C, "MX KR AR ZA", "In the G20", "Mexico, South Korea, Argentina and South Africa.", fact("g20")),
    g(C, "VE IQ NG LY", "In OPEC", "Venezuela, Iraq, Nigeria and Libya are oil exporters in OPEC.", fact("opec")),
  ),
  // #38
  b(
    g(F, "DE HU AM EE", "Three horizontal stripes", "Germany, Hungary, Armenia and Estonia.", fact("flagHorizontalTricolour")),
    g(N, "FI PL HU NL", "In the European Union", "Suomi, Polska, Magyarország and Nederland: Finland, Poland, Hungary and the Netherlands.", fact("eu")),
    g(N, "RU UA GE KZ", "Once in the Soviet Union", "Rossiya, Ukraina, Sakartvelo and Qazaqstan: Russia, Ukraine, Georgia and Kazakhstan.", fact("soviet")),
    g(K, "US PG GY CG", "Capitals named after a person", "Washington, Port Moresby (Admiral Moresby), Georgetown (George III) and Brazzaville (Pierre de Brazza).", fact("capitalAfterPerson")),
  ),
  // #39
  b(
    g(N, "ES IT GR CY", "On the Mediterranean", "España, Italia, Hellas and Kypros: Spain, Italy, Greece and Cyprus.", fact("mediterranean")),
    g(C, "FR IN PK KP", "Nuclear powers", "France, India, Pakistan and North Korea have nuclear weapons.", fact("nuclear")),
    g(K, "CO ET BT ER", "Over 2,000 metres up", "Bogotá, Addis Ababa, Thimphu and Asmara.", fact("capitalHigh")),
    g(K, "AU TR MA VN", "Not the biggest city", "Canberra, Ankara, Rabat and Hanoi are smaller than Sydney, Istanbul, Casablanca and Ho Chi Minh City.", fact("capitalNotLargest")),
  ),
  // #40
  b(
    g(C, "VN KH LA TH", "Southeast Asia", "Vietnam, Cambodia, Laos and Thailand.", fact("southeastAsia")),
    g(F, "TT TZ CG CD", "A diagonal band", "Trinidad and Tobago, Tanzania, the Republic of the Congo and DR Congo.", fact("flagDiagonal")),
    g(F, "AR UY KZ MW", "A sun", "Argentina, Uruguay, Kazakhstan and Malawi.", fact("flagSun")),
    g(N, "MG PH FJ CY", "Island countries", "Madagasikara, Pilipinas, Viti and Kypros: Madagascar, the Philippines, Fiji and Cyprus.", fact("island")),
  ),
  // #41
  b(
    g(K, "MU HT TT VU", "Port capitals", "Port Louis, Port-au-Prince, Port of Spain and Port Vila.", { type: "nameStarts", text: "Port" }),
    g(C, "GM NE UY JO", "Named after a river", "The Gambia, the Niger, the Uruguay and the Jordan.", fact("namedAfterRiver")),
    g(C, "CO BO SA SC", "Named after a person", "Columbus, Bolívar, the House of Saud and Jean Moreau de Séchelles (Seychelles).", fact("namedAfterPerson")),
    g(N, "EG LB MA JO", "Their names in Arabic", "Misr (Egypt), Lubnan (Lebanon), Al-Maghrib (Morocco) and Al-Urdun (Jordan).", { type: "nativeLang", lang: "Arabic" }),
  ),
  // #42
  b(
    g(C, "CL PE EC BO", "Along the Andes", "Chile, Peru, Ecuador and Bolivia.", fact("andes")),
    g(K, "PG MU HT TT", "Port capitals", "Port Moresby, Port Louis, Port-au-Prince and Port of Spain.", { type: "nameStarts", text: "Port" }),
    g(K, "SV AG ST SM", "San, São or Saint", "San Salvador (the Holy Saviour), Saint John's, São Tomé (Saint Thomas) and San Marino City (Saint Marinus).", { type: "nameStarts", text: ["San", "Saint", "São"] }),
    g(F, "CZ PH CU JO", "A triangle by the pole", "The Czech Republic, the Philippines, Cuba and Jordan.", fact("flagHoistTriangle")),
  ),
  // #43
  b(
    g(K, "SA QA AE BH", "Gulf capitals", "Riyadh, Doha, Abu Dhabi and Manama.", fact("gcc")),
    g(F, "LV PE LB CA", "Red, white, red", "Latvia and Lebanon across, Peru and Canada side by side.", fact("flagRedWhiteRed")),
    g(C, "GB US NO MK", "In NATO, not the EU", "The United Kingdom, the United States, Norway and North Macedonia.", fact("natoNotEU")),
    g(C, "AT IE MT CY", "In the EU, not NATO", "Austria, Ireland, Malta and Cyprus.", fact("euNotNato")),
  ),
  // #44
  b(
    g(N, "CH IT SI DE", "In the Alps", "Schweiz, Italia, Slovenija and Deutschland.", fact("alps")),
    g(C, "SE DK PL CZ", "In the EU, but no euro", "Sweden, Denmark, Poland and the Czech Republic kept their crowns and złoty.", fact("euNotEuro")),
    g(C, "AD VA XK ME", "The euro, but not the EU", "Andorra, Vatican City, Kosovo and Montenegro.", fact("euroNotEU")),
    g(K, "GM TD ZW KG", "Capitals once named after a person", "Banjul was Bathurst, N'Djamena was Fort-Lamy, Harare was Salisbury and Bishkek was Frunze.", fact("capitalOnceAfterPerson")),
  ),
  // #45
  b(
    g(C, "HR SI MK ME", "Former Yugoslavia", "Croatia, Slovenia, North Macedonia and Montenegro.", fact("yugoslavia")),
    g(F, "AL EG KZ ZM", "An eagle", "Albania, Egypt, Kazakhstan and Zambia.", fact("flagEagle")),
    g(F, "CY LB ER BZ", "A leaf, a tree or a branch", "Cyprus and Eritrea's olive branches, Lebanon's cedar and Belize's mahogany tree.", fact("flagPlant")),
    g(N, "NZ FJ PG IN", "In the Commonwealth", "Aotearoa, Viti, Papua Niugini and Bharat: New Zealand, Fiji, Papua New Guinea and India.", fact("commonwealth")),
  ),
  // #46
  b(
    g(F, "CH GE TO DM", "A cross, but not a Nordic one", "Switzerland, Georgia, Tonga and Dominica.", fact("flagCrossOther")),
    g(N, "AT HU SK HR", "On the Danube", "Österreich, Magyarország, Slovensko and Hrvatska: Austria, Hungary, Slovakia and Croatia.", fact("danube")),
    g(K, "BS BZ AU NZ", "King Charles is their king", "Nassau, Belmopan, Canberra and Wellington.", fact("realm")),
    g(K, "NO DK MA JO", "A monarch of their own", "Oslo, Copenhagen, Rabat and Amman: Norway, Denmark, Morocco and Jordan have their own kings.", fact("ownMonarch")),
  ),
  // #47
  b(
    g(K, "PE EC CL VE", "Andean capitals", "Lima, Quito, Santiago and Caracas: their countries all reach the Andes.", fact("andes")),
    g(C, "BG GE UA RU", "On the Black Sea", "Bulgaria, Georgia, Ukraine and Russia.", fact("blackSea")),
    g(C, "FR HR LY LB", "On the Mediterranean", "France, Croatia, Libya and Lebanon.", fact("mediterranean")),
    g(F, "BD PW LA NE", "A plain disc", "Bangladesh, Palau, Laos and Niger.", fact("flagDisc")),
  ),
  // #48
  b(
    g(C, "JP CA FR IT", "G7 members", "Japan, Canada, France and Italy.", fact("g7")),
    g(N, "PL CZ SK SI", "Slavic languages", "Polska, Česko, Slovensko and Slovenija.", fact("slavic")),
    g(N, "NO CH IS AL", "In Europe, outside the EU", "Norge, Schweiz, Ísland and Shqipëria: Norway, Switzerland, Iceland and Albania.", fact("europeOutsideEU")),
    g(K, "BZ BR DJ GT", "Capital shares the first letter", "Belmopan (Belize), Brasília (Brazil), Djibouti City and Guatemala City.", { type: "capitalSameLetter" }),
  ),
  // #49
  b(
    g(K, "GT HN NI PA", "Central American capitals", "Guatemala City, Tegucigalpa, Managua and Panama City.", fact("centralAmerica")),
    g(F, "CH GR GE TO", "A cross, but not a Nordic one", "Switzerland, Greece, Georgia and Tonga.", fact("flagCrossOther")),
    g(F, "SD AE KW IQ", "Pan-Arab colours", "Sudan, the UAE, Kuwait and Iraq: red, black, white and green.", fact("flagPanArab")),
    g(C, "RU KZ IR AZ", "On the Caspian Sea", "Russia, Kazakhstan, Iran and Azerbaijan, with Turkmenistan.", fact("caspian")),
  ),
  // #50
  b(
    g(N, "ES IT TR EG", "On the Mediterranean", "España, Italia, Türkiye and Misr: Spain, Italy, Turkey and Egypt.", fact("mediterranean")),
    g(F, "KE MZ AO OM", "A weapon", "Kenya, Mozambique, Angola and Oman.", fact("flagWeapon")),
    g(K, "EC CO MX ET", "Over 2,000 metres up", "Quito, Bogotá, Mexico City and Addis Ababa.", fact("capitalHigh")),
    g(K, "US NZ SC MT", "Capitals named after a person", "Washington, Wellington, Victoria and Valletta.", fact("capitalAfterPerson")),
  ),
  // #51
  b(
    g(N, "JP CN KP MN", "East Asia, in their own words", "Nippon, Zhongguo, Choson and Mongol Uls: Japan, China, North Korea and Mongolia.", fact("eastAsia")),
    g(K, "CH CZ LA AF", "Landlocked capitals", "Bern, Prague, Vientiane and Kabul.", fact("landlocked")),
    g(C, "CA AU AR KZ", "Among the ten biggest", "Canada, Australia, Argentina and Kazakhstan are in the world's top ten by area.", { type: "areaTop", n: 10 }),
    g(C, "ID PK NG BD", "Over 150 million people", "Indonesia, Pakistan, Nigeria and Bangladesh.", { type: "popAbove", m: 150 }),
  ),
  // #52
  b(
    g(F, "US LR MY TG", "Stars and stripes", "The United States, Liberia, Malaysia and Togo.", fact("flagStarsStripes")),
    g(N, "LU BE NL IE", "In the European Union", "Lëtzebuerg, België, Nederland and Éire: Luxembourg, Belgium, the Netherlands and Ireland.", fact("eu")),
    g(C, "PH GQ CU PE", "Once Spanish", "The Philippines, Equatorial Guinea, Cuba and Peru were Spanish colonies.", fact("exSpanish")),
    g(C, "AO MZ CV TL", "Once Portuguese", "Angola, Mozambique, Cape Verde and Timor-Leste.", fact("exPortuguese")),
  ),
]

export const PUZZLE_COUNT = PUZZLES.length

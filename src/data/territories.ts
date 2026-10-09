import { fp } from "./flagUrl"

// Present-day dependent territories tied to a sovereign country — Crown
// Dependencies and British Overseas Territories under the UK, the Caribbean
// constituent countries under the Netherlands, French overseas collectivities,
// US insular areas, and so on. These are CURRENT relationships (not the vanished
// states in the historical "Predecessor & Related States" section), surfaced in
// the Codex under "Territories & Dependencies".
//
// Rule: never show a stand-in flag. A territory either has its OWN distinct flag
// (region-specific, never the metropole's national flag) or it is marked
// noFlag — most French DOMs and the UK's base areas just fly the national flag,
// so they read "No flag" rather than repeating the tricolor / Union Jack.
export interface Territory {
  name: string
  flagUrl: string
  /** Constitutional status, shown as a small badge. */
  status: string
  note: string
  /** Optional sub-grouping header within a country's list. */
  group?: string
  /** No distinct flag of its own — flies the metropole's national flag. */
  noFlag?: boolean
}

export const TERRITORIES: Record<string, Territory[]> = {
  // ── United Kingdom ──────────────────────────────────────────────────────
  GB: [
    { group: "Crown Dependencies", name: "Jersey", status: "Crown Dependency",
      flagUrl: fp("Flag_of_Jersey.svg"),
      note: "A self-governing Bailiwick in the Channel Islands, a possession of the Crown but not part of the UK. Its red saltire with the Plantagenet badge dates from 1981." },
    { group: "Crown Dependencies", name: "Guernsey", status: "Crown Dependency",
      flagUrl: fp("Flag_of_Guernsey.svg"),
      note: "The other Channel Island Bailiwick (with Alderney, Sark and Herm). Its St George's Cross carries a gold cross said to be the banner of William the Conqueror, added in 1985." },
    { group: "Crown Dependencies", name: "Isle of Man", status: "Crown Dependency",
      flagUrl: fp("Flag_of_the_Isle_of_Mann.svg"),
      note: "A self-governing island in the Irish Sea with its own ancient parliament, Tynwald. The triskelion — three armoured legs — has symbolised Man since the 13th century." },

    { group: "British Overseas Territories", name: "Anguilla", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_Anguilla.svg"),
      note: "A small Caribbean island that broke away from St Kitts–Nevis to stay British. Its flag shows three dolphins on a Blue Ensign." },
    { group: "British Overseas Territories", name: "Bermuda", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_Bermuda.svg"),
      note: "A North Atlantic territory and one of the oldest, settled in 1609. Unusually it uses a Red Ensign defaced with the colony's arms — a wrecked ship." },
    { group: "British Overseas Territories", name: "British Virgin Islands", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_the_British_Virgin_Islands.svg"),
      note: "A Caribbean archipelago east of Puerto Rico. Its Blue Ensign carries the territory's arms with St Ursula and her lamps." },
    { group: "British Overseas Territories", name: "Cayman Islands", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_the_Cayman_Islands.svg"),
      note: "A major offshore financial centre in the Caribbean. The Blue Ensign bears arms with three stars for the islands and a turtle crest." },
    { group: "British Overseas Territories", name: "Falkland Islands", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_the_Falkland_Islands.svg"),
      note: "A South Atlantic territory claimed by Argentina, sparking the 1982 Falklands War. Its arms show the ship Desire and a ram for the sheep economy." },
    { group: "British Overseas Territories", name: "Gibraltar", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_Gibraltar.svg"),
      note: "A strategic rock guarding the entrance to the Mediterranean, British since 1713. Uniquely it flies a banner of its own arms — a castle and key — not a Blue Ensign." },
    { group: "British Overseas Territories", name: "Montserrat", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_Montserrat.svg"),
      note: "A Caribbean island half-buried by its volcano since 1995. Its Blue Ensign shows Erin with a harp, reflecting the island's Irish heritage." },
    { group: "British Overseas Territories", name: "Pitcairn Islands", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_the_Pitcairn_Islands.svg"),
      note: "The UK's most remote territory, in the South Pacific, settled by HMS Bounty mutineers in 1790. Fewer than 50 people live there." },
    { group: "British Overseas Territories", name: "St Helena, Ascension & Tristan da Cunha", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_Saint_Helena.svg"),
      note: "A trio of remote South Atlantic islands; St Helena was Napoleon's final place of exile. The flag carries the wirebird, found nowhere else on Earth." },
    { group: "British Overseas Territories", name: "South Georgia & South Sandwich Islands", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_South_Georgia_and_the_South_Sandwich_Islands.svg"),
      note: "Sub-Antarctic islands with no permanent population, administered from the Falklands. The arms feature a fur seal and a macaroni penguin." },
    { group: "British Overseas Territories", name: "Turks & Caicos Islands", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_the_Turks_and_Caicos_Islands.svg"),
      note: "A Caribbean archipelago of low coral islands. Its Blue Ensign shows a conch shell, a spiny lobster and a turk's-cap cactus." },
    { group: "British Overseas Territories", name: "British Indian Ocean Territory", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_the_British_Indian_Ocean_Territory_2025.svg"),
      note: "The Chagos Archipelago, home to the Diego Garcia military base. In 2024 the UK agreed to transfer sovereignty to Mauritius while keeping the base on a long lease." },
    { group: "British Overseas Territories", name: "British Antarctic Territory", status: "British Overseas Territory",
      flagUrl: fp("Flag_of_the_British_Antarctic_Territory.svg"),
      note: "The UK's slice of Antarctica below South America, with only research-station staff. Its claim overlaps those of Argentina and Chile and is held in abeyance under the Antarctic Treaty." },
    { group: "British Overseas Territories", name: "Akrotiri & Dhekelia", status: "British Overseas Territory",
      flagUrl: "", noFlag: true,
      note: "Two Sovereign Base Areas retained on Cyprus when the island became independent in 1960. As military bases they have no flag of their own and fly the Union Jack." },
  ],

  // ── Netherlands (Kingdom of the Netherlands) ────────────────────────────
  NL: [
    { group: "Constituent countries", name: "Aruba", status: "Constituent country",
      flagUrl: fp("Flag_of_Aruba.svg"),
      note: "An autonomous country within the Kingdom of the Netherlands since 1986, off the Venezuelan coast. Its light-blue flag has two yellow stripes and a red star." },
    { group: "Constituent countries", name: "Curaçao", status: "Constituent country",
      flagUrl: fp("Flag_of_Curaçao.svg"),
      note: "An autonomous country within the Kingdom since the 2010 break-up of the Netherlands Antilles. Two stars on its flag stand for Curaçao and Klein Curaçao." },
    { group: "Constituent countries", name: "Sint Maarten", status: "Constituent country",
      flagUrl: fp("Flag_of_Sint_Maarten.svg"),
      note: "The Dutch southern half of the island of Saint Martin — the smallest land mass shared by two nations, with French Saint-Martin to the north." },

    { group: "Caribbean Netherlands (special municipalities)", name: "Bonaire", status: "Special municipality",
      flagUrl: fp("Flag_of_Bonaire.svg"),
      note: "A 'BES island' that became a special municipality of the Netherlands proper in 2010, governed much like a Dutch town despite lying in the Caribbean." },
    { group: "Caribbean Netherlands (special municipalities)", name: "Saba", status: "Special municipality",
      flagUrl: fp("Flag_of_Saba.svg"),
      note: "The smallest special municipality, a single volcanic peak. Its flag's gold star sits on a diamond of red and blue." },
    { group: "Caribbean Netherlands (special municipalities)", name: "Sint Eustatius", status: "Special municipality",
      flagUrl: fp("Flag_of_Sint_Eustatius.svg"),
      note: "Known as 'Statia', once a booming free port that was the first to salute the American flag in 1776. A special municipality since 2010." },
  ],

  // ── France (overseas France) ────────────────────────────────────────────
  FR: [
    { name: "French Polynesia", status: "Overseas collectivity",
      flagUrl: fp("Flag_of_French_Polynesia.svg"),
      note: "An autonomous collectivity of 121 Pacific islands including Tahiti. It has its own official territorial flag — a red-white-red design with an outrigger canoe and sun." },
    { name: "New Caledonia", status: "Sui generis collectivity",
      flagUrl: fp("Flag_of_FLNKS.svg"),
      note: "A Pacific territory voting on independence in three referendums (2018–2021), all narrowly rejecting it. The indigenous Kanak (FLNKS) flag is flown alongside the French tricolor — the only French territory with such a recognised co-flag." },
    { name: "Saint Pierre and Miquelon", status: "Overseas collectivity",
      flagUrl: fp("Flag_of_Saint-Pierre_and_Miquelon.svg"),
      note: "A tiny archipelago off Newfoundland, the last remnant of French North America. Its widely flown local flag bears a ship and three regional emblems." },
    { name: "Martinique", status: "Overseas department & region",
      flagUrl: fp("Flag-of-Martinique.svg"),
      note: "A Caribbean island and full department of France. In 2023 it adopted an official red-green-black flag with a hummingbird, replacing the colonial snake banner." },
    { name: "Saint Martin", status: "Overseas collectivity",
      flagUrl: fp("Local_flag_of_the_Collectivity_of_Saint_Martin.svg"),
      note: "The French northern half of the island shared with Dutch Sint Maarten. Its local flag depicts the island's coastline and landmarks." },
    { name: "Guadeloupe", status: "Overseas department & region",
      flagUrl: "", noFlag: true,
      note: "A Caribbean department of France. It officially flies only the French tricolor; the local sun-and-fleur-de-lis designs are unofficial." },
    { name: "Réunion", status: "Overseas department & region",
      flagUrl: "", noFlag: true,
      note: "An Indian Ocean department east of Madagascar, fully part of France and the EU. It officially flies only the French tricolor." },
    { name: "Mayotte", status: "Overseas department & region",
      flagUrl: "", noFlag: true,
      note: "An Indian Ocean department that chose to stay French when the rest of the Comoros became independent. It officially flies only the tricolor." },
    { name: "French Guiana", status: "Overseas department & region",
      flagUrl: "", noFlag: true,
      note: "France's only mainland territory in South America, home to the Guiana Space Centre. It officially flies only the tricolor (a regional flag exists but is unofficial)." },
    { name: "Saint Barthélemy", status: "Overseas collectivity",
      flagUrl: "", noFlag: true,
      note: "A small, affluent Caribbean collectivity once owned by Sweden (1784–1878). It officially flies only the French tricolor." },
  ],

  // ── United States (insular areas) ───────────────────────────────────────
  US: [
    { name: "Puerto Rico", status: "Commonwealth (unincorporated territory)",
      flagUrl: fp("Flag_of_Puerto_Rico.svg"),
      note: "The most populous US territory, a Caribbean commonwealth whose residents are US citizens but cannot vote for president. Statehood remains a live debate." },
    { name: "Guam", status: "Unincorporated territory",
      flagUrl: fp("Flag_of_Guam.svg"),
      note: "A strategically vital Pacific island and major US military hub. Its flag shows a proa sailing past a coconut palm in Hagåtña Bay." },
    { name: "U.S. Virgin Islands", status: "Unincorporated territory",
      flagUrl: fp("Flag_of_the_United_States_Virgin_Islands.svg"),
      note: "A Caribbean territory the US bought from Denmark in 1917. The flag is a simplified US eagle holding a laurel branch and arrows between the letters V and I." },
    { name: "American Samoa", status: "Unincorporated territory",
      flagUrl: fp("Flag_of_American_Samoa.svg"),
      note: "The only US territory south of the equator. Its flag shows a bald eagle clutching a Samoan war club and fly-whisk, symbols of chiefly authority." },
    { name: "Northern Mariana Islands", status: "Commonwealth (unincorporated territory)",
      flagUrl: fp("Flag_of_the_Northern_Mariana_Islands.svg"),
      note: "A Pacific commonwealth that, unlike Guam, chose union with the US in the 1970s. Its flag features a latte stone and a mwar (flower garland)." },
  ],

  // ── Denmark (Kingdom of Denmark) ────────────────────────────────────────
  DK: [
    { name: "Greenland", status: "Autonomous territory",
      flagUrl: fp("Flag_of_Greenland.svg"),
      note: "The world's largest island, self-governing since 1979 with a path to full independence. Its red-and-white 'Erfalasorput' is the only Nordic flag without a cross." },
    { name: "Faroe Islands", status: "Autonomous territory",
      flagUrl: fp("Flag_of_the_Faroe_Islands.svg"),
      note: "A self-governing North Atlantic archipelago between Scotland and Iceland. Its 'Merkið' is a Nordic cross flag, like Denmark's but red-and-blue on white." },
  ],

  // ── New Zealand (Realm of New Zealand) ──────────────────────────────────
  NZ: [
    { name: "Cook Islands", status: "Associated state",
      flagUrl: fp("Flag_of_the_Cook_Islands.svg"),
      note: "A self-governing state in free association with New Zealand, running its own foreign policy. Fifteen stars on a Blue Ensign mark its fifteen islands." },
    { name: "Niue", status: "Associated state",
      flagUrl: fp("Flag_of_Niue.svg"),
      note: "One of the world's largest coral islands and a state in free association with New Zealand. Its yellow flag is unique in keeping the Union Jack with added stars." },
    { name: "Tokelau", status: "Dependent territory",
      flagUrl: fp("Flag_of_Tokelau.svg"),
      note: "Three tiny atolls that remain a non-self-governing dependency of New Zealand. Its flag shows a Tokelauan canoe sailing toward the Southern Cross." },
  ],

  // ── Australia (external territories) ────────────────────────────────────
  AU: [
    { name: "Norfolk Island", status: "External territory",
      flagUrl: fp("Flag_of_Norfolk_Island.svg"),
      note: "A South Pacific island settled partly by Bounty mutineer descendants from Pitcairn. Its flag frames the endemic Norfolk Island pine in green." },
    { name: "Christmas Island", status: "External territory",
      flagUrl: fp("Flag_of_Christmas_Island.svg"),
      note: "An Indian Ocean island famous for its annual red-crab migration. The crab and a golden bosun bird feature on its blue-and-green flag." },
    { name: "Cocos (Keeling) Islands", status: "External territory",
      flagUrl: fp("Flag_of_the_Cocos_(Keeling)_Islands.svg"),
      note: "A remote Indian Ocean atoll group with a largely Cocos Malay, Muslim population. Its flag bears a palm tree, a crescent and the Southern Cross." },
  ],

  // ── China (Special Administrative Regions) ──────────────────────────────
  CN: [
    { name: "Hong Kong", status: "Special Administrative Region",
      flagUrl: fp("Flag_of_Hong_Kong.svg"),
      note: "A former British colony returned to China in 1997, governed under 'one country, two systems' with its own legal system and currency. Its red flag bears a white five-petalled bauhinia flower." },
    { name: "Macau", status: "Special Administrative Region",
      flagUrl: fp("Flag_of_Macau.svg"),
      note: "A former Portuguese territory returned to China in 1999, also under 'one country, two systems'. The world's biggest gambling hub, its green flag shows a lotus over the Governor Nobre de Carvalho Bridge." },
  ],
}

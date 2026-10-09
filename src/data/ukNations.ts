import { fp } from "./flagUrl"
import type { HistoricalFlag } from "./codex"

// The United Kingdom is the one Codex country that drills down into its
// constituent nations. Each nation carries its own flag history — the modern
// national flag plus the older kingdoms and royal banners tied to that land
// (Wessex, Mercia, Northumbria, the Lion Rampant, Glyndŵr's banner…). Histories
// are ordered newest → oldest, matching the country flag-history convention.
//
// A note on honesty: the Anglo-Saxon "kingdom" banners (Wessex, Mercia,
// Northumbria) are *attributed* arms — early-medieval kingdoms had no flags in
// the modern sense. The notes say so rather than implying these flew at the time.
export interface UKNation {
  /** Synthetic key, not an ISO country code. */
  key: string
  name: string
  /** One-line emblem description shown under the name. */
  emblem: string
  flagHistory: HistoricalFlag[]
}

export const UK_NATIONS: UKNation[] = [
  {
    key: "england",
    name: "England",
    emblem: "St George's Cross",
    flagHistory: [
      {
        fromYear: 1270, toYear: null,
        flagUrl: fp("Flag_of_England.svg"),
        label: "St George's Cross",
        note: "A red cross on white, adopted by England from the late 13th century after St George became the realm's patron. It later formed the base of the Union Flag and is still flown as England's national flag today.",
      },
      {
        fromYear: 1198, toYear: 1707,
        flagUrl: fp("Royal_banner_of_England.svg"),
        label: "Royal Banner of England (Three Lions)",
        note: "The three gold lions (leopards) on red were the royal arms of the Plantagenet kings from Richard I onwards. As a banner it represented the monarch and the Kingdom of England until the 1707 union, and the lions survive in the Royal Standard and on England's sporting badges.",
      },
      {
        fromYear: 654, toYear: 954,
        flagUrl: fp("Flag_of_Northumbria.svg"),
        label: "Kingdom of Northumbria",
        note: "An Anglo-Saxon kingdom across northern England and southern Scotland. Its red-and-gold vertical banner is an attributed design based on Bede's description of King Oswald's standard — the kingdom itself had no flag in the modern sense.",
      },
      {
        fromYear: 527, toYear: 918,
        flagUrl: fp("Saint_Alban's_cross.svg"),
        label: "Kingdom of Mercia",
        note: "The dominant kingdom of the English Midlands during the 'Mercian Supremacy'. The gold saltire on blue — St Alban's Cross, after England's first martyr — is the attributed banner traditionally associated with Mercia.",
      },
      {
        fromYear: 519, toYear: 927,
        flagUrl: fp("Flag_of_Wessex.svg"),
        label: "Kingdom of Wessex",
        note: "The kingdom of the West Saxons, from which Alfred the Great and the eventual kings of a united England arose. The gold wyvern (dragon) on red is the attributed standard of Wessex, later revived as a regional emblem.",
      },
    ],
  },
  {
    key: "scotland",
    name: "Scotland",
    emblem: "The Saltire · St Andrew's Cross",
    flagHistory: [
      {
        fromYear: 1385, toYear: null,
        flagUrl: fp("Flag_of_Scotland.svg"),
        label: "Flag of Scotland (Saltire)",
        note: "The white diagonal cross of St Andrew on blue — by legend seen in the sky before a 9th-century battle, and first recorded in use in 1385. It is one of the oldest national flags still in use and forms the blue field of the Union Jack.",
      },
      {
        fromYear: 1222, toYear: null,
        flagUrl: fp("Royal_Standard_of_Scotland.svg"),
        label: "Royal Standard of Scotland (Lion Rampant)",
        note: "The red lion rampant within a double border, used by the Kings of Scots since at least the reign of Alexander II. Still the monarch's official banner in Scotland, it is flown unofficially as a second national flag at sporting events.",
      },
    ],
  },
  {
    key: "wales",
    name: "Wales",
    emblem: "Y Ddraig Goch · the Red Dragon",
    flagHistory: [
      {
        fromYear: 1959, toYear: null,
        flagUrl: fp("Flag_of_Wales.svg"),
        label: "Flag of Wales (Y Ddraig Goch)",
        note: "The red dragon on a green-and-white field, made the official flag of Wales in 1959. The dragon is one of Britain's oldest emblems, linked to the Welsh kings and the legend of Myrddin (Merlin). Uniquely, Wales is not represented on the Union Jack.",
      },
      {
        fromYear: 1400, toYear: 1415,
        flagUrl: fp("Glyndwr's_Banner.svg"),
        label: "Owain Glyndŵr's Banner",
        note: "The four lions rampant, quartered gold and red, were the arms of Owain Glyndŵr, the last native Welshman to hold the title Prince of Wales. He raised this banner during his revolt against English rule (1400–1415) and it remains a symbol of Welsh independence.",
      },
      {
        fromYear: 1120, toYear: null,
        flagUrl: fp("Flag_of_Saint_David.svg"),
        label: "St David's Flag",
        note: "A gold cross on black, the banner of Dewi Sant (St David), patron saint of Wales. Flown especially on St David's Day (1 March), it serves as an alternative Welsh flag rooted in the early medieval Welsh church.",
      },
    ],
  },
  {
    key: "northern-ireland",
    name: "Northern Ireland",
    emblem: "No official flag · Union Jack used",
    flagHistory: [
      {
        fromYear: 1972, toYear: null,
        flagUrl: "/flags/gb.svg",
        label: "No official flag (Union Jack)",
        note: "Since the Northern Ireland government was suspended in 1972, the region has had no official flag of its own — the Union Jack is the only flag used by the UK government for Northern Ireland. Other flags remain politically contested.",
      },
      {
        fromYear: 1953, toYear: 1972,
        flagUrl: fp("Ulster_Banner.svg"),
        label: "Ulster Banner",
        note: "Based on the St George's Cross with the red hand of Ulster on a six-pointed star and a crown, this was the flag of the Northern Ireland government from 1953 until it was abolished in 1972. It still appears in some sporting and unionist contexts but has no official status.",
      },
      {
        fromYear: 1783, toYear: null,
        flagUrl: fp("Saint_Patrick's_Saltire.svg"),
        label: "St Patrick's Saltire",
        note: "A red diagonal cross on white, used to represent Ireland in the Union Jack from the 1801 union. Its standing as a purely Irish symbol is debated, but it is the element of the UK flag that stands for the island of Ireland.",
      },
    ],
  },
]

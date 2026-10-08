// What countries call themselves (endonyms), for the Connections "local name"
// tiles. Latin script only: names in other scripts use the usual
// romanisation. Only names that are well documented and commonly cited, and
// only where the endonym is clearly different from the English name.
//
// `lang` is a BCP 47 tag (so screen readers pronounce the tile in that
// language) and `language` the language it is in.
//
// Choices where a country has more than one name:
//   CH  Schweiz: German is the majority language (Suisse, Svizzera and Svizra
//       are equally official). Helvetia, on stamps and coins, is Latin.
//   BE  België: Dutch is the majority language (also Belgique, Belgien).
//   CY  Kypros: Greek (Kıbrıs in Turkish).
//   NO  Norge: Bokmål, the written standard most Norwegians use (Noreg in Nynorsk).
//   JP  Nippon: the form on stamps, banknotes and team shirts (Nihon is also used).
//   GR  Hellas: the formal name behind "Hellenic Republic" (everyday Ellada).
//   KR  Hanguk: what South Koreans call the country (formally Daehan Minguk).
//   KP  Choson: North Korea's own name (Chosŏn).
//   IN  Bharat: "India, that is Bharat", the constitution's own words.
//   HT  Ayiti: Haitian Creole (Haïti in French).
//   NZ  Aotearoa: Māori, used alongside New Zealand.
//
// Left out on purpose: names that only differ by an accent or a letter or two
// from the English (México, România, Perú, Panamá, Việt Nam, Azərbaycan,
// Türkmenistan, Moçambique, Bulgaria/Balgariya), names with competing
// romanisations (Ethiopia, Eritrea), countries with many equal languages
// (South Africa, Bosnia and Herzegovina), and Kosovo, Taiwan, Israel and
// Palestine, where the name itself is contested.
export interface Endonym { name: string; lang: string; language: string }

const e = (name: string, lang: string, language: string): Endonym => ({ name, lang, language })

export const ENDONYMS: Record<string, Endonym> = {
  // ── Europe ────────────────────────────────────────────────────────────────
  AL: e("Shqipëria", "sq", "Albanian"),
  AT: e("Österreich", "de", "German"),
  BE: e("België", "nl", "Dutch"),
  HR: e("Hrvatska", "hr", "Croatian"),
  CY: e("Kypros", "el", "Greek"),
  CZ: e("Česko", "cs", "Czech"),
  DK: e("Danmark", "da", "Danish"),
  EE: e("Eesti", "et", "Estonian"),
  FI: e("Suomi", "fi", "Finnish"),
  DE: e("Deutschland", "de", "German"),
  GR: e("Hellas", "el", "Greek"),
  HU: e("Magyarország", "hu", "Hungarian"),
  IS: e("Ísland", "is", "Icelandic"),
  IE: e("Éire", "ga", "Irish"),
  IT: e("Italia", "it", "Italian"),
  LV: e("Latvija", "lv", "Latvian"),
  LT: e("Lietuva", "lt", "Lithuanian"),
  LU: e("Lëtzebuerg", "lb", "Luxembourgish"),
  ME: e("Crna Gora", "cnr", "Montenegrin"),
  NL: e("Nederland", "nl", "Dutch"),
  MK: e("Severna Makedonija", "mk", "Macedonian"),
  NO: e("Norge", "nb", "Norwegian"),
  PL: e("Polska", "pl", "Polish"),
  RU: e("Rossiya", "ru", "Russian"),
  RS: e("Srbija", "sr", "Serbian"),
  SK: e("Slovensko", "sk", "Slovak"),
  SI: e("Slovenija", "sl", "Slovene"),
  ES: e("España", "es", "Spanish"),
  SE: e("Sverige", "sv", "Swedish"),
  CH: e("Schweiz", "de", "German"),
  UA: e("Ukraina", "uk", "Ukrainian"),

  // ── Asia ──────────────────────────────────────────────────────────────────
  JP: e("Nippon", "ja", "Japanese"),
  CN: e("Zhongguo", "zh", "Chinese"),
  KR: e("Hanguk", "ko", "Korean"),
  KP: e("Choson", "ko", "Korean"),
  MN: e("Mongol Uls", "mn", "Mongolian"),
  IN: e("Bharat", "hi", "Hindi"),
  BT: e("Druk Yul", "dz", "Dzongkha"),
  TH: e("Prathet Thai", "th", "Thai"),
  KH: e("Kampuchea", "km", "Khmer"),
  PH: e("Pilipinas", "fil", "Filipino"),
  KZ: e("Qazaqstan", "kk", "Kazakh"),
  UZ: e("O'zbekiston", "uz", "Uzbek"),
  TJ: e("Tojikiston", "tg", "Tajik"),
  GE: e("Sakartvelo", "ka", "Georgian"),
  AM: e("Hayastan", "hy", "Armenian"),
  TR: e("Türkiye", "tr", "Turkish"),

  // ── Arabic-speaking countries ─────────────────────────────────────────────
  EG: e("Misr", "ar", "Arabic"),
  MA: e("Al-Maghrib", "ar", "Arabic"),
  DZ: e("Al-Jaza'ir", "ar", "Arabic"),
  JO: e("Al-Urdun", "ar", "Arabic"),
  LB: e("Lubnan", "ar", "Arabic"),
  YE: e("Al-Yaman", "ar", "Arabic"),

  // ── Africa, the Americas and Oceania ──────────────────────────────────────
  SO: e("Soomaaliya", "so", "Somali"),
  CV: e("Cabo Verde", "pt", "Portuguese"),
  MG: e("Madagasikara", "mg", "Malagasy"),
  BR: e("Brasil", "pt", "Portuguese"),
  HT: e("Ayiti", "ht", "Haitian Creole"),
  NZ: e("Aotearoa", "mi", "Māori"),
  FJ: e("Viti", "fj", "Fijian"),
  PG: e("Papua Niugini", "tpi", "Tok Pisin"),
}

// Spoken Here: the language families. Every language the data names belongs to
// one group, and the group decides its slice's colour. A group is a branch of a
// big family (Romance, Germanic and Slavic of Indo-European; Semitic and Berber
// of Afro-Asiatic; Bantu, Atlantic, Mande and Gur of Niger–Congo) or a whole
// small family (Turkic, Uralic, Dravidian, Austronesian…). Classification as
// Wikipedia's language infoboxes give it, checked against Glottolog; where the
// two differ (Mande, whose place in Niger–Congo is disputed) the family line says so.
//
// GROUPS: id -> [name shown, family it belongs to ('' when the group is a family
//   of its own), colour]. There are more groups than hues anyone can tell
//   apart, so groups share eleven tones (watercolour, from the parchment
//   palette): dark ones that take paper-white labels and light ones that take
//   ink labels. Groups that appear in the same pie get different tones, and a
//   light tone beside a dark one wherever red and green would meet (Romance
//   beside Slavic or Bantu), so neighbours differ in lightness as well as hue;
//   build.mjs checks no pie gives one tone to two groups, and that every tone
//   reads at 4.5:1 with its label. Further slices of one group take steps of
//   the same tone. Colour is never the only signal: the legend names each
//   slice's group, and slices of 8% or more carry their share.
// LANGS: language name as the pie shows it -> group id.

export const GROUPS = {
  romance:      ['Romance', 'Indo-European', '#B4492B'],
  germanic:     ['Germanic', 'Indo-European', '#2E64AD'],
  slavic:       ['Slavic', 'Indo-European', '#7DB866'],
  baltic:       ['Baltic', 'Indo-European', '#7646A6'],
  hellenic:     ['Hellenic', 'Indo-European', '#5DB8B0'],
  albanian:     ['Albanian', 'Indo-European', '#A93A6A'],
  armenian:     ['Armenian', 'Indo-European', '#A93A6A'],
  indoaryan:    ['Indo-Aryan', 'Indo-European', '#D9A23A'],
  iranian:      ['Iranian', 'Indo-European', '#5DB8B0'],
  semitic:      ['Semitic', 'Afro-Asiatic', '#D9A23A'],
  cushitic:     ['Cushitic', 'Afro-Asiatic', '#2E64AD'],
  berber:       ['Berber', 'Afro-Asiatic', '#5DB8B0'],
  bantu:        ['Bantu', 'Niger–Congo', '#7DB866'],
  atlantic:     ['Atlantic', 'Niger–Congo', '#2E64AD'],
  mande:        ['Mande', 'Niger–Congo (disputed)', '#D9A23A'],
  gur:          ['Gur', 'Niger–Congo', '#A93A6A'],
  sinitic:      ['Sinitic', 'Sino-Tibetan', '#A23E36'],
  tibetoburman: ['Tibeto-Burman', 'Sino-Tibetan', '#7646A6'],
  turkic:       ['Turkic', '', '#7646A6'],
  uralic:       ['Uralic', '', '#087272'],
  kartvelian:   ['Kartvelian', '', '#D9A23A'],
  dravidian:    ['Dravidian', '', '#5DB8B0'],
  austronesian: ['Austronesian', '', '#5DB8B0'],
  austroasiatic:['Austroasiatic', '', '#D9A23A'],
  kradai:       ['Kra–Dai', '', '#A93A6A'],
  mongolic:     ['Mongolic', '', '#5DB8B0'],
  caucasian:    ['Northeast Caucasian', '', '#087272'],
  mayan:        ['Mayan', '', '#5DB8B0'],
  quechuan:     ['Quechuan', '', '#7646A6'],
  aymaran:      ['Aymaran', '', '#E08DB0'],
  tupian:       ['Tupian', '', '#7DB866'],
  arawakan:     ['Arawakan', '', '#D9A23A'],
  khoe:         ['Khoe–Kwadi', '', '#7646A6'],
  papuan:       ['Trans–New Guinea', '', '#7646A6'],
  indigenous:   ['Indigenous American', 'several families', '#087272'],
  creole:       ['Creole', '', '#E08DB0'],
  nuristani:    ['Nuristani', 'Indo-European', '#7646A6'],
  isolate:      ['Language isolate', '', '#3E4E5E'],
  two:          ['Two languages', 'people who use both', '#6E5F48'],
  other:        ['Other', '', '#ADA493'],
}

export const LANGS = {
  // Romance
  Spanish: 'romance', Portuguese: 'romance', French: 'romance', Italian: 'romance', Romanian: 'romance',
  Catalan: 'romance', Galician: 'romance', Romansh: 'romance',
  // Germanic
  English: 'germanic', German: 'germanic', Dutch: 'germanic', Swedish: 'germanic', Frisian: 'germanic',
  Luxembourgish: 'germanic', Afrikaans: 'germanic', Yiddish: 'germanic',
  // Slavic
  Russian: 'slavic', Ukrainian: 'slavic', Belarusian: 'slavic', Polish: 'slavic', Czech: 'slavic', Slovak: 'slavic',
  Bulgarian: 'slavic', Macedonian: 'slavic', Serbian: 'slavic', Croatian: 'slavic', Bosnian: 'slavic',
  Montenegrin: 'slavic', 'Serbo-Croatian': 'slavic', Slovene: 'slavic', Silesian: 'slavic',
  // Baltic, Hellenic, Albanian, Armenian
  Lithuanian: 'baltic', Latvian: 'baltic',
  Greek: 'hellenic',
  Albanian: 'albanian',
  Armenian: 'armenian',
  // Indo-Aryan
  Hindi: 'indoaryan', Bengali: 'indoaryan', Marathi: 'indoaryan', Gujarati: 'indoaryan', Urdu: 'indoaryan',
  Odia: 'indoaryan', Punjabi: 'indoaryan', Assamese: 'indoaryan', Maithili: 'indoaryan', Nepali: 'indoaryan',
  Bhojpuri: 'indoaryan', Tharu: 'indoaryan', Bajjika: 'indoaryan', Awadhi: 'indoaryan', Doteli: 'indoaryan',
  Sindhi: 'indoaryan', Saraiki: 'indoaryan', Hindko: 'indoaryan', Sinhala: 'indoaryan', Romani: 'indoaryan',
  Pashayi: 'indoaryan', Nuristani: 'nuristani', Mewati: 'indoaryan',
  // Iranian
  Dari: 'iranian', Pashto: 'iranian', Tajik: 'iranian', Kurdish: 'iranian', Zazaki: 'iranian', Balochi: 'iranian',
  Ossetian: 'iranian', Yazidi: 'iranian',
  // Afro-Asiatic
  Arabic: 'semitic', Hebrew: 'semitic', Amharic: 'semitic', Tigrinya: 'semitic', Maltese: 'semitic', Gurage: 'semitic',
  "Silt'e": 'semitic',
  Oromo: 'cushitic', Somali: 'cushitic', Sidamo: 'cushitic', Afar: 'cushitic', Hadiyya: 'cushitic',
  Tashelhit: 'berber', 'Central Atlas Tamazight': 'berber', Tarifit: 'berber',
  // Niger–Congo: Bantu
  Umbundu: 'bantu', Kikongo: 'bantu', Kimbundu: 'bantu', Chokwe: 'bantu', Nyaneka: 'bantu', Ngangela: 'bantu',
  Kwanyama: 'bantu', Luvale: 'bantu', Kalanga: 'bantu', Kgalagadi: 'bantu', Shona: 'bantu',
  Mbukushu: 'bantu', Ndebele: 'bantu', Comorian: 'bantu', Makhuwa: 'bantu', Tsonga: 'bantu', Nyanja: 'bantu',
  Sena: 'bantu', Lomwe: 'bantu', Chuwabo: 'bantu', Ndau: 'bantu', Tswa: 'bantu', Oshiwambo: 'bantu',
  Otjiherero: 'bantu', Rukwangali: 'bantu', Kinyarwanda: 'bantu', Zulu: 'bantu', Xhosa: 'bantu',
  Sepedi: 'bantu', Tswana: 'bantu', Sotho: 'bantu', Swati: 'bantu', Venda: 'bantu', Bemba: 'bantu', Tonga: 'bantu',
  Lozi: 'bantu', Chewa: 'bantu', Nsenga: 'bantu', Tumbuka: 'bantu',
  // Niger–Congo: Atlantic, Mande, Gur
  Wolof: 'atlantic', Pulaar: 'atlantic', Fula: 'atlantic', Serer: 'atlantic', Jola: 'atlantic', Balanta: 'atlantic',
  Manjak: 'atlantic', Papel: 'atlantic',
  Mandinka: 'mande', Soninke: 'mande', Dyula: 'mande', Bissa: 'mande', Marka: 'mande', San: 'mande', Bobo: 'mande',
  Mooré: 'gur', Gourmanché: 'gur', Gurunsi: 'gur', Dagara: 'gur', Bwamu: 'gur', Senufo: 'gur', Lobi: 'gur',
  // Sino-Tibetan
  Mandarin: 'sinitic', Cantonese: 'sinitic', 'Taiwanese Hokkien': 'sinitic', Hakka: 'sinitic',
  'Other Chinese': 'sinitic', Chinese: 'sinitic',
  Sharchop: 'tibetoburman', Dzongkha: 'tibetoburman', Tamang: 'tibetoburman', Newar: 'tibetoburman',
  Magar: 'tibetoburman', Limbu: 'tibetoburman', Gurung: 'tibetoburman',
  // Families of their own
  Turkish: 'turkic', Azerbaijani: 'turkic', Kyrgyz: 'turkic', Uzbek: 'turkic', Turkmen: 'turkic', Tatar: 'turkic',
  Gagauz: 'turkic', Karakalpak: 'turkic', Kazakh: 'turkic',
  Hungarian: 'uralic', Finnish: 'uralic', Estonian: 'uralic',
  Georgian: 'kartvelian',
  Tamil: 'dravidian', Telugu: 'dravidian', Kannada: 'dravidian', Malayalam: 'dravidian', Brahui: 'dravidian',
  Tagalog: 'austronesian', Cebuano: 'austronesian', Hiligaynon: 'austronesian', Ilocano: 'austronesian',
  Bikol: 'austronesian', Waray: 'austronesian', Kapampangan: 'austronesian', Malay: 'austronesian',
  Malagasy: 'austronesian', Tetum: 'austronesian', Mambai: 'austronesian', Baikenu: 'austronesian',
  Kemak: 'austronesian', Tokodede: 'austronesian', Marshallese: 'austronesian', Nauruan: 'austronesian',
  Palauan: 'austronesian', Tongan: 'austronesian', Samoan: 'austronesian', Māori: 'austronesian',
  Filipino: 'austronesian', 'Oceanic languages': 'austronesian',
  Khmer: 'austroasiatic', Vietnamese: 'austroasiatic',
  Thai: 'kradai',
  Mongolian: 'mongolic',
  Chechen: 'caucasian',
  "Q'eqchi'": 'mayan', "K'iche'": 'mayan', Mam: 'mayan', Kaqchikel: 'mayan', 'Other Mayan languages': 'mayan', Maya: 'mayan',
  Quechua: 'quechuan', Aymara: 'aymaran', Guarani: 'tupian', 'Asháninka': 'arawakan',
  Khoekhoegowab: 'khoe',
  Makasai: 'papuan', Bunak: 'papuan', Fataluku: 'papuan',
  'Indigenous languages': 'indigenous', 'Other indigenous languages': 'indigenous', Garifuna: 'arawakan',
  // Creoles and pidgins: languages of their own, built on a colonial language
  'Mauritian Creole': 'creole', 'Seychellois Creole': 'creole', Kriol: 'creole', Forro: 'creole',
  'Cape Verdean Creole': 'creole', Angolar: 'creole', 'Belizean Creole': 'creole', Bislama: 'creole',
  // Basque
  Basque: 'isolate',
}

// What each creole is built on, for its family line ("Creole · French-based").
export const CREOLE_BASE = {
  'Mauritian Creole': 'French', 'Seychellois Creole': 'French', Kriol: 'Portuguese', Forro: 'Portuguese',
  'Cape Verdean Creole': 'Portuguese', Angolar: 'Portuguese', 'Belizean Creole': 'English', Bislama: 'English',
}

/** The group of a language name as the data writes it. "Spanish only" is
 *  Spanish's; "Guarani and Spanish" (people who use both) is "two";
 *  "Other…" and "Not stated" are "other". Undefined when the name is unknown. */
export function groupOf(name) {
  if (LANGS[name]) return LANGS[name]
  const only = name.match(/^(.+) only$/)
  if (only) return groupOf(only[1])
  if (/^Other\b|^Not stated$|^No /.test(name)) return 'other'
  if (/ and |^Two languages$/.test(name)) return 'two'
  return undefined
}

/** The family line under a language: "Romance · Indo-European", "Creole · French-based". */
export function familyLine(name) {
  const id = groupOf(name)
  const [group, family] = GROUPS[id]
  if (id === 'creole') return CREOLE_BASE[name] ? `Creole · ${CREOLE_BASE[name]}-based` : 'Creole'
  return family ? `${group} · ${family}` : group
}

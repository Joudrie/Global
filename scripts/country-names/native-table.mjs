// Native Names: what scripts/country-names/fetch.mjs can't work out by rule.
//
// NATIVE_TEXT    the everyday short name where Wikidata's label is the long
//                official one (대한민국 → 한국)
// NATIVE_ROMAN   the common Latin spelling of each name in a script that has
//                no rule-based romaniser here, checked by hand. Each entry
//                repeats the name it spells: if Wikidata's label changes, the
//                fetch script reports it instead of pairing a new name with an
//                old spelling. Systems, simplified to plain letters (no macrons,
//                dots or ʿ marks), unless the entry says otherwise:
//                  Arabic      ALA-LC, with the article as al-, as-, ash-…
//                  Persian, Pashto, Urdu, Bengali, Nepali, Kyrgyz
//                              the country's usual English spelling (all are
//                              spelled like the English, so the game drops them)
//                  Chinese     Hanyu Pinyin, without tone marks
//                  Japanese    modified Hepburn
//                  Hindi, Tamil, Sinhala
//                              ISO 15919, without diacritics
//                  Thai        Royal Thai General System (RTGS)
//                  Khmer       the common spelling (UNGEGN Kâmpŭchéa)
//                  Lao         BGN/PCGN
//                  Burmese     BGN/PCGN
//                  Dzongkha    Roman Dzongkha, as Bhutan writes it
//                  Dhivehi     Malé Latin, the Maldives' official Latin script
//                  Amharic, Tigrinya
//                              BGN/PCGN (1967)
//                  Hebrew      the common Israeli spelling (Yisra'el)
//                  Kazakh      the Kazakh Latin alphabet (2021)
//                  Tajik       the Tajik Latin alphabet
// KEEP_CLOSE     names that fail the "spelled like the English" test but are
//                kept because the owner asked for them by name; each is easy
//                and worth 10. `${code}:${name}`
// LANG_NAMES     English names of the languages the Cities Abroad list lacks.
//
// Left out on purpose (no Latin spelling we are sure of):
//   MA zgh ⵍⵎⵖⵔⵉⴱ  Standard Moroccan Tamazight in Tifinagh: written Lmɣrib
//                   letter for letter, but the usual Latin spelling (Lmeɣrib,
//                   Lmaghrib) varies.

export const NATIVE_TEXT = {
  'KR:ko': '한국',          // Hanguk; the label is 대한민국 (Daehan Minguk, Republic of Korea)
  'KP:ko': '조선',          // Joseon (Chosŏn); the label is the full DPRK name
  'CN:zh': '中国',          // Zhongguo; the label is 中华人民共和国 (People's Republic of China)
  'AE:ar': 'الإمارات',      // al-Imarat; the label is the full "United Arab Emirates"
  'PS:ar': 'فلسطين',        // Filastin; the label is دولة فلسطين (State of Palestine)
}

const t = (text, roman) => ({ text, roman })
export const NATIVE_ROMAN = {
  // Arabic (ALA-LC, simplified)
  'DZ:ar': t('الجزائر', 'al-Jazair'),
  'BH:ar': t('البحرين', 'al-Bahrayn'),
  'KM:ar': t('جزر القمر', 'Juzur al-Qamar'),
  'DJ:ar': t('جيبوتي', 'Jibuti'),
  'EG:ar': t('مصر', 'Misr'),
  'ER:ar': t('إرتريا', 'Iritriya'),
  'IQ:ar': t('العراق', 'al-Iraq'),
  'JO:ar': t('الأردن', 'al-Urdun'),
  'KW:ar': t('الكويت', 'al-Kuwayt'),
  'LB:ar': t('لبنان', 'Lubnan'),
  'LY:ar': t('ليبيا', 'Libya'),
  'MR:ar': t('موريتانيا', 'Muritaniya'),
  'MA:ar': t('المغرب', 'al-Maghrib'),
  'OM:ar': t('سلطنة عمان', 'Saltanat Uman'),
  'PS:ar': t('فلسطين', 'Filastin'),
  'QA:ar': t('قطر', 'Qatar'),
  'SA:ar': t('السعودية', 'as-Saudiyya'),
  'SO:ar': t('الصومال', 'as-Sumal'),
  'SD:ar': t('السودان', 'as-Sudan'),
  'SY:ar': t('سوريا', 'Suriya'),
  'TD:ar': t('تشاد', 'Tshad'),
  'TN:ar': t('تونس', 'Tunis'),
  'AE:ar': t('الإمارات', 'al-Imarat'),
  'YE:ar': t('اليمن', 'al-Yaman'),
  // Persian, Pashto, Urdu, Bengali, Nepali, Kyrgyz: spelled like the English
  'AF:fa': t('افغانستان', 'Afghanistan'),
  'AF:ps': t('افغانستان', 'Afghanistan'),
  'IR:fa': t('ایران', 'Iran'),
  'PK:ur': t('پاکستان', 'Pakistan'),
  'BD:bn': t('বাংলাদেশ', 'Bangladesh'),
  'NP:ne': t('नेपाल', 'Nepal'),
  'KG:ky': t('Кыргызстан', 'Kyrgyzstan'),
  // Chinese (Hanyu Pinyin)
  'CN:zh': t('中国', 'Zhongguo'),
  'TW:zh': t('中華民國', 'Zhonghua Minguo'),
  'SG:zh': t('新加坡', 'Xinjiapo'),
  // Japanese (Hepburn)
  'JP:ja': t('日本', 'Nihon'),
  // Hindi, Tamil, Sinhala (ISO 15919, plain letters)
  'IN:hi': t('भारत', 'Bharat'),
  'LK:ta': t('இலங்கை', 'Ilangai'),
  'SG:ta': t('சிங்கப்பூர்', 'Singappur'),
  'LK:si': t('ශ්රී ලංකාව', 'Shri Lankava'),
  // Thai (RTGS), Khmer, Lao, Burmese
  'TH:th': t('ประเทศไทย', 'Prathet Thai'),
  'KH:km': t('កម្ពុជា', 'Kampuchea'),
  'LA:lo': t('ປະເທດລາວ', 'Pathet Lao'),
  'MM:my': t('မြန်မာ', 'Myanma'),
  // Dzongkha, Dhivehi
  'BT:dz': t('འབྲུག་ཡུལ་', 'Druk Yul'),
  'MV:dv': t('ދިވެހިރާއްޖެ', 'Dhivehi Raajje'),
  // Amharic, Tigrinya (BGN/PCGN)
  'ET:am': t('ኢትዮጵያ', "Ityop'iya"),
  'ER:ti': t('ኤርትራ', 'Ertra'),
  // Hebrew
  'IL:he': t('ישראל', "Yisra'el"),
  // Kazakh and Tajik Latin alphabets
  'KZ:kk': t('Қазақстан', 'Qazaqstan'),
  'TJ:tg': t('Тоҷикистон', 'Tojikiston'),
}

export const KEEP_CLOSE = new Set([
  'LV:Latvija',     // one letter from Latvia
  'BE:België',      // Belgi- with a short ending, like Italia
  'BE:Belgique',    // two letters from Belgium
  'MN:Монгол Улс',  // Mongol Uls: "Mongol" is nearly Mongolia
  'IL:ישראל',       // Yisra'el: one letter from Israel
])

export const LANG_NAMES = {
  en: 'English', ar: 'Arabic', he: 'Hebrew', hi: 'Hindi', zh: 'Chinese', th: 'Thai', km: 'Khmer', lo: 'Lao', my: 'Burmese',
  dz: 'Dzongkha', dv: 'Dhivehi', am: 'Amharic', ti: 'Tigrinya', so: 'Somali', ta: 'Tamil', si: 'Sinhala', kk: 'Kazakh',
  ky: 'Kyrgyz', tg: 'Tajik', mn: 'Mongolian', fa: 'Persian', ps: 'Pashto', ur: 'Urdu', bn: 'Bengali', ne: 'Nepali',
  ht: 'Haitian Creole', tl: 'Filipino', cnr: 'Montenegrin', rm: 'Romansh', sg: 'Sango', tpi: 'Tok Pisin', fj: 'Fijian',
  na: 'Nauruan', mh: 'Marshallese', qu: 'Quechua', ay: 'Aymara', gn: 'Guarani', ha: 'Hausa', st: 'Sesotho', tn: 'Tswana',
  ts: 'Tsonga', ve: 'Venda', ss: 'Swazi', nr: 'Southern Ndebele', nso: 'Northern Sotho', la: 'Latin', mos: 'Mooré',
  kea: 'Cape Verdean Creole', rn: 'Kirundi', rw: 'Kinyarwanda', mg: 'Malagasy', ny: 'Chichewa', tum: 'Tumbuka',
  bm: 'Bambara', ff: 'Fula', wo: 'Wolof', sn: 'Shona', gil: 'Gilbertese', sm: 'Samoan', to: 'Tongan', bi: 'Bislama',
  hif: 'Fiji Hindi', qug: 'Kichwa', nah: 'Nahuatl', ku: 'Kurdish', tk: 'Turkmen', tet: 'Tetum', ja: 'Japanese', ko: 'Korean',
}

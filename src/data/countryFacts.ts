// Hand-checked country facts for the Connections puzzles (and anything else
// that needs them). Codes are the ISO alpha-2 codes used in FLAGS.
//
// Every fact has `yes` (clearly true) and optional `maybe` (true by some
// definitions, partly true, disputed or recently changed). A puzzle group may
// only use `yes` countries as members, and no other country on the same board
// may be `yes` OR `maybe` for that group's rule, so a player with a fair
// argument is never marked wrong. When unsure, a country goes in `maybe`.
//
// Deliberately NOT derived from FLAG_ATTRIBS: its `crescent` and `cross`
// flags are loose (it marks Saudi Arabia, Kazakhstan, Afghanistan and Brunei
// as crescent flags, for example).

export interface Fact { yes: string[]; maybe?: string[] }

export const FACTS = {
  // ── Geography ─────────────────────────────────────────────────────────────
  // 44 landlocked UN members + Kosovo. The three Caspian countries are
  // landlocked by the usual count, but the Caspian is sometimes called a sea.
  landlocked: {
    yes: [
      'AD', 'AT', 'BY', 'CZ', 'HU', 'LI', 'LU', 'MK', 'MD', 'SM', 'RS', 'SK', 'CH', 'VA', 'XK',
      'AF', 'AM', 'BT', 'KG', 'LA', 'MN', 'NP', 'TJ', 'UZ',
      'BW', 'BF', 'BI', 'CF', 'TD', 'SZ', 'ET', 'LS', 'MW', 'ML', 'NE', 'RW', 'SS', 'UG', 'ZM', 'ZW',
      'BO', 'PY',
    ],
    maybe: ['AZ', 'KZ', 'TM'],
  },
  // Landlocked, and every neighbour is landlocked too.
  doublyLandlocked: { yes: ['LI', 'UZ'] },
  // Whole territory on islands. Countries that share an island with a
  // neighbour are `maybe` (people argue about "island nation" for them).
  island: {
    yes: [
      'IS', 'MT', 'CY', 'JP', 'PH', 'LK', 'MV', 'SG', 'TW', 'BH', 'CU', 'JM', 'TT', 'BB', 'LC', 'AG',
      'DM', 'GD', 'KN', 'VC', 'BS', 'NZ', 'FJ', 'MG', 'MU', 'SC', 'CV', 'ST', 'KM', 'KI', 'TV', 'NR',
      'PW', 'FM', 'MH', 'WS', 'TO', 'SB', 'VU',
    ],
    maybe: ['GB', 'IE', 'HT', 'DO', 'TL', 'PG', 'ID', 'BN', 'AU'],
  },
  // The Equator crosses their land.
  equator: {
    yes: ['EC', 'CO', 'BR', 'ST', 'GA', 'CG', 'CD', 'UG', 'KE', 'SO', 'ID', 'KI'],
    maybe: ['MV'], // passes through its waters, between atolls (it also misses Equatorial Guinea's land)
  },
  // The river's main stream flows through or along them.
  nile: { yes: ['EG', 'SD', 'SS', 'UG', 'ET'], maybe: ['RW', 'BI', 'TZ', 'KE', 'CD', 'ER'] },
  danube: { yes: ['DE', 'AT', 'SK', 'HU', 'HR', 'RS', 'RO', 'BG', 'MD', 'UA'] },
  mekong: { yes: ['CN', 'MM', 'LA', 'TH', 'KH', 'VN'] },
  rhine: { yes: ['CH', 'LI', 'AT', 'DE', 'FR', 'NL'] },
  amazon: { yes: ['PE', 'CO', 'BR'], maybe: ['BO', 'EC', 'VE', 'GY', 'SR'] },
  // Coast on the Caspian Sea.
  caspian: { yes: ['RU', 'KZ', 'TM', 'IR', 'AZ'] },
  // Coast on the Mediterranean.
  mediterranean: {
    yes: ['ES', 'FR', 'MC', 'IT', 'SI', 'HR', 'BA', 'ME', 'AL', 'GR', 'TR', 'CY', 'SY', 'LB', 'IL', 'PS', 'EG', 'LY', 'TN', 'DZ', 'MA', 'MT'],
    maybe: ['GB'], // Gibraltar, Akrotiri
  },

  // Mountain ranges that run through them.
  alps: { yes: ['FR', 'IT', 'CH', 'AT', 'DE', 'LI', 'SI'], maybe: ['MC'] },
  andes: { yes: ['VE', 'CO', 'EC', 'PE', 'BO', 'CL', 'AR'] },
  himalaya: { yes: ['NP', 'BT', 'IN', 'CN', 'PK'], maybe: ['MM', 'AF'] },
  // The tropic line crosses their land.
  tropicCancer: { yes: ['MX', 'BS', 'MR', 'ML', 'DZ', 'NE', 'LY', 'EG', 'SA', 'AE', 'OM', 'IN', 'BD', 'MM', 'CN', 'TW'] },
  tropicCapricorn: { yes: ['CL', 'AR', 'PY', 'BR', 'NA', 'BW', 'ZA', 'MZ', 'MG', 'AU'], maybe: ['TO'] },

  // ── History ───────────────────────────────────────────────────────────────
  soviet: { yes: ['RU', 'UA', 'BY', 'MD', 'EE', 'LV', 'LT', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ'] },
  yugoslavia: { yes: ['SI', 'HR', 'BA', 'RS', 'ME', 'MK', 'XK'] },
  // Warsaw Pact members that were not Soviet republics.
  warsawPact: { yes: ['PL', 'HU', 'RO', 'BG'], maybe: ['CZ', 'SK', 'AL', 'DE'] },
  // Portuguese colonies that are countries today.
  exPortuguese: { yes: ['BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'], maybe: ['IN', 'LK', 'MY', 'OM', 'BH', 'MA', 'GH', 'UY'] },
  // Spanish colonies that are countries today.
  exSpanish: {
    yes: ['MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'CO', 'VE', 'EC', 'PE', 'BO', 'CL', 'AR', 'PY', 'UY', 'GQ', 'PH'],
    maybe: ['US', 'MA', 'JM', 'TT', 'HT', 'BZ', 'FM', 'PW', 'MH'],
  },

  // ── Politics and money ────────────────────────────────────────────────────
  eu: { yes: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'] },
  nato: { yes: ['AL', 'BE', 'BG', 'CA', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IT', 'LV', 'LT', 'LU', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'TR', 'GB', 'US'] },
  // The euro is the currency (in or out of the EU).
  euro: {
    yes: ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'SM', 'VA', 'XK', 'ME', 'BG'],
  },
  // The US dollar is the official currency.
  usDollar: { yes: ['US', 'EC', 'SV', 'PA', 'TL', 'FM', 'MH', 'PW'], maybe: ['ZW', 'KH', 'LR', 'BS'] },
  // Commonwealth of Nations, all 56 members.
  commonwealth: {
    yes: [
      'AG', 'AU', 'BS', 'BD', 'BB', 'BZ', 'BW', 'BN', 'CM', 'CA', 'CY', 'DM', 'SZ', 'FJ', 'GA', 'GM', 'GH', 'GD', 'GY',
      'IN', 'JM', 'KE', 'KI', 'LS', 'MW', 'MY', 'MV', 'MT', 'MU', 'MZ', 'NA', 'NR', 'NZ', 'NG', 'PK', 'PG', 'RW', 'KN',
      'LC', 'VC', 'WS', 'SC', 'SL', 'SG', 'SB', 'ZA', 'LK', 'TZ', 'TG', 'TO', 'TT', 'TV', 'UG', 'GB', 'VU', 'ZM',
    ],
  },
  // A monarch is head of state (including the 15 Commonwealth realms).
  monarchy: {
    yes: [
      'GB', 'AU', 'NZ', 'CA', 'JM', 'BS', 'BZ', 'AG', 'GD', 'KN', 'LC', 'VC', 'PG', 'SB', 'TV',
      'ES', 'NL', 'BE', 'LU', 'LI', 'MC', 'DK', 'NO', 'SE', 'AD', 'VA',
      'JP', 'TH', 'KH', 'BT', 'MY', 'BN', 'SA', 'JO', 'KW', 'QA', 'BH', 'AE', 'OM', 'MA', 'LS', 'SZ', 'TO',
    ],
  },
  // King Charles III is head of state (the 15 Commonwealth realms).
  realm: { yes: ['GB', 'AU', 'NZ', 'CA', 'JM', 'BS', 'BZ', 'AG', 'GD', 'KN', 'LC', 'VC', 'PG', 'SB', 'TV'] },
  // A monarch of their own (the monarchies that are not other countries' realms).
  ownMonarch: {
    yes: [
      'GB', 'ES', 'NL', 'BE', 'LU', 'LI', 'MC', 'DK', 'NO', 'SE', 'AD', 'VA',
      'JP', 'TH', 'KH', 'BT', 'MY', 'BN', 'SA', 'JO', 'KW', 'QA', 'BH', 'AE', 'OM', 'MA', 'LS', 'SZ', 'TO',
    ],
  },
  // One-party communist states today.
  communist: { yes: ['CN', 'VN', 'LA', 'CU', 'KP'] },
  // Have tested or openly hold nuclear weapons.
  nuclear: { yes: ['US', 'RU', 'GB', 'FR', 'CN', 'IN', 'PK', 'KP'], maybe: ['IL'] },
  // Permanent members of the UN Security Council.
  unscP5: { yes: ['US', 'RU', 'GB', 'FR', 'CN'] },
  g20: { yes: ['AR', 'AU', 'BR', 'CA', 'CN', 'FR', 'DE', 'IN', 'ID', 'IT', 'JP', 'KR', 'MX', 'RU', 'SA', 'ZA', 'TR', 'GB', 'US'] },
  // OPEC members (Angola left in 2024).
  opec: { yes: ['DZ', 'CG', 'GQ', 'GA', 'IR', 'IQ', 'KW', 'LY', 'NG', 'SA', 'AE', 'VE'], maybe: ['AO', 'EC', 'QA', 'ID'] },
  // Drive on the left.
  driveLeft: {
    yes: [
      'GB', 'IE', 'MT', 'CY', 'JP', 'IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV', 'TH', 'MY', 'SG', 'BN', 'ID', 'TL',
      'PG', 'AU', 'NZ', 'FJ', 'SB', 'TO', 'WS', 'TV', 'KI', 'NR', 'KE', 'UG', 'TZ', 'ZM', 'ZW', 'MW', 'MZ', 'BW',
      'NA', 'ZA', 'LS', 'SZ', 'MU', 'SC', 'JM', 'BS', 'BB', 'TT', 'GY', 'SR', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC',
    ],
  },

  // ── Sport ─────────────────────────────────────────────────────────────────
  summerOlympics: { yes: ['GR', 'FR', 'US', 'GB', 'SE', 'BE', 'NL', 'DE', 'FI', 'AU', 'IT', 'JP', 'MX', 'CA', 'RU', 'KR', 'ES', 'CN', 'BR'] },
  // Hosted (or co-hosted) the men's FIFA World Cup, up to and including 2026.
  worldCupHost: { yes: ['UY', 'IT', 'FR', 'BR', 'CH', 'SE', 'CL', 'MX', 'DE', 'AR', 'ES', 'US', 'JP', 'KR', 'ZA', 'QA', 'RU', 'CA'], maybe: ['GB'] },
  worldCupWinner: { yes: ['BR', 'DE', 'IT', 'AR', 'FR', 'UY', 'ES'], maybe: ['GB'] },

  // ── Flags ─────────────────────────────────────────────────────────────────
  // A plain crescent moon is part of the flag's design.
  flagCrescent: {
    yes: ['TR', 'TN', 'DZ', 'PK', 'MY', 'MV', 'AZ', 'MR', 'LY', 'KM', 'TM', 'UZ', 'SG'],
    maybe: ['BN', 'NP', 'MN', 'IR'], // inside a crest, a stylised moon, or a symbol read as crescents
  },
  // A cross (Nordic, Greek, St George's, a cross in the Union Jack...).
  flagCross: {
    yes: ['DK', 'NO', 'SE', 'FI', 'IS', 'CH', 'GB', 'GR', 'GE', 'TO', 'DO', 'AU', 'NZ', 'FJ', 'TV', 'DM', 'SK'],
    maybe: ['JM', 'BI', 'MT', 'MD', 'RS', 'ME', 'AD', 'VA', 'SM', 'HR', 'PT', 'ES', 'LI', 'EC', 'BO'],
  },
  nordicCross: { yes: ['DK', 'NO', 'SE', 'FI', 'IS'] },
  // Carries the Union Jack.
  unionJack: { yes: ['GB', 'AU', 'NZ', 'FJ', 'TV'] },
  // Three vertical bands (a pale), with or without an emblem.
  verticalTricolour: {
    yes: ['FR', 'IT', 'IE', 'BE', 'RO', 'AD', 'MD', 'TD', 'ML', 'GN', 'CI', 'NG', 'SN', 'CM', 'MX', 'PE', 'GT', 'MN', 'BB', 'VC'],
    maybe: ['CA', 'AF'],
  },
  // Exactly two colours.
  twoColours: {
    yes: [
      'JP', 'CA', 'CH', 'DK', 'PL', 'ID', 'MC', 'AT', 'LV', 'PE', 'TR', 'TN', 'GE', 'BH', 'QA', 'SG', 'MA', 'VN',
      'CN', 'UA', 'SE', 'FI', 'GR', 'IL', 'SO', 'PK', 'SA', 'AL', 'NG', 'BD', 'PW', 'TO', 'MK', 'KG', 'HN', 'KZ', 'FM',
    ],
    maybe: ['MT', 'NI', 'VA', 'SV', 'CY', 'LB', 'AF'],
  },
  // An animal (or bird) appears on the flag.
  flagAnimal: {
    yes: ['AL', 'MX', 'EG', 'ZM', 'ZW', 'UG', 'PG', 'KI', 'DM', 'BT', 'LK', 'ME', 'RS', 'MD', 'KZ', 'EC', 'GT', 'FJ'],
    maybe: ['AD', 'ES', 'BO', 'VE', 'PE', 'HR', 'VU', 'SV', 'NI', 'CR', 'AF'],
  },
  // A weapon appears on the flag.
  flagWeapon: {
    yes: ['KE', 'SZ', 'MZ', 'AO', 'SA', 'OM', 'LK', 'GT', 'HT'],
    maybe: ['BB', 'EC', 'BO', 'AF', 'DO', 'ME', 'VE', 'MX', 'BT', 'PT', 'ES', 'SV', 'NI', 'ZW', 'FJ'],
  },
  // A sun appears on the flag (including a plain disc that stands for the sun).
  flagSun: {
    yes: ['AR', 'UY', 'KZ', 'KG', 'MK', 'NE', 'JP', 'BD', 'TW', 'PH', 'AG', 'RW', 'MW', 'KI', 'NP', 'NA'],
    maybe: ['MN', 'EC', 'BO', 'PE', 'SV', 'NI', 'CR', 'PW', 'LA', 'MH', 'TJ', 'UZ'],
  },
  // A map of the country is on the flag.
  flagMap: { yes: ['CY', 'XK'] },
  // A plant, leaf, tree or branch is on the flag.
  flagPlant: {
    yes: ['CA', 'LB', 'CY', 'ER', 'BZ', 'GQ', 'HT', 'GD', 'MX', 'FJ', 'LK', 'VU', 'TM', 'GT'],
    maybe: ['SV', 'EC', 'BO', 'PE', 'VE', 'AF', 'PY', 'SM', 'MD', 'CR', 'DM', 'IR', 'NI', 'ME', 'ZM'],
  },

  // ── Capitals ──────────────────────────────────────────────────────────────
  // The capital is named after (or is) the country.
  capitalSameName: { yes: ['MX', 'GT', 'PA', 'KW', 'SG', 'MC', 'VA', 'SM', 'LU', 'DJ', 'AD', 'ST', 'GW'], maybe: ['BR', 'TN', 'DZ', 'SV'] },
  // The capital is not the country's biggest city.
  capitalNotLargest: {
    yes: ['US', 'CA', 'AU', 'NZ', 'BR', 'TR', 'CH', 'NG', 'PK', 'CN', 'VN', 'MA', 'TZ', 'CI', 'BO', 'KZ', 'MM', 'LK', 'BZ', 'MT', 'AE', 'BJ', 'BI', 'GM', 'LI', 'SM'],
    maybe: ['IN', 'EC', 'ZA', 'IL', 'CM', 'SY', 'MW', 'PH', 'SZ', 'OM', 'PS', 'NL', 'MH', 'KI', 'PW', 'FM', 'TW', 'TT', 'YE', 'KW'],
  },
  // The capital is named after a person.
  capitalAfterPerson: {
    yes: ['US', 'LR', 'NZ', 'CG', 'SC', 'GY', 'MU', 'MT'],
    maybe: ['BS', 'VC', 'JM', 'GR', 'IT', 'KN', 'AG', 'GD', 'LC', 'DM', 'ST', 'CL', 'AR', 'PY', 'CR', 'SV', 'DO', 'KZ', 'PH', 'ZW'],
  },
} satisfies Record<string, Fact>

export type FactId = keyof typeof FACTS

// Official (or co-official national) languages. `maybe` = national/working
// status, widely used without legal status, or recently changed.
export const OFFICIAL: Record<string, Fact> = {
  en: {
    yes: [
      'GB', 'US', 'CA', 'AU', 'NZ', 'IE', 'MT', 'IN', 'PK', 'PH', 'SG', 'NG', 'GH', 'KE', 'UG', 'TZ', 'ZM', 'ZW', 'MW',
      'BW', 'NA', 'ZA', 'LS', 'SZ', 'SL', 'LR', 'GM', 'CM', 'RW', 'BI', 'SS', 'SC', 'JM', 'BS', 'BB', 'TT', 'GY', 'BZ',
      'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'FJ', 'PG', 'SB', 'VU', 'WS', 'TO', 'TV', 'KI', 'NR', 'MH', 'PW', 'FM',
    ],
    maybe: ['SD', 'ER', 'ET', 'MU', 'BD', 'LK', 'MY', 'BN', 'CY', 'NE', 'IL'],
  },
  fr: {
    yes: [
      'FR', 'BE', 'CH', 'LU', 'MC', 'CA', 'HT', 'SN', 'CI', 'GN', 'BJ', 'TG', 'CM', 'TD', 'CF', 'CG', 'CD', 'GA', 'GQ',
      'DJ', 'KM', 'MG', 'SC', 'RW', 'BI', 'VU',
    ],
    maybe: ['ML', 'BF', 'NE', 'MA', 'TN', 'DZ', 'LB', 'MR', 'MU', 'AD'],
  },
  es: {
    yes: ['ES', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'CO', 'VE', 'EC', 'PE', 'BO', 'CL', 'AR', 'PY', 'UY', 'GQ'],
    maybe: ['BZ', 'AD', 'PH', 'US'],
  },
  pt: { yes: ['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL', 'GQ'] },
  ar: {
    yes: ['SA', 'AE', 'QA', 'BH', 'KW', 'OM', 'YE', 'IQ', 'SY', 'JO', 'LB', 'PS', 'EG', 'LY', 'TN', 'DZ', 'MA', 'MR', 'SD', 'SO', 'DJ', 'KM', 'TD'],
    maybe: ['ER', 'IL'],
  },
  de: { yes: ['DE', 'AT', 'CH', 'LI', 'LU', 'BE'], maybe: ['IT', 'NA'] },
  it: { yes: ['IT', 'SM', 'VA', 'CH'], maybe: ['SI', 'HR'] },
  ru: { yes: ['RU', 'BY', 'KZ', 'KG'], maybe: ['TJ', 'MD', 'UA'] },
  nl: { yes: ['NL', 'BE', 'SR'] },
  sw: { yes: ['KE', 'TZ', 'UG', 'RW'], maybe: ['CD'] },
}

// Border pairs that are true only through an overseas territory, an exclave
// or a disputed area. The border graph leaves them out; a "borders X" rule
// treats them as `maybe`.
export const DISPUTED_BORDERS: [string, string][] = [
  ['ES', 'MA'], ['GB', 'ES'], ['GB', 'CY'], ['FR', 'BR'], ['FR', 'SR'], ['FR', 'NL'],
  ['IN', 'AF'], ['MA', 'MR'], ['CY', 'TR'],
]

// Capitals that are split or often confused. The first one is the official
// seat used by capitals.ts; a capital rule is `maybe` if any of them matches.
export const OTHER_CAPITALS: Record<string, string[]> = {
  BO: ['La Paz'], CI: ['Abidjan'], LK: ['Colombo'], SZ: ['Lobamba'], BJ: ['Cotonou'], NL: ['The Hague'],
  MY: ['Putrajaya'], ZA: ['Cape Town', 'Bloemfontein'], TZ: ['Dar es Salaam'], IL: ['Tel Aviv'],
  PS: ['East Jerusalem', 'Gaza'], MM: ['Yangon'], YE: ['Aden'], KZ: ['Almaty'], PW: ['Melekeok', 'Koror'],
  NG: ['Lagos'], BI: ['Bujumbura'], TR: ['Istanbul'], PK: ['Karachi'], AU: ['Sydney'], CA: ['Toronto'],
  BR: ['Rio de Janeiro'], KI: ['Tarawa'], CH: ['Zurich', 'Geneva'], NZ: ['Auckland'], US: ['New York'],
}

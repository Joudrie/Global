// Structural attributes used by the Flag DNA game.
// colors:   dominant colors visible on the flag
// stripes:  flag uses horizontal colour bands (triband, etc.)
// cross:    flag has any type of cross symbol
// star:     flag has one or more stars
// crescent: flag has a crescent moon
// emblem:   flag has a coat of arms / complex central symbol
export interface FlagAttribs {
  colors: string[]
  stripes: boolean
  cross: boolean
  star: boolean
  crescent: boolean
  emblem: boolean
}

// Countries whose flags use VERTICAL stripes/bands (not horizontal)
export const STRIPES_V = new Set([
  'FR','IE','IT','BE','RO','NG','ML','SN','GN','CI','CM','TD','BJ','GW',
  'GA','CG','CD','AO','MZ','BI','DJ','EG',
  'CA','MX','CO','VE','EC','PE','GT','CR',
  'IN','AF','TJ','GE',
  'AD','MC',
])

const a = (
  colors: string[],
  stripes: boolean,
  cross: boolean,
  star: boolean,
  crescent: boolean,
  emblem: boolean,
): FlagAttribs => ({ colors, stripes, cross, star, crescent, emblem })

// keyed by ISO 3166-1 alpha-2 country code
export const FLAG_ATTRIBS: Record<string, FlagAttribs> = {
  // ── Europe ──────────────────────────────────────────────────────────────────
  AL: a(['red','black'],               false, false, false, false, true  ), // Albania
  AD: a(['blue','yellow','red'],       false, false, false, false, true  ), // Andorra
  AT: a(['red','white'],               true,  false, false, false, false ), // Austria
  BY: a(['red','green','white'],       true,  false, false, false, false ), // Belarus
  BE: a(['black','yellow','red'],      false, false, false, false, false ), // Belgium
  BA: a(['blue','yellow','white'],     false, false, true,  false, false ), // Bosnia
  BG: a(['white','green','red'],       true,  false, false, false, false ), // Bulgaria
  HR: a(['red','white','blue'],        true,  false, false, false, true  ), // Croatia
  CY: a(['white','orange'],            false, false, false, false, true  ), // Cyprus
  CZ: a(['white','red','blue'],        false, false, false, false, false ), // Czech Republic
  DK: a(['red','white'],               false, true,  false, false, false ), // Denmark
  EE: a(['blue','black','white'],      true,  false, false, false, false ), // Estonia
  FI: a(['white','blue'],              false, true,  false, false, false ), // Finland
  FR: a(['blue','white','red'],        false, false, false, false, false ), // France
  DE: a(['black','red','yellow'],      true,  false, false, false, false ), // Germany
  GR: a(['blue','white'],              true,  true,  false, false, false ), // Greece
  HU: a(['red','white','green'],       true,  false, false, false, false ), // Hungary
  IS: a(['blue','red','white'],        false, true,  false, false, false ), // Iceland
  IE: a(['green','white','orange'],    false, false, false, false, false ), // Ireland
  IT: a(['green','white','red'],       false, false, false, false, false ), // Italy
  XK: a(['blue','yellow','white'],     false, false, true,  false, true  ), // Kosovo
  LV: a(['red','white'],               true,  false, false, false, false ), // Latvia
  LI: a(['blue','red','yellow'],       true,  false, false, false, false ), // Liechtenstein
  LT: a(['yellow','green','red'],      true,  false, false, false, false ), // Lithuania
  LU: a(['red','white','blue'],        true,  false, false, false, false ), // Luxembourg
  MT: a(['white','red'],               false, true,  false, false, false ), // Malta
  MD: a(['blue','yellow','red'],       false, false, false, false, true  ), // Moldova
  MC: a(['red','white'],               true,  false, false, false, false ), // Monaco
  ME: a(['red','yellow'],              false, false, false, false, true  ), // Montenegro
  NL: a(['red','white','blue'],        true,  false, false, false, false ), // Netherlands
  MK: a(['red','yellow'],              false, false, true,  false, false ), // North Macedonia (sun)
  NO: a(['red','white','blue'],        false, true,  false, false, false ), // Norway
  PL: a(['white','red'],               true,  false, false, false, false ), // Poland
  PT: a(['green','red','yellow'],      false, false, false, false, true  ), // Portugal
  RO: a(['blue','yellow','red'],       false, false, false, false, false ), // Romania
  RU: a(['white','blue','red'],        true,  false, false, false, false ), // Russia
  SM: a(['blue','white'],              true,  false, false, false, true  ), // San Marino
  RS: a(['red','blue','white'],        true,  false, false, false, true  ), // Serbia
  SK: a(['white','blue','red'],        true,  false, false, false, true  ), // Slovakia
  SI: a(['blue','white','red'],        true,  false, false, false, true  ), // Slovenia
  ES: a(['red','yellow'],              true,  false, false, false, true  ), // Spain
  SE: a(['blue','yellow'],             false, true,  false, false, false ), // Sweden
  CH: a(['red','white'],               false, true,  false, false, false ), // Switzerland
  UA: a(['blue','yellow'],             true,  false, false, false, false ), // Ukraine
  GB: a(['red','white','blue'],        false, true,  false, false, false ), // United Kingdom
  VA: a(['yellow','white'],            false, false, false, false, true  ), // Vatican

  // ── Americas ─────────────────────────────────────────────────────────────────
  AG: a(['red','black','blue','white','yellow'], false, false, false, false, false ), // Antigua
  AR: a(['blue','white','yellow'],     true,  false, true,  false, false ), // Argentina (sun)
  BS: a(['blue','yellow','black'],     true,  false, false, false, false ), // Bahamas
  BB: a(['blue','yellow'],             false, false, false, false, false ), // Barbados
  BZ: a(['blue','red','white'],        false, false, false, false, true  ), // Belize
  BO: a(['red','yellow','green'],      true,  false, false, false, true  ), // Bolivia
  BR: a(['green','yellow','blue','white'], false, false, true,  false, false ), // Brazil
  CA: a(['red','white'],               false, false, false, false, false ), // Canada (maple leaf)
  CL: a(['red','white','blue'],        false, false, true,  false, false ), // Chile
  CO: a(['yellow','blue','red'],       true,  false, false, false, false ), // Colombia
  CR: a(['blue','white','red'],        true,  false, false, false, true  ), // Costa Rica
  CU: a(['blue','white','red'],        true,  false, true,  false, false ), // Cuba
  DM: a(['green','yellow','black','white','red'], false, true, false, false, false ), // Dominica
  DO: a(['blue','red','white'],        false, true,  false, false, true  ), // Dominican Republic
  EC: a(['yellow','blue','red'],       true,  false, false, false, true  ), // Ecuador
  SV: a(['blue','white'],              true,  false, false, false, true  ), // El Salvador
  GD: a(['red','yellow','green'],      false, false, true,  false, false ), // Grenada
  GT: a(['blue','white'],              false, false, false, false, true  ), // Guatemala
  GY: a(['green','yellow','white','red','black'], false, false, false, false, false ), // Guyana
  HT: a(['blue','red'],                true,  false, false, false, true  ), // Haiti
  HN: a(['blue','white'],              true,  false, true,  false, false ), // Honduras
  JM: a(['black','yellow','green'],    false, true,  false, false, false ), // Jamaica
  MX: a(['green','white','red'],       false, false, false, false, true  ), // Mexico
  NI: a(['blue','white'],              true,  false, false, false, true  ), // Nicaragua
  PA: a(['red','blue','white'],        false, false, true,  false, false ), // Panama
  PY: a(['red','white','blue'],        true,  false, false, false, true  ), // Paraguay
  PE: a(['red','white'],               true,  false, false, false, true  ), // Peru
  KN: a(['green','yellow','black','red','white'], false, false, true, false, false ), // St Kitts
  LC: a(['blue','yellow','black','white'], false, false, false, false, false ), // St Lucia
  VC: a(['green','yellow','blue'],     false, false, false, false, false ), // St Vincent
  SR: a(['green','yellow','white','red'], true, false, true,  false, false ), // Suriname
  TT: a(['red','black','white'],       false, false, false, false, false ), // Trinidad
  US: a(['red','white','blue'],        true,  false, true,  false, false ), // USA
  UY: a(['blue','white','yellow'],     true,  false, true,  false, false ), // Uruguay (sun)
  VE: a(['yellow','blue','red'],       true,  false, true,  false, true  ), // Venezuela

  // ── Middle East ───────────────────────────────────────────────────────────────
  BH: a(['red','white'],               false, false, false, false, false ), // Bahrain
  IR: a(['green','white','red'],       true,  false, false, true,  false ), // Iran
  IQ: a(['red','white','black'],       true,  false, false, false, false ), // Iraq
  IL: a(['blue','white'],              true,  false, true,  false, false ), // Israel (Star of David)
  JO: a(['black','white','green','red'], false, false, true,  false, false ), // Jordan
  KW: a(['green','white','red','black'], true, false, false, false, false ), // Kuwait
  LB: a(['red','white','green'],       true,  false, false, false, false ), // Lebanon
  OM: a(['red','white','green'],       false, false, false, false, true  ), // Oman
  PS: a(['black','white','green','red'], false, false, false, false, false ), // Palestine
  QA: a(['red','white'],               false, false, false, false, false ), // Qatar
  SA: a(['green','white'],             false, false, false, true,  false ), // Saudi Arabia
  SY: a(['green','white','black','red'], true, false, true,  false, false ), // Syria
  TR: a(['red','white'],               false, false, true,  true,  false ), // Turkey
  AE: a(['red','green','white','black'], false, false, false, false, false ), // UAE
  YE: a(['red','white','black'],       true,  false, false, false, false ), // Yemen

  // ── Asia ──────────────────────────────────────────────────────────────────────
  AF: a(['black','red','green','white'], false, false, false, true,  true  ), // Afghanistan
  AM: a(['red','blue','orange'],       true,  false, false, false, false ), // Armenia
  AZ: a(['blue','red','green','white'], true,  false, true,  true,  false ), // Azerbaijan
  BD: a(['green','red'],               false, false, false, false, false ), // Bangladesh
  BT: a(['yellow','orange'],           false, false, false, false, true  ), // Bhutan (dragon)
  BN: a(['yellow','white','black'],    true,  false, false, true,  true  ), // Brunei
  KH: a(['blue','red','white'],        false, false, false, false, true  ), // Cambodia (Angkor Wat)
  CN: a(['red','yellow'],              false, false, true,  false, false ), // China
  GE: a(['white','red'],               false, true,  false, false, false ), // Georgia
  IN: a(['orange','white','green','blue'], true, false, false, false, false ), // India
  ID: a(['red','white'],               true,  false, false, false, false ), // Indonesia
  JP: a(['white','red'],               false, false, false, false, false ), // Japan
  KZ: a(['blue','yellow'],             false, false, false, true,  false ), // Kazakhstan
  KG: a(['red','yellow'],              false, false, false, false, false ), // Kyrgyzstan (tunduk)
  LA: a(['red','blue','white'],        true,  false, false, false, false ), // Laos
  MY: a(['red','white','blue','yellow'], true, false, true,  true,  false ), // Malaysia
  MV: a(['red','green','white'],       false, false, false, true,  false ), // Maldives
  MN: a(['red','blue','yellow'],       false, false, false, false, true  ), // Mongolia
  MM: a(['yellow','green','red','white'], true, false, true,  false, false ), // Myanmar
  NP: a(['red','blue','white'],        false, false, false, true,  false ), // Nepal
  KP: a(['red','blue','white'],        false, false, true,  false, false ), // North Korea
  PK: a(['green','white'],             false, false, true,  true,  false ), // Pakistan
  PH: a(['blue','red','white','yellow'], false, false, true, false, false ), // Philippines
  SG: a(['red','white'],               true,  false, true,  true,  false ), // Singapore
  LK: a(['yellow','red','orange','green'], false, false, false, false, true ), // Sri Lanka
  KR: a(['white','red','blue','black'], false, false, false, false, false ), // South Korea
  TJ: a(['red','white','green','yellow'], true, false, true,  true,  false ), // Tajikistan
  TH: a(['red','white','blue'],        true,  false, false, false, false ), // Thailand
  TW: a(['red','blue','white'],        false, false, true,  false, false ), // Taiwan (blue sky, white sun)
  TL: a(['red','yellow','black','white'], false, false, true,  false, false ), // Timor-Leste
  TM: a(['green','white'],             false, false, true,  true,  false ), // Turkmenistan
  UZ: a(['blue','white','green'],      true,  false, true,  true,  false ), // Uzbekistan
  VN: a(['red','yellow'],              false, false, true,  false, false ), // Vietnam

  // ── Africa ────────────────────────────────────────────────────────────────────
  DZ: a(['green','white','red'],       false, false, false, true,  false ), // Algeria
  AO: a(['red','black','yellow'],      true,  false, true,  false, false ), // Angola
  BJ: a(['green','yellow','red'],      false, false, true,  false, false ), // Benin
  BW: a(['blue','white','black'],      true,  false, false, false, false ), // Botswana
  BF: a(['red','green','yellow'],      true,  false, true,  false, false ), // Burkina Faso
  BI: a(['red','white','green'],       false, true,  true,  false, false ), // Burundi
  CM: a(['green','red','yellow'],      false, false, true,  false, false ), // Cameroon
  CV: a(['blue','white','red','yellow'], false, false, true,  false, false ), // Cape Verde
  CF: a(['blue','white','green','yellow','red'], true, false, true, false, false ), // Central African Republic
  TD: a(['blue','yellow','red'],       false, false, false, false, false ), // Chad
  KM: a(['green','white','red','blue','yellow'], false, false, true, true, false ), // Comoros
  CD: a(['blue','red','yellow'],       false, false, true,  false, false ), // DR Congo
  CG: a(['green','yellow','red'],      false, false, false, false, false ), // Republic of Congo
  CI: a(['orange','white','green'],    false, false, false, false, false ), // Ivory Coast
  DJ: a(['blue','green','white','red'], false, false, true,  false, false ), // Djibouti
  EG: a(['red','white','black','yellow'], true, false, false, false, true  ), // Egypt
  GQ: a(['green','white','red','blue'], true,  false, false, false, true  ), // Equatorial Guinea
  ER: a(['green','blue','red','yellow'], false, false, false, false, false ), // Eritrea
  SZ: a(['blue','yellow','red'],       false, false, false, false, true  ), // Eswatini
  ET: a(['green','yellow','red','blue'], true, false, true,  false, false ), // Ethiopia
  GA: a(['green','yellow','blue'],     true,  false, false, false, false ), // Gabon
  GM: a(['red','blue','green','white'], true,  false, false, false, false ), // Gambia
  GH: a(['red','yellow','green','black'], true, false, true,  false, false ), // Ghana
  GN: a(['red','yellow','green'],      false, false, false, false, false ), // Guinea
  GW: a(['red','yellow','green','black'], false, false, true,  false, false ), // Guinea-Bissau
  KE: a(['black','red','green','white'], true,  false, false, false, true  ), // Kenya
  LS: a(['blue','white','green'],      true,  false, false, false, true  ), // Lesotho
  LR: a(['red','white','blue'],        true,  false, true,  false, false ), // Liberia
  LY: a(['black','red','green','white'], false, false, false, true,  false ), // Libya
  MG: a(['red','white','green'],       false, false, false, false, false ), // Madagascar
  MW: a(['black','red','green','yellow'], true, false, true,  false, false ), // Malawi
  ML: a(['green','yellow','red'],      false, false, false, false, false ), // Mali
  MR: a(['green','red','yellow'],      false, false, true,  true,  false ), // Mauritania
  MU: a(['red','blue','yellow','green'], true, false, false, false, false ), // Mauritius
  MA: a(['red','green'],               false, false, true,  false, false ), // Morocco (pentagram)
  MZ: a(['green','white','black','yellow','red'], false, false, true, false, false ), // Mozambique
  NA: a(['blue','red','green','yellow','white'], false, false, true,  false, false ), // Namibia
  NE: a(['orange','white','green'],    true,  false, false, false, false ), // Niger
  NG: a(['green','white'],             false, false, false, false, false ), // Nigeria
  RW: a(['blue','yellow','green'],     false, false, false, false, false ), // Rwanda
  ST: a(['green','yellow','black','red'], false, false, true,  false, false ), // São Tomé
  SN: a(['green','yellow','red'],      false, false, true,  false, false ), // Senegal
  SC: a(['blue','yellow','red','white','green'], false, false, false, false, false ), // Seychelles
  SL: a(['green','white','blue'],      true,  false, false, false, false ), // Sierra Leone
  SO: a(['blue','white'],              false, false, true,  false, false ), // Somalia
  ZA: a(['green','yellow','red','blue','white','black'], false, false, false, false, false ), // South Africa
  SS: a(['black','red','green','blue','white','yellow'], false, false, true, false, false ), // South Sudan
  SD: a(['red','white','black','green'], true,  false, false, false, false ), // Sudan
  TZ: a(['green','yellow','black','blue'], false, false, false, false, false ), // Tanzania
  TG: a(['green','yellow','red','white'], true,  false, true,  false, false ), // Togo
  TN: a(['red','white'],               false, false, true,  true,  false ), // Tunisia
  UG: a(['black','yellow','red','white'], true, false, false, false, true  ), // Uganda
  ZM: a(['green','red','black','orange'], false, false, false, false, false ), // Zambia
  ZW: a(['green','yellow','red','black','white'], true, false, true, false, false ), // Zimbabwe

  // ── Oceania ───────────────────────────────────────────────────────────────────
  AU: a(['blue','red','white'],        false, true,  true,  false, false ), // Australia
  FJ: a(['blue','white','red'],        false, true,  false, false, true  ), // Fiji
  KI: a(['red','blue','yellow','white'], false, false, false, false, false ), // Kiribati
  MH: a(['blue','orange','white'],     false, false, true,  false, false ), // Marshall Islands
  FM: a(['blue','white'],              false, false, true,  false, false ), // Micronesia
  NR: a(['blue','yellow','white'],     false, false, true,  false, false ), // Nauru
  NZ: a(['blue','red','white'],        false, true,  true,  false, false ), // New Zealand
  PW: a(['blue','yellow'],             false, false, false, false, false ), // Palau
  PG: a(['red','black','yellow','white'], false, false, true, false, false ), // Papua New Guinea
  WS: a(['red','blue','white'],        false, false, true,  false, false ), // Samoa
  SB: a(['blue','green','yellow','white'], false, false, true, false, false ), // Solomon Islands
  TO: a(['red','white'],               false, true,  false, false, false ), // Tonga
  TV: a(['blue','yellow'],             false, false, true,  false, false ), // Tuvalu
  VU: a(['red','green','black','yellow'], false, false, false, false, false ), // Vanuatu
}

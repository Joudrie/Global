export interface SubRegion {
  code: string
  name: string
  flagUrl?: string
  group?: string
  noFlag?: boolean      // true only when we've positively confirmed no flag exists
  groupHeader?: boolean // a province/nation-level flag shown on top of its group
}

export interface ChallengeCountry {
  code: string
  name: string
  emoji: string
  subTitle: string
  subRegions: SubRegion[]
  locked: boolean
}

export interface ChallengeContinent {
  id: string
  name: string
  emoji: string
  locked: boolean
  countries: ChallengeCountry[]
}

import { commonsFlag } from "./flagUrl"

// Self-hosted copy when available (LOCAL_FLAGS, then HOSTED_FLAGS under /cf/);
// empty string = dead link with no replacement; otherwise the live Commons redirect.
const wiki = (file: string): string => commonsFlag(file.replace(/ /g, '_'))

// ── UNITED STATES (50 states) ─────────────────────────────────────────────────
const US_STATES: SubRegion[] = [
  { code: "us-al", name: "Alabama", flagUrl: wiki("Flag of Alabama.svg"), group: "States" },
  { code: "us-ak", name: "Alaska", flagUrl: wiki("Flag of Alaska.svg"), group: "States" },
  { code: "us-az", name: "Arizona", flagUrl: wiki("Flag of Arizona.svg"), group: "States" },
  { code: "us-ar", name: "Arkansas", flagUrl: wiki("Flag of Arkansas.svg"), group: "States" },
  { code: "us-ca", name: "California", flagUrl: wiki("Flag of California.svg"), group: "States" },
  { code: "us-co", name: "Colorado", flagUrl: wiki("Flag of Colorado.svg"), group: "States" },
  { code: "us-ct", name: "Connecticut", flagUrl: wiki("Flag of Connecticut.svg"), group: "States" },
  { code: "us-de", name: "Delaware", flagUrl: wiki("Flag of Delaware.svg"), group: "States" },
  { code: "us-fl", name: "Florida", flagUrl: wiki("Flag of Florida.svg"), group: "States" },
  { code: "us-ga", name: "Georgia", flagUrl: wiki("Flag of Georgia.svg"), group: "States" },
  { code: "us-hi", name: "Hawaii", flagUrl: wiki("Flag of Hawaii.svg"), group: "States" },
  { code: "us-id", name: "Idaho", flagUrl: wiki("Flag of Idaho.svg"), group: "States" },
  { code: "us-il", name: "Illinois", flagUrl: wiki("Flag of Illinois.svg"), group: "States" },
  { code: "us-in", name: "Indiana", flagUrl: wiki("Flag of Indiana.svg"), group: "States" },
  { code: "us-ia", name: "Iowa", flagUrl: wiki("Flag of Iowa.svg"), group: "States" },
  { code: "us-ks", name: "Kansas", flagUrl: wiki("Flag of Kansas.svg"), group: "States" },
  { code: "us-ky", name: "Kentucky", flagUrl: wiki("Flag of Kentucky.svg"), group: "States" },
  { code: "us-la", name: "Louisiana", flagUrl: wiki("Flag of Louisiana.svg"), group: "States" },
  { code: "us-me", name: "Maine", flagUrl: wiki("Flag of Maine.svg"), group: "States" },
  { code: "us-md", name: "Maryland", flagUrl: wiki("Flag of Maryland.svg"), group: "States" },
  { code: "us-ma", name: "Massachusetts", flagUrl: wiki("Flag of Massachusetts.svg"), group: "States" },
  { code: "us-mi", name: "Michigan", flagUrl: wiki("Flag of Michigan.svg"), group: "States" },
  { code: "us-mn", name: "Minnesota", flagUrl: wiki("Flag of Minnesota.svg"), group: "States" },
  { code: "us-ms", name: "Mississippi", flagUrl: wiki("Flag of Mississippi.svg"), group: "States" },
  { code: "us-mo", name: "Missouri", flagUrl: wiki("Flag of Missouri.svg"), group: "States" },
  { code: "us-mt", name: "Montana", flagUrl: wiki("Flag of Montana.svg"), group: "States" },
  { code: "us-ne", name: "Nebraska", flagUrl: wiki("Flag of Nebraska.svg"), group: "States" },
  { code: "us-nv", name: "Nevada", flagUrl: wiki("Flag of Nevada.svg"), group: "States" },
  { code: "us-nh", name: "New Hampshire", flagUrl: wiki("Flag of New Hampshire.svg"), group: "States" },
  { code: "us-nj", name: "New Jersey", flagUrl: wiki("Flag of New Jersey.svg"), group: "States" },
  { code: "us-nm", name: "New Mexico", flagUrl: wiki("Flag of New Mexico.svg"), group: "States" },
  { code: "us-ny", name: "New York", flagUrl: wiki("Flag of New York.svg"), group: "States" },
  { code: "us-nc", name: "North Carolina", flagUrl: wiki("Flag of North Carolina.svg"), group: "States" },
  { code: "us-nd", name: "North Dakota", flagUrl: wiki("Flag of North Dakota.svg"), group: "States" },
  { code: "us-oh", name: "Ohio", flagUrl: wiki("Flag of Ohio.svg"), group: "States" },
  { code: "us-ok", name: "Oklahoma", flagUrl: wiki("Flag of Oklahoma.svg"), group: "States" },
  { code: "us-or", name: "Oregon", flagUrl: wiki("Flag of Oregon.svg"), group: "States" },
  { code: "us-pa", name: "Pennsylvania", flagUrl: wiki("Flag of Pennsylvania.svg"), group: "States" },
  { code: "us-ri", name: "Rhode Island", flagUrl: wiki("Flag of Rhode Island.svg"), group: "States" },
  { code: "us-sc", name: "South Carolina", flagUrl: wiki("Flag of South Carolina.svg"), group: "States" },
  { code: "us-sd", name: "South Dakota", flagUrl: wiki("Flag of South Dakota.svg"), group: "States" },
  { code: "us-tn", name: "Tennessee", flagUrl: wiki("Flag of Tennessee.svg"), group: "States" },
  { code: "us-tx", name: "Texas", flagUrl: wiki("Flag of Texas.svg"), group: "States" },
  { code: "us-ut", name: "Utah", flagUrl: wiki("Flag of Utah.svg"), group: "States" },
  { code: "us-vt", name: "Vermont", flagUrl: wiki("Flag of Vermont.svg"), group: "States" },
  { code: "us-va", name: "Virginia", flagUrl: wiki("Flag of Virginia.svg"), group: "States" },
  { code: "us-wa", name: "Washington", flagUrl: wiki("Flag of Washington.svg"), group: "States" },
  { code: "us-wv", name: "West Virginia", flagUrl: wiki("Flag of West Virginia.svg"), group: "States" },
  { code: "us-wi", name: "Wisconsin", flagUrl: wiki("Flag of Wisconsin.svg"), group: "States" },
  { code: "us-wy", name: "Wyoming", flagUrl: wiki("Flag of Wyoming.svg"), group: "States" },
  // ── Territories & federal district (shown below the states) ──
  { code: "us-pr", name: "Puerto Rico",             flagUrl: wiki("Flag of Puerto Rico.svg"),                      group: "Territories" },
  { code: "us-gu", name: "Guam",                    flagUrl: wiki("Flag of Guam.svg"),                             group: "Territories" },
  { code: "us-vi", name: "U.S. Virgin Islands",     flagUrl: wiki("Flag of the United States Virgin Islands.svg"), group: "Territories" },
  { code: "us-as", name: "American Samoa",          flagUrl: wiki("Flag of American Samoa.svg"),                   group: "Territories" },
  { code: "us-mp", name: "Northern Mariana Islands",flagUrl: wiki("Flag of the Northern Mariana Islands.svg"),     group: "Territories" },
  { code: "us-dc", name: "Washington, D.C.",        flagUrl: wiki("Flag of Washington, D.C..svg"),                 group: "Federal District" },
]

// ── CANADA (13 provinces & territories) ──────────────────────────────────────
const CA_PROVINCES: SubRegion[] = [
  { code: "ca-ab", name: "Alberta",                    flagUrl: wiki("Flag of Alberta.svg") },
  { code: "ca-bc", name: "British Columbia",           flagUrl: wiki("Flag of British Columbia.svg") },
  { code: "ca-mb", name: "Manitoba",                   flagUrl: wiki("Flag of Manitoba.svg") },
  { code: "ca-nb", name: "New Brunswick",              flagUrl: wiki("Flag of New Brunswick.svg") },
  { code: "ca-nl", name: "Newfoundland and Labrador",  flagUrl: wiki("Flag of Newfoundland and Labrador.svg") },
  { code: "ca-nt", name: "Northwest Territories",      flagUrl: wiki("Flag of the Northwest Territories.svg") },
  { code: "ca-ns", name: "Nova Scotia",                flagUrl: wiki("Flag of Nova Scotia.svg") },
  { code: "ca-nu", name: "Nunavut",                    flagUrl: wiki("Flag of Nunavut.svg") },
  { code: "ca-on", name: "Ontario",                    flagUrl: wiki("Flag of Ontario.svg") },
  { code: "ca-pe", name: "Prince Edward Island",       flagUrl: wiki("Flag of Prince Edward Island.svg") },
  { code: "ca-qc", name: "Quebec",                     flagUrl: wiki("Flag of Quebec.svg") },
  { code: "ca-sk", name: "Saskatchewan",               flagUrl: wiki("Flag of Saskatchewan.svg") },
  { code: "ca-yt", name: "Yukon",                      flagUrl: wiki("Flag of Yukon.svg") },
]

// ── MEXICO (32 states) ────────────────────────────────────────────────────────
const MX_STATES: SubRegion[] = [
  { code: "mx-agu", name: "Aguascalientes",    flagUrl: wiki("Flag of Aguascalientes.svg") },
  { code: "mx-bcn", name: "Baja California",  flagUrl: wiki("Flag of Baja California.svg") },
  { code: "mx-bcs", name: "Baja California Sur", flagUrl: wiki("Flag of Baja California Sur.svg") },
  { code: "mx-cam", name: "Campeche",          flagUrl: wiki("Flag of Campeche.svg") },
  { code: "mx-chp", name: "Chiapas",           flagUrl: wiki("Flag of Chiapas.svg") },
  { code: "mx-chh", name: "Chihuahua",         flagUrl: wiki("Flag of Chihuahua.svg") },
  { code: "mx-cmx", name: "Mexico City",       flagUrl: wiki("Flag of Mexico City, Mexico.svg") },
  { code: "mx-coa", name: "Coahuila",          flagUrl: wiki("Flag of Coahuila.svg") },
  { code: "mx-col", name: "Colima",            flagUrl: wiki("Flag of Colima.svg") },
  { code: "mx-dur", name: "Durango",           flagUrl: wiki("Flag of Durango.svg") },
  { code: "mx-gua", name: "Guanajuato",        flagUrl: wiki("Flag of Guanajuato.svg") },
  { code: "mx-gro", name: "Guerrero",          flagUrl: wiki("Flag of Guerrero.svg") },
  { code: "mx-hid", name: "Hidalgo",           flagUrl: wiki("Flag of Hidalgo.svg") },
  { code: "mx-jal", name: "Jalisco",           flagUrl: wiki("Flag of Jalisco.svg") },
  { code: "mx-mex", name: "State of Mexico",   flagUrl: wiki("Flag of the State of Mexico.svg") },
  { code: "mx-mic", name: "Michoacán",         flagUrl: wiki("Flag of Michoacan.svg") },
  { code: "mx-mor", name: "Morelos",           flagUrl: wiki("Flag of Morelos.svg") },
  { code: "mx-nay", name: "Nayarit",           flagUrl: wiki("Flag of Nayarit.svg") },
  { code: "mx-nle", name: "Nuevo León",        flagUrl: wiki("Flag of Nuevo Leon.svg") },
  { code: "mx-oax", name: "Oaxaca",            flagUrl: wiki("Flag of Oaxaca.svg") },
  { code: "mx-pue", name: "Puebla",            flagUrl: wiki("Flag of Puebla.svg") },
  { code: "mx-que", name: "Querétaro",         flagUrl: wiki("Flag of Queretaro.svg") },
  { code: "mx-roo", name: "Quintana Roo",      flagUrl: wiki("Flag of Quintana Roo.svg") },
  { code: "mx-slp", name: "San Luis Potosí",   flagUrl: wiki("Flag of San Luis Potosi.svg") },
  { code: "mx-sin", name: "Sinaloa",           flagUrl: wiki("Flag of Sinaloa.svg") },
  { code: "mx-son", name: "Sonora",            flagUrl: wiki("Flag of Sonora.svg") },
  { code: "mx-tab", name: "Tabasco",           flagUrl: wiki("Flag of Tabasco.svg") },
  { code: "mx-tam", name: "Tamaulipas",        flagUrl: wiki("Flag of Tamaulipas.svg") },
  { code: "mx-tla", name: "Tlaxcala",          flagUrl: wiki("Flag of Tlaxcala.svg") },
  { code: "mx-ver", name: "Veracruz",          flagUrl: wiki("Flag of Veracruz.svg") },
  { code: "mx-yuc", name: "Yucatán",           flagUrl: wiki("Flag of Yucatan.svg") },
  { code: "mx-zac", name: "Zacatecas",         flagUrl: wiki("Flag of Zacatecas.svg") },
]

// ── BELIZE (6 districts) ──────────────────────────────────────────────────────
const BZ_DISTRICTS: SubRegion[] = [
  { code: "bz-bz",  name: "Belize District"  },
  { code: "bz-cy",  name: "Cayo"  },
  { code: "bz-czl", name: "Corozal" },
  { code: "bz-ow",  name: "Orange Walk"  },
  { code: "bz-sc",  name: "Stann Creek"  },
  { code: "bz-tol", name: "Toledo" },
]

// ── GUATEMALA (22 departments) ────────────────────────────────────────────────
const GT_DEPARTMENTS: SubRegion[] = [
  { code: "gt-av", name: "Alta Verapaz",    flagUrl: wiki("Bandera de Alta Verapaz.svg") },
  { code: "gt-bv", name: "Baja Verapaz",    flagUrl: wiki("Flag of Baja Verapaz Department.svg") },
  { code: "gt-cm", name: "Chimaltenango", flagUrl: wiki("Flag of Chimaltenango Department.svg") },
  { code: "gt-cq", name: "Chiquimula",      flagUrl: wiki("Flag of Chiquimula.svg") },
  { code: "gt-es", name: "Escuintla",       flagUrl: wiki("Flag of Escuintla Department.svg") },
  { code: "gt-gu", name: "Guatemala",       flagUrl: wiki("Flag of the Guatemala Department.svg") },
  { code: "gt-hu", name: "Huehuetenango",   flagUrl: wiki("Flag of Huehuetenango Department.svg") },
  { code: "gt-iz", name: "Izabal", flagUrl: wiki("Flag of Izabal Department.svg") },
  { code: "gt-ja", name: "Jalapa",          flagUrl: wiki("Flag of Jalapa Department, Guatemala.svg") },
  { code: "gt-ju", name: "Jutiapa",         flagUrl: wiki("Flag of Jutiapa Department.svg") },
  { code: "gt-pe", name: "Petén",           flagUrl: wiki("Flag of Petén.svg") },
  { code: "gt-pr", name: "El Progreso",     flagUrl: wiki("Flag of El Progreso Department.svg") },
  { code: "gt-qc", name: "Quiché", flagUrl: wiki("Flag of Quiché Department.svg") },
  { code: "gt-qz", name: "Quetzaltenango",  flagUrl: wiki("Flag of Quetzaltenango Department.svg") },
  { code: "gt-re", name: "Retalhuleu",      flagUrl: wiki("Flag of Retahuleu.svg") },
  { code: "gt-sa", name: "Sacatepéquez",    flagUrl: wiki("Bandera de Sacatepéquez.svg") },
  { code: "gt-sm", name: "San Marcos",      flagUrl: wiki("Flag of San Marcos Department.svg") },
  { code: "gt-so", name: "Sololá",          flagUrl: wiki("Flag of Sololá Department, Guatemala.svg") },
  { code: "gt-sr", name: "Santa Rosa",      flagUrl: wiki("Flag of Santa Rosa Department.svg") },
  { code: "gt-su", name: "Suchitepéquez",   flagUrl: wiki("Flag of Suchitepéquez.svg") },
  { code: "gt-to", name: "Totonicapán",     flagUrl: wiki("Bandera Totonicapán.svg") },
  { code: "gt-za", name: "Zacapa",          flagUrl: wiki("Flag of Zacapa.svg") },
]

// ── HONDURAS (18 departments) ─────────────────────────────────────────────────
const HN_DEPARTMENTS: SubRegion[] = [
  { code: "hn-at", name: "Atlántida", flagUrl: wiki("Flag Of Atlantida Department.png") },
  { code: "hn-ch", name: "Choluteca", noFlag: true },
  { code: "hn-cl", name: "Colón", noFlag: true },
  { code: "hn-cm", name: "Comayagua", noFlag: true },
  { code: "hn-cp", name: "Copán",            flagUrl: wiki("Bandera de Copán.svg") },
  { code: "hn-cr", name: "Cortés", noFlag: true },
  { code: "hn-ep", name: "El Paraíso", noFlag: true },
  { code: "hn-fm", name: "Francisco Morazán", noFlag: true },
  { code: "hn-gd", name: "Gracias a Dios", noFlag: true },
  { code: "hn-ib", name: "Islas de la Bahía", noFlag: true },
  { code: "hn-in", name: "Intibucá", noFlag: true },
  { code: "hn-le", name: "Lempira", noFlag: true },
  { code: "hn-lp", name: "La Paz", noFlag: true },
  { code: "hn-oc", name: "Ocotepeque", noFlag: true },
  { code: "hn-ol", name: "Olancho",          flagUrl: wiki("Flag of Olancho Department, Honduras.svg") },
  { code: "hn-sb", name: "Santa Bárbara",    flagUrl: wiki("Bandera de Santa Barbara Honduras.svg") },
  { code: "hn-va", name: "Valle", noFlag: true },
  { code: "hn-yo", name: "Yoro", noFlag: true },
]

// ── EL SALVADOR (14 departments) ──────────────────────────────────────────────
const SV_DEPARTMENTS: SubRegion[] = [
  { code: "sv-ah", name: "Ahuachapán",    flagUrl: wiki("Bandera del Departamento de Ahuachapán.PNG") },
  { code: "sv-ca", name: "Cabañas",       flagUrl: wiki("Flag of the Cabañas Department.svg") },
  { code: "sv-ch", name: "Chalatenango",  flagUrl: wiki("Flag of Chalatenango.svg") },
  { code: "sv-cu", name: "Cuscatlán",     flagUrl: wiki("Bandera de Cuscatlán.svg") },
  { code: "sv-li", name: "La Libertad",   flagUrl: wiki("Flag of La Libertad Department (El Salvador).svg") },
  { code: "sv-mo", name: "Morazán",       flagUrl: wiki("Flag of Morazán Department.svg") },
  { code: "sv-pa", name: "La Paz",        flagUrl: wiki("Bandera del Departamento de La Paz de El Salvador.PNG") },
  { code: "sv-sa", name: "Santa Ana",     flagUrl: wiki("Bandera de Santa Ana, El Salvador.svg") },
  { code: "sv-sm", name: "San Miguel", flagUrl: wiki("Flag of San Miguel Department.png") },
  { code: "sv-so", name: "Sonsonate", flagUrl: wiki("Bandera del Departamento de Sonsonate.jpg") },
  { code: "sv-ss", name: "San Salvador",  flagUrl: wiki("Bandera de San Salvador (2015).svg") },
  { code: "sv-sv", name: "San Vicente",   flagUrl: wiki("Flag of San Vicente Department.svg") },
  { code: "sv-un", name: "La Unión",      flagUrl: wiki("Bandera del Departamento de La Unión de El Salvador.PNG") },
  { code: "sv-us", name: "Usulután",      flagUrl: wiki("Flag of Usulatán Department.svg") },
]

// ── NICARAGUA (17 departments & autonomous regions) ───────────────────────────
const NI_DEPARTMENTS: SubRegion[] = [
  { code: "ni-an", name: "Costa Caribe Norte", flagUrl: wiki("Flag of Region Autonoma del Atlantico Norte.svg") },
  { code: "ni-as", name: "Costa Caribe Sur",   flagUrl: wiki("Flag of Region Autonoma Atlantico Sur.svg") },
  { code: "ni-bo", name: "Boaco",              flagUrl: wiki("Flag of Boaco.svg") },
  { code: "ni-ca", name: "Carazo", noFlag: true },
  { code: "ni-ci", name: "Chinandega",         flagUrl: wiki("Flag of Chinandega.svg") },
  { code: "ni-co", name: "Chontales", noFlag: true },
  { code: "ni-es", name: "Estelí",             flagUrl: wiki("Flag of Esteli.svg") },
  { code: "ni-gr", name: "Granada",            flagUrl: wiki("Flag of Granada, Nicaragua.svg") },
  { code: "ni-ji", name: "Jinotega",           flagUrl: wiki("Flag of Jinotega.svg") },
  { code: "ni-le", name: "León",               flagUrl: wiki("Flag of Leon, Nicaragua.svg") },
  { code: "ni-md", name: "Madriz",             flagUrl: wiki("Flag of Madriz.svg") },
  { code: "ni-mn", name: "Managua",            flagUrl: wiki("Flag of Managua.svg") },
  { code: "ni-ms", name: "Masaya",             flagUrl: wiki("Flag of Masaya.svg") },
  { code: "ni-mt", name: "Matagalpa",          flagUrl: wiki("Flag of Matagalpa.svg") },
  { code: "ni-ns", name: "Nueva Segovia",      flagUrl: wiki("Flag of Nueva Segovia.svg") },
  { code: "ni-ri", name: "Rivas",              flagUrl: wiki("Flag of Rivas.svg") },
  { code: "ni-sj", name: "Río San Juan", noFlag: true },
]

// ── COSTA RICA (7 provinces) ──────────────────────────────────────────────────
const CR_PROVINCES: SubRegion[] = [
  { code: "cr-a",  name: "Alajuela",    flagUrl: wiki("Bandera de la Provincia de Alajuela.svg")  },
  { code: "cr-c",  name: "Cartago",     flagUrl: wiki("Bandera de la Provincia de Cartago.svg")  },
  { code: "cr-g",  name: "Guanacaste",  flagUrl: wiki("Bandera de la Provincia de Guanacaste.svg")  },
  { code: "cr-h",  name: "Heredia",     flagUrl: wiki("Bandera de la Provincia de Heredia.svg")  },
  { code: "cr-l",  name: "Limón",       flagUrl: wiki("Bandera de la Provincia de Limón.svg")  },
  { code: "cr-p",  name: "Puntarenas",  flagUrl: wiki("Bandera de la Provincia de Puntarenas.svg")  },
  { code: "cr-sj", name: "San José",    flagUrl: wiki("Bandera de la Provincia de San José.svg") },
]

// ── PANAMA (10 provinces) ─────────────────────────────────────────────────────
const PA_PROVINCES: SubRegion[] = [
  { code: "pa-1",  name: "Bocas del Toro", flagUrl: wiki("Bandera de la Provincia de Bocas del Toro.svg")  },
  { code: "pa-2",  name: "Coclé",          flagUrl: wiki("Bandera de la Provincia de Coclé.svg")  },
  { code: "pa-3",  name: "Colón",          flagUrl: wiki("Bandera de la Provincia de Colón.svg")  },
  { code: "pa-4",  name: "Chiriquí",       flagUrl: wiki("Bandera de la Provincia de Chiriquí.svg")  },
  { code: "pa-5",  name: "Darién",         flagUrl: wiki("Bandera de la Provincia de Darién.svg")  },
  { code: "pa-6",  name: "Herrera",        flagUrl: wiki("Bandera de la Provincia de Herrera.svg")  },
  { code: "pa-7",  name: "Los Santos",     flagUrl: wiki("Bandera de la Provincia de Los Santos.svg")  },
  { code: "pa-8",  name: "Panamá", noFlag: true  },
  { code: "pa-9",  name: "Veraguas",       flagUrl: wiki("Bandera de la Provincia de Veraguas.svg")  },
  { code: "pa-10", name: "Panamá Oeste",   flagUrl: wiki("Bandera de la Provincia de Panamá Oeste.svg") },
]

// ── CUBA (15 provinces) ───────────────────────────────────────────────────────
const CU_PROVINCES: SubRegion[] = [
  { code: "cu-01", name: "Pinar del Río" },
  { code: "cu-02", name: "Artemisa" },
  { code: "cu-03", name: "La Habana" },
  { code: "cu-04", name: "Mayabeque" },
  { code: "cu-05", name: "Matanzas" },
  { code: "cu-06", name: "Cienfuegos" },
  { code: "cu-07", name: "Villa Clara" },
  { code: "cu-08", name: "Sancti Spíritus" },
  { code: "cu-09", name: "Ciego de Ávila" },
  { code: "cu-10", name: "Camagüey" },
  { code: "cu-11", name: "Las Tunas" },
  { code: "cu-12", name: "Holguín" },
  { code: "cu-13", name: "Granma" },
  { code: "cu-14", name: "Santiago de Cuba" },
  { code: "cu-15", name: "Guantánamo" },
]

// ── HAITI (10 departments) ────────────────────────────────────────────────────
const HT_DEPARTMENTS: SubRegion[] = [
  { code: "ht-ar", name: "Artibonite" },
  { code: "ht-ce", name: "Centre" },
  { code: "ht-ga", name: "Grande'Anse" },
  { code: "ht-nd", name: "Nord" },
  { code: "ht-ne", name: "Nord-Est",    flagUrl: wiki("Drapeau du département du Nord-Est d'Haïti.jpg") },
  { code: "ht-no", name: "Nord-Ouest",  flagUrl: wiki("Drapeau du département du Nord-Ouest d'Haïti.jpg") },
  { code: "ht-ni", name: "Nippes" },
  { code: "ht-ou", name: "Ouest" },
  { code: "ht-sd", name: "Sud" },
  { code: "ht-se", name: "Sud-Est" },
]

// ── DOMINICAN REPUBLIC (32 provinces + National District = 33) ───────────────
const DO_PROVINCES: SubRegion[] = [
  { code: "do-01", name: "Distrito Nacional" },
  { code: "do-02", name: "Azua" },
  { code: "do-03", name: "Baoruco" },
  { code: "do-04", name: "Barahona" },
  { code: "do-05", name: "Dajabón" },
  { code: "do-06", name: "Duarte" },
  { code: "do-07", name: "Elías Piña" },
  { code: "do-08", name: "El Seibo" },
  { code: "do-09", name: "Espaillat" },
  { code: "do-10", name: "Independencia",       flagUrl: wiki("Bandera de la provincia Independencia.png") },
  { code: "do-11", name: "La Altagracia" },
  { code: "do-12", name: "La Romana" },
  { code: "do-13", name: "La Vega" },
  { code: "do-14", name: "María Trinidad Sánchez" },
  { code: "do-15", name: "Monte Cristi" },
  { code: "do-16", name: "Pedernales" },
  { code: "do-17", name: "Peravia" },
  { code: "do-18", name: "Puerto Plata",        flagUrl: wiki("Flag of Puerto Plata Province.svg") },
  { code: "do-19", name: "Hermanas Mirabal" },
  { code: "do-20", name: "Samaná" },
  { code: "do-21", name: "San Cristóbal" },
  { code: "do-22", name: "San Juan",            flagUrl: wiki("Bandera sanjuanmaguana.png") },
  { code: "do-23", name: "San Pedro de Macorís",flagUrl: wiki("Flag of San Pedro de Macorís Province.svg") },
  { code: "do-24", name: "Sánchez Ramírez" },
  { code: "do-25", name: "Santiago" },
  { code: "do-26", name: "Santiago Rodríguez" },
  { code: "do-27", name: "Valverde" },
  { code: "do-28", name: "Monseñor Nouel" },
  { code: "do-29", name: "Monte Plata" },
  { code: "do-30", name: "Hato Mayor" },
  { code: "do-31", name: "San José de Ocoa" },
  { code: "do-32", name: "Santo Domingo" },
]

// ── BRAZIL (27 states & DF) ───────────────────────────────────────────────────
const BR_STATES: SubRegion[] = [
  { code: "br-ac", name: "Acre",               flagUrl: wiki("Bandeira do Acre.svg") },
  { code: "br-al", name: "Alagoas",            flagUrl: wiki("Bandeira de Alagoas.svg") },
  { code: "br-am", name: "Amazonas",           flagUrl: wiki("Bandeira do Amazonas.svg") },
  { code: "br-ap", name: "Amapá",              flagUrl: wiki("Bandeira do Amapá.svg") },
  { code: "br-ba", name: "Bahia",              flagUrl: wiki("Bandeira da Bahia.svg") },
  { code: "br-ce", name: "Ceará",              flagUrl: wiki("Bandeira do Ceará.svg") },
  { code: "br-df", name: "Distrito Federal",   flagUrl: wiki("Bandeira do Distrito Federal (Brasil).svg") },
  { code: "br-es", name: "Espírito Santo",     flagUrl: wiki("Bandeira do Espírito Santo.svg") },
  { code: "br-go", name: "Goiás",              flagUrl: wiki("Flag of Goiás.svg") },
  { code: "br-ma", name: "Maranhão",           flagUrl: wiki("Bandeira do Maranhão.svg") },
  { code: "br-mg", name: "Minas Gerais",       flagUrl: wiki("Bandeira de Minas Gerais.svg") },
  { code: "br-ms", name: "Mato Grosso do Sul", flagUrl: wiki("Bandeira de Mato Grosso do Sul.svg") },
  { code: "br-mt", name: "Mato Grosso",        flagUrl: wiki("Bandeira de Mato Grosso.svg") },
  { code: "br-pa", name: "Pará",               flagUrl: wiki("Bandeira do Pará.svg") },
  { code: "br-pb", name: "Paraíba",            flagUrl: wiki("Bandeira da Paraíba.svg") },
  { code: "br-pe", name: "Pernambuco",         flagUrl: wiki("Bandeira de Pernambuco.svg") },
  { code: "br-pi", name: "Piauí",              flagUrl: wiki("Bandeira do Piauí.svg") },
  { code: "br-pr", name: "Paraná",             flagUrl: wiki("Bandeira do Paraná.svg") },
  { code: "br-rj", name: "Rio de Janeiro",     flagUrl: wiki("Bandeira do estado do Rio de Janeiro.svg") },
  { code: "br-rn", name: "Rio Grande do Norte",flagUrl: wiki("Bandeira do Rio Grande do Norte.svg") },
  { code: "br-ro", name: "Rondônia",           flagUrl: wiki("Bandeira de Rondônia.svg") },
  { code: "br-rr", name: "Roraima",            flagUrl: wiki("Bandeira de Roraima.svg") },
  { code: "br-rs", name: "Rio Grande do Sul",  flagUrl: wiki("Bandeira do Rio Grande do Sul.svg") },
  { code: "br-sc", name: "Santa Catarina",     flagUrl: wiki("Bandeira de Santa Catarina.svg") },
  { code: "br-se", name: "Sergipe",            flagUrl: wiki("Bandeira de Sergipe.svg") },
  { code: "br-sp", name: "São Paulo",          flagUrl: wiki("Bandeira do estado de São Paulo.svg") },
  { code: "br-to", name: "Tocantins",          flagUrl: wiki("Bandeira do Tocantins.svg") },
]

// ── ARGENTINA (24 provinces) ──────────────────────────────────────────────────
const AR_PROVINCES: SubRegion[] = [
  { code: "ar-a", name: "Salta",              flagUrl: wiki("Bandera de la Provincia de Salta.svg") },
  { code: "ar-b", name: "Buenos Aires Prov.", flagUrl: wiki("Bandera de la Provincia de Buenos Aires.svg") },
  { code: "ar-c", name: "Buenos Aires City",  flagUrl: wiki("Bandera de la Ciudad de Buenos Aires.svg") },
  { code: "ar-d", name: "San Luis",           flagUrl: wiki("Bandera de la Provincia de San Luis.svg") },
  { code: "ar-e", name: "Entre Ríos",         flagUrl: wiki("Bandera de la Provincia de Entre Ríos.svg") },
  { code: "ar-f", name: "La Rioja",           flagUrl: wiki("Bandera de la Provincia de La Rioja.svg") },
  { code: "ar-g", name: "Santiago del Estero",flagUrl: wiki("Bandera de la Provincia de Santiago del Estero.svg") },
  { code: "ar-h", name: "Chaco",              flagUrl: wiki("Bandera de la Provincia del Chaco.svg") },
  { code: "ar-j", name: "San Juan",           flagUrl: wiki("Bandera de la Provincia de San Juan.svg") },
  { code: "ar-k", name: "Catamarca",          flagUrl: wiki("Bandera de la Provincia de Catamarca.svg") },
  { code: "ar-l", name: "La Pampa",           flagUrl: wiki("Bandera de la Provincia de La Pampa.svg") },
  { code: "ar-m", name: "Mendoza",            flagUrl: wiki("Bandera de la Provincia de Mendoza.svg") },
  { code: "ar-n", name: "Misiones",           flagUrl: wiki("Bandera de la Provincia de Misiones.svg") },
  { code: "ar-p", name: "Formosa",            flagUrl: wiki("Bandera de la Provincia de Formosa.svg") },
  { code: "ar-q", name: "Neuquén",            flagUrl: wiki("Bandera de la Provincia del Neuquen.svg") },
  { code: "ar-r", name: "Río Negro",          flagUrl: wiki("Bandera de la Provincia del Río Negro.svg") },
  { code: "ar-s", name: "Santa Fe",           flagUrl: wiki("Bandera de la Provincia de Santa Fe.svg") },
  { code: "ar-t", name: "Tucumán",            flagUrl: wiki("Bandera de la Provincia de Tucumán.svg") },
  { code: "ar-u", name: "Chubut",             flagUrl: wiki("Bandera de la Provincia del Chubut.svg") },
  { code: "ar-v", name: "Tierra del Fuego",   flagUrl: wiki("Bandera de la Provincia de Tierra del Fuego.svg") },
  { code: "ar-w", name: "Corrientes",         flagUrl: wiki("Bandera de la Provincia de Corrientes.svg") },
  { code: "ar-x", name: "Córdoba",            flagUrl: wiki("Bandera de la Provincia de Córdoba.svg") },
  { code: "ar-y", name: "Jujuy",              flagUrl: wiki("Bandera de la Provincia de Jujuy.svg") },
  { code: "ar-z", name: "Santa Cruz",         flagUrl: wiki("Bandera de la Provincia de Santa Cruz.svg") },
]

// ── COLOMBIA (32 departments + Bogotá DC = 33) ────────────────────────────────
const CO_DEPARTMENTS: SubRegion[] = [
  { code: "co-ama", name: "Amazonas",        flagUrl: wiki("Flag of Amazonas (Colombia).svg") },
  { code: "co-ant", name: "Antioquia",       flagUrl: wiki("Flag of Antioquia Department.svg") },
  { code: "co-ara", name: "Arauca",          flagUrl: wiki("Flag of Arauca.svg") },
  { code: "co-atl", name: "Atlántico",       flagUrl: wiki("Flag of Atlántico.svg") },
  { code: "co-bol", name: "Bolívar",         flagUrl: wiki("Flag of Bolívar (Colombia).svg") },
  { code: "co-boy", name: "Boyacá",          flagUrl: wiki("Flag of Boyacá Department.svg") },
  { code: "co-cal", name: "Caldas",          flagUrl: wiki("Flag of Caldas.svg") },
  { code: "co-caq", name: "Caquetá",         flagUrl: wiki("Flag of Caquetá.svg") },
  { code: "co-cas", name: "Casanare",        flagUrl: wiki("Flag of Casanare.svg") },
  { code: "co-cau", name: "Cauca",           flagUrl: wiki("Flag of Cauca.svg") },
  { code: "co-ces", name: "Cesar",           flagUrl: wiki("Flag of Cesar.svg") },
  { code: "co-cho", name: "Chocó",           flagUrl: wiki("Flag of Chocó.svg") },
  { code: "co-cor", name: "Córdoba",         flagUrl: wiki("Flag of Córdoba.svg") },
  { code: "co-cun", name: "Cundinamarca",    flagUrl: wiki("Flag of Cundinamarca.svg") },
  { code: "co-dc",  name: "Bogotá D.C.",     flagUrl: wiki("Flag of Bogotá.svg")  },
  { code: "co-gua", name: "Guainía",         flagUrl: wiki("Flag of Guainía.svg") },
  { code: "co-guv", name: "Guaviare",        flagUrl: wiki("Flag of Guaviare.svg") },
  { code: "co-hui", name: "Huila",           flagUrl: wiki("Flag of Huila.svg") },
  { code: "co-lag", name: "La Guajira",      flagUrl: wiki("Flag of La Guajira.svg") },
  { code: "co-mag", name: "Magdalena",       flagUrl: wiki("Flag of Magdalena.svg") },
  { code: "co-met", name: "Meta",            flagUrl: wiki("Flag of Meta.svg") },
  { code: "co-nar", name: "Nariño",          flagUrl: wiki("Flag of Nariño.svg") },
  { code: "co-nsa", name: "Norte de Santander", flagUrl: wiki("Flag of Norte de Santander.svg") },
  { code: "co-put", name: "Putumayo",        flagUrl: wiki("Flag of Putumayo.svg") },
  { code: "co-qui", name: "Quindío",         flagUrl: wiki("Flag of Quindío.svg") },
  { code: "co-ris", name: "Risaralda",       flagUrl: wiki("Flag of Risaralda.svg") },
  { code: "co-sap", name: "San Andrés",      flagUrl: wiki("Flag of San Andrés y Providencia.svg") },
  { code: "co-suc", name: "Sucre",           flagUrl: wiki("Flag of Sucre (Colombia).svg") },
  { code: "co-tol", name: "Tolima",          flagUrl: wiki("Flag of Tolima.svg") },
  { code: "co-vac", name: "Valle del Cauca", flagUrl: wiki("Flag of Valle del Cauca.svg") },
  { code: "co-vau", name: "Vaupés",          flagUrl: wiki("Flag of Vaupés.svg") },
  { code: "co-vid", name: "Vichada",         flagUrl: wiki("Flag of Vichada.svg") },
]

// ── VENEZUELA (23 states + capital district) ──────────────────────────────────
const VE_STATES: SubRegion[] = [
  { code: "ve-a", name: "Distrito Capital", flagUrl: wiki("Flag of Caracas (2022).svg") },
  { code: "ve-b", name: "Anzoátegui",       flagUrl: wiki("Flag of Anzoátegui State.svg") },
  { code: "ve-c", name: "Apure",            flagUrl: wiki("Flag of Apure State.svg") },
  { code: "ve-d", name: "Aragua",           flagUrl: wiki("Flag of Aragua State.svg") },
  { code: "ve-e", name: "Barinas",          flagUrl: wiki("Flag of Barinas State.svg") },
  { code: "ve-f", name: "Bolívar",          flagUrl: wiki("Flag of Bolívar State.svg") },
  { code: "ve-g", name: "Carabobo",         flagUrl: wiki("Flag of Carabobo State.svg") },
  { code: "ve-h", name: "Cojedes",          flagUrl: wiki("Flag of Cojedes State.svg") },
  { code: "ve-i", name: "Falcón",           flagUrl: wiki("Flag of Falcón.svg") },
  { code: "ve-j", name: "Guárico",          flagUrl: wiki("Flag of Guárico State.svg") },
  { code: "ve-k", name: "Lara",             flagUrl: wiki("Flag of Lara State.svg") },
  { code: "ve-l", name: "Mérida",           flagUrl: wiki("Flag of Mérida.svg") },
  { code: "ve-m", name: "Miranda",          flagUrl: wiki("Flag of Miranda state.svg") },
  { code: "ve-n", name: "Monagas",          flagUrl: wiki("Flag of Monagas State.svg") },
  { code: "ve-o", name: "Nueva Esparta",    flagUrl: wiki("Flag of Nueva Esparta.svg") },
  { code: "ve-p", name: "Portuguesa",       flagUrl: wiki("Flag of Portuguesa.svg") },
  { code: "ve-r", name: "Sucre",            flagUrl: wiki("Flag of Sucre State.svg") },
  { code: "ve-s", name: "Táchira",          flagUrl: wiki("Flag of Táchira State.svg") },
  { code: "ve-t", name: "Trujillo",         flagUrl: wiki("Flag of Trujillo State.svg") },
  { code: "ve-u", name: "Yaracuy",          flagUrl: wiki("Flag of Yaracuy State.svg") },
  { code: "ve-v", name: "Zulia",            flagUrl: wiki("Flag of Zulia State.svg") },
  { code: "ve-x", name: "La Guaira",        flagUrl: wiki("Flag of La Guaira State.svg") },
  { code: "ve-y", name: "Delta Amacuro",    flagUrl: wiki("Flag of Delta Amacuro State.svg") },
  { code: "ve-z", name: "Amazonas",         flagUrl: wiki("Flag of Amazonas Indigenous State.svg") },
]

// ── CHILE (16 regions) ────────────────────────────────────────────────────────
const CL_REGIONS: SubRegion[] = [
  { code: "cl-ai", name: "Aysén",             flagUrl: wiki("Flag of Aysen, Chile.svg") },
  { code: "cl-an", name: "Antofagasta",        flagUrl: wiki("Flag of Antofagasta Region, Chile.svg") },
  { code: "cl-ap", name: "Arica y Parinacota", flagUrl: wiki("Flag of Arica y Parinacota, Chile.svg") },
  { code: "cl-ar", name: "La Araucanía",       flagUrl: wiki("Flag of La Araucania, Chile.svg") },
  { code: "cl-at", name: "Atacama",            flagUrl: wiki("Flag of Atacama, Chile.svg") },
  { code: "cl-bi", name: "Biobío",             flagUrl: wiki("Flag of Biobío Region, Chile.svg") },
  { code: "cl-co", name: "Coquimbo",           flagUrl: wiki("Flag of Coquimbo Region, Chile.svg") },
  { code: "cl-li", name: "O'Higgins",          flagUrl: wiki("Flag of O'Higgins Region, Chile.svg") },
  { code: "cl-ll", name: "Los Lagos",          flagUrl: wiki("Flag of Los Lagos Region, Chile.svg") },
  { code: "cl-lr", name: "Los Ríos",           flagUrl: wiki("Flag of Los Ríos, Chile.svg") },
  { code: "cl-ma", name: "Magallanes",         flagUrl: wiki("Flag of Magallanes, Chile.svg") },
  { code: "cl-ml", name: "Maule",              flagUrl: wiki("Flag of Maule, Chile.svg") },
  { code: "cl-nb", name: "Ñuble",              flagUrl: wiki("Flag of Ñuble Region, Chile.svg") },
  { code: "cl-rm", name: "Santiago Metro",     flagUrl: wiki("Flag of the Metropolitan Region, Chile.svg") },
  { code: "cl-ta", name: "Tarapacá",           flagUrl: wiki("Flag of Tarapaca, Chile.svg") },
  { code: "cl-vs", name: "Valparaíso",         flagUrl: wiki("Flag of Valparaiso Region, Chile.svg") },
]

// ── PERU (25 regions) ─────────────────────────────────────────────────────────
const PE_REGIONS: SubRegion[] = [
  { code: "pe-ama", name: "Amazonas",       flagUrl: wiki("Amazonas bandera.svg") },
  { code: "pe-anc", name: "Áncash",         flagUrl: wiki("Bandera Ancash.svg") },
  { code: "pe-apu", name: "Apurímac",       flagUrl: wiki("Bandera Región Apurimac.svg") },
  { code: "pe-are", name: "Arequipa",       flagUrl: wiki("Bandera de Arequipa.svg") },
  { code: "pe-aya", name: "Ayacucho",       flagUrl: wiki("Flag of Ayacucho.svg") },
  { code: "pe-caj", name: "Cajamarca",      flagUrl: wiki("Bandera de Cajamarca.svg") },
  { code: "pe-cal", name: "Callao",         flagUrl: wiki("Bandera del Callao.svg") },
  { code: "pe-cus", name: "Cusco",          flagUrl: wiki("Flag of Cusco (2021).svg") },
  { code: "pe-huc", name: "Huánuco", flagUrl: wiki("Flag of Huánuco.svg") },
  { code: "pe-huv", name: "Huancavelica",   flagUrl: wiki("Flag of Huancavelica.svg") },
  { code: "pe-ica", name: "Ica",            flagUrl: wiki("Bandera Región Ica.svg") },
  { code: "pe-jun", name: "Junín",          flagUrl: wiki("Flag of Junin.svg") },
  { code: "pe-lal", name: "La Libertad",    flagUrl: wiki("Bandera de La Libertad Peru.svg") },
  { code: "pe-lam", name: "Lambayeque",     flagUrl: wiki("Bandera de Lambayeque.svg") },
  { code: "pe-lim", name: "Lima Region",    flagUrl: wiki("Lima region flag.svg") },
  { code: "pe-lor", name: "Loreto",         flagUrl: wiki("Bandera Región Loreto.svg") },
  { code: "pe-mdd", name: "Madre de Dios",  flagUrl: wiki("Flag of Madre de Dios Department.svg") },
  { code: "pe-moq", name: "Moquegua",       flagUrl: wiki("Bandera de Moquegua.svg") },
  { code: "pe-pas", name: "Pasco",          flagUrl: wiki("Flag of Pasco Department.svg") },
  { code: "pe-piu", name: "Piura",          flagUrl: wiki("Bandera de la región de Piura.svg") },
  { code: "pe-pun", name: "Puno",           flagUrl: wiki("Bandera Región Puno.svg") },
  { code: "pe-sam", name: "San Martín",     flagUrl: wiki("Bandera Región San Martín.svg") },
  { code: "pe-tac", name: "Tacna",          flagUrl: wiki("Flag of Tacna.svg") },
  { code: "pe-tum", name: "Tumbes",         flagUrl: wiki("Bandera de Tumbes.svg") },
  { code: "pe-uca", name: "Ucayali",        flagUrl: wiki("Bandera de Ucayali.svg") },
]

// ── ECUADOR (24 provinces) ────────────────────────────────────────────────────
const EC_PROVINCES: SubRegion[] = [
  { code: "ec-a", name: "Azuay",                        flagUrl: wiki("Bandera Provincia Azuay.svg") },
  { code: "ec-b", name: "Bolívar",                      flagUrl: wiki("Bandera Provincia Bolívar.svg") },
  { code: "ec-c", name: "Carchi",                       flagUrl: wiki("Bandera Provincia Carchi.svg") },
  { code: "ec-d", name: "Orellana",                     flagUrl: wiki("Bandera Provincia Orellana.svg") },
  { code: "ec-e", name: "Esmeraldas",                   flagUrl: wiki("Bandera Provincia Esmeraldas.svg") },
  { code: "ec-f", name: "Cañar",                        flagUrl: wiki("Bandera Provincia Cañar.svg") },
  { code: "ec-g", name: "Guayas",                       flagUrl: wiki("Bandera Provincia Guayas.svg") },
  { code: "ec-h", name: "Chimborazo",                   flagUrl: wiki("Bandera Provincia Chimborazo.svg") },
  { code: "ec-i", name: "Imbabura",                     flagUrl: wiki("Bandera Provincia Imbabura.svg") },
  { code: "ec-j", name: "Loja",                         flagUrl: wiki("Bandera Provincia Loja.svg") },
  { code: "ec-k", name: "Los Ríos",                     flagUrl: wiki("Bandera Provincia Los Ríos.svg") },
  { code: "ec-l", name: "Manabí",                       flagUrl: wiki("Bandera Provincia Manabí.svg") },
  { code: "ec-m", name: "Morona Santiago",              flagUrl: wiki("Bandera Provincia Morona Santiago.svg") },
  { code: "ec-n", name: "Napo",                         flagUrl: wiki("Bandera Provincia Napo.svg") },
  { code: "ec-o", name: "El Oro",                       flagUrl: wiki("Bandera Provincia El Oro.svg") },
  { code: "ec-p", name: "Pichincha",                    flagUrl: wiki("Bandera Provincia Pichincha.svg") },
  { code: "ec-q", name: "Sucumbíos",                    flagUrl: wiki("Bandera Provincia Sucumbíos.svg") },
  { code: "ec-r", name: "Tungurahua",                   flagUrl: wiki("Bandera Provincia Tungurahua.svg") },
  { code: "ec-s", name: "Zamora Chinchipe",             flagUrl: wiki("Bandera Provincia Zamora Chinchipe.svg") },
  { code: "ec-t", name: "Santo Domingo de los Tsáchilas", flagUrl: wiki("Flag of Santo Domingo, Ecuador.svg") },
  { code: "ec-u", name: "Santa Elena",                  flagUrl: wiki("Bandera Provincia Santa Elena.svg") },
  { code: "ec-w", name: "Pastaza",                      flagUrl: wiki("Bandera Provincia Pastaza.svg") },
  { code: "ec-x", name: "Cotopaxi",                     flagUrl: wiki("Bandera Provincia Cotopaxi.svg") },
  { code: "ec-z", name: "Galápagos",                    flagUrl: wiki("Bandera Provincia Galápagos.svg") },
]

// ── BOLIVIA (9 departments) ───────────────────────────────────────────────────
const BO_DEPARTMENTS: SubRegion[] = [
  { code: "bo-b", name: "El Beni",    flagUrl: wiki("Flag of Beni Department, Bolivia.svg") },
  { code: "bo-c", name: "Cochabamba", flagUrl: wiki("Flag of Cochabamba.svg") },
  { code: "bo-h", name: "Chuquisaca", flagUrl: wiki("Flag of Chuquisaca & Sucre.svg") },
  { code: "bo-l", name: "La Paz",     flagUrl: wiki("Bandera de La Paz.svg") },
  { code: "bo-n", name: "Pando",      flagUrl: wiki("Flag of Pando.svg") },
  { code: "bo-o", name: "Oruro",      flagUrl: wiki("Flag of Oruro.svg") },
  { code: "bo-p", name: "Potosí",     flagUrl: wiki("Flag of Potosí.svg") },
  { code: "bo-s", name: "Santa Cruz", flagUrl: wiki("Flag of Santa Cruz.svg") },
  { code: "bo-t", name: "Tarija",     flagUrl: wiki("Flag of Tarija.svg") },
]

// ── PARAGUAY (17 departments + Asunción = 18) ─────────────────────────────────
const PY_DEPARTMENTS: SubRegion[] = [
  { code: "py-asu", name: "Asunción",         flagUrl: wiki("Flag of Asunción.svg") },
  { code: "py-1",   name: "Concepción",       flagUrl: wiki("Flag of Concepción Department.svg")   },
  { code: "py-2",   name: "San Pedro",        flagUrl: wiki("Flag of San Pedro Department (Paraguay).svg")   },
  { code: "py-3",   name: "Cordillera",       flagUrl: wiki("Bandera del Departamento de Cordillera.JPG")   },
  { code: "py-4",   name: "Guairá", flagUrl: wiki("Flag of Guairá Department.svg")   },
  { code: "py-5",   name: "Caaguazú",         flagUrl: wiki("Flag of Caaguazú Department.svg")   },
  { code: "py-6",   name: "Caazapá",          flagUrl: wiki("Flag of Caazapá Department.svg")   },
  { code: "py-7",   name: "Itapúa",           flagUrl: wiki("Flag of Itapúa Department.svg")   },
  { code: "py-8",   name: "Misiones",         flagUrl: wiki("Flag of Misiones, Paraguay.svg")   },
  { code: "py-9",   name: "Paraguarí",        flagUrl: wiki("Bandera del Departamento de Paraguarí.JPG")   },
  { code: "py-10",  name: "Alto Paraná",      flagUrl: wiki("Flag of Alto Paraná Department.svg")  },
  { code: "py-11",  name: "Central",          flagUrl: wiki("Flag of Central Department, Paraguay.svg")  },
  { code: "py-12",  name: "Ñeembucú",         flagUrl: wiki("Flag of Ñeembucú Department.svg")  },
  { code: "py-13",  name: "Amambay",          flagUrl: wiki("Flag of Amambay.svg")  },
  { code: "py-14",  name: "Canindeyú",        flagUrl: wiki("Flag of Canindeyú Department.svg")  },
  { code: "py-15",  name: "Presidente Hayes", flagUrl: wiki("Flag of Presidente Hayes Department.svg")  },
  { code: "py-16",  name: "Alto Paraguay",    flagUrl: wiki("Flag of Alto Paraguay Department.svg")  },
  { code: "py-17",  name: "Boquerón",         flagUrl: wiki("Flag of Boquerón Department.svg")  },
]

// ── URUGUAY (19 departments) ──────────────────────────────────────────────────
const UY_DEPARTMENTS: SubRegion[] = [
  { code: "uy-ar", name: "Artigas",      flagUrl: wiki("Flag of Artigas Department.svg") },
  { code: "uy-ca", name: "Canelones",    flagUrl: wiki("Flag of Canelones Department.svg") },
  { code: "uy-cl", name: "Cerro Largo",  flagUrl: wiki("Flag of Cerro Largo Department.svg") },
  { code: "uy-co", name: "Colonia",      flagUrl: wiki("Flag of Colonia Department.svg") },
  { code: "uy-du", name: "Durazno",      flagUrl: wiki("Flag of Durazno Department.svg") },
  { code: "uy-fd", name: "Florida",      flagUrl: wiki("Flag of Florida Department.svg") },
  { code: "uy-fs", name: "Flores",       flagUrl: wiki("Flag of Flores Department.svg") },
  { code: "uy-la", name: "Lavalleja",    flagUrl: wiki("Flag of Lavalleja Department.svg") },
  { code: "uy-ma", name: "Maldonado", flagUrl: wiki("Bandera del Departamento de Maldonado.svg") },
  { code: "uy-mo", name: "Montevideo",   flagUrl: wiki("Flag of Montevideo.svg") },
  { code: "uy-pa", name: "Paysandú",     flagUrl: wiki("Flag of Paysandú Department.svg") },
  { code: "uy-rn", name: "Río Negro",    flagUrl: wiki("Flag of Rio Negro Department.svg") },
  { code: "uy-ro", name: "Rocha",        flagUrl: wiki("Flag of Rocha Department.svg") },
  { code: "uy-rv", name: "Rivera",       flagUrl: wiki("Flag of Uruguay (Rivera).svg") },
  { code: "uy-sa", name: "Salto",        flagUrl: wiki("Flag of Salto Department.svg") },
  { code: "uy-sj", name: "San José",     flagUrl: wiki("Flag of San José Department.svg") },
  { code: "uy-so", name: "Soriano",      flagUrl: wiki("Flag of Soriano Department.svg") },
  { code: "uy-ta", name: "Tacuarembó",   flagUrl: wiki("Bandera de Tacuarembó.svg") },
  { code: "uy-tt", name: "Treinta y Tres", flagUrl: wiki("Flag of Departamento Treinta y Tres.svg") },
]

// ── GUYANA (10 regions) ───────────────────────────────────────────────────────
const GY_REGIONS: SubRegion[] = [
  { code: "gy-ba", name: "Barima-Waini",                 flagUrl: wiki("Flag of Barima-Waini, Guyana.svg") },
  { code: "gy-cu", name: "Cuyuni-Mazaruni", flagUrl: wiki("Flag of Cuyuni-Mazaruni, Guyana.svg") },
  { code: "gy-de", name: "Demerara-Mahaica", flagUrl: wiki("Flag of Demerara-Mahaica, Guyana.svg") },
  { code: "gy-ea", name: "East Berbice-Corentyne", flagUrl: wiki("Flag of East Berbice-Corentyne, Guyana.svg") },
  { code: "gy-es", name: "Essequibo Islands-W. Demerara", flagUrl: wiki("Flag of Essequibo Islands-West Demerara, Guyana.svg") },
  { code: "gy-ma", name: "Mahaica-Berbice", flagUrl: wiki("Flag of Mahaica-Berbice, Guyana.svg") },
  { code: "gy-pm", name: "Pomeroon-Supenaam", flagUrl: wiki("Flag of Pomeroon-Supenaam, Guyana.svg") },
  { code: "gy-pt", name: "Potaro-Siparuni", flagUrl: wiki("Flag of Potaro-Siparuni, Guyana.svg") },
  { code: "gy-ud", name: "Upper Demerara-Berbice", flagUrl: wiki("Flag of Upper Demerara-Berbice, Guyana.svg") },
  { code: "gy-ut", name: "Upper Takutu-Upper Essequibo", flagUrl: wiki("Flag of Upper Takutu-Upper Essequibo, Guyana.svg") },
]

// ── SURINAME (10 districts) ───────────────────────────────────────────────────
const SR_DISTRICTS: SubRegion[] = [
  { code: "sr-br", name: "Brokopondo" },
  { code: "sr-cm", name: "Commewijne" },
  { code: "sr-cr", name: "Coronie" },
  { code: "sr-ma", name: "Marowijne" },
  { code: "sr-ni", name: "Nickerie" },
  { code: "sr-pm", name: "Para" },
  { code: "sr-pr", name: "Paramaribo" },
  { code: "sr-sa", name: "Saramacca" },
  { code: "sr-si", name: "Sipaliwini" },
  { code: "sr-wa", name: "Wanica" },
]

// ─────────────────────────────────────────────────────────────────────────────

export const CHALLENGE_CONTINENTS: ChallengeContinent[] = [
  // ── NORTH AMERICA (Northern + Central) ───────────────────────────────────
  {
    id: "north-america",
    name: "North America",
    emoji: "🌎",
    locked: false,
    countries: [
      // Northern
      { code: "US", name: "United States", emoji: "🇺🇸", subTitle: "50 States + 6 Territories", subRegions: US_STATES, locked: false },
      { code: "CA", name: "Canada", emoji: "🇨🇦", subTitle: "13 Provinces & Territories", subRegions: CA_PROVINCES, locked: false },
      { code: "MX", name: "Mexico", emoji: "🇲🇽", subTitle: "32 States", subRegions: MX_STATES, locked: false },
      // Central America
      { code: "BZ", name: "Belize", emoji: "🇧🇿", subTitle: "6 Districts", subRegions: BZ_DISTRICTS, locked: true },
      { code: "GT", name: "Guatemala", emoji: "🇬🇹", subTitle: "22 Departments", subRegions: GT_DEPARTMENTS, locked: false },
      { code: "HN", name: "Honduras", emoji: "🇭🇳", subTitle: "18 Departments", subRegions: HN_DEPARTMENTS, locked: false },
      { code: "SV", name: "El Salvador", emoji: "🇸🇻", subTitle: "14 Departments", subRegions: SV_DEPARTMENTS, locked: false },
      { code: "NI", name: "Nicaragua", emoji: "🇳🇮", subTitle: "17 Departments", subRegions: NI_DEPARTMENTS, locked: false },
      { code: "CR", name: "Costa Rica", emoji: "🇨🇷", subTitle: "7 Provinces", subRegions: CR_PROVINCES, locked: false },
      { code: "PA", name: "Panama", emoji: "🇵🇦", subTitle: "10 Provinces", subRegions: PA_PROVINCES, locked: false },
    ],
  },

  // ── CARIBBEAN ─────────────────────────────────────────────────────────────
  {
    id: "caribbean",
    name: "Caribbean",
    emoji: "🏝️",
    locked: false,
    countries: [
      { code: "CU", name: "Cuba", emoji: "🇨🇺", subTitle: "15 Provinces", subRegions: CU_PROVINCES, locked: false },
      { code: "HT", name: "Haiti", emoji: "🇭🇹", subTitle: "10 Departments", subRegions: HT_DEPARTMENTS, locked: false },
      { code: "DO", name: "Dominican Republic", emoji: "🇩🇴", subTitle: "32 Provinces", subRegions: DO_PROVINCES, locked: false },

      // ── Jamaica (14 parishes, in 3 historic counties) ────────────────────
      {
        code: "JM", name: "Jamaica", emoji: "🇯🇲", subTitle: "14 Parishes", locked: false,
        subRegions: [
          { code: "jm-ha", name: "Hanover",        group: "Cornwall" },
          { code: "jm-el", name: "St. Elizabeth",  group: "Cornwall" },
          { code: "jm-ja", name: "St. James",      group: "Cornwall" },
          { code: "jm-tr", name: "Trelawny",       group: "Cornwall" },
          { code: "jm-we", name: "Westmoreland",   group: "Cornwall" },
          { code: "jm-cl", name: "Clarendon",      group: "Middlesex" },
          { code: "jm-ma", name: "Manchester",     group: "Middlesex" },
          { code: "jm-an", name: "St. Ann",        group: "Middlesex" },
          { code: "jm-ca", name: "St. Catherine",  group: "Middlesex" },
          { code: "jm-my", name: "St. Mary",       group: "Middlesex" },
          { code: "jm-ki", name: "Kingston",       group: "Surrey" },
          { code: "jm-po", name: "Portland",       group: "Surrey" },
          { code: "jm-ad", name: "St. Andrew",     group: "Surrey" },
          { code: "jm-th", name: "St. Thomas",     group: "Surrey" },
        ],
      },

      // ── Trinidad and Tobago (14 corporations + Tobago) ───────────────────
      // Breaks down weird: Trinidad has 14 municipal corporations (2 cities, 3 boroughs,
      // 9 regions); Tobago is self-governing under the Tobago House of Assembly and has
      // its own flag.
      {
        code: "TT", name: "Trinidad and Tobago", emoji: "🇹🇹", subTitle: "14 Corporations + Tobago", locked: false,
        subRegions: [
          { code: "tt-pos", name: "Port of Spain",            group: "Trinidad" },
          { code: "tt-sfo", name: "San Fernando",             group: "Trinidad" },
          { code: "tt-ari", name: "Arima",                    group: "Trinidad" },
          { code: "tt-cha", name: "Chaguanas",                group: "Trinidad" },
          { code: "tt-ptf", name: "Point Fortin",             group: "Trinidad" },
          { code: "tt-ctt", name: "Couva-Tabaquite-Talparo",  group: "Trinidad" },
          { code: "tt-dmn", name: "Diego Martin",             group: "Trinidad" },
          { code: "tt-mrc", name: "Mayaro-Rio Claro",         group: "Trinidad" },
          { code: "tt-ped", name: "Penal-Debe",               group: "Trinidad" },
          { code: "tt-ptn", name: "Princes Town",             group: "Trinidad" },
          { code: "tt-sge", name: "Sangre Grande",            group: "Trinidad" },
          { code: "tt-sjl", name: "San Juan-Laventille",      group: "Trinidad" },
          { code: "tt-sip", name: "Siparia",                  group: "Trinidad" },
          { code: "tt-tup", name: "Tunapuna-Piarco",          group: "Trinidad" },
          { code: "tt-tob", name: "Tobago", flagUrl: wiki("Flag of Tobago.svg"), group: "Tobago" },
        ],
      },

      // ── Barbados (11 parishes) ───────────────────────────────────────────
      {
        code: "BB", name: "Barbados", emoji: "🇧🇧", subTitle: "11 Parishes", locked: false,
        subRegions: [
          { code: "bb-cc", name: "Christ Church" },
          { code: "bb-an", name: "St. Andrew" },
          { code: "bb-ge", name: "St. George" },
          { code: "bb-ja", name: "St. James" },
          { code: "bb-jo", name: "St. John" },
          { code: "bb-js", name: "St. Joseph" },
          { code: "bb-lu", name: "St. Lucy" },
          { code: "bb-mi", name: "St. Michael" },
          { code: "bb-pe", name: "St. Peter" },
          { code: "bb-ph", name: "St. Philip" },
          { code: "bb-th", name: "St. Thomas" },
        ],
      },

      // ── Saint Lucia (10 districts) ───────────────────────────────────────
      {
        code: "LC", name: "Saint Lucia", emoji: "🇱🇨", subTitle: "10 Districts", locked: false,
        subRegions: [
          { code: "lc-alr", name: "Anse la Raye" },
          { code: "lc-can", name: "Canaries" },
          { code: "lc-cas", name: "Castries" },
          { code: "lc-cho", name: "Choiseul" },
          { code: "lc-den", name: "Dennery" },
          { code: "lc-gro", name: "Gros Islet" },
          { code: "lc-lab", name: "Laborie" },
          { code: "lc-mic", name: "Micoud" },
          { code: "lc-sou", name: "Soufrière" },
          { code: "lc-vfo", name: "Vieux Fort" },
        ],
      },

      // ── Saint Vincent and the Grenadines (6 parishes) ────────────────────
      {
        code: "VC", name: "St Vincent & Grenadines", emoji: "🇻🇨", subTitle: "6 Parishes", locked: false,
        subRegions: [
          { code: "vc-ch", name: "Charlotte" },
          { code: "vc-gr", name: "Grenadines" },
          { code: "vc-an", name: "Saint Andrew" },
          { code: "vc-da", name: "Saint David" },
          { code: "vc-ge", name: "Saint George" },
          { code: "vc-pa", name: "Saint Patrick" },
        ],
      },

      // ── Grenada (6 parishes + Carriacou) ─────────────────────────────────
      {
        code: "GD", name: "Grenada", emoji: "🇬🇩", subTitle: "6 Parishes + Carriacou", locked: false,
        subRegions: [
          { code: "gd-an", name: "Saint Andrew",  group: "Parishes" },
          { code: "gd-da", name: "Saint David",   group: "Parishes" },
          { code: "gd-ge", name: "Saint George",  group: "Parishes" },
          { code: "gd-jo", name: "Saint John",    group: "Parishes" },
          { code: "gd-ma", name: "Saint Mark",    group: "Parishes" },
          { code: "gd-pa", name: "Saint Patrick", group: "Parishes" },
          { code: "gd-ca", name: "Carriacou & Petite Martinique", group: "Dependency" },
        ],
      },

      // ── Antigua and Barbuda (6 parishes + dependencies) ──────────────────
      // The 6 parishes are all on Antigua; Barbuda and Redonda are separate dependencies.
      {
        code: "AG", name: "Antigua and Barbuda", emoji: "🇦🇬", subTitle: "6 Parishes + Dependencies", locked: false,
        subRegions: [
          { code: "ag-ge", name: "Saint George",  group: "Antigua" },
          { code: "ag-jo", name: "Saint John",    group: "Antigua" },
          { code: "ag-ma", name: "Saint Mary",    group: "Antigua" },
          { code: "ag-pa", name: "Saint Paul",    group: "Antigua" },
          { code: "ag-pe", name: "Saint Peter",   group: "Antigua" },
          { code: "ag-ph", name: "Saint Philip",  group: "Antigua" },
          { code: "ag-ba", name: "Barbuda",       flagUrl: wiki("Flag of Barbuda.svg"), group: "Dependencies" },
          { code: "ag-re", name: "Redonda",       group: "Dependencies" },
        ],
      },

      // ── Dominica (10 parishes) ───────────────────────────────────────────
      {
        code: "DM", name: "Dominica", emoji: "🇩🇲", subTitle: "10 Parishes", locked: false,
        subRegions: [
          { code: "dm-an", name: "Saint Andrew" },
          { code: "dm-da", name: "Saint David" },
          { code: "dm-ge", name: "Saint George" },
          { code: "dm-jo", name: "Saint John" },
          { code: "dm-js", name: "Saint Joseph" },
          { code: "dm-lu", name: "Saint Luke" },
          { code: "dm-ma", name: "Saint Mark" },
          { code: "dm-pa", name: "Saint Patrick" },
          { code: "dm-pl", name: "Saint Paul" },
          { code: "dm-pe", name: "Saint Peter" },
        ],
      },

      // ── Saint Kitts and Nevis (14 parishes across 2 islands) ─────────────
      // Nevis is a self-governing island with its own assembly and flag.
      {
        code: "KN", name: "Saint Kitts and Nevis", emoji: "🇰🇳", subTitle: "14 Parishes", locked: false,
        subRegions: [
          { code: "kn-cc", name: "Christ Church Nichola Town", group: "Saint Kitts" },
          { code: "kn-as", name: "Saint Anne Sandy Point",     group: "Saint Kitts" },
          { code: "kn-gb", name: "Saint George Basseterre",    group: "Saint Kitts" },
          { code: "kn-jc", name: "Saint John Capisterre",      group: "Saint Kitts" },
          { code: "kn-mc", name: "Saint Mary Cayon",           group: "Saint Kitts" },
          { code: "kn-pc", name: "Saint Paul Capisterre",      group: "Saint Kitts" },
          { code: "kn-pb", name: "Saint Peter Basseterre",     group: "Saint Kitts" },
          { code: "kn-mi", name: "Saint Thomas Middle Island", group: "Saint Kitts" },
          { code: "kn-tp", name: "Trinity Palmetto Point",     group: "Saint Kitts" },
          { code: "kn-nevis", name: "Nevis", flagUrl: wiki("Flag of Nevis.svg"), group: "Nevis", groupHeader: true },
          { code: "kn-gg", name: "Saint George Gingerland",    group: "Nevis" },
          { code: "kn-jw", name: "Saint James Windward",       group: "Nevis" },
          { code: "kn-jf", name: "Saint John Figtree",         group: "Nevis" },
          { code: "kn-pch",name: "Saint Paul Charlestown",     group: "Nevis" },
          { code: "kn-tl", name: "Saint Thomas Lowland",       group: "Nevis" },
        ],
      },

      // ── Bahamas (31 districts) ───────────────────────────────────────────
      {
        code: "BS", name: "Bahamas", emoji: "🇧🇸", subTitle: "31 Districts", locked: false,
        subRegions: [
          { code: "bs-ack", name: "Acklins" },
          { code: "bs-bry", name: "Berry Islands" },
          { code: "bs-bim", name: "Bimini" },
          { code: "bs-blk", name: "Black Point" },
          { code: "bs-cat", name: "Cat Island" },
          { code: "bs-cab", name: "Central Abaco" },
          { code: "bs-can", name: "Central Andros" },
          { code: "bs-cel", name: "Central Eleuthera" },
          { code: "bs-fre", name: "City of Freeport" },
          { code: "bs-crk", name: "Crooked Island & Long Cay" },
          { code: "bs-egb", name: "East Grand Bahama" },
          { code: "bs-exu", name: "Exuma" },
          { code: "bs-grc", name: "Grand Cay" },
          { code: "bs-hbr", name: "Harbour Island" },
          { code: "bs-hop", name: "Hope Town" },
          { code: "bs-ina", name: "Inagua" },
          { code: "bs-lng", name: "Long Island" },
          { code: "bs-man", name: "Mangrove Cay" },
          { code: "bs-may", name: "Mayaguana" },
          { code: "bs-mor", name: "Moore's Island" },
          { code: "bs-nab", name: "North Abaco" },
          { code: "bs-nan", name: "North Andros" },
          { code: "bs-nel", name: "North Eleuthera" },
          { code: "bs-rag", name: "Ragged Island" },
          { code: "bs-rum", name: "Rum Cay" },
          { code: "bs-sas", name: "San Salvador" },
          { code: "bs-sab", name: "South Abaco" },
          { code: "bs-san", name: "South Andros" },
          { code: "bs-sel", name: "South Eleuthera" },
          { code: "bs-spw", name: "Spanish Wells" },
          { code: "bs-wgb", name: "West Grand Bahama" },
        ],
      },
    ],
  },

  // ── SOUTH AMERICA ─────────────────────────────────────────────────────────
  {
    id: "south-america",
    name: "South America",
    emoji: "🌎",
    locked: false,
    countries: [
      { code: "BR", name: "Brazil", emoji: "🇧🇷", subTitle: "27 States", subRegions: BR_STATES, locked: false },
      { code: "AR", name: "Argentina", emoji: "🇦🇷", subTitle: "24 Provinces", subRegions: AR_PROVINCES, locked: false },
      { code: "CO", name: "Colombia", emoji: "🇨🇴", subTitle: "32 Departments", subRegions: CO_DEPARTMENTS, locked: false },
      { code: "VE", name: "Venezuela", emoji: "🇻🇪", subTitle: "23 States + Capital District", subRegions: VE_STATES, locked: false },
      { code: "PE", name: "Peru", emoji: "🇵🇪", subTitle: "25 Regions", subRegions: PE_REGIONS, locked: false },
      { code: "CL", name: "Chile", emoji: "🇨🇱", subTitle: "16 Regions", subRegions: CL_REGIONS, locked: false },
      { code: "EC", name: "Ecuador", emoji: "🇪🇨", subTitle: "24 Provinces", subRegions: EC_PROVINCES, locked: false },
      { code: "BO", name: "Bolivia", emoji: "🇧🇴", subTitle: "9 Departments", subRegions: BO_DEPARTMENTS, locked: false },
      { code: "PY", name: "Paraguay", emoji: "🇵🇾", subTitle: "17 Departments + Asunción", subRegions: PY_DEPARTMENTS, locked: false },
      { code: "UY", name: "Uruguay", emoji: "🇺🇾", subTitle: "19 Departments", subRegions: UY_DEPARTMENTS, locked: false },
      { code: "GY", name: "Guyana", emoji: "🇬🇾", subTitle: "10 Regions", subRegions: GY_REGIONS, locked: true },
      { code: "SR", name: "Suriname", emoji: "🇸🇷", subTitle: "10 Districts", subRegions: SR_DISTRICTS, locked: true },
    ],
  },

  // ── ASIA ──────────────────────────────────────────────────────────────────
  {
    id: "asia",
    name: "Asia",
    emoji: "🌏",
    locked: false,
    countries: [

      // ── Afghanistan (34 provinces) ───────────────────────────────────────────
      {
        code: "AF", name: "Afghanistan", emoji: "🇦🇫", subTitle: "34 Provinces", locked: false,
        subRegions: [
          { code: "af-bds", name: "Badakhshan" },
          { code: "af-bdg", name: "Badghis" },
          { code: "af-bgl", name: "Baghlan" },
          { code: "af-bal", name: "Balkh" },
          { code: "af-bam", name: "Bamiyan" },
          { code: "af-day", name: "Daykundi" },
          { code: "af-far", name: "Farah" },
          { code: "af-fra", name: "Faryab" },
          { code: "af-gha", name: "Ghazni" },
          { code: "af-gho", name: "Ghor" },
          { code: "af-hel", name: "Helmand" },
          { code: "af-her", name: "Herat" },
          { code: "af-jow", name: "Jowzjan" },
          { code: "af-kab", name: "Kabul" },
          { code: "af-kan", name: "Kandahar" },
          { code: "af-kap", name: "Kapisa" },
          { code: "af-kho", name: "Khost" },
          { code: "af-kna", name: "Kunar" },
          { code: "af-kun", name: "Kunduz" },
          { code: "af-lag", name: "Laghman" },
          { code: "af-log", name: "Logar" },
          { code: "af-nan", name: "Nangarhar" },
          { code: "af-nim", name: "Nimruz" },
          { code: "af-nur", name: "Nuristan" },
          { code: "af-ora", name: "Orūzgān" },
          { code: "af-pan", name: "Panjshir" },
          { code: "af-par", name: "Parwan" },
          { code: "af-pik", name: "Paktika" },
          { code: "af-pkt", name: "Paktiya" },
          { code: "af-sam", name: "Samangan" },
          { code: "af-sar", name: "Sar-e Pol" },
          { code: "af-tak", name: "Takhar" },
          { code: "af-war", name: "Wardak" },
          { code: "af-zab", name: "Zabul" },
        ],
      },

      // ── Armenia (11 provinces) ───────────────────────────────────────────────
      {
        code: "AM", name: "Armenia", emoji: "🇦🇲", subTitle: "11 Provinces", locked: false,
        subRegions: [
          { code: "am-ag", name: "Aragatsotn" },
          { code: "am-ar", name: "Ararat" },
          { code: "am-av", name: "Armavir" },
          { code: "am-gr", name: "Gegharkunik" },
          { code: "am-kt", name: "Kotayk" },
          { code: "am-lo", name: "Lori" },
          { code: "am-sh", name: "Shirak" },
          { code: "am-su", name: "Syunik" },
          { code: "am-tv", name: "Tavush" },
          { code: "am-vd", name: "Vayots Dzor" },
          { code: "am-er", name: "Yerevan" },
        ],
      },

      // ── Azerbaijan (66 districts + Baku + Nakhchivan AR) ─────────────────────
      {
        code: "AZ", name: "Azerbaijan", emoji: "🇦🇿", subTitle: "66 Districts + AR", locked: false,
        subRegions: [
          // Absheron-Khizi
          { code: "az-bak", name: "Baku",         group: "Absheron-Khizi" },
          { code: "az-abs", name: "Absheron",      group: "Absheron-Khizi" },
          { code: "az-khi", name: "Khizi",         group: "Absheron-Khizi" },
          // Ganja-Dashkasan
          { code: "az-ga",  name: "Ganja",         group: "Ganja-Dashkasan" },
          { code: "az-das", name: "Dashkasan",     group: "Ganja-Dashkasan" },
          { code: "az-gad", name: "Gadabay",       group: "Ganja-Dashkasan" },
          { code: "az-gyg", name: "Goygol",        group: "Ganja-Dashkasan" },
          { code: "az-sam", name: "Samukh",        group: "Ganja-Dashkasan" },
          { code: "az-smk", name: "Shamkir",       group: "Ganja-Dashkasan" },
          { code: "az-tov", name: "Tovuz",         group: "Ganja-Dashkasan" },
          // Guba-Khachmaz
          { code: "az-qba", name: "Guba",          group: "Guba-Khachmaz" },
          { code: "az-gus", name: "Gusar",         group: "Guba-Khachmaz" },
          { code: "az-kha", name: "Khachmaz",      group: "Guba-Khachmaz" },
          { code: "az-qab", name: "Qabala",        group: "Guba-Khachmaz" },
          { code: "az-shb", name: "Shabran",       group: "Guba-Khachmaz" },
          { code: "az-sia", name: "Siazan",        group: "Guba-Khachmaz" },
          // Aran
          { code: "az-agj", name: "Aghjabadi",     group: "Aran" },
          { code: "az-agd", name: "Agdash",        group: "Aran" },
          { code: "az-bar", name: "Barda",         group: "Aran" },
          { code: "az-bey", name: "Beylagan",      group: "Aran" },
          { code: "az-bil", name: "Bilasuvar",     group: "Aran" },
          { code: "az-gor", name: "Goranboy",      group: "Aran" },
          { code: "az-hac", name: "Hajigabul",     group: "Aran" },
          { code: "az-imi", name: "Imishli",       group: "Aran" },
          { code: "az-kur", name: "Kurdamir",      group: "Aran" },
          { code: "az-mi",  name: "Mingachevir",   group: "Aran" },
          { code: "az-nef", name: "Neftchala",     group: "Aran" },
          { code: "az-sat", name: "Saatly",        group: "Aran" },
          { code: "az-sbr", name: "Sabirabad",     group: "Aran" },
          { code: "az-sal", name: "Salyan",        group: "Aran" },
          { code: "az-sr",  name: "Shirvan",       group: "Aran" },
          { code: "az-uja", name: "Ujar",          group: "Aran" },
          { code: "az-yev", name: "Yevlakh",       group: "Aran" },
          { code: "az-zrd", name: "Zardab",        group: "Aran" },
          // Yukhari Karabakh
          { code: "az-aga", name: "Agdam",         group: "Yukhari Karabakh" },
          { code: "az-fuz", name: "Fuzuli",        group: "Yukhari Karabakh" },
          { code: "az-cab", name: "Jabrayil",      group: "Yukhari Karabakh" },
          { code: "az-xoc", name: "Khojaly",       group: "Yukhari Karabakh" },
          { code: "az-xkv", name: "Khojavend",     group: "Yukhari Karabakh" },
          { code: "az-qbi", name: "Qubadli",       group: "Yukhari Karabakh" },
          { code: "az-sus", name: "Shusha",        group: "Yukhari Karabakh" },
          { code: "az-tar", name: "Tartar",        group: "Yukhari Karabakh" },
          { code: "az-zan", name: "Zangilan",      group: "Yukhari Karabakh" },
          // Kalbajar-Lachin
          { code: "az-kal", name: "Kalbajar",      group: "Kalbajar-Lachin" },
          { code: "az-lac", name: "Lachin",        group: "Kalbajar-Lachin" },
          // Lankaran
          { code: "az-ast", name: "Astara",        group: "Lankaran" },
          { code: "az-cal", name: "Jalilabad",     group: "Lankaran" },
          { code: "az-lan", name: "Lankaran",      group: "Lankaran" },
          { code: "az-ler", name: "Lerik",         group: "Lankaran" },
          { code: "az-mas", name: "Masally",       group: "Lankaran" },
          { code: "az-yar", name: "Yardymli",      group: "Lankaran" },
          // Shaki-Zagatala
          { code: "az-bal", name: "Balakan",       group: "Shaki-Zagatala" },
          { code: "az-qax", name: "Gakh",          group: "Shaki-Zagatala" },
          { code: "az-ogu", name: "Oghuz",         group: "Shaki-Zagatala" },
          { code: "az-sha", name: "Shaki",         group: "Shaki-Zagatala" },
          { code: "az-zaq", name: "Zaqatala",      group: "Shaki-Zagatala" },
          // Shirvan
          { code: "az-ags", name: "Agsu",          group: "Shirvan" },
          { code: "az-goy", name: "Goychay",       group: "Shirvan" },
          { code: "az-ism", name: "Ismayilli",     group: "Shirvan" },
          { code: "az-qob", name: "Qobustan",      group: "Shirvan" },
          { code: "az-smh", name: "Shamakhi",      group: "Shirvan" },
          // Nakhchivan AR
          { code: "az-nax", name: "Nakhchivan AR", group: "Nakhchivan" },
          { code: "az-bab", name: "Babek",         group: "Nakhchivan" },
          { code: "az-cul", name: "Julfa",         group: "Nakhchivan" },
          { code: "az-kan", name: "Kangarli",      group: "Nakhchivan" },
          { code: "az-ord", name: "Ordubad",       group: "Nakhchivan" },
          { code: "az-sad", name: "Sadarak",       group: "Nakhchivan" },
          { code: "az-shr", name: "Sharur",        group: "Nakhchivan" },
        ],
      },

      // ── Bangladesh (8 divisions) ─────────────────────────────────────────────
      {
        code: "BD", name: "Bangladesh", emoji: "🇧🇩", subTitle: "8 Divisions", locked: false,
        subRegions: [
          { code: "bd-a", name: "Barishal" },
          { code: "bd-b", name: "Chittagong" },
          { code: "bd-c", name: "Dhaka" },
          { code: "bd-d", name: "Khulna" },
          { code: "bd-e", name: "Mymensingh" },
          { code: "bd-f", name: "Rajshahi" },
          { code: "bd-g", name: "Rangpur" },
          { code: "bd-h", name: "Sylhet" },
        ],
      },

      // ── Bhutan (20 districts) ────────────────────────────────────────────────
      {
        code: "BT", name: "Bhutan", emoji: "🇧🇹", subTitle: "20 Districts", locked: false,
        subRegions: [
          { code: "bt-bu", name: "Bumthang" },
          { code: "bt-ch", name: "Chhukha" },
          { code: "bt-da", name: "Dagana" },
          { code: "bt-ga", name: "Gasa" },
          { code: "bt-ha", name: "Haa" },
          { code: "bt-lh", name: "Lhuntse" },
          { code: "bt-mo", name: "Mongar" },
          { code: "bt-pa", name: "Paro" },
          { code: "bt-pe", name: "Pemagatshel" },
          { code: "bt-pu", name: "Punakha" },
          { code: "bt-sj", name: "Samdrup Jongkhar" },
          { code: "bt-sm", name: "Samtse" },
          { code: "bt-sr", name: "Sarpang" },
          { code: "bt-th", name: "Thimphu" },
          { code: "bt-tg", name: "Trashigang" },
          { code: "bt-ty", name: "Trashi Yangtse" },
          { code: "bt-to", name: "Trongsa" },
          { code: "bt-ts", name: "Tsirang" },
          { code: "bt-wp", name: "Wangdue Phodrang" },
          { code: "bt-zh", name: "Zhemgang" },
        ],
      },

      // ── Brunei (4 districts) ─────────────────────────────────────────────────
      {
        code: "BN", name: "Brunei", emoji: "🇧🇳", subTitle: "4 Districts", locked: false,
        subRegions: [
          { code: "bn-be", name: "Belait" },
          { code: "bn-bm", name: "Brunei-Muara" },
          { code: "bn-te", name: "Temburong" },
          { code: "bn-tu", name: "Tutong" },
        ],
      },

      // ── Cambodia (25 provinces) ──────────────────────────────────────────────
      {
        code: "KH", name: "Cambodia", emoji: "🇰🇭", subTitle: "25 Provinces", locked: false,
        subRegions: [
          { code: "kh-1",  name: "Banteay Meanchey" },
          { code: "kh-2",  name: "Battambang" },
          { code: "kh-3",  name: "Kampong Cham" },
          { code: "kh-4",  name: "Kampong Chhnang" },
          { code: "kh-5",  name: "Kampong Speu" },
          { code: "kh-6",  name: "Kampong Thom" },
          { code: "kh-7",  name: "Kampot" },
          { code: "kh-8",  name: "Kandal" },
          { code: "kh-9",  name: "Kep" },
          { code: "kh-10", name: "Koh Kong" },
          { code: "kh-11", name: "Kratié" },
          { code: "kh-12", name: "Mondulkiri" },
          { code: "kh-13", name: "Oddar Meanchey" },
          { code: "kh-14", name: "Pailin" },
          { code: "kh-15", name: "Phnom Penh" },
          { code: "kh-16", name: "Preah Sihanouk" },
          { code: "kh-17", name: "Preah Vihear" },
          { code: "kh-18", name: "Prey Veng" },
          { code: "kh-19", name: "Pursat" },
          { code: "kh-20", name: "Ratanakiri" },
          { code: "kh-21", name: "Siem Reap" },
          { code: "kh-22", name: "Stung Treng" },
          { code: "kh-23", name: "Svay Rieng" },
          { code: "kh-24", name: "Takéo" },
          { code: "kh-25", name: "Tboung Khmum" },
        ],
      },

      // ── China (34 province-level divisions) ──────────────────────────────────
      {
        code: "CN", name: "China", emoji: "🇨🇳", subTitle: "34 Province-Level Divisions", locked: false,
        subRegions: [
          // Provinces
          { code: "cn-ah",  name: "Anhui",          group: "Provinces" },
          { code: "cn-fj",  name: "Fujian",         group: "Provinces" },
          { code: "cn-gs",  name: "Gansu",          group: "Provinces" },
          { code: "cn-gd",  name: "Guangdong",      group: "Provinces" },
          { code: "cn-gz",  name: "Guizhou",        group: "Provinces" },
          { code: "cn-hi",  name: "Hainan",         group: "Provinces" },
          { code: "cn-he",  name: "Hebei",          group: "Provinces" },
          { code: "cn-hl",  name: "Heilongjiang",   group: "Provinces" },
          { code: "cn-ha",  name: "Henan",          group: "Provinces" },
          { code: "cn-hb",  name: "Hubei",          group: "Provinces" },
          { code: "cn-hn",  name: "Hunan",          group: "Provinces" },
          { code: "cn-js",  name: "Jiangsu",        group: "Provinces" },
          { code: "cn-jx",  name: "Jiangxi",        group: "Provinces" },
          { code: "cn-jl",  name: "Jilin",          group: "Provinces" },
          { code: "cn-ln",  name: "Liaoning",       group: "Provinces" },
          { code: "cn-qh",  name: "Qinghai",        group: "Provinces" },
          { code: "cn-sn",  name: "Shaanxi",        group: "Provinces" },
          { code: "cn-sd",  name: "Shandong",       group: "Provinces" },
          { code: "cn-sx",  name: "Shanxi",         group: "Provinces" },
          { code: "cn-sc",  name: "Sichuan",        group: "Provinces" },
          { code: "cn-tw",  name: "Taiwan",         group: "Provinces" },
          { code: "cn-yn",  name: "Yunnan",         group: "Provinces" },
          { code: "cn-zj",  name: "Zhejiang",       group: "Provinces" },
          // Municipalities
          { code: "cn-bj",  name: "Beijing",        group: "Municipalities" },
          { code: "cn-cq",  name: "Chongqing",      group: "Municipalities" },
          { code: "cn-sh",  name: "Shanghai",       group: "Municipalities" },
          { code: "cn-tj",  name: "Tianjin",        group: "Municipalities" },
          // Autonomous Regions
          { code: "cn-gx",  name: "Guangxi",        group: "Autonomous Regions" },
          { code: "cn-nm",  name: "Inner Mongolia", group: "Autonomous Regions" },
          { code: "cn-nx",  name: "Ningxia",        group: "Autonomous Regions" },
          { code: "cn-xj",  name: "Xinjiang",       group: "Autonomous Regions" },
          { code: "cn-xz",  name: "Tibet",          group: "Autonomous Regions" },
          // Special Administrative Regions
          { code: "cn-hk",  name: "Hong Kong", flagUrl: "/flags/hk.svg",      group: "Special Administrative Regions" },
          { code: "cn-mo",  name: "Macao", flagUrl: "/flags/mo.svg",          group: "Special Administrative Regions" },
        ],
      },

      // ── Georgia (12 first-level divisions) ───────────────────────────────────
      {
        code: "GE", name: "Georgia", emoji: "🇬🇪", subTitle: "12 Regions & ARs", locked: false,
        subRegions: [
          { code: "ge-ab", name: "Abkhazia", flagUrl: wiki("Flag of the Republic of Abkhazia.svg"),                              group: "Autonomous Republics" },
          { code: "ge-aj", name: "Adjara", flagUrl: wiki("Flag of Adjara.svg"),                                group: "Autonomous Republics" },
          { code: "ge-tb", name: "Tbilisi",                               group: "Capital" },
          { code: "ge-gu", name: "Guria",                                 group: "Regions" },
          { code: "ge-im", name: "Imereti",                               group: "Regions" },
          { code: "ge-ka", name: "Kakheti",                               group: "Regions" },
          { code: "ge-kv", name: "Kvemo Kartli",                          group: "Regions" },
          { code: "ge-mc", name: "Mtskheta-Mtianeti",                     group: "Regions" },
          { code: "ge-ra", name: "Racha-Lechkhumi and Kvemo Svaneti",     group: "Regions" },
          { code: "ge-sk", name: "Samegrelo-Zemo Svaneti",                group: "Regions" },
          { code: "ge-sm", name: "Samtskhe-Javakheti",                    group: "Regions" },
          { code: "ge-sz", name: "Shida Kartli",                          group: "Regions" },
        ],
      },

      // ── India (36 states & union territories) ────────────────────────────────
      {
        code: "IN", name: "India", emoji: "🇮🇳", subTitle: "36 States & Union Territories", locked: false,
        subRegions: [
          // States
          { code: "in-ap", name: "Andhra Pradesh",                        group: "States" },
          { code: "in-ar", name: "Arunachal Pradesh",                     group: "States" },
          { code: "in-as", name: "Assam",                                 group: "States" },
          { code: "in-br", name: "Bihar",                                 group: "States" },
          { code: "in-cg", name: "Chhattisgarh",                         group: "States" },
          { code: "in-ga", name: "Goa",                                   group: "States" },
          { code: "in-gj", name: "Gujarat",                               group: "States" },
          { code: "in-hr", name: "Haryana",                               group: "States" },
          { code: "in-hp", name: "Himachal Pradesh",                      group: "States" },
          { code: "in-jh", name: "Jharkhand",                             group: "States" },
          { code: "in-ka", name: "Karnataka",                             group: "States" },
          { code: "in-kl", name: "Kerala",                                group: "States" },
          { code: "in-mp", name: "Madhya Pradesh",                        group: "States" },
          { code: "in-mh", name: "Maharashtra",                           group: "States" },
          { code: "in-mn", name: "Manipur",                               group: "States" },
          { code: "in-ml", name: "Meghalaya",                             group: "States" },
          { code: "in-mz", name: "Mizoram",                               group: "States" },
          { code: "in-nl", name: "Nagaland",                              group: "States" },
          { code: "in-or", name: "Odisha",                                group: "States" },
          { code: "in-pb", name: "Punjab",                                group: "States" },
          { code: "in-rj", name: "Rajasthan",                             group: "States" },
          { code: "in-sk", name: "Sikkim",                                group: "States" },
          { code: "in-tn", name: "Tamil Nadu",                            group: "States" },
          { code: "in-tg", name: "Telangana",                             group: "States" },
          { code: "in-tr", name: "Tripura",                               group: "States" },
          { code: "in-up", name: "Uttar Pradesh",                         group: "States" },
          { code: "in-ut", name: "Uttarakhand",                           group: "States" },
          { code: "in-wb", name: "West Bengal",                           group: "States" },
          // Union Territories
          { code: "in-an", name: "Andaman and Nicobar Islands",           group: "Union Territories" },
          { code: "in-ch", name: "Chandigarh",                            group: "Union Territories" },
          { code: "in-dn", name: "Dadra & Nagar Haveli and Daman & Diu",  group: "Union Territories" },
          { code: "in-dl", name: "Delhi",                                 group: "Union Territories" },
          { code: "in-jk", name: "Jammu and Kashmir",                     group: "Union Territories" },
          { code: "in-la", name: "Ladakh",                                group: "Union Territories" },
          { code: "in-ld", name: "Lakshadweep",                           group: "Union Territories" },
          { code: "in-py", name: "Puducherry",                            group: "Union Territories" },
        ],
      },

      // ── Indonesia (38 provinces) ─────────────────────────────────────────────
      {
        code: "ID", name: "Indonesia", emoji: "🇮🇩", subTitle: "38 Provinces", locked: false,
        subRegions: [
          // Sumatra
          { code: "id-ac", name: "Aceh", flagUrl: wiki("Flag of Aceh, Indonesia.svg"),                    group: "Sumatra" },
          { code: "id-su", name: "North Sumatra", flagUrl: wiki("Flag of North Sumatra.svg"),           group: "Sumatra" },
          { code: "id-sb", name: "West Sumatra", flagUrl: wiki("Flag of West Sumatra.svg"),            group: "Sumatra" },
          { code: "id-ri", name: "Riau", flagUrl: wiki("Flag of Riau.svg"),                    group: "Sumatra" },
          { code: "id-ja", name: "Jambi", flagUrl: wiki("Flag of Jambi.svg"),                   group: "Sumatra" },
          { code: "id-ss", name: "South Sumatra", flagUrl: wiki("Flag of South Sumatra (vectorised).svg"),           group: "Sumatra" },
          { code: "id-be", name: "Bengkulu", flagUrl: wiki("Flag of Bengkulu.svg"),                group: "Sumatra" },
          { code: "id-la", name: "Lampung", flagUrl: wiki("Flag of Lampung.svg"),                 group: "Sumatra" },
          { code: "id-bb", name: "Bangka Belitung Islands", flagUrl: wiki("Flag of Bangka-Belitung.svg"), group: "Sumatra" },
          { code: "id-kr", name: "Riau Islands", flagUrl: wiki("Flag of Riau Islands.svg"),            group: "Sumatra" },
          // Java
          { code: "id-jk", name: "Jakarta", flagUrl: wiki("Flag of Jakarta (vectorised).svg"),                 group: "Java" },
          { code: "id-jb", name: "West Java", flagUrl: wiki("Flag of West Java (vectorised).svg"),               group: "Java" },
          { code: "id-bt", name: "Banten", flagUrl: wiki("Flag of Banten, Indonesia.svg"),                  group: "Java" },
          { code: "id-jt", name: "Central Java", flagUrl: wiki("Flag of Central Java.svg"),            group: "Java" },
          { code: "id-yo", name: "Yogyakarta", flagUrl: wiki("Flag of Yogyakarta.svg"),              group: "Java" },
          { code: "id-ji", name: "East Java", flagUrl: wiki("Flag of East Java.svg"),               group: "Java" },
          // Bali & Nusa Tenggara
          { code: "id-ba", name: "Bali", flagUrl: wiki("Flag of Bali.svg"),                    group: "Bali & Nusa Tenggara" },
          { code: "id-nb", name: "West Nusa Tenggara", flagUrl: wiki("Flag of West Nusa Tenggara.svg"),      group: "Bali & Nusa Tenggara" },
          { code: "id-nt", name: "East Nusa Tenggara", flagUrl: wiki("Flag of East Nusa Tenggara.svg"),      group: "Bali & Nusa Tenggara" },
          // Kalimantan
          { code: "id-kb", name: "West Kalimantan", flagUrl: wiki("Flag of West Kalimantan.svg"),         group: "Kalimantan" },
          { code: "id-kt", name: "Central Kalimantan", flagUrl: wiki("Flag of Central Kalimantan.svg"),      group: "Kalimantan" },
          { code: "id-ks", name: "South Kalimantan", flagUrl: wiki("Flag of South Kalimantan.svg"),        group: "Kalimantan" },
          { code: "id-ki", name: "East Kalimantan", flagUrl: wiki("Flag of East Kalimantan.svg"),         group: "Kalimantan" },
          { code: "id-ku", name: "North Kalimantan", flagUrl: wiki("Flag of North Kalimantan.svg"),        group: "Kalimantan" },
          // Sulawesi
          { code: "id-sa", name: "North Sulawesi", flagUrl: wiki("Flag of North Sulawesi.svg"),          group: "Sulawesi" },
          { code: "id-go", name: "Gorontalo", flagUrl: wiki("Flag of Gorontalo.svg"),               group: "Sulawesi" },
          { code: "id-st", name: "Central Sulawesi", flagUrl: wiki("Flag of Central Sulawesi.svg"),        group: "Sulawesi" },
          { code: "id-sr", name: "West Sulawesi", flagUrl: wiki("Flag of West Sulawesi.svg"),           group: "Sulawesi" },
          { code: "id-sn", name: "South Sulawesi", flagUrl: wiki("Flag of South Sulawesi.svg"),          group: "Sulawesi" },
          { code: "id-sg", name: "Southeast Sulawesi", flagUrl: wiki("Flag of Southeast Sulawesi.svg"),      group: "Sulawesi" },
          // Maluku
          { code: "id-ma", name: "Maluku", flagUrl: wiki("Flag of Maluku.svg"),                  group: "Maluku" },
          { code: "id-mu", name: "North Maluku", flagUrl: wiki("Flag of North Maluku.svg"),            group: "Maluku" },
          // Papua
          { code: "id-pa", name: "Papua", flagUrl: wiki("Flag of Papua.svg"),                   group: "Papua" },
          { code: "id-pb", name: "West Papua", flagUrl: wiki("Flag of West Papua (vectorised).svg"),              group: "Papua" },
          { code: "id-ps", name: "South Papua", flagUrl: wiki("Flag of South Papua Province.svg"),             group: "Papua" },
          { code: "id-pt", name: "Central Papua", flagUrl: wiki("Flag of Central Papua Province.svg"),           group: "Papua" },
          { code: "id-pe", name: "Highland Papua", flagUrl: wiki("Flag of Highland Papua.svg"),          group: "Papua" },
          { code: "id-pw", name: "Southwest Papua", flagUrl: wiki("Flag of Southwest Papua.svg"),         group: "Papua" },
        ],
      },

      // ── Japan (47 prefectures) ───────────────────────────────────────────────
      {
        code: "JP", name: "Japan", emoji: "🇯🇵", subTitle: "47 Prefectures", locked: false,
        subRegions: [
          // Hokkaido
          { code: "jp-01", name: "Hokkaido", flagUrl: wiki("Flag of Hokkaido Prefecture.svg"),   group: "Hokkaido" },
          // Tohoku
          { code: "jp-02", name: "Aomori", flagUrl: wiki("Flag of Aomori Prefecture.svg"),     group: "Tohoku" },
          { code: "jp-03", name: "Iwate", flagUrl: wiki("Flag of Iwate Prefecture.svg"),      group: "Tohoku" },
          { code: "jp-04", name: "Miyagi", flagUrl: wiki("Flag of Miyagi Prefecture.svg"),     group: "Tohoku" },
          { code: "jp-05", name: "Akita", flagUrl: wiki("Flag of Akita Prefecture.svg"),      group: "Tohoku" },
          { code: "jp-06", name: "Yamagata", flagUrl: wiki("Flag of Yamagata Prefecture.svg"),   group: "Tohoku" },
          { code: "jp-07", name: "Fukushima", flagUrl: wiki("Flag of Fukushima Prefecture.svg"),  group: "Tohoku" },
          // Kanto
          { code: "jp-08", name: "Ibaraki", flagUrl: wiki("Flag of Ibaraki Prefecture.svg"),    group: "Kanto" },
          { code: "jp-09", name: "Tochigi", flagUrl: wiki("Flag of Tochigi Prefecture.svg"),    group: "Kanto" },
          { code: "jp-10", name: "Gunma", flagUrl: wiki("Flag of Gunma Prefecture.svg"),      group: "Kanto" },
          { code: "jp-11", name: "Saitama", flagUrl: wiki("Flag of Saitama Prefecture.svg"),    group: "Kanto" },
          { code: "jp-12", name: "Chiba", flagUrl: wiki("Flag of Chiba Prefecture.svg"),      group: "Kanto" },
          { code: "jp-13", name: "Tokyo", flagUrl: wiki("Flag of Tokyo Metropolis.svg"),      group: "Kanto" },
          { code: "jp-14", name: "Kanagawa", flagUrl: wiki("Flag of Kanagawa Prefecture.svg"),   group: "Kanto" },
          // Chubu
          { code: "jp-15", name: "Niigata", flagUrl: wiki("Flag of Niigata Prefecture.svg"),    group: "Chubu" },
          { code: "jp-16", name: "Toyama", flagUrl: wiki("Flag of Toyama Prefecture.svg"),     group: "Chubu" },
          { code: "jp-17", name: "Ishikawa", flagUrl: wiki("Flag of Ishikawa Prefecture.svg"),   group: "Chubu" },
          { code: "jp-18", name: "Fukui", flagUrl: wiki("Flag of Fukui Prefecture.svg"),      group: "Chubu" },
          { code: "jp-19", name: "Yamanashi", flagUrl: wiki("Flag of Yamanashi Prefecture.svg"),  group: "Chubu" },
          { code: "jp-20", name: "Nagano", flagUrl: wiki("Flag of Nagano Prefecture.svg"),     group: "Chubu" },
          { code: "jp-21", name: "Gifu", flagUrl: wiki("Flag of Gifu Prefecture.svg"),       group: "Chubu" },
          { code: "jp-22", name: "Shizuoka", flagUrl: wiki("Flag of Shizuoka Prefecture.svg"),   group: "Chubu" },
          { code: "jp-23", name: "Aichi", flagUrl: wiki("Flag of Aichi Prefecture.svg"),      group: "Chubu" },
          // Kansai
          { code: "jp-24", name: "Mie", flagUrl: wiki("Flag of Mie Prefecture.svg"),        group: "Kansai" },
          { code: "jp-25", name: "Shiga", flagUrl: wiki("Flag of Shiga Prefecture.svg"),      group: "Kansai" },
          { code: "jp-26", name: "Kyoto", flagUrl: wiki("Flag of Kyoto Prefecture.svg"),      group: "Kansai" },
          { code: "jp-27", name: "Osaka", flagUrl: wiki("Flag of Osaka Prefecture.svg"),      group: "Kansai" },
          { code: "jp-28", name: "Hyogo", flagUrl: wiki("Flag of Hyogo Prefecture.svg"),      group: "Kansai" },
          { code: "jp-29", name: "Nara", flagUrl: wiki("Flag of Nara Prefecture.svg"),       group: "Kansai" },
          { code: "jp-30", name: "Wakayama", flagUrl: wiki("Flag of Wakayama Prefecture.svg"),   group: "Kansai" },
          // Chugoku
          { code: "jp-31", name: "Tottori", flagUrl: wiki("Flag of Tottori Prefecture.svg"),    group: "Chugoku" },
          { code: "jp-32", name: "Shimane", flagUrl: wiki("Flag of Shimane Prefecture.svg"),    group: "Chugoku" },
          { code: "jp-33", name: "Okayama", flagUrl: wiki("Flag of Okayama Prefecture.svg"),    group: "Chugoku" },
          { code: "jp-34", name: "Hiroshima", flagUrl: wiki("Flag of Hiroshima Prefecture.svg"),  group: "Chugoku" },
          { code: "jp-35", name: "Yamaguchi", flagUrl: wiki("Flag of Yamaguchi Prefecture.svg"),  group: "Chugoku" },
          // Shikoku
          { code: "jp-36", name: "Tokushima", flagUrl: wiki("Flag of Tokushima Prefecture.svg"),  group: "Shikoku" },
          { code: "jp-37", name: "Kagawa", flagUrl: wiki("Flag of Kagawa Prefecture.svg"),     group: "Shikoku" },
          { code: "jp-38", name: "Ehime", flagUrl: wiki("Flag of Ehime Prefecture.svg"),      group: "Shikoku" },
          { code: "jp-39", name: "Kochi", flagUrl: wiki("Flag of Kochi Prefecture.svg"),      group: "Shikoku" },
          // Kyushu & Okinawa
          { code: "jp-40", name: "Fukuoka", flagUrl: wiki("Flag of Fukuoka Prefecture.svg"),    group: "Kyushu & Okinawa" },
          { code: "jp-41", name: "Saga", flagUrl: wiki("Flag of Saga Prefecture.svg"),       group: "Kyushu & Okinawa" },
          { code: "jp-42", name: "Nagasaki", flagUrl: wiki("Flag of Nagasaki Prefecture.svg"),   group: "Kyushu & Okinawa" },
          { code: "jp-43", name: "Kumamoto", flagUrl: wiki("Flag of Kumamoto Prefecture.svg"),   group: "Kyushu & Okinawa" },
          { code: "jp-44", name: "Oita", flagUrl: wiki("Flag of Oita Prefecture.svg"),       group: "Kyushu & Okinawa" },
          { code: "jp-45", name: "Miyazaki", flagUrl: wiki("Flag of Miyazaki Prefecture.svg"),   group: "Kyushu & Okinawa" },
          { code: "jp-46", name: "Kagoshima", flagUrl: wiki("Flag of Kagoshima Prefecture.svg"),  group: "Kyushu & Okinawa" },
          { code: "jp-47", name: "Okinawa", flagUrl: wiki("Flag of Okinawa Prefecture.svg"),    group: "Kyushu & Okinawa" },
        ],
      },

      // ── Kazakhstan (20 regions) ──────────────────────────────────────────────
      {
        code: "KZ", name: "Kazakhstan", emoji: "🇰🇿", subTitle: "20 Regions", locked: false,
        subRegions: [
          { code: "kz-akm", name: "Akmola" },
          { code: "kz-akt", name: "Aktobe" },
          { code: "kz-ala", name: "Almaty Region" },
          { code: "kz-alm", name: "Almaty City" },
          { code: "kz-ast", name: "Astana" },
          { code: "kz-atr", name: "Atyrau" },
          { code: "kz-aba", name: "Abai" },
          { code: "kz-ek",  name: "East Kazakhstan" },
          { code: "kz-zha", name: "Jambyl" },
          { code: "kz-jet", name: "Jetisu" },
          { code: "kz-kar", name: "Karaganda" },
          { code: "kz-kos", name: "Kostanay" },
          { code: "kz-kzy", name: "Kyzylorda" },
          { code: "kz-mng", name: "Mangystau" },
          { code: "kz-nko", name: "North Kazakhstan" },
          { code: "kz-pav", name: "Pavlodar" },
          { code: "kz-sky", name: "Shymkent" },
          { code: "kz-tur", name: "Turkistan" },
          { code: "kz-uly", name: "Ulytau" },
          { code: "kz-wk",  name: "West Kazakhstan" },
        ],
      },

      // ── Kyrgyzstan (9 regions) ───────────────────────────────────────────────
      {
        code: "KG", name: "Kyrgyzstan", emoji: "🇰🇬", subTitle: "9 Regions", locked: false,
        subRegions: [
          { code: "kg-b",    name: "Batken" },
          { code: "kg-bish", name: "Bishkek" },
          { code: "kg-c",    name: "Chuy" },
          { code: "kg-n",    name: "Issyk-Kul" },
          { code: "kg-j",    name: "Jalal-Abad" },
          { code: "kg-go",   name: "Naryn" },
          { code: "kg-o",    name: "Osh Region" },
          { code: "kg-osh",  name: "Osh City" },
          { code: "kg-t",    name: "Talas" },
        ],
      },

      // ── Laos (18 provinces + Vientiane Prefecture) ───────────────────────────
      {
        code: "LA", name: "Laos", emoji: "🇱🇦", subTitle: "18 Provinces + Prefecture", locked: false,
        subRegions: [
          { code: "la-at", name: "Attapeu" },
          { code: "la-bk", name: "Bokeo" },
          { code: "la-bl", name: "Bolikhamxai" },
          { code: "la-ch", name: "Champasak" },
          { code: "la-hu", name: "Houaphanh" },
          { code: "la-kh", name: "Khammouane" },
          { code: "la-lu", name: "Luang Namtha" },
          { code: "la-lp", name: "Luang Prabang" },
          { code: "la-og", name: "Oudomxay" },
          { code: "la-ph", name: "Phongsali" },
          { code: "la-sl", name: "Salavan" },
          { code: "la-sv", name: "Savannakhet" },
          { code: "la-vi", name: "Vientiane Province" },
          { code: "la-vt", name: "Vientiane Prefecture" },
          { code: "la-xk", name: "Xaisomboun" },
          { code: "la-xe", name: "Xekong" },
          { code: "la-xi", name: "Xiangkhouang" },
        ],
      },

      // ── Malaysia (16 states & federal territories) ───────────────────────────
      {
        code: "MY", name: "Malaysia", emoji: "🇲🇾", subTitle: "16 States & FTs", locked: false,
        subRegions: [
          // Peninsular Malaysia
          { code: "my-jh", name: "Johor", flagUrl: wiki("Flag of Johor.svg"),              group: "Peninsular Malaysia" },
          { code: "my-kd", name: "Kedah", flagUrl: wiki("Flag of Kedah.svg"),              group: "Peninsular Malaysia" },
          { code: "my-kn", name: "Kelantan", flagUrl: wiki("Flag of Kelantan.svg"),           group: "Peninsular Malaysia" },
          { code: "my-me", name: "Melaka", flagUrl: wiki("Flag of Malacca.svg"),             group: "Peninsular Malaysia" },
          { code: "my-ns", name: "Negeri Sembilan", flagUrl: wiki("Flag of Negeri Sembilan.svg"),    group: "Peninsular Malaysia" },
          { code: "my-ph", name: "Pahang", flagUrl: wiki("Flag of Pahang.svg"),             group: "Peninsular Malaysia" },
          { code: "my-py", name: "Penang", flagUrl: wiki("Flag of Penang (Malaysia).svg"),             group: "Peninsular Malaysia" },
          { code: "my-pk", name: "Perak", flagUrl: wiki("Flag of Perak.svg"),              group: "Peninsular Malaysia" },
          { code: "my-pl", name: "Perlis", flagUrl: wiki("Flag of Perlis.svg"),             group: "Peninsular Malaysia" },
          { code: "my-sb2",name: "Selangor", flagUrl: wiki("Flag of Selangor.svg"),           group: "Peninsular Malaysia" },
          { code: "my-tr", name: "Terengganu", flagUrl: wiki("Flag of Terengganu.svg"),         group: "Peninsular Malaysia" },
          // East Malaysia
          { code: "my-sa", name: "Sabah", flagUrl: wiki("Flag of Sabah.svg"),              group: "East Malaysia" },
          { code: "my-sw", name: "Sarawak", flagUrl: wiki("Flag of Sarawak.svg"),            group: "East Malaysia" },
          // Federal Territories
          { code: "my-kl", name: "Kuala Lumpur", flagUrl: wiki("Flag of Kuala Lumpur, Malaysia.svg"),       group: "Federal Territories" },
          { code: "my-lb", name: "Labuan", flagUrl: wiki("Flag of Labuan.svg"),             group: "Federal Territories" },
          { code: "my-pu", name: "Putrajaya", flagUrl: wiki("Flag of Putrajaya.svg"),          group: "Federal Territories" },
        ],
      },

      // ── Maldives (21 administrative atolls) ──────────────────────────────────
      {
        code: "MV", name: "Maldives", emoji: "🇲🇻", subTitle: "21 Administrative Atolls", locked: false,
        subRegions: [
          { code: "mv-ha",  name: "Haa Alif" },
          { code: "mv-hd",  name: "Haa Dhaalu" },
          { code: "mv-sh",  name: "Shaviyani" },
          { code: "mv-no",  name: "Noonu" },
          { code: "mv-r",   name: "Raa" },
          { code: "mv-b",   name: "Baa" },
          { code: "mv-lh",  name: "Lhaviyani" },
          { code: "mv-k",   name: "Kaafu" },
          { code: "mv-aa",  name: "Alif Alif" },
          { code: "mv-adh", name: "Alif Dhaal" },
          { code: "mv-v",   name: "Vaavu" },
          { code: "mv-m",   name: "Meemu" },
          { code: "mv-f",   name: "Faafu" },
          { code: "mv-dh",  name: "Dhaalu" },
          { code: "mv-th",  name: "Thaa" },
          { code: "mv-l",   name: "Laamu" },
          { code: "mv-ga",  name: "Gaafu Alif" },
          { code: "mv-gd",  name: "Gaafu Dhaal" },
          { code: "mv-gn",  name: "Gnaviyani" },
          { code: "mv-s",   name: "Seenu" },
          { code: "mv-ml",  name: "Malé" },
        ],
      },

      // ── Mongolia (22 provinces + capital) ────────────────────────────────────
      {
        code: "MN", name: "Mongolia", emoji: "🇲🇳", subTitle: "22 Provinces", locked: false,
        subRegions: [
          { code: "mn-ar", name: "Arkhangai", flagUrl: wiki("Mn flag arkhangai aimag 2014.svg") },
          { code: "mn-bh", name: "Bayan-Ölgii", flagUrl: wiki("Mn flag bayan olgiy aymag.svg") },
          { code: "mn-bk", name: "Bayankhongor", flagUrl: wiki("Mn flag bayankhongor aymag.png") },
          { code: "mn-bu", name: "Bulgan", flagUrl: wiki("Mn flag bulgan aimag.svg") },
          { code: "mn-da", name: "Darkhan-Uul", flagUrl: wiki("Mn flag darkhan uul aymag.svg") },
          { code: "mn-dg", name: "Dornogobi", flagUrl: wiki("Mn flag dornogovi aimag 2011.svg") },
          { code: "mn-do", name: "Dornod", flagUrl: wiki("Mn flag dornod aimag 2001.svg") },
          { code: "mn-dz", name: "Dundgovi", flagUrl: wiki("Mn flag dundgovi aimag.svg") },
          { code: "mn-ga", name: "Govi-Altai", flagUrl: wiki("Mn flag govi-altai aimag 2011.svg") },
          { code: "mn-gs", name: "Govisümber", flagUrl: wiki("Mn flag govisümber aimag.svg") },
          { code: "mn-kh", name: "Khentii", flagUrl: wiki("Khentii aimag Flag.svg") },
          { code: "mn-kv", name: "Khövsgöl", flagUrl: wiki("Mn flag khövsgöl aimag 2014.svg") },
          { code: "mn-kd", name: "Khovd", flagUrl: wiki("Khovd stars flag.svg") },
          { code: "mn-og", name: "Ömnögovi", flagUrl: wiki("Mn flag ömnögovi aimag 2011.svg") },
          { code: "mn-or", name: "Orkhon", flagUrl: wiki("Orkhon Aimag Flag.svg") },
          { code: "mn-ov", name: "Övörkhangai", flagUrl: wiki("Mn flag Ovurhangai aymag.svg") },
          { code: "mn-se", name: "Selenge", flagUrl: wiki("Mn flag selenge aimag 1999.svg") },
          { code: "mn-su", name: "Sükhbaatar", flagUrl: wiki("Mn flag sükhbaatar aimag.svg") },
          { code: "mn-to", name: "Töv", flagUrl: wiki("Tov aymag flag.svg") },
          { code: "mn-ub", name: "Ulaanbaatar", flagUrl: wiki("Flag of Ulaanbaatar, Mongolia.svg") },
          { code: "mn-uv", name: "Uvs", flagUrl: wiki("Uvs Aimag Flag.svg") },
          { code: "mn-za", name: "Zavkhan", flagUrl: wiki("Mn flag zavkhan aimag.svg") },
        ],
      },

      // ── Myanmar (15 states, regions & union territory) ────────────────────────
      {
        code: "MM", name: "Myanmar", emoji: "🇲🇲", subTitle: "15 States & Regions", locked: false,
        subRegions: [
          // States
          { code: "mm-ch", name: "Chin", flagUrl: wiki("Flag of Chin State.svg"),          group: "States" },
          { code: "mm-ka", name: "Kachin", flagUrl: wiki("Flag of Kachin State.svg"),        group: "States" },
          { code: "mm-kah",name: "Kayah", flagUrl: wiki("Flag of Kayah State.svg"),         group: "States" },
          { code: "mm-kn", name: "Kayin", flagUrl: wiki("Flag of Kayin State.svg"),         group: "States" },
          { code: "mm-mo", name: "Mon", flagUrl: wiki("Flag of Mon State (2018).svg"),           group: "States" },
          { code: "mm-ra", name: "Rakhine", flagUrl: wiki("Flag of Rakhine.svg"),       group: "States" },
          { code: "mm-sh", name: "Shan", flagUrl: wiki("Flag of Shan State.svg"),          group: "States" },
          // Regions
          { code: "mm-ay", name: "Ayeyarwady",    group: "Regions" },
          { code: "mm-ba", name: "Bago",          group: "Regions" },
          { code: "mm-ma", name: "Magway",        group: "Regions" },
          { code: "mm-md", name: "Mandalay",      group: "Regions" },
          { code: "mm-sa", name: "Sagaing",       group: "Regions" },
          { code: "mm-ta", name: "Tanintharyi",   group: "Regions" },
          { code: "mm-ya", name: "Yangon",        group: "Regions" },
          // Union Territory
          { code: "mm-np", name: "Naypyidaw",     group: "Union Territory" },
        ],
      },

      // ── Nepal (7 provinces) ──────────────────────────────────────────────────
      {
        code: "NP", name: "Nepal", emoji: "🇳🇵", subTitle: "7 Provinces", locked: false,
        subRegions: [
          { code: "np-1", name: "Koshi" },
          { code: "np-2", name: "Madhesh" },
          { code: "np-3", name: "Bagmati" },
          { code: "np-4", name: "Gandaki" },
          { code: "np-5", name: "Lumbini" },
          { code: "np-6", name: "Karnali" },
          { code: "np-7", name: "Sudurpashchim" },
        ],
      },

      // ── North Korea (12 provinces & special cities) ───────────────────────────
      {
        code: "KP", name: "North Korea", emoji: "🇰🇵", subTitle: "12 Provinces & Cities", locked: false,
        subRegions: [
          // Provinces
          { code: "kp-ch", name: "Chagang",          group: "Provinces" },
          { code: "kp-hb", name: "North Hamgyong",   group: "Provinces" },
          { code: "kp-hn", name: "South Hamgyong",   group: "Provinces" },
          { code: "kp-hw", name: "North Hwanghae",   group: "Provinces" },
          { code: "kp-hz", name: "South Hwanghae",   group: "Provinces" },
          { code: "kp-ka", name: "Kangwon",          group: "Provinces" },
          { code: "kp-nb", name: "North Pyongan",    group: "Provinces" },
          { code: "kp-ns", name: "South Pyongan",    group: "Provinces" },
          { code: "kp-ry", name: "Ryanggang",        group: "Provinces" },
          // Special Cities
          { code: "kp-py", name: "Pyongyang",        group: "Special Cities" },
          { code: "kp-nm", name: "Nampo",            group: "Special Cities" },
          { code: "kp-ra", name: "Rason",            group: "Special Cities" },
        ],
      },

      // ── Pakistan (7 provinces & territories) ─────────────────────────────────
      {
        code: "PK", name: "Pakistan", emoji: "🇵🇰", subTitle: "7 Provinces & Territories", locked: false,
        subRegions: [
          // Provinces
          { code: "pk-ba", name: "Balochistan", flagUrl: wiki("Flag of Balochistan.svg"),                 group: "Provinces" },
          { code: "pk-kb", name: "Khyber Pakhtunkhwa", flagUrl: wiki("Flag of Khyber Pakhtunkhwa.svg"),          group: "Provinces" },
          { code: "pk-pb", name: "Punjab", flagUrl: wiki("Flag of Punjab.svg"),                      group: "Provinces" },
          { code: "pk-sd", name: "Sindh", flagUrl: wiki("Flag of Sindh.svg"),                       group: "Provinces" },
          // Territories
          { code: "pk-is", name: "Islamabad Capital Territory", group: "Territories" },
          { code: "pk-aj", name: "Azad Kashmir", flagUrl: wiki("Flag of Azad Kashmir.svg"),                group: "Territories" },
          { code: "pk-gb", name: "Gilgit-Baltistan",            group: "Territories" },
        ],
      },

      // ── Philippines (17 regions) ─────────────────────────────────────────────
      {
        code: "PH", name: "Philippines", emoji: "🇵🇭", subTitle: "17 Regions", locked: false,
        subRegions: [
          // Luzon
          { code: "ph-ncr", name: "Metro Manila (NCR)",                          group: "Luzon" },
          { code: "ph-car", name: "Cordillera Administrative Region",            group: "Luzon" },
          { code: "ph-1",   name: "Ilocos Region",                              group: "Luzon" },
          { code: "ph-2",   name: "Cagayan Valley",                             group: "Luzon" },
          { code: "ph-3",   name: "Central Luzon",                              group: "Luzon" },
          { code: "ph-4a",  name: "CALABARZON",                                 group: "Luzon" },
          { code: "ph-4b",  name: "MIMAROPA",                                   group: "Luzon" },
          { code: "ph-5",   name: "Bicol Region",                               group: "Luzon" },
          // Visayas
          { code: "ph-6",   name: "Western Visayas",                            group: "Visayas" },
          { code: "ph-7",   name: "Central Visayas",                            group: "Visayas" },
          { code: "ph-8",   name: "Eastern Visayas",                            group: "Visayas" },
          // Mindanao
          { code: "ph-9",   name: "Zamboanga Peninsula",                        group: "Mindanao" },
          { code: "ph-10",  name: "Northern Mindanao",                          group: "Mindanao" },
          { code: "ph-11",  name: "Davao Region",                               group: "Mindanao" },
          { code: "ph-12",  name: "SOCCSKSARGEN",                               group: "Mindanao" },
          { code: "ph-13",  name: "Caraga",                                     group: "Mindanao" },
          { code: "ph-bm",  name: "Bangsamoro (BARMM)", flagUrl: wiki("Flag of Bangsamoro.svg"),                         group: "Mindanao" },
        ],
      },

      // ── Singapore (5 community development councils) ──────────────────────────
      {
        code: "SG", name: "Singapore", emoji: "🇸🇬", subTitle: "5 CDC Districts", locked: false,
        subRegions: [
          { code: "sg-ce", name: "Central Singapore" },
          { code: "sg-ne", name: "North East" },
          { code: "sg-nw", name: "North West" },
          { code: "sg-se", name: "South East" },
          { code: "sg-sw", name: "South West" },
        ],
      },

      // ── South Korea (17 administrative divisions) ─────────────────────────────
      {
        code: "KR", name: "South Korea", emoji: "🇰🇷", subTitle: "17 Provinces & Cities", locked: false,
        subRegions: [
          // Special & Metropolitan Cities
          { code: "kr-11", name: "Seoul", flagUrl: wiki("Flag of Seoul.svg"),                group: "Special & Metropolitan Cities" },
          { code: "kr-21", name: "Busan", flagUrl: wiki("Flag of Busan.svg"),                group: "Special & Metropolitan Cities" },
          { code: "kr-22", name: "Daegu", flagUrl: wiki("Flag of Daegu.svg"),                group: "Special & Metropolitan Cities" },
          { code: "kr-23", name: "Incheon", flagUrl: wiki("Flag of Incheon.svg"),              group: "Special & Metropolitan Cities" },
          { code: "kr-24", name: "Gwangju", flagUrl: wiki("Flag of Gwangju.svg"),              group: "Special & Metropolitan Cities" },
          { code: "kr-25", name: "Daejeon", flagUrl: wiki("Flag of Daejeon.svg"),              group: "Special & Metropolitan Cities" },
          { code: "kr-26", name: "Ulsan", flagUrl: wiki("Flag of Ulsan.svg"),                group: "Special & Metropolitan Cities" },
          { code: "kr-50", name: "Sejong", flagUrl: wiki("Flag of Sejong City.svg"),               group: "Special & Metropolitan Cities" },
          // Provinces
          { code: "kr-41", name: "Gyeonggi", flagUrl: wiki("Flag of Gyeonggi Province.svg"),             group: "Provinces" },
          { code: "kr-42", name: "Gangwon", flagUrl: wiki("Flag of Gangwon State.svg"),              group: "Provinces" },
          { code: "kr-43", name: "North Chungcheong", flagUrl: wiki("Flag of North Chungcheong Province.svg"),    group: "Provinces" },
          { code: "kr-44", name: "South Chungcheong", flagUrl: wiki("Flag of South Chungcheong Province.svg"),    group: "Provinces" },
          { code: "kr-45", name: "North Jeolla", flagUrl: wiki("Flag of Jeonbuk State, South Korea.svg"),         group: "Provinces" },
          { code: "kr-46", name: "South Jeolla", flagUrl: wiki("Flag of South Jeolla Province.svg"),         group: "Provinces" },
          { code: "kr-47", name: "North Gyeongsang", flagUrl: wiki("Flag of North Gyeongsang Province.svg"),     group: "Provinces" },
          { code: "kr-48", name: "South Gyeongsang", flagUrl: wiki("Flag of South Gyeongsang Province.svg"),     group: "Provinces" },
          { code: "kr-49", name: "Jeju", flagUrl: wiki("Flag of Jeju Province.svg"),                 group: "Provinces" },
        ],
      },

      // ── Sri Lanka (9 provinces) ──────────────────────────────────────────────
      {
        code: "LK", name: "Sri Lanka", emoji: "🇱🇰", subTitle: "9 Provinces", locked: false,
        subRegions: [
          { code: "lk-1", name: "Western", flagUrl: wiki("Western Province Flag (SRI LANKA).png") },
          { code: "lk-2", name: "Central", flagUrl: wiki("Flag of the Central Province (Sri Lanka).PNG") },
          { code: "lk-3", name: "Southern", flagUrl: wiki("Flag of the Southern Province (Sri Lanka).PNG") },
          { code: "lk-4", name: "Northern", flagUrl: wiki("Flag of the Northern Province.svg") },
          { code: "lk-5", name: "Eastern", flagUrl: wiki("Eastern Province Flag (SRI LANKA).png") },
          { code: "lk-6", name: "North Western", flagUrl: wiki("Flag of the North Western Province (Sri Lanka).svg") },
          { code: "lk-7", name: "North Central", flagUrl: wiki("Flag of the North Central Province (Sri Lanka).PNG") },
          { code: "lk-8", name: "Uva", flagUrl: wiki("Flag of the Uva Province (Sri Lanka).PNG") },
          { code: "lk-9", name: "Sabaragamuwa", flagUrl: wiki("Flag of the Sabaragamuwa Province (Sri Lanka).PNG") },
        ],
      },

      // ── Tajikistan (5 administrative divisions) ───────────────────────────────
      {
        code: "TJ", name: "Tajikistan", emoji: "🇹🇯", subTitle: "5 Regions", locked: false,
        subRegions: [
          { code: "tj-du", name: "Dushanbe" },
          { code: "tj-gb", name: "Gorno-Badakhshan" },
          { code: "tj-kh", name: "Khatlon" },
          { code: "tj-rr", name: "Regions of Republican Subordination" },
          { code: "tj-sg", name: "Sughd" },
        ],
      },

      // ── Thailand (77 provinces) ──────────────────────────────────────────────
      {
        code: "TH", name: "Thailand", emoji: "🇹🇭", subTitle: "77 Provinces", locked: false,
        subRegions: [
          // Northern
          { code: "th-cm", name: "Chiang Mai", flagUrl: wiki("Flag of Chiang Mai Province.svg"),    group: "Northern" },
          { code: "th-cr", name: "Chiang Rai", flagUrl: wiki("Flag of Chiang Rai Province.svg"),    group: "Northern" },
          { code: "th-lg", name: "Lampang", flagUrl: wiki("Flag of Lampang Province.svg"),       group: "Northern" },
          { code: "th-lp", name: "Lamphun", flagUrl: wiki("Flag of Lamphun Province.svg"),       group: "Northern" },
          { code: "th-ms", name: "Mae Hong Son", flagUrl: wiki("Flag of Mae Hong Son Province.svg"),  group: "Northern" },
          { code: "th-nn", name: "Nan", flagUrl: wiki("Flag of Nan Province.svg"),           group: "Northern" },
          { code: "th-py", name: "Phayao", flagUrl: wiki("Flag of Phayao Province.svg"),        group: "Northern" },
          { code: "th-pr", name: "Phrae", flagUrl: wiki("Flag of Phrae Province.svg"),         group: "Northern" },
          { code: "th-ut", name: "Uttaradit", flagUrl: wiki("Flag of Uttaradit Province.svg"),     group: "Northern" },
          // Northeastern
          { code: "th-ac", name: "Amnat Charoen", flagUrl: wiki("Flag of Amnat Charoen Province.svg"), group: "Northeastern" },
          { code: "th-bk", name: "Bueng Kan", flagUrl: wiki("Flag of Bueng Kan Province.svg"),     group: "Northeastern" },
          { code: "th-br", name: "Buri Ram", flagUrl: wiki("Flag of Buri Ram Province.svg"),      group: "Northeastern" },
          { code: "th-cp", name: "Chaiyaphum", flagUrl: wiki("Flag of Chaiyaphum Province.svg"),    group: "Northeastern" },
          { code: "th-kn", name: "Kalasin", flagUrl: wiki("Flag of Kalasin Province.svg"),       group: "Northeastern" },
          { code: "th-ke", name: "Khon Kaen", flagUrl: wiki("Flag of Khon Kaen Province.svg"),     group: "Northeastern" },
          { code: "th-le", name: "Loei", flagUrl: wiki("Flag of Loei Province.svg"),          group: "Northeastern" },
          { code: "th-mk", name: "Maha Sarakham", flagUrl: wiki("Flag of Maha Sarakham Province.svg"), group: "Northeastern" },
          { code: "th-md", name: "Mukdahan", flagUrl: wiki("Flag of Mukdahan Province.svg"),      group: "Northeastern" },
          { code: "th-np", name: "Nakhon Phanom", flagUrl: wiki("Flag of Nakhon Phanom Province.svg"), group: "Northeastern" },
          { code: "th-nr", name: "Nakhon Ratchasima", flagUrl: wiki("Flag of Nakhon Ratchasima Province.svg"), group: "Northeastern" },
          { code: "th-nb", name: "Nong Bua Lam Phu", flagUrl: wiki("Flag of Nong Bua Lam Phu Province.svg"), group: "Northeastern" },
          { code: "th-nk", name: "Nong Khai", flagUrl: wiki("Flag of Nong Khai Province.svg"),    group: "Northeastern" },
          { code: "th-re", name: "Roi Et", flagUrl: wiki("Flag of Roi Et Province.svg"),        group: "Northeastern" },
          { code: "th-sn", name: "Sakon Nakhon", flagUrl: wiki("Flag of Sakon Nakhon Province.svg"), group: "Northeastern" },
          { code: "th-sk", name: "Si Sa Ket", flagUrl: wiki("Flag of Si Sa Ket Province.svg"),     group: "Northeastern" },
          { code: "th-su", name: "Surin", flagUrl: wiki("Flag of Surin Province.svg"),         group: "Northeastern" },
          { code: "th-ub", name: "Ubon Ratchathani", flagUrl: wiki("Flag of Ubon Ratchathani Province.svg"), group: "Northeastern" },
          { code: "th-ud", name: "Udon Thani", flagUrl: wiki("Flag of Udon Thani Province.svg"),    group: "Northeastern" },
          { code: "th-ys", name: "Yasothon", flagUrl: wiki("Flag of Yasothon Province.svg"),      group: "Northeastern" },
          // Central
          { code: "th-an", name: "Ang Thong", flagUrl: wiki("Flag of Ang Thong Province.svg"),     group: "Central" },
          { code: "th-ay", name: "Ayutthaya", flagUrl: wiki("Flag of Ayutthaya Province.svg"),     group: "Central" },
          { code: "th-bk2",name: "Bangkok", flagUrl: wiki("Flag of Bangkok.svg"),       group: "Central" },
          { code: "th-cn", name: "Chainat", flagUrl: wiki("Flag of Chainat Province.svg"),       group: "Central" },
          { code: "th-lb", name: "Lop Buri", flagUrl: wiki("Flag of Lop Buri Province.svg"),      group: "Central" },
          { code: "th-ny", name: "Nakhon Nayok", flagUrl: wiki("Flag of Nakhon Nayok Province.svg"),  group: "Central" },
          { code: "th-npm",name: "Nakhon Pathom", flagUrl: wiki("Flag of Nakhon Pathom Province.svg"), group: "Central" },
          { code: "th-nb2",name: "Nonthaburi", flagUrl: wiki("Flag of Nonthaburi Province.svg"),    group: "Central" },
          { code: "th-pt", name: "Pathum Thani", flagUrl: wiki("Flag of Pathum Thani Province.svg"),  group: "Central" },
          { code: "th-pb", name: "Phetchaburi", flagUrl: wiki("Flag of Phetchaburi Province.svg"),   group: "Central" },
          { code: "th-pkk",name: "Prachuap Khiri Khan", flagUrl: wiki("Flag of Prachuap Khiri Khan Province.svg"), group: "Central" },
          { code: "th-rb", name: "Ratchaburi", flagUrl: wiki("Flag of Ratchaburi Province.svg"),    group: "Central" },
          { code: "th-sb", name: "Samut Prakan", flagUrl: wiki("Flag of Samut Prakan Province.svg"),  group: "Central" },
          { code: "th-sm", name: "Samut Sakhon", flagUrl: wiki("Flag of Samut Sakhon Province.svg"),  group: "Central" },
          { code: "th-ss", name: "Samut Songkhram", flagUrl: wiki("Flag of Samut Songkhram Province.svg"),group: "Central" },
          { code: "th-sr", name: "Sara Buri", flagUrl: wiki("Flag of Sara Buri Province.svg"),     group: "Central" },
          { code: "th-sg", name: "Sing Buri", flagUrl: wiki("Flag of Sing Buri Province.svg"),     group: "Central" },
          { code: "th-sp", name: "Suphan Buri", flagUrl: wiki("Flag of Suphan Buri Province.svg"),   group: "Central" },
          // Western
          { code: "th-kj", name: "Kanchanaburi", flagUrl: wiki("Flag of Kanchanaburi Province.svg"),  group: "Western" },
          { code: "th-pk", name: "Phetchabun", flagUrl: wiki("Flag of Phetchabun Province.svg"),    group: "Western" },
          { code: "th-pc", name: "Phichit", flagUrl: wiki("Flag of Phichit Province.svg"),       group: "Western" },
          { code: "th-pl", name: "Phitsanulok", flagUrl: wiki("Flag of Phitsanulok Province.svg"),   group: "Western" },
          { code: "th-nw", name: "Nakhon Sawan", flagUrl: wiki("Flag of Nakhon Sawan Province.svg"),  group: "Western" },
          { code: "th-tk", name: "Tak", flagUrl: wiki("Flag of Tak Province.svg"),           group: "Western" },
          { code: "th-utn",name: "Uthai Thani", flagUrl: wiki("Flag of Uthai Thani Province.svg"),   group: "Western" },
          // Eastern
          { code: "th-cc", name: "Chachoengsao", flagUrl: wiki("Flag of Chachoengsao Province.svg"),  group: "Eastern" },
          { code: "th-ct", name: "Chanthaburi", flagUrl: wiki("Flag of Chanthaburi Province.svg"),   group: "Eastern" },
          { code: "th-cb", name: "Chon Buri", flagUrl: wiki("Flag of Chon Buri Province.svg"),     group: "Eastern" },
          { code: "th-pi", name: "Prachin Buri", flagUrl: wiki("Flag of Prachin Buri Province.svg"),  group: "Eastern" },
          { code: "th-ry", name: "Rayong", flagUrl: wiki("Flag of Rayong Province.svg"),        group: "Eastern" },
          { code: "th-sk2",name: "Sa Kaeo", flagUrl: wiki("Flag of Sa Kaeo Province.svg"),       group: "Eastern" },
          { code: "th-tr", name: "Trat", flagUrl: wiki("Flag of Trat Province.svg"),          group: "Eastern" },
          // Southern
          { code: "th-ch", name: "Chumphon", flagUrl: wiki("Flag of Chumphon Province.svg"),      group: "Southern" },
          { code: "th-kb", name: "Krabi", flagUrl: wiki("Flag of Krabi Province.svg"),         group: "Southern" },
          { code: "th-nst",name: "Nakhon Si Thammarat", flagUrl: wiki("Flag of Nakhon Si Thammarat Province.svg"), group: "Southern" },
          { code: "th-nw2",name: "Narathiwat", flagUrl: wiki("Flag of Narathiwat Province.svg"),    group: "Southern" },
          { code: "th-pn", name: "Pattani", flagUrl: wiki("Flag of Pattani Province.svg"),       group: "Southern" },
          { code: "th-png",name: "Phangnga", flagUrl: wiki("Flag of Phangnga Province.svg"),      group: "Southern" },
          { code: "th-phg",name: "Phatthalung", flagUrl: wiki("Flag of Phatthalung Province.svg"),   group: "Southern" },
          { code: "th-phu",name: "Phuket", flagUrl: wiki("Flag of Phuket.svg"),        group: "Southern" },
          { code: "th-rn", name: "Ranong", flagUrl: wiki("Flag of Ranong Province.svg"),        group: "Southern" },
          { code: "th-st", name: "Satun", flagUrl: wiki("Flag of Satun Province.svg"),         group: "Southern" },
          { code: "th-so", name: "Songkhla", flagUrl: wiki("Flag of Songkhla Province.svg"),      group: "Southern" },
          { code: "th-srth",name:"Surat Thani", flagUrl: wiki("Flag of Suratthani Province.svg"),   group: "Southern" },
          { code: "th-tg", name: "Trang", flagUrl: wiki("Flag of Trang Province.svg"),         group: "Southern" },
          { code: "th-yl", name: "Yala", flagUrl: wiki("Flag of Yala Province.svg"),          group: "Southern" },
        ],
      },

      // ── Timor-Leste (13 municipalities) ──────────────────────────────────────
      {
        code: "TL", name: "Timor-Leste", emoji: "🇹🇱", subTitle: "13 Municipalities", locked: false,
        subRegions: [
          { code: "tl-al", name: "Aileu" },
          { code: "tl-an", name: "Ainaro" },
          { code: "tl-ba", name: "Baucau" },
          { code: "tl-bo", name: "Bobonaro" },
          { code: "tl-co", name: "Cova Lima" },
          { code: "tl-di", name: "Dili" },
          { code: "tl-er", name: "Ermera" },
          { code: "tl-la", name: "Lautém" },
          { code: "tl-li", name: "Liquiçá" },
          { code: "tl-ma", name: "Manatuto" },
          { code: "tl-mn", name: "Manufahi" },
          { code: "tl-oe", name: "Oecusse" },
          { code: "tl-vi", name: "Viqueque" },
        ],
      },

      // ── Turkmenistan (6 regions) ─────────────────────────────────────────────
      {
        code: "TM", name: "Turkmenistan", emoji: "🇹🇲", subTitle: "6 Regions", locked: false,
        subRegions: [
          { code: "tm-a",  name: "Ahal" },
          { code: "tm-as", name: "Ashgabat" },
          { code: "tm-b",  name: "Balkan" },
          { code: "tm-d",  name: "Daşoguz" },
          { code: "tm-l",  name: "Lebap" },
          { code: "tm-m",  name: "Mary" },
        ],
      },

      // ── Uzbekistan (14 regions) ──────────────────────────────────────────────
      {
        code: "UZ", name: "Uzbekistan", emoji: "🇺🇿", subTitle: "14 Regions", locked: false,
        subRegions: [
          { code: "uz-an", name: "Andijan" },
          { code: "uz-bu", name: "Bukhara" },
          { code: "uz-fa", name: "Fergana" },
          { code: "uz-jz", name: "Jizzakh" },
          { code: "uz-qr", name: "Karakalpakstan", flagUrl: wiki("Flag of Karakalpakstan.svg") },
          { code: "uz-kh", name: "Khorezm" },
          { code: "uz-ng", name: "Namangan" },
          { code: "uz-nw", name: "Navoiy" },
          { code: "uz-qa", name: "Qashqadaryo" },
          { code: "uz-sa", name: "Samarqand" },
          { code: "uz-si", name: "Sirdaryo" },
          { code: "uz-su", name: "Surxondaryo" },
          { code: "uz-ta", name: "Tashkent Region" },
          { code: "uz-tk", name: "Tashkent City", flagUrl: wiki("Flag of Tashkent.svg") },
        ],
      },

      // ── Vietnam (63 provinces & municipalities) ───────────────────────────────
      {
        code: "VN", name: "Vietnam", emoji: "🇻🇳", subTitle: "63 Provinces & Municipalities", locked: false,
        subRegions: [
          // North
          { code: "vn-bg", name: "Bắc Giang",         group: "North" },
          { code: "vn-bk", name: "Bắc Kạn",           group: "North" },
          { code: "vn-bn", name: "Bắc Ninh",          group: "North" },
          { code: "vn-cb", name: "Cao Bằng",          group: "North" },
          { code: "vn-db", name: "Điện Biên",         group: "North" },
          { code: "vn-hg", name: "Hà Giang",          group: "North" },
          { code: "vn-hm", name: "Hà Nam",            group: "North" },
          { code: "vn-hn", name: "Hà Nội",            group: "North" },
          { code: "vn-hd", name: "Hải Dương",         group: "North" },
          { code: "vn-hp", name: "Hải Phòng",         group: "North" },
          { code: "vn-hb", name: "Hòa Bình",          group: "North" },
          { code: "vn-hy", name: "Hưng Yên",          group: "North" },
          { code: "vn-lc", name: "Lai Châu",          group: "North" },
          { code: "vn-ls", name: "Lạng Sơn",          group: "North" },
          { code: "vn-lk", name: "Lào Cai",           group: "North" },
          { code: "vn-nd", name: "Nam Định",          group: "North" },
          { code: "vn-nb", name: "Ninh Bình",         group: "North" },
          { code: "vn-pt", name: "Phú Thọ",           group: "North" },
          { code: "vn-qn", name: "Quảng Ninh",        group: "North" },
          { code: "vn-sl", name: "Sơn La",            group: "North" },
          { code: "vn-tb", name: "Thái Bình",         group: "North" },
          { code: "vn-tn", name: "Thái Nguyên",       group: "North" },
          { code: "vn-tq", name: "Tuyên Quang",       group: "North" },
          { code: "vn-vp", name: "Vĩnh Phúc",         group: "North" },
          { code: "vn-yb", name: "Yên Bái",           group: "North" },
          // Central
          { code: "vn-bdi",name: "Bình Định",         group: "Central" },
          { code: "vn-bt", name: "Bình Thuận",        group: "Central" },
          { code: "vn-dn", name: "Đà Nẵng",           group: "Central" },
          { code: "vn-dl", name: "Đắk Lắk",          group: "Central" },
          { code: "vn-dno",name: "Đắk Nông",         group: "Central" },
          { code: "vn-gl", name: "Gia Lai",           group: "Central" },
          { code: "vn-ht", name: "Hà Tĩnh",          group: "Central" },
          { code: "vn-kh", name: "Khánh Hòa",        group: "Central" },
          { code: "vn-kt", name: "Kon Tum",           group: "Central" },
          { code: "vn-ld", name: "Lâm Đồng",         group: "Central" },
          { code: "vn-na", name: "Nghệ An",           group: "Central" },
          { code: "vn-nt", name: "Ninh Thuận",        group: "Central" },
          { code: "vn-py", name: "Phú Yên",           group: "Central" },
          { code: "vn-qb", name: "Quảng Bình",        group: "Central" },
          { code: "vn-qnm",name: "Quảng Nam",         group: "Central" },
          { code: "vn-qng",name: "Quảng Ngãi",        group: "Central" },
          { code: "vn-qt", name: "Quảng Trị",         group: "Central" },
          { code: "vn-tth",name: "Thừa Thiên Huế",    group: "Central" },
          // South
          { code: "vn-ag", name: "An Giang",          group: "South" },
          { code: "vn-bv", name: "Bà Rịa–Vũng Tàu",  group: "South" },
          { code: "vn-bl", name: "Bạc Liêu",          group: "South" },
          { code: "vn-btr",name: "Bến Tre",           group: "South" },
          { code: "vn-bp", name: "Bình Dương",        group: "South" },
          { code: "vn-bph",name: "Bình Phước",        group: "South" },
          { code: "vn-cm", name: "Cà Mau",            group: "South" },
          { code: "vn-ct", name: "Cần Thơ",           group: "South" },
          { code: "vn-dn2",name: "Đồng Nai",          group: "South" },
          { code: "vn-dt", name: "Đồng Tháp",         group: "South" },
          { code: "vn-hau",name: "Hậu Giang",         group: "South" },
          { code: "vn-hcm",name: "Hồ Chí Minh City",  group: "South" },
          { code: "vn-kg", name: "Kiên Giang",        group: "South" },
          { code: "vn-la", name: "Long An",           group: "South" },
          { code: "vn-st", name: "Sóc Trăng",         group: "South" },
          { code: "vn-ty", name: "Tây Ninh",          group: "South" },
          { code: "vn-tg", name: "Tiền Giang",        group: "South" },
          { code: "vn-trv",name: "Trà Vinh",          group: "South" },
          { code: "vn-vl", name: "Vĩnh Long",         group: "South" },
        ],
      },

    ],
  },

  // ── AFRICA ────────────────────────────────────────────────────────────────
  // NOTE ON FLAGS: Unlike Europe / the US, the great majority of African first-level
  // subdivisions have NO official flag (provinces, governorates, counties, wilayas are
  // usually purely administrative). Those tiles are name-only — same convention used for
  // Irish counties and UK English regions above. Flags are added only where one genuinely
  // exists (notably Ethiopia's regional states and Tanzania's Zanzibar).
  {
    id: "africa",
    name: "Africa",
    emoji: "🌍",
    locked: false,
    countries: [

      // ── Nigeria (36 states + Federal Capital Territory) ──────────────────
      // Breaks down weird: Abuja (FCT) is a federal territory, NOT a state, so it is
      // grouped separately. Nigerian states have official seals but no flags.
      {
        code: "NG", name: "Nigeria", emoji: "🇳🇬", subTitle: "36 States + FCT", locked: false,
        subRegions: [
          { code: "ng-ab", name: "Abia",        flagUrl: wiki("Abia State Flag.gif"),            group: "States" },
          { code: "ng-ad", name: "Adamawa",     flagUrl: wiki("Adamawa State Flag.svg"),         group: "States" },
          { code: "ng-ak", name: "Akwa Ibom",   flagUrl: wiki("Flag of Akwa Ibom State.svg"),    group: "States" },
          { code: "ng-an", name: "Anambra",     flagUrl: wiki("Flag of Anambra State.png"),      group: "States" },
          { code: "ng-ba", name: "Bauchi",      noFlag: true, group: "States" },
          { code: "ng-by", name: "Bayelsa",     flagUrl: wiki("Flag of Bayelsa State.svg"),      group: "States" },
          { code: "ng-be", name: "Benue",       noFlag: true, group: "States" },
          { code: "ng-bo", name: "Borno", noFlag: true,       group: "States" },
          { code: "ng-cr", name: "Cross River", flagUrl: wiki("Cross River State Flag.svg"),     group: "States" },
          { code: "ng-de", name: "Delta",       flagUrl: wiki("Flag of Delta State.svg"),        group: "States" },
          { code: "ng-eb", name: "Ebonyi",      noFlag: true, group: "States" },
          { code: "ng-ed", name: "Edo",         flagUrl: wiki("Edo State Flag.png"),             group: "States" },
          { code: "ng-ek", name: "Ekiti",       flagUrl: wiki("Ekiti State Flag.gif"),           group: "States" },
          { code: "ng-en", name: "Enugu",       flagUrl: wiki("Enugu State Flag.svg"),           group: "States" },
          { code: "ng-go", name: "Gombe",       flagUrl: wiki("Flag of Gombe State.svg"),        group: "States" },
          { code: "ng-im", name: "Imo",         flagUrl: wiki("Imo State Flag.svg"),             group: "States" },
          { code: "ng-ji", name: "Jigawa",      noFlag: true, group: "States" },
          { code: "ng-kd", name: "Kaduna",      flagUrl: wiki("Kaduna State Flag.png"),          group: "States" },
          { code: "ng-kn", name: "Kano",        flagUrl: wiki("Kano flag.svg"),                  group: "States" },
          { code: "ng-kt", name: "Katsina",     flagUrl: wiki("Flag of Katsina State.svg"),      group: "States" },
          { code: "ng-ke", name: "Kebbi",       noFlag: true, group: "States" },
          { code: "ng-ko", name: "Kogi",        flagUrl: wiki("Kogi State Flag.svg"),            group: "States" },
          { code: "ng-kw", name: "Kwara",       flagUrl: wiki("Kwara State Flag.jpg"),           group: "States" },
          { code: "ng-la", name: "Lagos",       flagUrl: wiki("Lagos State Flag.svg"),           group: "States" },
          { code: "ng-na", name: "Nasarawa",    flagUrl: wiki("Flag of Nasarawa State.png"),     group: "States" },
          { code: "ng-ni", name: "Niger",       flagUrl: wiki("Niger state flag.png"),           group: "States" },
          { code: "ng-og", name: "Ogun",        flagUrl: wiki("Ogun State Flag.jpg"),            group: "States" },
          { code: "ng-on", name: "Ondo",        flagUrl: wiki("Ondo State Flag.jpg"),            group: "States" },
          { code: "ng-os", name: "Osun",        flagUrl: wiki("Flag of Osun State, Nigeria.svg"),group: "States" },
          { code: "ng-oy", name: "Oyo",         flagUrl: wiki("Oyo State Flag.svg"),             group: "States" },
          { code: "ng-pl", name: "Plateau",     flagUrl: wiki("Plateau State Flag.jpg"),         group: "States" },
          { code: "ng-ri", name: "Rivers",      flagUrl: wiki("Rivers State Flag.svg"),          group: "States" },
          { code: "ng-so", name: "Sokoto",      flagUrl: wiki("Sokoto State Flag.svg"),          group: "States" },
          { code: "ng-ta", name: "Taraba",      noFlag: true, group: "States" },
          { code: "ng-yo", name: "Yobe",        flagUrl: wiki("Yobe State Flag.png"),            group: "States" },
          { code: "ng-za", name: "Zamfara",     flagUrl: wiki("Zamfara State Flag.svg"),         group: "States" },
          { code: "ng-fc", name: "Abuja (FCT)", flagUrl: wiki("Flag of Abuja.svg"),              group: "Federal Capital Territory" },
        ],
      },

      // ── South Africa (9 provinces) ───────────────────────────────────────
      // Most provinces have coats of arms but no official flags; only Mpumalanga has one.
      {
        code: "ZA", name: "South Africa", emoji: "🇿🇦", subTitle: "9 Provinces", locked: false,
        subRegions: [
          { code: "za-ec",  name: "Eastern Cape" },
          { code: "za-fs",  name: "Free State" },
          { code: "za-gp",  name: "Gauteng" },
          { code: "za-kzn", name: "KwaZulu-Natal" },
          { code: "za-lp",  name: "Limpopo" },
          { code: "za-mp",  name: "Mpumalanga", flagUrl: wiki("Flag of Mpumalanga Province.svg") },
          { code: "za-nc",  name: "Northern Cape" },
          { code: "za-nw",  name: "North West" },
          { code: "za-wc",  name: "Western Cape" },
        ],
      },

      // ── Ethiopia (12 regional states + 2 chartered cities) ───────────────
      // Breaks down weird: Ethiopia has 12 ethnically-based regional states PLUS two
      // self-governing chartered cities (Addis Ababa, Dire Dawa) — grouped separately.
      // The old SNNPR has been split since 2020 into Sidama, South West, South & Central
      // Ethiopia. Regional states are among the few African subdivisions with real flags.
      {
        code: "ET", name: "Ethiopia", emoji: "🇪🇹", subTitle: "12 Regions + 2 Cities", locked: false,
        subRegions: [
          { code: "et-ti", name: "Tigray",              flagUrl: wiki("Flag of the Tigray Region.svg"),                   group: "Regional States" },
          { code: "et-af", name: "Afar",                flagUrl: wiki("Flag of the Afar Region.svg"),                     group: "Regional States" },
          { code: "et-am", name: "Amhara",              flagUrl: wiki("Flag of the Amhara Region.svg"),                   group: "Regional States" },
          { code: "et-or", name: "Oromia",              flagUrl: wiki("Flag of the Oromia Region.svg"),                   group: "Regional States" },
          { code: "et-so", name: "Somali",              flagUrl: wiki("Flag of the Somali Region (1994-2008, 2018-).svg"),group: "Regional States" },
          { code: "et-be", name: "Benishangul-Gumuz",   flagUrl: wiki("Flag of the Benishangul-Gumuz Region.svg"),        group: "Regional States" },
          // Commons spells this "Gambella" (double-L) even though the region is "Gambela"
          { code: "et-ga", name: "Gambela",             flagUrl: wiki("Flag of the Gambella Region.svg"),                 group: "Regional States" },
          // Harari's file is literally "Harari Flag.svg", not the usual "Flag of the … Region" pattern
          { code: "et-ha", name: "Harari",              flagUrl: wiki("Harari Flag.svg"),                                 group: "Regional States" },
          { code: "et-si", name: "Sidama",              flagUrl: wiki("Flag of Sidama.svg"),                              group: "Regional States" },
          { code: "et-sw", name: "South West Ethiopia", flagUrl: wiki("Flag of South West Ethiopia.svg"),                 group: "Regional States" },
          // South Ethiopia (new 2023 region) only has a PNG on Commons, no SVG
          { code: "et-se", name: "South Ethiopia",      flagUrl: wiki("Flag of Southern Ethiopia.png"),                   group: "Regional States" },
          { code: "et-ce", name: "Central Ethiopia",    flagUrl: wiki("Flag of Central Ethiopia Regional State.svg"),     group: "Regional States" },
          { code: "et-aa", name: "Addis Ababa",         flagUrl: wiki("Flag of Addis Ababa.svg"),                         group: "Chartered Cities" },
          // Dire Dawa has a city flag in reality but no verified Commons file — left name-only
          { code: "et-dd", name: "Dire Dawa", flagUrl: wiki("Flag of Dire Dawa, Ethiopia.svg"),                                                                             group: "Chartered Cities" },
        ],
      },

      // ── Egypt (27 governorates) ──────────────────────────────────────────
      // Most governorates have a flag (filenames on Commons are inconsistent — some are
      // misspelled, animated GIFs, or Catalan-named). Faiyum has no verified flag file.
      {
        code: "EG", name: "Egypt", emoji: "🇪🇬", subTitle: "27 Governorates", locked: false,
        subRegions: [
          { code: "eg-c",   name: "Cairo",          flagUrl: wiki("Flag of Cairo Governorate.svg") },
          { code: "eg-gz",  name: "Giza",           flagUrl: wiki("Flag of Giza Governorate.png") },
          { code: "eg-alx", name: "Alexandria",     flagUrl: wiki("Flag of Alexandria.svg") },
          { code: "eg-dk",  name: "Dakahlia",       flagUrl: wiki("Governadorat de Daqahliya.png") },
          { code: "eg-bh",  name: "Beheira",        flagUrl: wiki("Flag of Beheira Governorate.svg") },
          { code: "eg-fym", name: "Faiyum", flagUrl: wiki("Governadorat de Faium.png") },
          { code: "eg-gh",  name: "Gharbia",        flagUrl: wiki("Flag of Gharbia Governorate.png") },
          { code: "eg-is",  name: "Ismailia",       flagUrl: wiki("Governadorat d'Ismailiya.png") },
          { code: "eg-mnf", name: "Monufia",        flagUrl: wiki("Flag of Menoufia Governorate.PNG") },
          { code: "eg-mn",  name: "Minya",          flagUrl: wiki("Flag of Minya Govenorate.JPG") },
          { code: "eg-kb",  name: "Qalyubia",       flagUrl: wiki("Flag of Qalubiya Governorate.png") },
          { code: "eg-wad", name: "New Valley",      flagUrl: wiki("Old Flag of New Valley Governorate, Egypt.svg") },
          { code: "eg-suz", name: "Suez",           flagUrl: wiki("Flag of Suez Governorate.svg") },
          { code: "eg-asn", name: "Aswan",          flagUrl: wiki("Flag of Aswan Governorate.png") },
          { code: "eg-ast", name: "Asyut",          flagUrl: wiki("Flag of Asyut Governorate.png") },
          { code: "eg-bns", name: "Beni Suef",      flagUrl: wiki("Beni Suef Governorate New Flag.svg") },
          { code: "eg-pts", name: "Port Said",      flagUrl: wiki("Flag of Port Said Governorate.PNG") },
          { code: "eg-dt",  name: "Damietta",       flagUrl: wiki("Flag of Damietta Governorate.svg") },
          { code: "eg-shr", name: "Sharqia",        flagUrl: wiki("Flag of Ash Sharqiyah.svg") },
          { code: "eg-js",  name: "South Sinai",    flagUrl: wiki("Flag of the South Sinai Governorate.svg") },
          { code: "eg-kfs", name: "Kafr el-Sheikh", flagUrl: wiki("Flag of Kafr El-Sheikh Governorate.svg") },
          { code: "eg-mt",  name: "Matrouh",        flagUrl: wiki("Flag of Matrouh Governorate.svg") },
          { code: "eg-lx",  name: "Luxor",          flagUrl: wiki("Eg luxor.png") },
          { code: "eg-qna", name: "Qena",           flagUrl: wiki("Flag of Qena Governorate.png") },
          { code: "eg-sin", name: "North Sinai",    flagUrl: wiki("Flag of North Sinai Governorate.svg") },
          { code: "eg-shg", name: "Sohag",          flagUrl: wiki("Flag of Sohag Governorate.svg") },
          { code: "eg-ba",  name: "Red Sea",        flagUrl: wiki("Red sea governorate flag.png") },
        ],
      },

      // ── DR Congo (26 provinces) ──────────────────────────────────────────
      // Reorganised from 11 to 26 provinces in 2015; provinces have no official flags.
      {
        code: "CD", name: "DR Congo", emoji: "🇨🇩", subTitle: "26 Provinces", locked: false,
        subRegions: [
          { code: "cd-kn", name: "Kinshasa" },
          { code: "cd-bc", name: "Kongo Central" },
          { code: "cd-kg", name: "Kwango" },
          { code: "cd-kl", name: "Kwilu" },
          { code: "cd-mn", name: "Mai-Ndombe" },
          { code: "cd-ks", name: "Kasaï" },
          { code: "cd-kc", name: "Kasaï-Central" },
          { code: "cd-ke", name: "Kasaï-Oriental" },
          { code: "cd-lo", name: "Lomami" },
          { code: "cd-sa", name: "Sankuru" },
          { code: "cd-ma", name: "Maniema" },
          { code: "cd-sk", name: "South Kivu" },
          { code: "cd-nk", name: "North Kivu" },
          { code: "cd-it", name: "Ituri" },
          { code: "cd-hu", name: "Haut-Uélé" },
          { code: "cd-to", name: "Tshopo" },
          { code: "cd-bu", name: "Bas-Uélé" },
          { code: "cd-nu", name: "Nord-Ubangi" },
          { code: "cd-mo", name: "Mongala" },
          { code: "cd-su", name: "Sud-Ubangi" },
          { code: "cd-eq", name: "Équateur" },
          { code: "cd-tu", name: "Tshuapa" },
          { code: "cd-ta", name: "Tanganyika" },
          { code: "cd-hl", name: "Haut-Lomami" },
          { code: "cd-lu", name: "Lualaba" },
          { code: "cd-hk", name: "Haut-Katanga" },
        ],
      },

      // ── Tanzania (31 regions: 26 mainland + 5 Zanzibar) ──────────────────
      // Breaks down weird: Zanzibar is a semi-autonomous archipelago with its own
      // government and flag — its 5 regions are grouped apart from the 26 mainland ones.
      {
        code: "TZ", name: "Tanzania", emoji: "🇹🇿", subTitle: "31 Regions", locked: false,
        subRegions: [
          { code: "tz-arusha",     name: "Arusha",         group: "Mainland" },
          { code: "tz-dar",        name: "Dar es Salaam",  group: "Mainland" },
          { code: "tz-dodoma",     name: "Dodoma",         group: "Mainland" },
          { code: "tz-geita",      name: "Geita",          group: "Mainland" },
          { code: "tz-iringa",     name: "Iringa",         group: "Mainland" },
          { code: "tz-kagera",     name: "Kagera",         group: "Mainland" },
          { code: "tz-katavi",     name: "Katavi",         group: "Mainland" },
          { code: "tz-kigoma",     name: "Kigoma",         group: "Mainland" },
          { code: "tz-kilimanjaro",name: "Kilimanjaro",    group: "Mainland" },
          { code: "tz-lindi",      name: "Lindi",          group: "Mainland" },
          { code: "tz-manyara",    name: "Manyara",        group: "Mainland" },
          { code: "tz-mara",       name: "Mara",           group: "Mainland" },
          { code: "tz-mbeya",      name: "Mbeya",          group: "Mainland" },
          { code: "tz-morogoro",   name: "Morogoro",       group: "Mainland" },
          { code: "tz-mtwara",     name: "Mtwara",         group: "Mainland" },
          { code: "tz-mwanza",     name: "Mwanza",         group: "Mainland" },
          { code: "tz-njombe",     name: "Njombe",         group: "Mainland" },
          { code: "tz-pwani",      name: "Pwani (Coast)",  group: "Mainland" },
          { code: "tz-rukwa",      name: "Rukwa",          group: "Mainland" },
          { code: "tz-ruvuma",     name: "Ruvuma",         group: "Mainland" },
          { code: "tz-shinyanga",  name: "Shinyanga",      group: "Mainland" },
          { code: "tz-simiyu",     name: "Simiyu",         group: "Mainland" },
          { code: "tz-singida",    name: "Singida",        group: "Mainland" },
          { code: "tz-songwe",     name: "Songwe",         group: "Mainland" },
          { code: "tz-tabora",     name: "Tabora",         group: "Mainland" },
          { code: "tz-tanga",      name: "Tanga",          group: "Mainland" },
          { code: "tz-zn-north",   name: "Zanzibar North", group: "Zanzibar" },
          { code: "tz-zn-central", name: "Zanzibar Central/South", group: "Zanzibar" },
          { code: "tz-zn-urban",   name: "Zanzibar Urban/West",    group: "Zanzibar" },
          { code: "tz-pemba-north",name: "Pemba North",    group: "Zanzibar" },
          { code: "tz-pemba-south",name: "Pemba South",    group: "Zanzibar" },
        ],
      },

      // ── Kenya (47 counties) ──────────────────────────────────────────────
      // Most of Kenya's 47 counties adopted flags after devolution in 2013.
      {
        code: "KE", name: "Kenya", emoji: "🇰🇪", subTitle: "47 Counties", locked: false,
        subRegions: [
          { code: "ke-mombasa",        name: "Mombasa",         flagUrl: wiki("Flag of Mombasa County.png") },
          { code: "ke-kwale",          name: "Kwale",           flagUrl: wiki("Kwale County Flag.svg") },
          { code: "ke-kilifi",         name: "Kilifi",          flagUrl: wiki("Flag of Kilifi County.png") },
          { code: "ke-tana-river",     name: "Tana River",      flagUrl: wiki("Flag of Tana River County.gif") },
          { code: "ke-lamu",           name: "Lamu",            flagUrl: wiki("Lamu County Flag.png") },
          { code: "ke-taita-taveta",   name: "Taita-Taveta",    flagUrl: wiki("Flag of Taita Taveta County.png") },
          { code: "ke-garissa",        name: "Garissa",         flagUrl: wiki("Former flag of Garissa County.gif") },
          { code: "ke-wajir",          name: "Wajir",           flagUrl: wiki("Flag of Wajir County, Kenya.svg") },
          { code: "ke-mandera",        name: "Mandera",         flagUrl: wiki("Flag of Mandera County, Kenya.svg") },
          { code: "ke-marsabit",       name: "Marsabit",        flagUrl: wiki("Flag of Marsabit County.png") },
          { code: "ke-isiolo",         name: "Isiolo",          flagUrl: wiki("Flag of Isiolo County.gif") },
          { code: "ke-meru",           name: "Meru",            flagUrl: wiki("Flag of Meru County.png") },
          { code: "ke-tharaka-nithi",  name: "Tharaka-Nithi",   flagUrl: wiki("Flag of Tharaka Nithi County.gif") },
          { code: "ke-embu",           name: "Embu",            flagUrl: wiki("Flag of Embu County.gif") },
          { code: "ke-kitui",          name: "Kitui",           flagUrl: wiki("Flag of Kitui County.gif") },
          { code: "ke-machakos",       name: "Machakos",        flagUrl: wiki("Flag of Machakos County.png") },
          { code: "ke-makueni",        name: "Makueni", flagUrl: wiki("Flag of Makueni County.gif") },
          { code: "ke-nyandarua",      name: "Nyandarua",       flagUrl: wiki("Flag of Nyandarua County.png") },
          { code: "ke-nyeri",          name: "Nyeri",           flagUrl: wiki("Nyeri County Border Flag.jpg") },
          { code: "ke-kirinyaga",      name: "Kirinyaga",       flagUrl: wiki("Flag of Kirinyaga County.gif") },
          { code: "ke-muranga",        name: "Murang'a",        flagUrl: wiki("Flag of Murang'a County.gif") },
          { code: "ke-kiambu",         name: "Kiambu",          flagUrl: wiki("Kiambu County Flag.svg") },
          { code: "ke-turkana",        name: "Turkana",         flagUrl: wiki("Flag of Turkana County.gif") },
          { code: "ke-west-pokot",     name: "West Pokot",      flagUrl: wiki("Flag of West Pokot County.png") },
          { code: "ke-samburu",        name: "Samburu",         flagUrl: wiki("Flag of Samburu County.png") },
          { code: "ke-trans-nzoia",    name: "Trans-Nzoia",     flagUrl: wiki("Flag of Trans Nzoia County.gif") },
          { code: "ke-uasin-gishu",    name: "Uasin Gishu",     flagUrl: wiki("Flag of Uasin Gishu County.gif") },
          { code: "ke-elgeyo",         name: "Elgeyo-Marakwet", flagUrl: wiki("Elgeyo Marakwet Flag.png") },
          { code: "ke-nandi",          name: "Nandi",           flagUrl: wiki("Contea di Nandi flag.gif") },
          { code: "ke-baringo",        name: "Baringo",         flagUrl: wiki("Flag of Baringo County.svg") },
          { code: "ke-laikipia",       name: "Laikipia",        flagUrl: wiki("Flag of Laikipia County.gif") },
          { code: "ke-nakuru",         name: "Nakuru",          flagUrl: wiki("Flag of Nakuru County.svg") },
          { code: "ke-narok",          name: "Narok",           flagUrl: wiki("Narok County Flag border.jpg") },
          { code: "ke-kajiado",        name: "Kajiado",         flagUrl: wiki("Kajiado Flag.png") },
          { code: "ke-kericho",        name: "Kericho",         flagUrl: wiki("Flag of Kericho County.gif") },
          { code: "ke-bomet",          name: "Bomet",           flagUrl: wiki("Flag of Bomet County.png") },
          { code: "ke-kakamega",       name: "Kakamega",        flagUrl: wiki("Flag of Kakamega County.gif") },
          { code: "ke-vihiga",         name: "Vihiga",          flagUrl: wiki("Vihiga County Flag.svg") },
          { code: "ke-bungoma",        name: "Bungoma",         flagUrl: wiki("Flag of Bungoma County.gif") },
          { code: "ke-busia",          name: "Busia",           flagUrl: wiki("Flag of Busia County.svg") },
          { code: "ke-siaya",          name: "Siaya",           flagUrl: wiki("Flag of Siaya County.png") },
          { code: "ke-kisumu",         name: "Kisumu",          flagUrl: wiki("Flag of Kisumu County.png") },
          { code: "ke-homa-bay",       name: "Homa Bay",        flagUrl: wiki("Flag of Homa Bay County.png") },
          { code: "ke-migori",         name: "Migori",          flagUrl: wiki("Flag of Migori County, Kenya.png") },
          { code: "ke-kisii",          name: "Kisii",           flagUrl: wiki("Flag of Kisii County.gif") },
          { code: "ke-nyamira",        name: "Nyamira",         flagUrl: wiki("Flag of Nyamira County.gif") },
          { code: "ke-nairobi",        name: "Nairobi",         flagUrl: wiki("Flag of Nairobi County.svg") },
        ],
      },

      // ── Ghana (16 regions) ───────────────────────────────────────────────
      // Expanded from 10 to 16 regions in 2019 after referendums; no official flags.
      {
        code: "GH", name: "Ghana", emoji: "🇬🇭", subTitle: "16 Regions", locked: false,
        subRegions: [
          { code: "gh-ah",  name: "Ahafo" },
          { code: "gh-as",  name: "Ashanti" },
          { code: "gh-br",  name: "Bono" },
          { code: "gh-be",  name: "Bono East" },
          { code: "gh-cp",  name: "Central" },
          { code: "gh-ep",  name: "Eastern" },
          { code: "gh-aa",  name: "Greater Accra" },
          { code: "gh-ne",  name: "North East" },
          { code: "gh-np",  name: "Northern" },
          { code: "gh-ot",  name: "Oti" },
          { code: "gh-sv",  name: "Savannah" },
          { code: "gh-ue",  name: "Upper East" },
          { code: "gh-uw",  name: "Upper West" },
          { code: "gh-tv",  name: "Volta" },
          { code: "gh-wp",  name: "Western" },
          { code: "gh-wn",  name: "Western North" },
        ],
      },

      // ── Morocco (12 regions) ─────────────────────────────────────────────
      // Note: the southern two regions (Laâyoune-Sakia El Hamra, Dakhla-Oued Ed-Dahab)
      // lie in Western Sahara, a territory whose status is disputed.
      {
        code: "MA", name: "Morocco", emoji: "🇲🇦", subTitle: "12 Regions", locked: false,
        subRegions: [
          { code: "ma-01", name: "Tanger-Tétouan-Al Hoceïma" },
          { code: "ma-02", name: "Oriental" },
          { code: "ma-03", name: "Fès-Meknès" },
          { code: "ma-04", name: "Rabat-Salé-Kénitra" },
          { code: "ma-05", name: "Béni Mellal-Khénifra" },
          { code: "ma-06", name: "Casablanca-Settat" },
          { code: "ma-07", name: "Marrakesh-Safi" },
          { code: "ma-08", name: "Drâa-Tafilalet" },
          { code: "ma-09", name: "Souss-Massa" },
          { code: "ma-10", name: "Guelmim-Oued Noun" },
          { code: "ma-11", name: "Laâyoune-Sakia El Hamra" },
          { code: "ma-12", name: "Dakhla-Oued Ed-Dahab" },
        ],
      },

      // ── Algeria (58 provinces / wilayas) ─────────────────────────────────
      // Expanded from 48 to 58 wilayas in 2019 (ten new provinces carved from the south).
      {
        code: "DZ", name: "Algeria", emoji: "🇩🇿", subTitle: "58 Provinces", locked: false,
        subRegions: [
          { code: "dz-01", name: "Adrar" },
          { code: "dz-02", name: "Chlef" },
          { code: "dz-03", name: "Laghouat" },
          { code: "dz-04", name: "Oum El Bouaghi" },
          { code: "dz-05", name: "Batna" },
          { code: "dz-06", name: "Béjaïa" },
          { code: "dz-07", name: "Biskra" },
          { code: "dz-08", name: "Béchar" },
          { code: "dz-09", name: "Blida" },
          { code: "dz-10", name: "Bouïra" },
          { code: "dz-11", name: "Tamanrasset" },
          { code: "dz-12", name: "Tébessa" },
          { code: "dz-13", name: "Tlemcen" },
          { code: "dz-14", name: "Tiaret" },
          { code: "dz-15", name: "Tizi Ouzou" },
          { code: "dz-16", name: "Algiers" },
          { code: "dz-17", name: "Djelfa" },
          { code: "dz-18", name: "Jijel" },
          { code: "dz-19", name: "Sétif" },
          { code: "dz-20", name: "Saïda" },
          { code: "dz-21", name: "Skikda" },
          { code: "dz-22", name: "Sidi Bel Abbès" },
          { code: "dz-23", name: "Annaba" },
          { code: "dz-24", name: "Guelma" },
          { code: "dz-25", name: "Constantine" },
          { code: "dz-26", name: "Médéa" },
          { code: "dz-27", name: "Mostaganem" },
          { code: "dz-28", name: "M'Sila" },
          { code: "dz-29", name: "Mascara" },
          { code: "dz-30", name: "Ouargla" },
          { code: "dz-31", name: "Oran" },
          { code: "dz-32", name: "El Bayadh" },
          { code: "dz-33", name: "Illizi" },
          { code: "dz-34", name: "Bordj Bou Arréridj" },
          { code: "dz-35", name: "Boumerdès" },
          { code: "dz-36", name: "El Tarf" },
          { code: "dz-37", name: "Tindouf" },
          { code: "dz-38", name: "Tissemsilt" },
          { code: "dz-39", name: "El Oued" },
          { code: "dz-40", name: "Khenchela" },
          { code: "dz-41", name: "Souk Ahras" },
          { code: "dz-42", name: "Tipaza" },
          { code: "dz-43", name: "Mila" },
          { code: "dz-44", name: "Aïn Defla" },
          { code: "dz-45", name: "Naâma" },
          { code: "dz-46", name: "Aïn Témouchent" },
          { code: "dz-47", name: "Ghardaïa" },
          { code: "dz-48", name: "Relizane" },
          { code: "dz-49", name: "Timimoun" },
          { code: "dz-50", name: "Bordj Badji Mokhtar" },
          { code: "dz-51", name: "Ouled Djellal" },
          { code: "dz-52", name: "Béni Abbès" },
          { code: "dz-53", name: "In Salah" },
          { code: "dz-54", name: "In Guezzam" },
          { code: "dz-55", name: "Touggourt" },
          { code: "dz-56", name: "Djanet" },
          { code: "dz-57", name: "El M'Ghair" },
          { code: "dz-58", name: "El Menia" },
        ],
      },

      // ── Angola (18 provinces) ────────────────────────────────────────────
      // Note: a 2024 reform expanded Angola to 21 provinces; the classic 18 are listed
      // here. Provinces have no official flags.
      {
        code: "AO", name: "Angola", emoji: "🇦🇴", subTitle: "18 Provinces", locked: false,
        subRegions: [
          { code: "ao-bgo", name: "Bengo" },
          { code: "ao-bgu", name: "Benguela" },
          { code: "ao-bie", name: "Bié" },
          { code: "ao-cab", name: "Cabinda" },
          { code: "ao-ccu", name: "Cuando Cubango" },
          { code: "ao-cno", name: "Cuanza Norte" },
          { code: "ao-cus", name: "Cuanza Sul" },
          { code: "ao-cnn", name: "Cunene" },
          { code: "ao-hua", name: "Huambo" },
          { code: "ao-hui", name: "Huíla" },
          { code: "ao-lua", name: "Luanda" },
          { code: "ao-lno", name: "Lunda Norte" },
          { code: "ao-lsu", name: "Lunda Sul" },
          { code: "ao-mal", name: "Malanje" },
          { code: "ao-mox", name: "Moxico" },
          { code: "ao-nam", name: "Namibe" },
          { code: "ao-uig", name: "Uíge" },
          { code: "ao-zai", name: "Zaire" },
        ],
      },

      // ── Mozambique (10 provinces + Maputo City) ──────────────────────────
      // Breaks down weird: Maputo City has provincial status separate from the
      // surrounding Maputo Province, making 11 first-level units in practice.
      {
        code: "MZ", name: "Mozambique", emoji: "🇲🇿", subTitle: "10 Provinces + Capital", locked: false,
        subRegions: [
          { code: "mz-p",   name: "Cabo Delgado",  group: "Provinces" },
          { code: "mz-g",   name: "Gaza",          group: "Provinces" },
          { code: "mz-i",   name: "Inhambane",     group: "Provinces" },
          { code: "mz-b",   name: "Manica",        group: "Provinces" },
          { code: "mz-l",   name: "Maputo",        group: "Provinces" },
          { code: "mz-n",   name: "Nampula",       group: "Provinces" },
          { code: "mz-a",   name: "Niassa",        group: "Provinces" },
          { code: "mz-s",   name: "Sofala",        group: "Provinces" },
          { code: "mz-t",   name: "Tete",          group: "Provinces" },
          { code: "mz-q",   name: "Zambezia",      group: "Provinces" },
          { code: "mz-mpm", name: "Maputo City",   group: "City (Provincial Status)" },
        ],
      },

      // ── Cameroon (10 regions) ────────────────────────────────────────────
      // Note: the North-West and South-West are the Anglophone regions at the centre of
      // the ongoing Ambazonia conflict. Regions have no official flags.
      {
        code: "CM", name: "Cameroon", emoji: "🇨🇲", subTitle: "10 Regions", locked: false,
        subRegions: [
          { code: "cm-ad", name: "Adamawa" },
          { code: "cm-ce", name: "Centre" },
          { code: "cm-es", name: "East" },
          { code: "cm-en", name: "Far North" },
          { code: "cm-lt", name: "Littoral" },
          { code: "cm-no", name: "North" },
          { code: "cm-nw", name: "North-West" },
          { code: "cm-su", name: "South" },
          { code: "cm-sw", name: "South-West" },
          { code: "cm-ou", name: "West" },
        ],
      },

      // ── Senegal (14 regions) ─────────────────────────────────────────────
      // Regions have no official flags.
      {
        code: "SN", name: "Senegal", emoji: "🇸🇳", subTitle: "14 Regions", locked: false,
        subRegions: [
          { code: "sn-dk", name: "Dakar" },
          { code: "sn-db", name: "Diourbel" },
          { code: "sn-fk", name: "Fatick" },
          { code: "sn-ka", name: "Kaffrine" },
          { code: "sn-kl", name: "Kaolack" },
          { code: "sn-kd", name: "Kédougou" },
          { code: "sn-kz", name: "Kolda" },
          { code: "sn-lg", name: "Louga" },
          { code: "sn-mt", name: "Matam" },
          { code: "sn-sl", name: "Saint-Louis" },
          { code: "sn-se", name: "Sédhiou" },
          { code: "sn-tc", name: "Tambacounda" },
          { code: "sn-th", name: "Thiès" },
          { code: "sn-zg", name: "Ziguinchor" },
        ],
      },

      // The remaining African countries — first-level subdivisions. Almost none of these
      // have official subdivision flags, so they are name-only tiles (a few notable
      // exceptions, e.g. the Comoros islands and Príncipe, do have flags and are noted).

      // ── Benin (12 departments) ───────────────────────────────────────────
      {
        code: "BJ", name: "Benin", emoji: "🇧🇯", subTitle: "12 Departments", locked: false,
        subRegions: [
          { code: "bj-al", name: "Alibori" },
          { code: "bj-ak", name: "Atacora" },
          { code: "bj-aq", name: "Atlantique" },
          { code: "bj-bo", name: "Borgou" },
          { code: "bj-co", name: "Collines" },
          { code: "bj-ku", name: "Couffo" },
          { code: "bj-do", name: "Donga" },
          { code: "bj-li", name: "Littoral" },
          { code: "bj-mo", name: "Mono" },
          { code: "bj-ou", name: "Ouémé" },
          { code: "bj-pl", name: "Plateau" },
          { code: "bj-zo", name: "Zou" },
        ],
      },

      // ── Botswana (10 districts) ──────────────────────────────────────────
      {
        code: "BW", name: "Botswana", emoji: "🇧🇼", subTitle: "10 Districts", locked: false,
        subRegions: [
          { code: "bw-ce", name: "Central" },
          { code: "bw-ch", name: "Chobe" },
          { code: "bw-gh", name: "Ghanzi" },
          { code: "bw-kg", name: "Kgalagadi" },
          { code: "bw-kl", name: "Kgatleng" },
          { code: "bw-kw", name: "Kweneng" },
          { code: "bw-ne", name: "North-East" },
          { code: "bw-nw", name: "North-West" },
          { code: "bw-se", name: "South-East" },
          { code: "bw-so", name: "Southern" },
        ],
      },

      // ── Burkina Faso (13 regions) ────────────────────────────────────────
      {
        code: "BF", name: "Burkina Faso", emoji: "🇧🇫", subTitle: "13 Regions", locked: false,
        subRegions: [
          { code: "bf-bml", name: "Boucle du Mouhoun" },
          { code: "bf-cas", name: "Cascades" },
          { code: "bf-cen", name: "Centre" },
          { code: "bf-est", name: "Centre-Est" },
          { code: "bf-nor", name: "Centre-Nord" },
          { code: "bf-oue", name: "Centre-Ouest" },
          { code: "bf-sud", name: "Centre-Sud" },
          { code: "bf-e",   name: "Est" },
          { code: "bf-hba", name: "Hauts-Bassins" },
          { code: "bf-n",   name: "Nord" },
          { code: "bf-plc", name: "Plateau-Central" },
          { code: "bf-sah", name: "Sahel" },
          { code: "bf-sow", name: "Sud-Ouest" },
        ],
      },

      // ── Burundi (18 provinces) ───────────────────────────────────────────
      {
        code: "BI", name: "Burundi", emoji: "🇧🇮", subTitle: "18 Provinces", locked: false,
        subRegions: [
          { code: "bi-bb", name: "Bubanza" },
          { code: "bi-bm", name: "Bujumbura Mairie" },
          { code: "bi-br", name: "Bujumbura Rural" },
          { code: "bi-br2",name: "Bururi" },
          { code: "bi-ca", name: "Cankuzo" },
          { code: "bi-ci", name: "Cibitoke" },
          { code: "bi-gi", name: "Gitega" },
          { code: "bi-ka", name: "Karuzi" },
          { code: "bi-ky", name: "Kayanza" },
          { code: "bi-ki", name: "Kirundo" },
          { code: "bi-ma", name: "Makamba" },
          { code: "bi-mu", name: "Muramvya" },
          { code: "bi-my", name: "Muyinga" },
          { code: "bi-mw", name: "Mwaro" },
          { code: "bi-ng", name: "Ngozi" },
          { code: "bi-rm", name: "Rumonge" },
          { code: "bi-rt", name: "Rutana" },
          { code: "bi-ry", name: "Ruyigi" },
        ],
      },

      // ── Cape Verde (22 municipalities) ───────────────────────────────────
      // Many municipalities have flags (Commons naming is inconsistent — mix of English
      // "Flag of X municipality" and Portuguese "Bandeira X"). Unverified ones are placeholders.
      {
        code: "CV", name: "Cape Verde", emoji: "🇨🇻", subTitle: "22 Municipalities", locked: false,
        subRegions: [
          { code: "cv-bv", name: "Boa Vista",                  flagUrl: wiki("Flag of Boa Vista municipality.jpg") },
          { code: "cv-br", name: "Brava",                      flagUrl: wiki("Flag of Brava municipality.gif") },
          { code: "cv-ma", name: "Maio",                       flagUrl: wiki("Flag of Maio municipality.gif") },
          { code: "cv-mo", name: "Mosteiros", flagUrl: wiki("Flag of Mosteiros municipality.gif") },
          { code: "cv-pa", name: "Paul", flagUrl: wiki("Flag of Paul municipality.gif") },
          { code: "cv-pn", name: "Porto Novo",                 flagUrl: wiki("Bandeira Porto Novo.gif") },
          { code: "cv-pr", name: "Praia",                      flagUrl: wiki("Flag of Praia.svg") },
          { code: "cv-rb", name: "Ribeira Brava", noFlag: true },
          { code: "cv-rg", name: "Ribeira Grande",             flagUrl: wiki("Flag of Ribeira Grande municipality.gif") },
          { code: "cv-rs", name: "Ribeira Grande de Santiago", noFlag: true },
          { code: "cv-sl", name: "Sal",                        flagUrl: wiki("Flag of Sal municipality.gif") },
          { code: "cv-ca", name: "Santa Catarina",             flagUrl: wiki("Flag of Santa Catarina municipality.gif") },
          { code: "cv-cf", name: "Santa Catarina do Fogo" },
          { code: "cv-cr", name: "Santa Cruz", noFlag: true },
          { code: "cv-sd", name: "São Domingos" },
          { code: "cv-sf", name: "São Filipe",                 flagUrl: wiki("Bandeira São Filipe.gif") },
          { code: "cv-so", name: "São Lourenço dos Órgãos" },
          { code: "cv-sm", name: "São Miguel", flagUrl: wiki("Flag of São Miguel, Cabo Verde.svg") },
          { code: "cv-ss", name: "São Salvador do Mundo" },
          { code: "cv-sv", name: "São Vicente",                flagUrl: wiki("Flag of São Vicente municipality.gif") },
          { code: "cv-ta", name: "Tarrafal", flagUrl: wiki("Flag of Tarrafal municipality.gif") },
          { code: "cv-ts", name: "Tarrafal de São Nicolau",    flagUrl: wiki("Flag of Tarrafal de São Nicolau municipality.gif") },
        ],
      },

      // ── Central African Republic (16 prefectures + Bangui) ───────────────
      {
        code: "CF", name: "Central African Republic", emoji: "🇨🇫", subTitle: "16 Prefectures + Bangui", locked: false,
        subRegions: [
          { code: "cf-bgf", name: "Bangui" },
          { code: "cf-bb",  name: "Bamingui-Bangoran" },
          { code: "cf-bk",  name: "Basse-Kotto" },
          { code: "cf-hm",  name: "Haut-Mbomou" },
          { code: "cf-hk",  name: "Haute-Kotto" },
          { code: "cf-kg",  name: "Kémo" },
          { code: "cf-lb",  name: "Lobaye" },
          { code: "cf-hs",  name: "Mambéré-Kadéï" },
          { code: "cf-mb",  name: "Mbomou" },
          { code: "cf-kb",  name: "Nana-Grébizi" },
          { code: "cf-nm",  name: "Nana-Mambéré" },
          { code: "cf-mp",  name: "Ombella-M'Poko" },
          { code: "cf-uk",  name: "Ouaka" },
          { code: "cf-ac",  name: "Ouham" },
          { code: "cf-op",  name: "Ouham-Pendé" },
          { code: "cf-se",  name: "Sangha-Mbaéré" },
          { code: "cf-vk",  name: "Vakaga" },
        ],
      },

      // ── Chad (23 provinces) ──────────────────────────────────────────────
      {
        code: "TD", name: "Chad", emoji: "🇹🇩", subTitle: "23 Provinces", locked: false,
        subRegions: [
          { code: "td-ba",  name: "Batha" },
          { code: "td-bg",  name: "Barh-El-Gazel" },
          { code: "td-bo",  name: "Borkou" },
          { code: "td-cb",  name: "Chari-Baguirmi" },
          { code: "td-ee",  name: "Ennedi-Est" },
          { code: "td-eo",  name: "Ennedi-Ouest" },
          { code: "td-gr",  name: "Guéra" },
          { code: "td-hl",  name: "Hadjer-Lamis" },
          { code: "td-ka",  name: "Kanem" },
          { code: "td-lc",  name: "Lac" },
          { code: "td-lo",  name: "Logone Occidental" },
          { code: "td-lr",  name: "Logone Oriental" },
          { code: "td-ma",  name: "Mandoul" },
          { code: "td-me",  name: "Mayo-Kebbi Est" },
          { code: "td-mo",  name: "Mayo-Kebbi Ouest" },
          { code: "td-mc",  name: "Moyen-Chari" },
          { code: "td-nd",  name: "N'Djamena" },
          { code: "td-od",  name: "Ouaddaï" },
          { code: "td-sa",  name: "Salamat" },
          { code: "td-si",  name: "Sila" },
          { code: "td-ti",  name: "Tandjilé" },
          { code: "td-ts",  name: "Tibesti" },
          { code: "td-wf",  name: "Wadi Fira" },
        ],
      },

      // ── Comoros (3 autonomous islands) ───────────────────────────────────
      // Each island is autonomous and has its own official flag.
      {
        code: "KM", name: "Comoros", emoji: "🇰🇲", subTitle: "3 Islands", locked: false,
        subRegions: [
          { code: "km-g", name: "Grande Comore (Ngazidja)", flagUrl: wiki("Flag of Grande Comore.svg") },
          { code: "km-a", name: "Anjouan (Ndzuwani)",       flagUrl: wiki("Flag of Anjouan (official).svg") },
          { code: "km-m", name: "Mohéli (Mwali)",           flagUrl: wiki("Flag of Mohéli (official).svg") },
        ],
      },

      // ── Republic of the Congo (12 departments) ───────────────────────────
      {
        code: "CG", name: "Republic of the Congo", emoji: "🇨🇬", subTitle: "12 Departments", locked: false,
        subRegions: [
          { code: "cg-bz", name: "Brazzaville" },
          { code: "cg-bo", name: "Bouenza" },
          { code: "cg-cu", name: "Cuvette" },
          { code: "cg-co", name: "Cuvette-Ouest" },
          { code: "cg-ko", name: "Kouilou" },
          { code: "cg-le", name: "Lékoumou" },
          { code: "cg-li", name: "Likouala" },
          { code: "cg-ni", name: "Niari" },
          { code: "cg-pl", name: "Plateaux" },
          { code: "cg-pn", name: "Pointe-Noire" },
          { code: "cg-po", name: "Pool" },
          { code: "cg-sa", name: "Sangha" },
        ],
      },

      // ── Côte d'Ivoire (14 districts) ─────────────────────────────────────
      {
        code: "CI", name: "Côte d'Ivoire", emoji: "🇨🇮", subTitle: "14 Districts", locked: false,
        subRegions: [
          { code: "ci-ab", name: "Abidjan" },
          { code: "ci-ym", name: "Yamoussoukro" },
          { code: "ci-bs", name: "Bas-Sassandra" },
          { code: "ci-cm", name: "Comoé" },
          { code: "ci-dn", name: "Denguélé" },
          { code: "ci-gd", name: "Gôh-Djiboua" },
          { code: "ci-lc", name: "Lacs" },
          { code: "ci-lg", name: "Lagunes" },
          { code: "ci-mg", name: "Montagnes" },
          { code: "ci-sm", name: "Sassandra-Marahoué" },
          { code: "ci-sv", name: "Savanes" },
          { code: "ci-vb", name: "Vallée du Bandama" },
          { code: "ci-wr", name: "Woroba" },
          { code: "ci-zz", name: "Zanzan" },
        ],
      },

      // ── Djibouti (6 regions) ─────────────────────────────────────────────
      {
        code: "DJ", name: "Djibouti", emoji: "🇩🇯", subTitle: "6 Regions", locked: false,
        subRegions: [
          { code: "dj-as", name: "Ali Sabieh" },
          { code: "dj-ar", name: "Arta" },
          { code: "dj-di", name: "Dikhil" },
          { code: "dj-dj", name: "Djibouti" },
          { code: "dj-ob", name: "Obock" },
          { code: "dj-ta", name: "Tadjourah" },
        ],
      },

      // ── Equatorial Guinea (8 provinces) ──────────────────────────────────
      {
        code: "GQ", name: "Equatorial Guinea", emoji: "🇬🇶", subTitle: "8 Provinces", locked: false,
        subRegions: [
          { code: "gq-an", name: "Annobón" },
          { code: "gq-bn", name: "Bioko Norte" },
          { code: "gq-bs", name: "Bioko Sur" },
          { code: "gq-cs", name: "Centro Sur" },
          { code: "gq-dj", name: "Djibloho" },
          { code: "gq-kn", name: "Kié-Ntem" },
          { code: "gq-li", name: "Litoral" },
          { code: "gq-wn", name: "Wele-Nzas" },
        ],
      },

      // ── Eritrea (6 regions / zobas) ──────────────────────────────────────
      {
        code: "ER", name: "Eritrea", emoji: "🇪🇷", subTitle: "6 Regions", locked: false,
        subRegions: [
          { code: "er-an", name: "Anseba" },
          { code: "er-db", name: "Debub (Southern)" },
          { code: "er-gb", name: "Gash-Barka" },
          { code: "er-ma", name: "Maekel (Central)" },
          { code: "er-sk", name: "Northern Red Sea" },
          { code: "er-dk", name: "Southern Red Sea" },
        ],
      },

      // ── Eswatini (4 regions) ─────────────────────────────────────────────
      {
        code: "SZ", name: "Eswatini", emoji: "🇸🇿", subTitle: "4 Regions", locked: false,
        subRegions: [
          { code: "sz-hh", name: "Hhohho" },
          { code: "sz-lu", name: "Lubombo" },
          { code: "sz-ma", name: "Manzini" },
          { code: "sz-sh", name: "Shiselweni" },
        ],
      },

      // ── Gabon (9 provinces) ──────────────────────────────────────────────
      {
        code: "GA", name: "Gabon", emoji: "🇬🇦", subTitle: "9 Provinces", locked: false,
        subRegions: [
          { code: "ga-es", name: "Estuaire" },
          { code: "ga-ho", name: "Haut-Ogooué" },
          { code: "ga-mo", name: "Moyen-Ogooué" },
          { code: "ga-ng", name: "Ngounié" },
          { code: "ga-ny", name: "Nyanga" },
          { code: "ga-oi", name: "Ogooué-Ivindo" },
          { code: "ga-ol", name: "Ogooué-Lolo" },
          { code: "ga-om", name: "Ogooué-Maritime" },
          { code: "ga-wn", name: "Woleu-Ntem" },
        ],
      },

      // ── The Gambia (8 local government areas) ────────────────────────────
      {
        code: "GM", name: "Gambia", emoji: "🇬🇲", subTitle: "8 Local Government Areas", locked: false,
        subRegions: [
          { code: "gm-bj", name: "Banjul" },
          { code: "gm-kf", name: "Kanifing" },
          { code: "gm-br", name: "Brikama" },
          { code: "gm-ml", name: "Mansa Konko" },
          { code: "gm-kr", name: "Kerewan" },
          { code: "gm-ku", name: "Kuntaur" },
          { code: "gm-jw", name: "Janjanbureh" },
          { code: "gm-bs", name: "Basse" },
        ],
      },

      // ── Guinea (8 regions) ───────────────────────────────────────────────
      {
        code: "GN", name: "Guinea", emoji: "🇬🇳", subTitle: "8 Regions", locked: false,
        subRegions: [
          { code: "gn-b",  name: "Boké" },
          { code: "gn-c",  name: "Conakry" },
          { code: "gn-f",  name: "Faranah" },
          { code: "gn-k",  name: "Kankan" },
          { code: "gn-d",  name: "Kindia" },
          { code: "gn-l",  name: "Labé" },
          { code: "gn-m",  name: "Mamou" },
          { code: "gn-n",  name: "Nzérékoré" },
        ],
      },

      // ── Guinea-Bissau (9 regions) ────────────────────────────────────────
      {
        code: "GW", name: "Guinea-Bissau", emoji: "🇬🇼", subTitle: "9 Regions", locked: false,
        subRegions: [
          { code: "gw-ba", name: "Bafatá" },
          { code: "gw-bm", name: "Biombo" },
          { code: "gw-bs", name: "Bissau" },
          { code: "gw-bl", name: "Bolama" },
          { code: "gw-ca", name: "Cacheu" },
          { code: "gw-ga", name: "Gabú" },
          { code: "gw-oi", name: "Oio" },
          { code: "gw-qu", name: "Quinara" },
          { code: "gw-to", name: "Tombali" },
        ],
      },

      // ── Lesotho (10 districts) ───────────────────────────────────────────
      {
        code: "LS", name: "Lesotho", emoji: "🇱🇸", subTitle: "10 Districts", locked: false,
        subRegions: [
          { code: "ls-d", name: "Berea" },
          { code: "ls-b", name: "Butha-Buthe" },
          { code: "ls-c", name: "Leribe" },
          { code: "ls-e", name: "Mafeteng" },
          { code: "ls-a", name: "Maseru" },
          { code: "ls-f", name: "Mohale's Hoek" },
          { code: "ls-j", name: "Mokhotlong" },
          { code: "ls-h", name: "Qacha's Nek" },
          { code: "ls-g", name: "Quthing" },
          { code: "ls-k", name: "Thaba-Tseka" },
        ],
      },

      // ── Liberia (15 counties) ────────────────────────────────────────────
      {
        code: "LR", name: "Liberia", emoji: "🇱🇷", subTitle: "15 Counties", locked: false,
        subRegions: [
          { code: "lr-bm", name: "Bomi",            flagUrl: wiki("Flag of Bomi County.svg") },
          { code: "lr-bg", name: "Bong",            flagUrl: wiki("Flag of Bong County.svg") },
          { code: "lr-gp", name: "Gbarpolu",        flagUrl: wiki("Flag of Gbarpolu County.svg") },
          { code: "lr-gb", name: "Grand Bassa",     flagUrl: wiki("Flag of Grand Bassa County.svg") },
          { code: "lr-cm", name: "Grand Cape Mount", flagUrl: wiki("Flag of Grand Cape Mount County.svg") },
          { code: "lr-gg", name: "Grand Gedeh",     flagUrl: wiki("Flag of Grand Gedeh County.svg") },
          { code: "lr-gk", name: "Grand Kru",       flagUrl: wiki("Flag of Grand Kru County.svg") },
          { code: "lr-lo", name: "Lofa",            flagUrl: wiki("Flag of Lofa County.svg") },
          { code: "lr-mg", name: "Margibi",         flagUrl: wiki("Flag of Margibi County.svg") },
          { code: "lr-my", name: "Maryland",        flagUrl: wiki("Flag of Maryland County.svg") },
          { code: "lr-mo", name: "Montserrado",     flagUrl: wiki("Flag of Montserrado County.svg") },
          { code: "lr-ni", name: "Nimba",           flagUrl: wiki("Flag of Nimba County.svg") },
          { code: "lr-ri", name: "River Cess",      flagUrl: wiki("Flag of Rivercess County.svg") },
          { code: "lr-rg", name: "River Gee",       flagUrl: wiki("Flag of River Gee County.svg") },
          { code: "lr-si", name: "Sinoe",           flagUrl: wiki("Flag of Sinoe County.svg") },
        ],
      },

      // ── Libya (22 districts / sha'biyat) ─────────────────────────────────
      {
        code: "LY", name: "Libya", emoji: "🇱🇾", subTitle: "22 Districts", locked: false,
        subRegions: [
          { code: "ly-bu", name: "Al Butnan" },
          { code: "ly-dr", name: "Darnah" },
          { code: "ly-ja", name: "Al Jabal al Akhdar" },
          { code: "ly-mj", name: "Al Marj" },
          { code: "ly-ba", name: "Benghazi" },
          { code: "ly-wa", name: "Al Wahat" },
          { code: "ly-ku", name: "Kufra" },
          { code: "ly-sr", name: "Sirte" },
          { code: "ly-mi", name: "Misrata" },
          { code: "ly-mb", name: "Murqub" },
          { code: "ly-tb", name: "Tripoli" },
          { code: "ly-ji", name: "Jafara" },
          { code: "ly-za", name: "Zawiya" },
          { code: "ly-nq", name: "Nuqat al Khams" },
          { code: "ly-jg", name: "Jabal al Gharbi" },
          { code: "ly-nl", name: "Nalut" },
          { code: "ly-ws", name: "Wadi al Shatii" },
          { code: "ly-sb", name: "Sabha" },
          { code: "ly-wd", name: "Wadi al Hayaa" },
          { code: "ly-gt", name: "Ghat" },
          { code: "ly-mq", name: "Murzuq" },
          { code: "ly-ju", name: "Jufra" },
        ],
      },

      // ── Madagascar (6 provinces) ─────────────────────────────────────────
      // Madagascar is also divided into 23 regions, but the 6 historic provinces
      // (faritany) remain the best-known first-level breakdown.
      {
        code: "MG", name: "Madagascar", emoji: "🇲🇬", subTitle: "6 Provinces", locked: false,
        subRegions: [
          { code: "mg-t", name: "Antananarivo" },
          { code: "mg-d", name: "Antsiranana" },
          { code: "mg-f", name: "Fianarantsoa" },
          { code: "mg-m", name: "Mahajanga" },
          { code: "mg-a", name: "Toamasina" },
          { code: "mg-u", name: "Toliara" },
        ],
      },

      // ── Malawi (28 districts in 3 regions) ───────────────────────────────
      {
        code: "MW", name: "Malawi", emoji: "🇲🇼", subTitle: "28 Districts", locked: false,
        subRegions: [
          { code: "mw-ci", name: "Chitipa",     group: "Northern" },
          { code: "mw-ka", name: "Karonga",     group: "Northern" },
          { code: "mw-lk", name: "Likoma",      group: "Northern" },
          { code: "mw-mz", name: "Mzimba",      group: "Northern" },
          { code: "mw-nb", name: "Nkhata Bay",  group: "Northern" },
          { code: "mw-ru", name: "Rumphi",      group: "Northern" },
          { code: "mw-de", name: "Dedza",       group: "Central" },
          { code: "mw-do", name: "Dowa",        group: "Central" },
          { code: "mw-ks", name: "Kasungu",     group: "Central" },
          { code: "mw-li", name: "Lilongwe",    group: "Central" },
          { code: "mw-mc", name: "Mchinji",     group: "Central" },
          { code: "mw-nk", name: "Nkhotakota",  group: "Central" },
          { code: "mw-nu", name: "Ntcheu",      group: "Central" },
          { code: "mw-ni", name: "Ntchisi",     group: "Central" },
          { code: "mw-sa", name: "Salima",      group: "Central" },
          { code: "mw-ba", name: "Balaka",      group: "Southern" },
          { code: "mw-bl", name: "Blantyre",    group: "Southern" },
          { code: "mw-ck", name: "Chikwawa",    group: "Southern" },
          { code: "mw-cr", name: "Chiradzulu",  group: "Southern" },
          { code: "mw-mh", name: "Machinga",    group: "Southern" },
          { code: "mw-mg", name: "Mangochi",    group: "Southern" },
          { code: "mw-mu", name: "Mulanje",     group: "Southern" },
          { code: "mw-mw", name: "Mwanza",      group: "Southern" },
          { code: "mw-ns", name: "Nsanje",      group: "Southern" },
          { code: "mw-ne", name: "Neno",        group: "Southern" },
          { code: "mw-ph", name: "Phalombe",    group: "Southern" },
          { code: "mw-th", name: "Thyolo",      group: "Southern" },
          { code: "mw-zo", name: "Zomba",       group: "Southern" },
        ],
      },

      // ── Mali (10 regions + Bamako) ───────────────────────────────────────
      {
        code: "ML", name: "Mali", emoji: "🇲🇱", subTitle: "10 Regions + Bamako", locked: false,
        subRegions: [
          { code: "ml-bko",name: "Bamako" },
          { code: "ml-1",  name: "Kayes" },
          { code: "ml-2",  name: "Koulikoro" },
          { code: "ml-3",  name: "Sikasso" },
          { code: "ml-4",  name: "Ségou" },
          { code: "ml-5",  name: "Mopti" },
          { code: "ml-6",  name: "Tombouctou (Timbuktu)" },
          { code: "ml-7",  name: "Gao" },
          { code: "ml-8",  name: "Kidal" },
          { code: "ml-9",  name: "Taoudénit" },
          { code: "ml-10", name: "Ménaka" },
        ],
      },

      // ── Mauritania (15 regions) ──────────────────────────────────────────
      {
        code: "MR", name: "Mauritania", emoji: "🇲🇷", subTitle: "15 Regions", locked: false,
        subRegions: [
          { code: "mr-01", name: "Hodh Ech Chargui" },
          { code: "mr-02", name: "Hodh El Gharbi" },
          { code: "mr-03", name: "Assaba" },
          { code: "mr-04", name: "Gorgol" },
          { code: "mr-05", name: "Brakna" },
          { code: "mr-06", name: "Trarza" },
          { code: "mr-07", name: "Adrar" },
          { code: "mr-08", name: "Dakhlet Nouadhibou" },
          { code: "mr-09", name: "Tagant" },
          { code: "mr-10", name: "Guidimaka" },
          { code: "mr-11", name: "Tiris Zemmour" },
          { code: "mr-12", name: "Inchiri" },
          { code: "mr-nkn",name: "Nouakchott-Nord" },
          { code: "mr-nkw",name: "Nouakchott-Ouest" },
          { code: "mr-nks",name: "Nouakchott-Sud" },
        ],
      },

      // ── Mauritius (9 districts + Rodrigues) ──────────────────────────────
      // Rodrigues is an autonomous outer island and has its own regional flag.
      {
        code: "MU", name: "Mauritius", emoji: "🇲🇺", subTitle: "9 Districts + Rodrigues", locked: false,
        subRegions: [
          { code: "mu-bl", name: "Black River",       group: "Districts" },
          { code: "mu-fl", name: "Flacq",             group: "Districts" },
          { code: "mu-gp", name: "Grand Port",        group: "Districts" },
          { code: "mu-mo", name: "Moka",              group: "Districts" },
          { code: "mu-pa", name: "Pamplemousses",     group: "Districts" },
          { code: "mu-pw", name: "Plaines Wilhems",   group: "Districts" },
          { code: "mu-pl", name: "Port Louis",        group: "Districts" },
          { code: "mu-rr", name: "Rivière du Rempart",group: "Districts" },
          { code: "mu-sa", name: "Savanne",           group: "Districts" },
          { code: "mu-ro", name: "Rodrigues",         flagUrl: wiki("Flag of Rodrigues.svg"), group: "Autonomous Island" },
        ],
      },

      // ── Namibia (14 regions) ─────────────────────────────────────────────
      {
        code: "NA", name: "Namibia", emoji: "🇳🇦", subTitle: "14 Regions", locked: false,
        subRegions: [
          { code: "na-er", name: "Erongo" },
          { code: "na-ha", name: "Hardap" },
          { code: "na-ka", name: "ǁKaras" },
          { code: "na-ke", name: "Kavango East" },
          { code: "na-kw", name: "Kavango West" },
          { code: "na-kh", name: "Khomas" },
          { code: "na-ku", name: "Kunene" },
          { code: "na-ow", name: "Ohangwena" },
          { code: "na-oh", name: "Omaheke" },
          { code: "na-os", name: "Omusati" },
          { code: "na-on", name: "Oshana" },
          { code: "na-ot", name: "Oshikoto" },
          { code: "na-oj", name: "Otjozondjupa" },
          { code: "na-ca", name: "Zambezi" },
        ],
      },

      // ── Niger (8 regions) ────────────────────────────────────────────────
      {
        code: "NE", name: "Niger", emoji: "🇳🇪", subTitle: "8 Regions", locked: false,
        subRegions: [
          { code: "ne-1", name: "Agadez" },
          { code: "ne-2", name: "Diffa" },
          { code: "ne-3", name: "Dosso" },
          { code: "ne-4", name: "Maradi" },
          { code: "ne-8", name: "Niamey" },
          { code: "ne-5", name: "Tahoua" },
          { code: "ne-6", name: "Tillabéri" },
          { code: "ne-7", name: "Zinder" },
        ],
      },

      // ── Rwanda (5 provinces) ─────────────────────────────────────────────
      {
        code: "RW", name: "Rwanda", emoji: "🇷🇼", subTitle: "5 Provinces", locked: false,
        subRegions: [
          { code: "rw-01", name: "Kigali" },
          { code: "rw-02", name: "Eastern" },
          { code: "rw-03", name: "Northern" },
          { code: "rw-04", name: "Western" },
          { code: "rw-05", name: "Southern" },
        ],
      },

      // ── São Tomé and Príncipe (6 districts + Príncipe) ───────────────────
      // Príncipe is an autonomous region and has its own flag.
      {
        code: "ST", name: "São Tomé and Príncipe", emoji: "🇸🇹", subTitle: "6 Districts + Príncipe", locked: false,
        subRegions: [
          { code: "st-ag", name: "Água Grande",  group: "São Tomé Island" },
          { code: "st-ca", name: "Cantagalo",    group: "São Tomé Island" },
          { code: "st-cau",name: "Caué",         group: "São Tomé Island" },
          { code: "st-le", name: "Lembá",        group: "São Tomé Island" },
          { code: "st-lo", name: "Lobata",       group: "São Tomé Island" },
          { code: "st-me", name: "Mé-Zóchi",     group: "São Tomé Island" },
          { code: "st-pa", name: "Príncipe",     flagUrl: wiki("Flag of Príncipe Autonomous Region.svg"), group: "Autonomous Region" },
        ],
      },

      // ── Sierra Leone (16 districts in 5 provinces) ───────────────────────
      {
        code: "SL", name: "Sierra Leone", emoji: "🇸🇱", subTitle: "16 Districts", locked: false,
        subRegions: [
          { code: "sl-kai", name: "Kailahun",  group: "Eastern" },
          { code: "sl-ken", name: "Kenema",    group: "Eastern" },
          { code: "sl-kon", name: "Kono",      group: "Eastern" },
          { code: "sl-bom", name: "Bombali",   group: "Northern" },
          { code: "sl-fal", name: "Falaba",    group: "Northern" },
          { code: "sl-koi", name: "Koinadugu", group: "Northern" },
          { code: "sl-ton", name: "Tonkolili", group: "Northern" },
          { code: "sl-kam", name: "Kambia",    group: "North West" },
          { code: "sl-kar", name: "Karene",    group: "North West" },
          { code: "sl-por", name: "Port Loko", group: "North West" },
          { code: "sl-bo",  name: "Bo",        group: "Southern" },
          { code: "sl-bon", name: "Bonthe",    group: "Southern" },
          { code: "sl-moy", name: "Moyamba",   group: "Southern" },
          { code: "sl-puj", name: "Pujehun",   group: "Southern" },
          { code: "sl-war", name: "Western Area Rural", group: "Western Area" },
          { code: "sl-wau", name: "Western Area Urban", group: "Western Area" },
        ],
      },

      // ── Somalia (18 regions) ─────────────────────────────────────────────
      // Note: the northern regions (Awdal, Woqooyi Galbeed, Togdheer, Sool, Sanaag)
      // form the self-declared, internationally unrecognised state of Somaliland.
      {
        code: "SO", name: "Somalia", emoji: "🇸🇴", subTitle: "18 Regions", locked: false,
        subRegions: [
          { code: "so-aw", name: "Awdal" },
          { code: "so-ba", name: "Bakool" },
          { code: "so-bn", name: "Banaadir" },
          { code: "so-br", name: "Bari" },
          { code: "so-by", name: "Bay" },
          { code: "so-ga", name: "Galguduud" },
          { code: "so-ge", name: "Gedo" },
          { code: "so-hi", name: "Hiiraan" },
          { code: "so-jd", name: "Middle Juba" },
          { code: "so-jh", name: "Lower Juba" },
          { code: "so-mu", name: "Mudug" },
          { code: "so-nu", name: "Nugaal" },
          { code: "so-sa", name: "Sanaag" },
          { code: "so-sd", name: "Middle Shabelle" },
          { code: "so-sh", name: "Lower Shabelle" },
          { code: "so-so", name: "Sool" },
          { code: "so-to", name: "Togdheer" },
          { code: "so-wo", name: "Woqooyi Galbeed" },
        ],
      },

      // ── South Sudan (10 states + 3 administrative areas) ─────────────────
      {
        code: "SS", name: "South Sudan", emoji: "🇸🇸", subTitle: "10 States + 3 Areas", locked: false,
        subRegions: [
          { code: "ss-ec", name: "Central Equatoria",       flagUrl: wiki("Flag of Central Equatoria.svg"),       group: "States" },
          { code: "ss-ee", name: "Eastern Equatoria",       flagUrl: wiki("Flag of Eastern Equatoria.png"),       group: "States" },
          { code: "ss-jg", name: "Jonglei",                 flagUrl: wiki("Flag of Jonglei.png"),                 group: "States" },
          { code: "ss-lk", name: "Lakes",                   flagUrl: wiki("Flag of Lakes State.png"),             group: "States" },
          { code: "ss-bn", name: "Northern Bahr el Ghazal", flagUrl: wiki("Flag of Northern Bahr el Ghazal.png"), group: "States" },
          { code: "ss-un", name: "Unity",                   flagUrl: wiki("Flag of Unity State.png"),             group: "States" },
          { code: "ss-nu", name: "Upper Nile",              flagUrl: wiki("Flag of Upper Nile State.png"),        group: "States" },
          { code: "ss-wr", name: "Warrap",                  flagUrl: wiki("Flag of Warrap State.png"),            group: "States" },
          { code: "ss-bw", name: "Western Bahr el Ghazal",  flagUrl: wiki("Flag of Western Bahr el Ghazal.png"),  group: "States" },
          { code: "ss-ew", name: "Western Equatoria",       flagUrl: wiki("Flag of Western Equatoria.png"),       group: "States" },
          { code: "ss-ab", name: "Abyei",                   noFlag: true, group: "Administrative Areas" },
          { code: "ss-pi", name: "Pibor",                   noFlag: true, group: "Administrative Areas" },
          { code: "ss-ru", name: "Ruweng",                  noFlag: true, group: "Administrative Areas" },
        ],
      },

      // ── Sudan (18 states / wilayat) ──────────────────────────────────────
      {
        code: "SD", name: "Sudan", emoji: "🇸🇩", subTitle: "18 States", locked: false,
        subRegions: [
          { code: "sd-kh", name: "Khartoum", flagUrl: wiki("Flag of Khartoum Wilayah.png") },
          { code: "sd-gz", name: "Al Jazirah", noFlag: true },
          { code: "sd-rs", name: "Red Sea", noFlag: true },
          { code: "sd-ka", name: "Kassala", noFlag: true },
          { code: "sd-gd", name: "Al Qadarif", flagUrl: wiki("Flag of Al Qadarif State.png") },
          { code: "sd-nr", name: "River Nile", noFlag: true },
          { code: "sd-no", name: "Northern", noFlag: true },
          { code: "sd-nw", name: "White Nile", noFlag: true },
          { code: "sd-nb", name: "Blue Nile", flagUrl: wiki("Flag of Blue Nile State.png") },
          { code: "sd-no2",name: "North Kordofan", flagUrl: wiki("Flag of North Kurdufan.svg") },
          { code: "sd-ks", name: "South Kordofan", noFlag: true },
          { code: "sd-gk", name: "West Kordofan", noFlag: true },
          { code: "sd-nd", name: "North Darfur", flagUrl: wiki("Flag of North Darfur State.png") },
          { code: "sd-sd", name: "South Darfur", flagUrl: wiki("Flag of South Darfur State.png") },
          { code: "sd-ed", name: "East Darfur", noFlag: true },
          { code: "sd-wd", name: "West Darfur", flagUrl: wiki("Flag of West Darfur State.png") },
          { code: "sd-cd", name: "Central Darfur", flagUrl: wiki("Flag of Central Darfur State.png") },
          { code: "sd-si", name: "Sennar", noFlag: true },
        ],
      },

      // ── Togo (5 regions) ─────────────────────────────────────────────────
      {
        code: "TG", name: "Togo", emoji: "🇹🇬", subTitle: "5 Regions", locked: false,
        subRegions: [
          { code: "tg-m", name: "Maritime" },
          { code: "tg-p", name: "Plateaux" },
          { code: "tg-c", name: "Centrale" },
          { code: "tg-k", name: "Kara" },
          { code: "tg-s", name: "Savanes" },
        ],
      },

      // ── Tunisia (24 governorates) ────────────────────────────────────────
      {
        code: "TN", name: "Tunisia", emoji: "🇹🇳", subTitle: "24 Governorates", locked: false,
        subRegions: [
          { code: "tn-11", name: "Tunis" },
          { code: "tn-12", name: "Ariana" },
          { code: "tn-13", name: "Ben Arous" },
          { code: "tn-14", name: "Manouba" },
          { code: "tn-21", name: "Nabeul" },
          { code: "tn-22", name: "Zaghouan" },
          { code: "tn-23", name: "Bizerte" },
          { code: "tn-31", name: "Béja" },
          { code: "tn-32", name: "Jendouba" },
          { code: "tn-33", name: "Kef" },
          { code: "tn-34", name: "Siliana" },
          { code: "tn-41", name: "Kairouan" },
          { code: "tn-42", name: "Kasserine" },
          { code: "tn-43", name: "Sidi Bouzid" },
          { code: "tn-51", name: "Sousse" },
          { code: "tn-52", name: "Monastir" },
          { code: "tn-53", name: "Mahdia" },
          { code: "tn-61", name: "Sfax" },
          { code: "tn-71", name: "Gafsa" },
          { code: "tn-72", name: "Tozeur" },
          { code: "tn-73", name: "Kébili" },
          { code: "tn-81", name: "Gabès" },
          { code: "tn-82", name: "Médenine" },
          { code: "tn-83", name: "Tataouine" },
        ],
      },

      // ── Uganda (4 regions) ───────────────────────────────────────────────
      // Uganda is subdivided into 130+ small districts; these group into 4 regions,
      // which is the clearest first-level breakdown.
      {
        code: "UG", name: "Uganda", emoji: "🇺🇬", subTitle: "4 Regions", locked: false,
        subRegions: [
          { code: "ug-c", name: "Central" },
          { code: "ug-e", name: "Eastern" },
          { code: "ug-n", name: "Northern" },
          { code: "ug-w", name: "Western" },
        ],
      },

      // ── Zambia (10 provinces) ────────────────────────────────────────────
      {
        code: "ZM", name: "Zambia", emoji: "🇿🇲", subTitle: "10 Provinces", locked: false,
        subRegions: [
          { code: "zm-02", name: "Central" },
          { code: "zm-08", name: "Copperbelt" },
          { code: "zm-03", name: "Eastern" },
          { code: "zm-04", name: "Luapula" },
          { code: "zm-09", name: "Lusaka" },
          { code: "zm-10", name: "Muchinga" },
          { code: "zm-05", name: "Northern" },
          { code: "zm-06", name: "North-Western" },
          { code: "zm-07", name: "Southern" },
          { code: "zm-01", name: "Western" },
        ],
      },

      // ── Zimbabwe (10 provinces) ──────────────────────────────────────────
      {
        code: "ZW", name: "Zimbabwe", emoji: "🇿🇼", subTitle: "10 Provinces", locked: false,
        subRegions: [
          { code: "zw-bu", name: "Bulawayo" },
          { code: "zw-ha", name: "Harare" },
          { code: "zw-ma", name: "Manicaland" },
          { code: "zw-mc", name: "Mashonaland Central" },
          { code: "zw-me", name: "Mashonaland East" },
          { code: "zw-mw", name: "Mashonaland West" },
          { code: "zw-mv", name: "Masvingo" },
          { code: "zw-mn", name: "Matabeleland North" },
          { code: "zw-ms", name: "Matabeleland South" },
          { code: "zw-mi", name: "Midlands" },
        ],
      },
    ],
  },

  // ── OCEANIA ───────────────────────────────────────────────────────────────
  {
    id: "oceania",
    name: "Oceania",
    emoji: "🌊",
    locked: false,
    countries: [

      // ── Australia (8 states & territories) ──────────────────────────────────
      {
        code: "AU", name: "Australia", emoji: "🇦🇺", subTitle: "8 States & Territories", locked: false,
        subRegions: [
          { code: "au-act", name: "Australian Capital Territory", flagUrl: wiki("Flag of the Australian Capital Territory.svg") },
          { code: "au-nsw", name: "New South Wales",             flagUrl: wiki("Flag of New South Wales.svg") },
          { code: "au-nt",  name: "Northern Territory",          flagUrl: wiki("Flag of the Northern Territory.svg") },
          { code: "au-qld", name: "Queensland",                  flagUrl: wiki("Flag of Queensland.svg") },
          { code: "au-sa",  name: "South Australia",             flagUrl: wiki("Flag of South Australia.svg") },
          { code: "au-tas", name: "Tasmania",                    flagUrl: wiki("Flag of Tasmania.svg") },
          { code: "au-vic", name: "Victoria",                    flagUrl: wiki("Flag of Victoria (Australia).svg") },
          { code: "au-wa",  name: "Western Australia",           flagUrl: wiki("Flag of Western Australia.svg") },
        ],
      },

      // ── Fiji (14 provinces) ──────────────────────────────────────────────────
      {
        code: "FJ", name: "Fiji", emoji: "🇫🇯", subTitle: "14 Provinces", locked: false,
        subRegions: [
          { code: "fj-ba",  name: "Ba",               group: "Western" },
          { code: "fj-nr",  name: "Nadroga-Navosa",   group: "Western" },
          { code: "fj-ra",  name: "Ra",               group: "Western" },
          { code: "fj-ta",  name: "Tailevu",          group: "Western" },
          { code: "fj-ni",  name: "Naitasiri",        group: "Central" },
          { code: "fj-nm",  name: "Namosi",           group: "Central" },
          { code: "fj-rw",  name: "Rewa",             group: "Central" },
          { code: "fj-se",  name: "Serua",            group: "Central" },
          { code: "fj-bu",  name: "Bua",              group: "Northern" },
          { code: "fj-ca",  name: "Cakaudrove",       group: "Northern" },
          { code: "fj-mc",  name: "Macuata",          group: "Northern" },
          { code: "fj-kd",  name: "Kadavu",           group: "Eastern" },
          { code: "fj-la",  name: "Lau",              group: "Eastern" },
          { code: "fj-lm",  name: "Lomaiviti",        group: "Eastern" },
        ],
      },

      // ── Kiribati (3 island groups) ───────────────────────────────────────────
      {
        code: "KI", name: "Kiribati", emoji: "🇰🇮", subTitle: "3 Island Groups", locked: false,
        subRegions: [
          { code: "ki-g", name: "Gilbert Islands" },
          { code: "ki-l", name: "Line Islands" },
          { code: "ki-p", name: "Phoenix Islands" },
        ],
      },

      // ── Marshall Islands (24 municipalities) ────────────────────────────────
      {
        code: "MH", name: "Marshall Islands", emoji: "🇲🇭", subTitle: "24 Municipalities", locked: false,
        subRegions: [
          { code: "mh-alk", name: "Ailuk",         group: "Ratak Chain" },
          { code: "mh-arn", name: "Arno",          group: "Ratak Chain" },
          { code: "mh-aur", name: "Aur",           group: "Ratak Chain" },
          { code: "mh-bik", name: "Bikini",        flagUrl: wiki("Flag of Bikini Atoll.svg"), group: "Ratak Chain" },
          { code: "mh-lkp", name: "Likiep",        group: "Ratak Chain" },
          { code: "mh-maj", name: "Majuro",        group: "Ratak Chain" },
          { code: "mh-mlo", name: "Maloelap",      group: "Ratak Chain" },
          { code: "mh-mej", name: "Mejit",         group: "Ratak Chain" },
          { code: "mh-mil", name: "Mili",          group: "Ratak Chain" },
          { code: "mh-utr", name: "Utrik",         group: "Ratak Chain" },
          { code: "mh-woj", name: "Wotje",         group: "Ratak Chain" },
          { code: "mh-all", name: "Ailinglapalap", group: "Ralik Chain" },
          { code: "mh-ebn", name: "Ebon",          group: "Ralik Chain" },
          { code: "mh-enw", name: "Enewetak",      group: "Ralik Chain" },
          { code: "mh-jab", name: "Jabat",         group: "Ralik Chain" },
          { code: "mh-jal", name: "Jaluit",        group: "Ralik Chain" },
          { code: "mh-kil", name: "Kili",          group: "Ralik Chain" },
          { code: "mh-kwj", name: "Kwajalein",     group: "Ralik Chain" },
          { code: "mh-lae", name: "Lae",           group: "Ralik Chain" },
          { code: "mh-lib", name: "Lib",           group: "Ralik Chain" },
          { code: "mh-nmd", name: "Namdrik",       group: "Ralik Chain" },
          { code: "mh-nmu", name: "Namu",          group: "Ralik Chain" },
          { code: "mh-uja", name: "Ujae",          group: "Ralik Chain" },
          { code: "mh-wth", name: "Wotho",         group: "Ralik Chain" },
        ],
      },

      // ── Micronesia (4 states) ────────────────────────────────────────────────
      {
        code: "FM", name: "Micronesia", emoji: "🇫🇲", subTitle: "4 States", locked: false,
        subRegions: [
          { code: "fm-ksa", name: "Kosrae",  flagUrl: wiki("Flag of Kosrae.svg") },
          { code: "fm-pni", name: "Pohnpei", flagUrl: wiki("Flag of Pohnpei.svg") },
          { code: "fm-trk", name: "Chuuk",   flagUrl: wiki("Flag of Chuuk.svg") },
          { code: "fm-yap", name: "Yap",     flagUrl: wiki("Flag of Yap.svg") },
        ],
      },

      // ── Nauru (14 districts) ─────────────────────────────────────────────────
      {
        code: "NR", name: "Nauru", emoji: "🇳🇷", subTitle: "14 Districts", locked: false,
        subRegions: [
          { code: "nr-01", name: "Aiwo" },
          { code: "nr-02", name: "Anabar" },
          { code: "nr-03", name: "Anetan" },
          { code: "nr-04", name: "Anibare" },
          { code: "nr-05", name: "Baiti" },
          { code: "nr-06", name: "Boe" },
          { code: "nr-07", name: "Buada" },
          { code: "nr-08", name: "Denigomodu" },
          { code: "nr-09", name: "Ewa" },
          { code: "nr-10", name: "Ijuw" },
          { code: "nr-11", name: "Meneng" },
          { code: "nr-12", name: "Nibok" },
          { code: "nr-13", name: "Uaboe" },
          { code: "nr-14", name: "Yaren" },
        ],
      },

      // ── New Zealand (16 regions) ─────────────────────────────────────────────
      {
        code: "NZ", name: "New Zealand", emoji: "🇳🇿", subTitle: "16 Regions", locked: false,
        subRegions: [
          { code: "nz-auk", name: "Auckland" },
          { code: "nz-bop", name: "Bay of Plenty" },
          { code: "nz-can", name: "Canterbury" },
          { code: "nz-gis", name: "Gisborne" },
          { code: "nz-hkb", name: "Hawke's Bay" },
          { code: "nz-mbh", name: "Marlborough" },
          { code: "nz-mwt", name: "Manawatu-Whanganui" },
          { code: "nz-nsn", name: "Nelson" },
          { code: "nz-ntl", name: "Northland" },
          { code: "nz-ota", name: "Otago", flagUrl: wiki("Flag of Otago.svg") },
          { code: "nz-stl", name: "Southland" },
          { code: "nz-tas", name: "Tasman" },
          { code: "nz-tki", name: "Taranaki" },
          { code: "nz-wgn", name: "Wellington" },
          { code: "nz-wko", name: "Waikato" },
          { code: "nz-wtc", name: "West Coast" },
        ],
      },

      // ── Palau (16 states) ────────────────────────────────────────────────────
      {
        code: "PW", name: "Palau", emoji: "🇵🇼", subTitle: "16 States", locked: false,
        subRegions: [
          { code: "pw-002", name: "Aimeliik",    flagUrl: wiki("Flag of Aimeliik.svg") },
          { code: "pw-004", name: "Airai",        flagUrl: wiki("Flag of Airai State.png") },
          { code: "pw-010", name: "Angaur",       flagUrl: wiki("Flag of Angaur State.svg") },
          { code: "pw-050", name: "Hatohobei",    flagUrl: wiki("Flag of Hatohobei.svg") },
          { code: "pw-100", name: "Kayangel",     flagUrl: wiki("Flag of Kayangel.svg") },
          { code: "pw-150", name: "Koror",        flagUrl: wiki("Flag of Koror State.png") },
          { code: "pw-212", name: "Melekeok",     flagUrl: wiki("Flag of Melekeok.svg") },
          { code: "pw-214", name: "Ngaraard",     flagUrl: wiki("Flag of Ngaraard State.svg") },
          { code: "pw-218", name: "Ngarchelong",  flagUrl: wiki("Flag of Ngarchelong.svg") },
          { code: "pw-222", name: "Ngardmau",     flagUrl: wiki("Flag of Ngardmau State.svg") },
          { code: "pw-224", name: "Ngatpang",     flagUrl: wiki("Flag of Ngatpang.svg") },
          { code: "pw-226", name: "Ngchesar",     flagUrl: wiki("Flag of Ngchesar State.png") },
          { code: "pw-227", name: "Ngeremlengui", flagUrl: wiki("Flag of Ngeremlengui State, Palau.svg") },
          { code: "pw-228", name: "Ngiwal",       flagUrl: wiki("Flag of Ngiwal.png") },
          { code: "pw-350", name: "Peleliu",      flagUrl: wiki("Flag of Peleliu.svg") },
          { code: "pw-370", name: "Sonsorol",     flagUrl: wiki("Flag of Sonsorol.svg") },
        ],
      },

      // ── Papua New Guinea (22 provinces) ─────────────────────────────────────
      {
        code: "PG", name: "Papua New Guinea", emoji: "🇵🇬", subTitle: "22 Provinces", locked: false,
        subRegions: [
          { code: "pg-ncd", name: "National Capital District", flagUrl: wiki("Flag of NCD.svg") },
          { code: "pg-wpd", name: "Western",                  flagUrl: wiki("Flag of Western Province.svg") },
          { code: "pg-gpk", name: "Gulf",                     flagUrl: wiki("Flag of Gulf Province.png") },
          { code: "pg-cpm", name: "Central",                  flagUrl: wiki("Flag of Central Province, Papua New Guinea.svg") },
          { code: "pg-mbp", name: "Milne Bay",                flagUrl: wiki("Flag of Milne Bay.svg") },
          { code: "pg-npp", name: "Northern (Oro)",           flagUrl: wiki("Flag of Flag Oro new.png") },
          { code: "pg-shm", name: "Southern Highlands",       flagUrl: wiki("Flag of Southern Highlands Province (Papua New Guinea).svg") },
          { code: "pg-hla", name: "Hela",                     flagUrl: wiki("Flag of Hela.svg") },
          { code: "pg-epw", name: "Enga",                     flagUrl: wiki("Flag of Enga.png") },
          { code: "pg-whp", name: "Western Highlands",        flagUrl: wiki("Flag of Western Highlands.svg") },
          { code: "pg-jwk", name: "Jiwaka",                   flagUrl: wiki("Flag of Jiwaka.svg") },
          { code: "pg-chm", name: "Chimbu",                   flagUrl: wiki("Flag of Chimbu.svg") },
          { code: "pg-ehg", name: "Eastern Highlands",        flagUrl: wiki("Flag of Eastern Highlands.svg") },
          { code: "pg-mpm", name: "Morobe",                   flagUrl: wiki("Flag of Morobe.png") },
          { code: "pg-mad", name: "Madang",                   flagUrl: wiki("Flag of Madang.svg") },
          { code: "pg-esp", name: "East Sepik",               flagUrl: wiki("Flag of East Sepik.png") },
          { code: "pg-san", name: "West Sepik",               flagUrl: wiki("Flag of Sandaun.svg") },
          { code: "pg-mrl", name: "Manus",                    flagUrl: wiki("Flag of Manus.svg") },
          { code: "pg-nik", name: "New Ireland",              flagUrl: wiki("Flag of New Ireland.svg") },
          { code: "pg-ebr", name: "East New Britain",         flagUrl: wiki("Flag of East New Britain.svg") },
          { code: "pg-wbk", name: "West New Britain",         flagUrl: wiki("Flag of West New Britain.svg") },
          { code: "pg-nsb", name: "Bougainville",             flagUrl: wiki("Flag of Bougainville.svg") },
        ],
      },

      // ── Samoa (11 districts) ─────────────────────────────────────────────────
      {
        code: "WS", name: "Samoa", emoji: "🇼🇸", subTitle: "11 Districts", locked: false,
        subRegions: [
          { code: "ws-aa", name: "A'ana" },
          { code: "ws-al", name: "Aiga-i-le-Tai" },
          { code: "ws-at", name: "Atua" },
          { code: "ws-fa", name: "Fa'asaleleaga" },
          { code: "ws-ge", name: "Gaga'emauga" },
          { code: "ws-gi", name: "Gagaifomauga" },
          { code: "ws-pa", name: "Palauli" },
          { code: "ws-sa", name: "Satupa'itea" },
          { code: "ws-tu", name: "Tuamasaga" },
          { code: "ws-vf", name: "Va'a-o-Fonoti" },
          { code: "ws-vs", name: "Vaisigano" },
        ],
      },

      // ── Solomon Islands (10 provinces) ──────────────────────────────────────
      {
        code: "SB", name: "Solomon Islands", emoji: "🇸🇧", subTitle: "10 Provinces", locked: false,
        subRegions: [
          { code: "sb-ct", name: "Capital Territory (Honiara)", flagUrl: wiki("Flag of Honiara.svg") },
          { code: "sb-ce", name: "Central",                    flagUrl: wiki("Flag of Central Province Solomon Islands.png") },
          { code: "sb-ch", name: "Choiseul",                   flagUrl: wiki("Flag of Choiseul.png") },
          { code: "sb-gu", name: "Guadalcanal",                flagUrl: wiki("Flag of Guadalcanal.png") },
          { code: "sb-is", name: "Isabel",                     flagUrl: wiki("Flag of Isabel Province Solomon Islands.png") },
          { code: "sb-mk", name: "Makira-Ulawa",               flagUrl: wiki("Flag Makira and Ulawa.png") },
          { code: "sb-ml", name: "Malaita",                    flagUrl: wiki("Flag of Malaiita.png") },
          { code: "sb-rb", name: "Rennell and Bellona",        flagUrl: wiki("Flag of Rennell and Bellona Province.svg") },
          { code: "sb-te", name: "Temotu",                     flagUrl: wiki("Temotu province flag.svg") },
          { code: "sb-we", name: "Western",                    flagUrl: wiki("Flag of Western Province Solomon Islands.png") },
        ],
      },

      // ── Tonga (5 divisions) ──────────────────────────────────────────────────
      {
        code: "TO", name: "Tonga", emoji: "🇹🇴", subTitle: "5 Divisions", locked: false,
        subRegions: [
          { code: "to-01", name: "'Eua" },
          { code: "to-02", name: "Ha'apai" },
          { code: "to-03", name: "Niuas" },
          { code: "to-04", name: "Tongatapu" },
          { code: "to-05", name: "Vava'u" },
        ],
      },

      // ── Tuvalu (8 islands) ───────────────────────────────────────────────────
      {
        code: "TV", name: "Tuvalu", emoji: "🇹🇻", subTitle: "8 Islands", locked: false,
        subRegions: [
          { code: "tv-fun", name: "Funafuti" },
          { code: "tv-nma", name: "Nanumea" },
          { code: "tv-nmg", name: "Nanumanga" },
          { code: "tv-nit", name: "Niutao" },
          { code: "tv-nui", name: "Nui" },
          { code: "tv-nkf", name: "Nukufetau" },
          { code: "tv-nkl", name: "Nukulaelae" },
          { code: "tv-vai", name: "Vaitupu" },
        ],
      },

      // ── Vanuatu (6 provinces) ────────────────────────────────────────────────
      {
        code: "VU", name: "Vanuatu", emoji: "🇻🇺", subTitle: "6 Provinces", locked: false,
        subRegions: [
          { code: "vu-map", name: "Malampa", flagUrl: wiki("Flag of Malampa Province.svg") },
          { code: "vu-pam", name: "Penama",  flagUrl: wiki("Flag of Penama Province.svg") },
          { code: "vu-sam", name: "Sanma",   flagUrl: wiki("Flag of Sanma Province.svg") },
          { code: "vu-see", name: "Shefa",   flagUrl: wiki("Flag of Shefa Province.svg") },
          { code: "vu-tae", name: "Tafea",   flagUrl: wiki("Tafea Province Flag.svg") },
          { code: "vu-tob", name: "Torba",   flagUrl: wiki("Flag of Torba Province.png") },
        ],
      },

    ],
  },

  // ── MIDDLE EAST ───────────────────────────────────────────────────────────
  {
    id: "middle-east",
    name: "Middle East",
    emoji: "🕌",
    locked: false,
    countries: [

      // ── Bahrain (4 governorates) ─────────────────────────────────────────────
      {
        code: "BH", name: "Bahrain", emoji: "🇧🇭", subTitle: "4 Governorates", locked: false,
        subRegions: [
          { code: "bh-13", name: "Capital" },
          { code: "bh-14", name: "Muharraq" },
          { code: "bh-15", name: "Northern" },
          { code: "bh-17", name: "Southern" },
        ],
      },

      // ── Iran (31 provinces) ──────────────────────────────────────────────────
      {
        code: "IR", name: "Iran", emoji: "🇮🇷", subTitle: "31 Provinces", locked: false,
        subRegions: [
          { code: "ir-alb", name: "Alborz" },
          { code: "ir-ard", name: "Ardabil" },
          { code: "ir-aze", name: "East Azerbaijan" },
          { code: "ir-azw", name: "West Azerbaijan" },
          { code: "ir-bus", name: "Bushehr" },
          { code: "ir-chb", name: "Chaharmahal and Bakhtiari" },
          { code: "ir-frs", name: "Fars" },
          { code: "ir-gls", name: "Golestan" },
          { code: "ir-gln", name: "Gilan" },
          { code: "ir-hmd", name: "Hamadan" },
          { code: "ir-hgb", name: "Hormozgan" },
          { code: "ir-iln", name: "Ilam" },
          { code: "ir-isp", name: "Isfahan" },
          { code: "ir-krm", name: "Kerman" },
          { code: "ir-ksh", name: "Kermanshah" },
          { code: "ir-kby", name: "Kohgiluyeh and Boyer-Ahmad" },
          { code: "ir-krd", name: "Kurdistan" },
          { code: "ir-khn", name: "North Khorasan" },
          { code: "ir-khr", name: "Razavi Khorasan" },
          { code: "ir-khs", name: "South Khorasan" },
          { code: "ir-khz", name: "Khuzestan" },
          { code: "ir-lor", name: "Lorestan" },
          { code: "ir-mzn", name: "Mazandaran" },
          { code: "ir-mrk", name: "Markazi" },
          { code: "ir-qzn", name: "Qazvin" },
          { code: "ir-qom", name: "Qom" },
          { code: "ir-smn", name: "Semnan" },
          { code: "ir-sbl", name: "Sistan and Baluchestan" },
          { code: "ir-teh", name: "Tehran" },
          { code: "ir-yaz", name: "Yazd" },
          { code: "ir-znj", name: "Zanjan" },
        ],
      },

      // ── Iraq (19 governorates) ───────────────────────────────────────────────
      {
        code: "IQ", name: "Iraq", emoji: "🇮🇶", subTitle: "19 Governorates", locked: false,
        subRegions: [
          { code: "iq-an", name: "Al-Anbar", flagUrl: wiki("Flag of Al Anbar.png") },
          { code: "iq-ar", name: "Erbil", noFlag: true },
          { code: "iq-ba", name: "Basra", flagUrl: wiki("Flag of Basra Governorate.svg") },
          { code: "iq-bb", name: "Babylon", flagUrl: wiki("Flag of Babylon Governorate.svg") },
          { code: "iq-bg", name: "Baghdad", flagUrl: wiki("Flag of Baghdad.svg") },
          { code: "iq-da", name: "Dohuk", noFlag: true },
          { code: "iq-di", name: "Diyala", noFlag: true },
          { code: "iq-dq", name: "Dhi Qar", noFlag: true },
          { code: "iq-hl", name: "Halabja", noFlag: true },
          { code: "iq-ka", name: "Karbala", flagUrl: wiki("Flag of Karbala.svg") },
          { code: "iq-kr", name: "Kirkuk", noFlag: true },
          { code: "iq-ma", name: "Maysan", noFlag: true },
          { code: "iq-mu", name: "Al-Muthanna", noFlag: true },
          { code: "iq-na", name: "Najaf", noFlag: true },
          { code: "iq-ni", name: "Nineveh", flagUrl: wiki("Flag of Nineveh Governorate.svg") },
          { code: "iq-qa", name: "Al-Qadisiyyah", noFlag: true },
          { code: "iq-sa", name: "Saladin", flagUrl: wiki("Flag of Saladin Governorate, Iraq.svg") },
          { code: "iq-su", name: "Sulaymaniyah", noFlag: true },
          { code: "iq-wa", name: "Wasit", noFlag: true },
        ],
      },

      // ── Israel (6 districts) ─────────────────────────────────────────────────
      {
        code: "IL", name: "Israel", emoji: "🇮🇱", subTitle: "6 Districts", locked: false,
        subRegions: [
          { code: "il-d",  name: "Southern" },
          { code: "il-ha", name: "Haifa" },
          { code: "il-jm", name: "Jerusalem" },
          { code: "il-m",  name: "Central" },
          { code: "il-ta", name: "Tel Aviv" },
          { code: "il-z",  name: "Northern" },
        ],
      },

      // ── Jordan (12 governorates) ─────────────────────────────────────────────
      {
        code: "JO", name: "Jordan", emoji: "🇯🇴", subTitle: "12 Governorates", locked: false,
        subRegions: [
          { code: "jo-aj", name: "Ajloun" },
          { code: "jo-aq", name: "Aqaba" },
          { code: "jo-am", name: "Amman" },
          { code: "jo-at", name: "At-Tafilah" },
          { code: "jo-az", name: "Az-Zarqa" },
          { code: "jo-ba", name: "Al-Balqa" },
          { code: "jo-ir", name: "Irbid" },
          { code: "jo-ja", name: "Jerash" },
          { code: "jo-ka", name: "Al-Karak" },
          { code: "jo-ma", name: "Ma'an" },
          { code: "jo-md", name: "Madaba" },
          { code: "jo-mn", name: "Mafraq" },
        ],
      },

      // ── Kuwait (6 governorates) ──────────────────────────────────────────────
      {
        code: "KW", name: "Kuwait", emoji: "🇰🇼", subTitle: "6 Governorates", locked: false,
        subRegions: [
          { code: "kw-ah", name: "Ahmadi" },
          { code: "kw-fa", name: "Farwaniyah" },
          { code: "kw-ha", name: "Hawalli" },
          { code: "kw-ja", name: "Jahra" },
          { code: "kw-ku", name: "Capital" },
          { code: "kw-mu", name: "Mubarak Al-Kabeer" },
        ],
      },

      // ── Lebanon (8 governorates) ─────────────────────────────────────────────
      {
        code: "LB", name: "Lebanon", emoji: "🇱🇧", subTitle: "8 Governorates", locked: false,
        subRegions: [
          { code: "lb-ak", name: "Akkar" },
          { code: "lb-as", name: "North" },
          { code: "lb-ba", name: "Beirut" },
          { code: "lb-bh", name: "Baalbek-Hermel" },
          { code: "lb-bi", name: "Bekaa" },
          { code: "lb-jl", name: "Mount Lebanon" },
          { code: "lb-jn", name: "South" },
          { code: "lb-na", name: "Nabatieh" },
        ],
      },

      // ── Oman (11 governorates) ───────────────────────────────────────────────
      {
        code: "OM", name: "Oman", emoji: "🇴🇲", subTitle: "11 Governorates", locked: false,
        subRegions: [
          { code: "om-bu", name: "Al-Buraymi" },
          { code: "om-ba", name: "North Al-Batinah" },
          { code: "om-bs", name: "South Al-Batinah" },
          { code: "om-da", name: "Ad-Dakhiliyah" },
          { code: "om-dh", name: "Dhofar" },
          { code: "om-ma", name: "Muscat" },
          { code: "om-md", name: "Musandam" },
          { code: "om-sa", name: "North Ash-Sharqiyah" },
          { code: "om-sj", name: "South Ash-Sharqiyah" },
          { code: "om-wu", name: "Al-Wusta" },
          { code: "om-za", name: "Ad-Dhahirah" },
        ],
      },

      // ── Palestine (16 governorates) ──────────────────────────────────────────
      {
        code: "PS", name: "Palestine", emoji: "🇵🇸", subTitle: "16 Governorates", locked: false,
        subRegions: [
          { code: "ps-jn", name: "Jenin",                   group: "West Bank" },
          { code: "ps-tb", name: "Tubas",                   group: "West Bank" },
          { code: "ps-tl", name: "Tulkarm",                 group: "West Bank" },
          { code: "ps-nb", name: "Nablus",                  group: "West Bank" },
          { code: "ps-ql", name: "Qalqilya",                group: "West Bank" },
          { code: "ps-sl", name: "Salfit",                  group: "West Bank" },
          { code: "ps-rh", name: "Ramallah and Al-Bireh",   group: "West Bank" },
          { code: "ps-jr", name: "Jericho and Al-Aghwar",   group: "West Bank" },
          { code: "ps-jm", name: "Jerusalem",               group: "West Bank" },
          { code: "ps-bt", name: "Bethlehem",               group: "West Bank" },
          { code: "ps-hb", name: "Hebron",                  group: "West Bank" },
          { code: "ps-ng", name: "North Gaza",              group: "Gaza Strip" },
          { code: "ps-gz", name: "Gaza City",               group: "Gaza Strip" },
          { code: "ps-dc", name: "Deir al-Balah",           group: "Gaza Strip" },
          { code: "ps-ky", name: "Khan Yunis",              group: "Gaza Strip" },
          { code: "ps-rf", name: "Rafah",                   group: "Gaza Strip" },
        ],
      },

      // ── Qatar (8 municipalities) ─────────────────────────────────────────────
      {
        code: "QA", name: "Qatar", emoji: "🇶🇦", subTitle: "8 Municipalities", locked: false,
        subRegions: [
          { code: "qa-da", name: "Ad-Dawhah (Doha)" },
          { code: "qa-kh", name: "Al-Khor" },
          { code: "qa-ra", name: "Al-Rayyan" },
          { code: "qa-sh", name: "Al-Shahaniyah" },
          { code: "qa-sm", name: "Al-Shamal" },
          { code: "qa-us", name: "Umm Salal" },
          { code: "qa-wa", name: "Al-Wakrah" },
          { code: "qa-za", name: "Az-Za'ayin" },
        ],
      },

      // ── Saudi Arabia (13 regions) ────────────────────────────────────────────
      {
        code: "SA", name: "Saudi Arabia", emoji: "🇸🇦", subTitle: "13 Regions", locked: false,
        subRegions: [
          { code: "sa-01", name: "Riyadh" },
          { code: "sa-02", name: "Mecca" },
          { code: "sa-03", name: "Medina" },
          { code: "sa-04", name: "Eastern Province" },
          { code: "sa-05", name: "Al-Qassim" },
          { code: "sa-06", name: "Ha'il" },
          { code: "sa-07", name: "Tabuk" },
          { code: "sa-08", name: "Northern Borders" },
          { code: "sa-09", name: "Jizan" },
          { code: "sa-10", name: "Najran" },
          { code: "sa-11", name: "Al-Bahah" },
          { code: "sa-12", name: "Al-Jawf" },
          { code: "sa-14", name: "Asir" },
        ],
      },

      // ── Syria (14 governorates) ──────────────────────────────────────────────
      {
        code: "SY", name: "Syria", emoji: "🇸🇾", subTitle: "14 Governorates", locked: false,
        subRegions: [
          { code: "sy-hl", name: "Aleppo" },
          { code: "sy-dm", name: "Damascus" },
          { code: "sy-rd", name: "Rural Damascus" },
          { code: "sy-dr", name: "Daraa" },
          { code: "sy-dy", name: "Deir ez-Zor" },
          { code: "sy-ha", name: "Al-Hasakah" },
          { code: "sy-hm", name: "Hama" },
          { code: "sy-hi", name: "Homs" },
          { code: "sy-id", name: "Idlib" },
          { code: "sy-la", name: "Latakia" },
          { code: "sy-qu", name: "Al-Quneitra" },
          { code: "sy-ra", name: "Raqqa" },
          { code: "sy-su", name: "As-Suwayda" },
          { code: "sy-ta", name: "Tartus" },
        ],
      },

      // ── Turkey (81 provinces) ────────────────────────────────────────────────
      {
        code: "TR", name: "Turkey", emoji: "🇹🇷", subTitle: "81 Provinces", locked: false,
        subRegions: [
          // Marmara
          { code: "tr-34", name: "İstanbul",     group: "Marmara" },
          { code: "tr-22", name: "Edirne",        group: "Marmara" },
          { code: "tr-39", name: "Kırklareli",    group: "Marmara" },
          { code: "tr-59", name: "Tekirdağ",      group: "Marmara" },
          { code: "tr-17", name: "Çanakkale",     group: "Marmara" },
          { code: "tr-10", name: "Balıkesir",     group: "Marmara" },
          { code: "tr-16", name: "Bursa",         group: "Marmara" },
          { code: "tr-41", name: "Kocaeli",       group: "Marmara" },
          { code: "tr-54", name: "Sakarya",       group: "Marmara" },
          { code: "tr-14", name: "Bolu",          group: "Marmara" },
          { code: "tr-11", name: "Bilecik",       group: "Marmara" },
          { code: "tr-77", name: "Yalova",        group: "Marmara" },
          // Aegean
          { code: "tr-35", name: "İzmir",         group: "Aegean" },
          { code: "tr-45", name: "Manisa",        group: "Aegean" },
          { code: "tr-09", name: "Aydın",         group: "Aegean" },
          { code: "tr-48", name: "Muğla",         group: "Aegean" },
          { code: "tr-20", name: "Denizli",       group: "Aegean" },
          { code: "tr-64", name: "Uşak",          group: "Aegean" },
          { code: "tr-03", name: "Afyonkarahisar",group: "Aegean" },
          { code: "tr-43", name: "Kütahya",       group: "Aegean" },
          // Mediterranean
          { code: "tr-07", name: "Antalya",       group: "Mediterranean" },
          { code: "tr-15", name: "Burdur",        group: "Mediterranean" },
          { code: "tr-32", name: "Isparta",       group: "Mediterranean" },
          { code: "tr-33", name: "Mersin",        group: "Mediterranean" },
          { code: "tr-01", name: "Adana",         group: "Mediterranean" },
          { code: "tr-31", name: "Hatay",         group: "Mediterranean" },
          { code: "tr-46", name: "Kahramanmaraş", group: "Mediterranean" },
          { code: "tr-80", name: "Osmaniye",      group: "Mediterranean" },
          // Central Anatolia
          { code: "tr-06", name: "Ankara",        group: "Central Anatolia" },
          { code: "tr-42", name: "Konya",         group: "Central Anatolia" },
          { code: "tr-26", name: "Eskişehir",     group: "Central Anatolia" },
          { code: "tr-71", name: "Kırıkkale",     group: "Central Anatolia" },
          { code: "tr-40", name: "Kırşehir",      group: "Central Anatolia" },
          { code: "tr-68", name: "Aksaray",       group: "Central Anatolia" },
          { code: "tr-50", name: "Nevşehir",      group: "Central Anatolia" },
          { code: "tr-51", name: "Niğde",         group: "Central Anatolia" },
          { code: "tr-38", name: "Kayseri",       group: "Central Anatolia" },
          { code: "tr-58", name: "Sivas",         group: "Central Anatolia" },
          { code: "tr-66", name: "Yozgat",        group: "Central Anatolia" },
          { code: "tr-18", name: "Çankırı",       group: "Central Anatolia" },
          { code: "tr-19", name: "Çorum",         group: "Central Anatolia" },
          { code: "tr-70", name: "Karaman",       group: "Central Anatolia" },
          // Black Sea
          { code: "tr-67", name: "Zonguldak",     group: "Black Sea" },
          { code: "tr-78", name: "Karabük",       group: "Black Sea" },
          { code: "tr-74", name: "Bartın",        group: "Black Sea" },
          { code: "tr-37", name: "Kastamonu",     group: "Black Sea" },
          { code: "tr-57", name: "Sinop",         group: "Black Sea" },
          { code: "tr-55", name: "Samsun",        group: "Black Sea" },
          { code: "tr-05", name: "Amasya",        group: "Black Sea" },
          { code: "tr-60", name: "Tokat",         group: "Black Sea" },
          { code: "tr-52", name: "Ordu",          group: "Black Sea" },
          { code: "tr-28", name: "Giresun",       group: "Black Sea" },
          { code: "tr-61", name: "Trabzon",       group: "Black Sea" },
          { code: "tr-53", name: "Rize",          group: "Black Sea" },
          { code: "tr-08", name: "Artvin",        group: "Black Sea" },
          { code: "tr-29", name: "Gümüşhane",     group: "Black Sea" },
          { code: "tr-69", name: "Bayburt",       group: "Black Sea" },
          { code: "tr-81", name: "Düzce",         group: "Black Sea" },
          // Eastern Anatolia
          { code: "tr-25", name: "Erzurum",       group: "Eastern Anatolia" },
          { code: "tr-24", name: "Erzincan",      group: "Eastern Anatolia" },
          { code: "tr-04", name: "Ağrı",          group: "Eastern Anatolia" },
          { code: "tr-36", name: "Kars",          group: "Eastern Anatolia" },
          { code: "tr-75", name: "Ardahan",       group: "Eastern Anatolia" },
          { code: "tr-76", name: "Iğdır",         group: "Eastern Anatolia" },
          { code: "tr-49", name: "Muş",           group: "Eastern Anatolia" },
          { code: "tr-13", name: "Bitlis",        group: "Eastern Anatolia" },
          { code: "tr-65", name: "Van",           group: "Eastern Anatolia" },
          { code: "tr-30", name: "Hakkari",       group: "Eastern Anatolia" },
          { code: "tr-44", name: "Malatya",       group: "Eastern Anatolia" },
          { code: "tr-23", name: "Elazığ",        group: "Eastern Anatolia" },
          { code: "tr-12", name: "Bingöl",        group: "Eastern Anatolia" },
          { code: "tr-62", name: "Tunceli",       group: "Eastern Anatolia" },
          // Southeastern Anatolia
          { code: "tr-27", name: "Gaziantep",     group: "Southeastern Anatolia" },
          { code: "tr-79", name: "Kilis",         group: "Southeastern Anatolia" },
          { code: "tr-63", name: "Şanlıurfa",     group: "Southeastern Anatolia" },
          { code: "tr-21", name: "Diyarbakır",    group: "Southeastern Anatolia" },
          { code: "tr-47", name: "Mardin",        group: "Southeastern Anatolia" },
          { code: "tr-73", name: "Şırnak",        group: "Southeastern Anatolia" },
          { code: "tr-56", name: "Siirt",         group: "Southeastern Anatolia" },
          { code: "tr-72", name: "Batman",        group: "Southeastern Anatolia" },
          { code: "tr-02", name: "Adıyaman",      group: "Southeastern Anatolia" },
        ],
      },

      // ── UAE (7 emirates) ─────────────────────────────────────────────────────
      {
        code: "AE", name: "UAE", emoji: "🇦🇪", subTitle: "7 Emirates", locked: false,
        subRegions: [
          { code: "ae-az", name: "Abu Dhabi", flagUrl: wiki("Flag of Abu Dhabi.svg") },
          { code: "ae-aj", name: "Ajman", flagUrl: wiki("Flag of Ajman.svg") },
          { code: "ae-du", name: "Dubai", flagUrl: wiki("Flag of Dubai.svg") },
          { code: "ae-fu", name: "Fujairah", flagUrl: wiki("Flag of the United Arab Emirates.svg") },
          { code: "ae-rk", name: "Ras al-Khaimah", flagUrl: wiki("Flag of Sharjah and Ras Al Khaimah.svg") },
          { code: "ae-sh", name: "Sharjah", flagUrl: wiki("Flag of Sharjah and Ras Al Khaimah.svg") },
          { code: "ae-uq", name: "Umm al-Quwain", flagUrl: wiki("Flag of Umm al-Qaiwain.svg") },
        ],
      },

      // ── Yemen (22 governorates) ──────────────────────────────────────────────
      {
        code: "YE", name: "Yemen", emoji: "🇾🇪", subTitle: "22 Governorates", locked: false,
        subRegions: [
          { code: "ye-ab", name: "Abyan" },
          { code: "ye-ad", name: "Aden" },
          { code: "ye-am", name: "Amanat Al-Asimah" },
          { code: "ye-an", name: "Amran" },
          { code: "ye-ba", name: "Al-Bayda" },
          { code: "ye-da", name: "Al-Dale'" },
          { code: "ye-dh", name: "Dhamar" },
          { code: "ye-hd", name: "Al-Hudaydah" },
          { code: "ye-hj", name: "Hajjah" },
          { code: "ye-hm", name: "Hadramawt" },
          { code: "ye-ib", name: "Ibb" },
          { code: "ye-ja", name: "Al-Jawf" },
          { code: "ye-lh", name: "Lahij" },
          { code: "ye-ma", name: "Ma'rib" },
          { code: "ye-mr", name: "Al-Mahrah" },
          { code: "ye-mw", name: "Al-Mahwit" },
          { code: "ye-rm", name: "Raymah" },
          { code: "ye-sa", name: "Saada" },
          { code: "ye-sn", name: "Sana'a" },
          { code: "ye-sh", name: "Shabwah" },
          { code: "ye-so", name: "Socotra" },
          { code: "ye-ta", name: "Taiz" },
        ],
      },

    ],
  },

  // ── EUROPE ────────────────────────────────────────────────────────────────
  {
    id: "europe",
    name: "Europe",
    emoji: "🏰",
    locked: false,
    countries: [

      // ── Germany (16 Bundesländer) ────────────────────────────────────────
      {
        code: "DE", name: "Germany", emoji: "🇩🇪", subTitle: "16 States", locked: false,
        subRegions: [
          { code: "de-bb", name: "Brandenburg",            flagUrl: wiki("Flag of Brandenburg.svg") },
          { code: "de-be", name: "Berlin",                 flagUrl: wiki("Flag of Berlin.svg") },
          { code: "de-bw", name: "Baden-Württemberg",      flagUrl: wiki("Flag of Baden-Württemberg.svg") },
          { code: "de-by", name: "Bavaria",                flagUrl: wiki("Flag of Bavaria (lozengy).svg") },
          { code: "de-hb", name: "Bremen",                 flagUrl: wiki("Flag of Bremen.svg") },
          { code: "de-he", name: "Hesse",                  flagUrl: wiki("Flag of Hesse.svg") },
          { code: "de-hh", name: "Hamburg",                flagUrl: wiki("Flag of Hamburg.svg") },
          { code: "de-mv", name: "Mecklenburg-Vorpommern", flagUrl: wiki("Flag of Mecklenburg-Western Pomerania.svg") },
          { code: "de-ni", name: "Lower Saxony",           flagUrl: wiki("Flag of Lower Saxony.svg") },
          { code: "de-nw", name: "North Rhine-Westphalia", flagUrl: wiki("Flag of North Rhine-Westphalia.svg") },
          { code: "de-rp", name: "Rhineland-Palatinate",   flagUrl: wiki("Flag of Rhineland-Palatinate.svg") },
          { code: "de-sh", name: "Schleswig-Holstein",     flagUrl: wiki("Flag of Schleswig-Holstein.svg") },
          { code: "de-sl", name: "Saarland",               flagUrl: wiki("Flag of Saarland.svg") },
          { code: "de-sn", name: "Saxony",                 flagUrl: wiki("Flag of Saxony.svg") },
          { code: "de-st", name: "Saxony-Anhalt",          flagUrl: wiki("Flag of Saxony-Anhalt (state).svg") },
          { code: "de-th", name: "Thuringia",              flagUrl: wiki("Flag of Thuringia.svg") },
        ],
      },

      // ── France (13 metropolitan + 5 overseas regions) ────────────────────
      {
        code: "FR", name: "France", emoji: "🇫🇷", subTitle: "18 Regions", locked: false,
        subRegions: [
          { code: "fr-ara", name: "Auvergne-Rhône-Alpes",       flagUrl: wiki("Flag of the region Auvergne-Rhône-Alpes.svg") },
          { code: "fr-bfc", name: "Bourgogne-Franche-Comté",    flagUrl: wiki("Flag of the region Bourgogne-Franche-Comté (fixed).svg") },
          { code: "fr-bre", name: "Brittany",                   flagUrl: wiki("Flag of Brittany (Gwenn ha du).svg") },
          { code: "fr-cvl", name: "Centre-Val de Loire",        flagUrl: wiki("Flag of Centre-Val de Loire.svg") },
          { code: "fr-cor", name: "Corsica",                    flagUrl: wiki("Flag of Corsica.svg") },
          { code: "fr-ges", name: "Grand Est",                  flagUrl: wiki("Flag of Grand Est (2022-present).svg") },
          { code: "fr-hdf", name: "Hauts-de-France",            flagUrl: wiki("Flag of the Region of Hauts-de-France.svg") },
          { code: "fr-idf", name: "Île-de-France",              flagUrl: wiki("Cultural flag of Île-de-France.svg") },
          { code: "fr-naq", name: "Nouvelle-Aquitaine",         flagUrl: wiki("Flag of Nouvelle-Aquitaine.svg") },
          { code: "fr-nor", name: "Normandy",                   flagUrl: wiki("Flag of Normandie.svg") },
          { code: "fr-occ", name: "Occitanie",                  flagUrl: wiki("Flag of Région Occitanie (symbol only).svg") },
          { code: "fr-pac", name: "Provence-Alpes-Côte d'Azur", flagUrl: wiki("Flag of Provence-Alpes-Côte d'Azur.svg") },
          { code: "fr-pdl", name: "Pays de la Loire",           flagUrl: wiki("Cultural flag of Pays-de-la-Loire.svg") },
          { code: "fr-gua", name: "Guadeloupe",                 flagUrl: wiki("Flag of Guadeloupe (Local).svg") },
          { code: "fr-guy", name: "French Guiana",              flagUrl: wiki("Flag of French Guiana (Local).svg") },
          { code: "fr-lre", name: "La Réunion",                 flagUrl: wiki("Proposed flag of Réunion (VAR).svg") },
          { code: "fr-may", name: "Mayotte",                    flagUrl: wiki("Flag of Mayotte (Local).svg") },
          { code: "fr-mq",  name: "Martinique",                 flagUrl: wiki("Flag-of-Martinique.svg") },
        ],
      },

      // ── Spain (17 autonomous communities + 2 cities) ─────────────────────
      {
        code: "ES", name: "Spain", emoji: "🇪🇸", subTitle: "19 Regions", locked: false,
        subRegions: [
          { code: "es-an", name: "Andalusia",           flagUrl: wiki("Bandera de Andalucia.svg") },
          { code: "es-ar", name: "Aragon",              flagUrl: wiki("Flag of Aragon.svg") },
          { code: "es-as", name: "Asturias",            flagUrl: wiki("Flag of Asturias.svg") },
          { code: "es-cb", name: "Cantabria",           flagUrl: wiki("Flag of Cantabria.svg") },
          { code: "es-ce", name: "Ceuta",               flagUrl: wiki("Flag of Ceuta without coa.svg") },
          { code: "es-cl", name: "Castile and León",    flagUrl: wiki("Flag of Castile and León.svg") },
          { code: "es-cm", name: "Castile-La Mancha",   flagUrl: wiki("Flag of Castile-La Mancha.svg") },
          { code: "es-cn", name: "Canary Islands",      flagUrl: wiki("Flag of the Canary Islands (simple).svg") },
          { code: "es-ct", name: "Catalonia",           flagUrl: wiki("Flag of Catalonia.svg") },
          { code: "es-ex", name: "Extremadura",         flagUrl: wiki("Flag of Extremadura, Spain (with coat of arms).svg") },
          { code: "es-ga", name: "Galicia",             flagUrl: wiki("Flag of Galicia (civil).svg") },
          { code: "es-ib", name: "Balearic Islands",    flagUrl: wiki("Flag of the Balearic Islands.svg") },
          { code: "es-mc", name: "Region of Murcia",    flagUrl: wiki("Flag of the Region of Murcia.svg") },
          { code: "es-md", name: "Community of Madrid", flagUrl: wiki("Flag of the Community of Madrid.svg") },
          { code: "es-me", name: "Melilla",             flagUrl: wiki("Flag of Melilla.svg") },
          { code: "es-nc", name: "Navarre",             flagUrl: wiki("Bandera de Navarra.svg") },
          { code: "es-pv", name: "Basque Country",      flagUrl: wiki("Flag of the Basque Country.svg") },
          { code: "es-ri", name: "La Rioja",            flagUrl: wiki("Flag of La Rioja (with coat of arms).svg") },
          { code: "es-vc", name: "Valencia",            flagUrl: wiki("Flag of the Valencian Community (2x3).svg") },
        ],
      },

      // ── Italy (20 regions) ───────────────────────────────────────────────
      {
        code: "IT", name: "Italy", emoji: "🇮🇹", subTitle: "20 Regions", locked: false,
        subRegions: [
          { code: "it-21", name: "Piedmont",                    flagUrl: wiki("Flag of Piedmont.svg") },
          { code: "it-23", name: "Aosta Valley",                flagUrl: wiki("Flag of Valle d'Aosta.svg") },
          { code: "it-25", name: "Lombardy",                    flagUrl: wiki("Flag of Lombardy.svg") },
          { code: "it-32", name: "Trentino-Alto Adige",         flagUrl: wiki("Flag of Trentino-South Tyrol.svg") },
          { code: "it-34", name: "Veneto",                      flagUrl: wiki("Flag of Veneto.svg") },
          { code: "it-36", name: "Friuli-Venezia Giulia",       flagUrl: wiki("Flag of Friuli-Venezia Giulia.svg") },
          { code: "it-42", name: "Liguria",                     flagUrl: wiki("Flag of Liguria.svg") },
          { code: "it-45", name: "Emilia-Romagna",              flagUrl: wiki("Flag of Emilia-Romagna (de facto).svg") },
          { code: "it-52", name: "Tuscany",                     flagUrl: wiki("Flag of Tuscany.svg") },
          { code: "it-55", name: "Umbria",                      flagUrl: wiki("Flag of Umbria.svg") },
          { code: "it-57", name: "Marche",                      flagUrl: wiki("Flag of Marche.svg") },
          { code: "it-62", name: "Lazio",                       flagUrl: wiki("Flag of Lazio.svg") },
          { code: "it-65", name: "Abruzzo",                     flagUrl: wiki("Flag of Abruzzo.svg") },
          { code: "it-67", name: "Molise",                      flagUrl: wiki("Flag of Molise.svg") },
          { code: "it-72", name: "Campania",                    flagUrl: wiki("Flag of Campania.svg") },
          { code: "it-75", name: "Apulia",                      flagUrl: wiki("Flag of Apulia.svg") },
          { code: "it-77", name: "Basilicata",                  flagUrl: wiki("Flag of Basilicata.svg") },
          { code: "it-78", name: "Calabria",                    flagUrl: wiki("Flag of Calabria.svg") },
          { code: "it-82", name: "Sicily",                      flagUrl: wiki("Flag of Sicily.svg") },
          { code: "it-88", name: "Sardinia",                    flagUrl: wiki("Flag of Sardinia, Italy.svg") },
        ],
      },

      // ── United Kingdom (England 9 regions · Scotland 32 · Wales 22 · NI 11) ──
      {
        code: "GB", name: "United Kingdom", emoji: "🇬🇧", subTitle: "74 Regions & Districts", locked: false,
        subRegions: [
          // Nation flags — shown on top of each group. Northern Ireland has no official
          // flag (the UK uses the Union Flag there), so it shows a placeholder.
          { code: "gb-eng", name: "England",          flagUrl: wiki("Flag of England.svg"),  group: "England", groupHeader: true },
          { code: "gb-sct", name: "Scotland",         flagUrl: wiki("Flag of Scotland.svg"), group: "Scotland", groupHeader: true },
          { code: "gb-wls", name: "Wales",            flagUrl: wiki("Flag of Wales.svg"),    group: "Wales", groupHeader: true },
          { code: "gb-nir", name: "Northern Ireland", noFlag: true, group: "Northern Ireland", groupHeader: true },
          // England – 9 statistical regions (most are purely admin, no official flags)
          { code: "gb-ne",  name: "North East England", noFlag: true,           group: "England" },
          { code: "gb-nw",  name: "North West England", noFlag: true,           group: "England" },
          { code: "gb-yh",  name: "Yorkshire & the Humber",       flagUrl: wiki("Flag of Yorkshire.svg"),          group: "England" },
          { code: "gb-em",  name: "East Midlands", noFlag: true,                group: "England" },
          { code: "gb-wm",  name: "West Midlands", noFlag: true,                group: "England" },
          { code: "gb-ee",  name: "East of England", noFlag: true,              group: "England" },
          { code: "gb-lon", name: "Greater London",               flagUrl: wiki("Flag of Greater London.svg"),     group: "England" },
          { code: "gb-se",  name: "South East England", noFlag: true,           group: "England" },
          { code: "gb-sw",  name: "South West England", noFlag: true,           group: "England" },
          // Scotland – 32 council areas
          { code: "gb-abd", name: "Aberdeen City",                flagUrl: wiki("Flag of Aberdeen.svg"),           group: "Scotland" },
          { code: "gb-abe", name: "Aberdeenshire",                flagUrl: wiki("Flag of Aberdeenshire.svg"),      group: "Scotland" },
          { code: "gb-ans", name: "Angus", noFlag: true,                        group: "Scotland" },
          { code: "gb-agb", name: "Argyll and Bute", noFlag: true,              group: "Scotland" },
          { code: "gb-clk", name: "Clackmannanshire", noFlag: true,             group: "Scotland" },
          { code: "gb-dgy", name: "Dumfries and Galloway", flagUrl: wiki("Dumfries and galloway flag.svg"),        group: "Scotland" },
          { code: "gb-dnd", name: "Dundee City",                  flagUrl: wiki("Dundee City Flag.png"),           group: "Scotland" },
          { code: "gb-eay", name: "East Ayrshire", noFlag: true,                group: "Scotland" },
          { code: "gb-edu", name: "East Dunbartonshire", noFlag: true,          group: "Scotland" },
          { code: "gb-eln", name: "East Lothian",                 flagUrl: wiki("Flag of East Lothian.svg"),       group: "Scotland" },
          { code: "gb-erw", name: "East Renfrewshire", noFlag: true,            group: "Scotland" },
          { code: "gb-edh", name: "Edinburgh",                    flagUrl: wiki("Flag of Edinburgh.svg"),          group: "Scotland" },
          { code: "gb-els", name: "Na h-Eileanan Siar",           flagUrl: wiki("Western Isles Council Flag.svg"), group: "Scotland" },
          { code: "gb-fal", name: "Falkirk", noFlag: true,                      group: "Scotland" },
          { code: "gb-fif", name: "Fife", noFlag: true,                         group: "Scotland" },
          { code: "gb-glg", name: "Glasgow City",                 flagUrl: wiki("Flag of Glasgow.svg"),            group: "Scotland" },
          { code: "gb-hld", name: "Highland", noFlag: true,                     group: "Scotland" },
          { code: "gb-ivc", name: "Inverclyde", noFlag: true,                   group: "Scotland" },
          { code: "gb-mln", name: "Midlothian", noFlag: true,                   group: "Scotland" },
          { code: "gb-mry", name: "Moray", noFlag: true,                        group: "Scotland" },
          { code: "gb-nay", name: "North Ayrshire", noFlag: true,               group: "Scotland" },
          { code: "gb-nlk", name: "North Lanarkshire", noFlag: true,            group: "Scotland" },
          { code: "gb-ork", name: "Orkney Islands",               flagUrl: wiki("Flag of Orkney.svg"),             group: "Scotland" },
          { code: "gb-pkn", name: "Perth and Kinross", noFlag: true,            group: "Scotland" },
          { code: "gb-rfw", name: "Renfrewshire", noFlag: true,                 group: "Scotland" },
          { code: "gb-scb", name: "Scottish Borders", noFlag: true,             group: "Scotland" },
          { code: "gb-zet", name: "Shetland Islands",             flagUrl: wiki("Flag of Shetland.svg"),           group: "Scotland" },
          { code: "gb-say", name: "South Ayrshire", noFlag: true,               group: "Scotland" },
          { code: "gb-slk", name: "South Lanarkshire", noFlag: true,            group: "Scotland" },
          { code: "gb-stg", name: "Stirling",                     flagUrl: wiki("Flag of Stirling.svg"),           group: "Scotland" },
          { code: "gb-wdu", name: "West Dunbartonshire", noFlag: true,          group: "Scotland" },
          { code: "gb-wln", name: "West Lothian", noFlag: true,                 group: "Scotland" },
          // Wales – 22 local authorities
          { code: "gb-agy", name: "Isle of Anglesey",             flagUrl: wiki("Flag of Anglesey.svg"),           group: "Wales" },
          { code: "gb-bgw", name: "Blaenau Gwent", noFlag: true,                group: "Wales" },
          { code: "gb-bge", name: "Bridgend", noFlag: true,                     group: "Wales" },
          { code: "gb-cay", name: "Caerphilly", noFlag: true,                   group: "Wales" },
          { code: "gb-crf", name: "Cardiff",                      flagUrl: wiki("Flag of Cardiff.svg"),            group: "Wales" },
          { code: "gb-cmn", name: "Carmarthenshire", noFlag: true,              group: "Wales" },
          { code: "gb-cgn", name: "Ceredigion",                   flagUrl: wiki("Flag of Ceredigion.svg"),         group: "Wales" },
          { code: "gb-cwy", name: "Conwy", noFlag: true,                        group: "Wales" },
          { code: "gb-den", name: "Denbighshire", noFlag: true,                 group: "Wales" },
          { code: "gb-fln", name: "Flintshire",                   flagUrl: wiki("Flag of Flintshire.svg"),         group: "Wales" },
          { code: "gb-gwn", name: "Gwynedd",                      flagUrl: wiki("Flag of Gwynedd.svg"),            group: "Wales" },
          { code: "gb-mty", name: "Merthyr Tydfil", noFlag: true,               group: "Wales" },
          { code: "gb-mon", name: "Monmouthshire",                flagUrl: wiki("Flag of Monmouthshire.svg"),      group: "Wales" },
          { code: "gb-ntl", name: "Neath Port Talbot", noFlag: true,            group: "Wales" },
          { code: "gb-nwp", name: "Newport", noFlag: true,                      group: "Wales" },
          { code: "gb-pem", name: "Pembrokeshire",                flagUrl: wiki("Flag of Pembrokeshire.svg"),      group: "Wales" },
          { code: "gb-pow", name: "Powys",                        flagUrl: wiki("Flag of Powys.svg"),              group: "Wales" },
          { code: "gb-rct", name: "Rhondda Cynon Taf", noFlag: true,            group: "Wales" },
          { code: "gb-swa", name: "Swansea", noFlag: true,                      group: "Wales" },
          { code: "gb-tof", name: "Torfaen", noFlag: true,                      group: "Wales" },
          { code: "gb-vgl", name: "Vale of Glamorgan", noFlag: true,            group: "Wales" },
          { code: "gb-wrx", name: "Wrexham", noFlag: true,                      group: "Wales" },
          // Northern Ireland – 11 districts (new 2015 super-councils, most without distinct flags)
          { code: "gb-abc", name: "Armagh, Banbridge & Craigavon", noFlag: true, group: "Northern Ireland" },
          { code: "gb-and", name: "Antrim & Newtownabbey", noFlag: true,        group: "Northern Ireland" },
          { code: "gb-ann", name: "Ards & North Down", noFlag: true,            group: "Northern Ireland" },
          { code: "gb-bfs", name: "Belfast",                      flagUrl: wiki("Flag of Belfast.svg"),            group: "Northern Ireland" },
          { code: "gb-ccg", name: "Causeway Coast & Glens", noFlag: true,       group: "Northern Ireland" },
          { code: "gb-drs", name: "Derry City & Strabane", noFlag: true,        group: "Northern Ireland" },
          { code: "gb-fmo", name: "Fermanagh & Omagh", noFlag: true,            group: "Northern Ireland" },
          { code: "gb-lbc", name: "Lisburn & Castlereagh", noFlag: true,        group: "Northern Ireland" },
          { code: "gb-mea", name: "Mid & East Antrim", noFlag: true,            group: "Northern Ireland" },
          { code: "gb-mul", name: "Mid Ulster", noFlag: true,                   group: "Northern Ireland" },
          { code: "gb-nmd", name: "Newry, Mourne & Down", noFlag: true,         group: "Northern Ireland" },
        ],
      },

      // ── Isle of Man (6 sheadings) ─────────────────────────────────────────
      {
        code: "IM", name: "Isle of Man", emoji: "🇮🇲", subTitle: "6 Sheadings", locked: false,
        subRegions: [
          { code: "im-ay", name: "Ayre", noFlag: true },
          { code: "im-ga", name: "Garff", noFlag: true },
          { code: "im-gf", name: "Glenfaba", noFlag: true },
          { code: "im-mi", name: "Michael", noFlag: true },
          { code: "im-md", name: "Middle", noFlag: true },
          { code: "im-ru", name: "Rushen", noFlag: true },
        ],
      },

      // ── Jersey (12 parishes) ─────────────────────────────────────────────
      {
        code: "JE", name: "Jersey", emoji: "🇯🇪", subTitle: "12 Parishes", locked: false,
        subRegions: [
          { code: "je-gr", name: "Grouville",    flagUrl: wiki("Blason_ville_uk_Grouville_(Jersey).svg") },
          { code: "je-sb", name: "St. Brelade",  flagUrl: wiki("Blason_St_Brelade_Jersey.svg") },
          { code: "je-sc", name: "St. Clement",  flagUrl: wiki("Blason_ville_uk_Saint-Clément_(Jersey).svg") },
          { code: "je-sh", name: "St. Helier",   flagUrl: wiki("Blason_ville_uk_Saint-Hélier_(Jersey).svg") },
          { code: "je-sj", name: "St. John",     flagUrl: wiki("Blason_ville_uk_Saint-Jean_(Jersey).svg") },
          { code: "je-sl", name: "St. Lawrence", flagUrl: wiki("Blason_Saint_Lawrence_Jersey.svg") },
          { code: "je-sm", name: "St. Martin",   flagUrl: wiki("Blason_ville_uk_Saint-Martin_(Jersey).svg") },
          { code: "je-sy", name: "St. Mary",     flagUrl: wiki("Blason_ville_uk_Sainte-Marie_(Jersey).svg") },
          { code: "je-so", name: "St. Ouen",     flagUrl: wiki("Blason_ville_uk_Saint-Ouen_(Jersey).svg") },
          { code: "je-sp", name: "St. Peter",    flagUrl: wiki("Blason_ville_uk_Saint-Pierre_(Jersey).svg") },
          { code: "je-ss", name: "St. Saviour",  flagUrl: wiki("Blason_ville_uk_Saint-Sauveur_(Jersey).svg") },
          { code: "je-tr", name: "Trinity",      flagUrl: wiki("Trinity-Parish-Jersey-Coat-of-Arms.svg") },
        ],
      },

      // ── Guernsey (10 parishes) ───────────────────────────────────────────
      {
        code: "GG", name: "Guernsey", emoji: "🇬🇬", subTitle: "10 Parishes", locked: false,
        subRegions: [
          { code: "gg-ca", name: "Castel", flagUrl: wiki("Flag of Castel, Guernsey.svg") },
          { code: "gg-fo", name: "Forest", flagUrl: wiki("Flag of Forest, Guernsey.svg") },
          { code: "gg-sa", name: "St. Andrew", flagUrl: wiki("Flag of Saint Andrew, Guernsey.svg") },
          { code: "gg-sm", name: "St. Martin", flagUrl: wiki("Flag of Saint Martin, Guernsey.svg") },
          { code: "gg-sp", name: "St. Peter Port", flagUrl: wiki("Flag of Saint Peter Port, Guernsey.svg") },
          { code: "gg-sd", name: "St. Pierre du Bois", flagUrl: wiki("Flag of Saint Pierre du Bois, Guernsey.svg") },
          { code: "gg-ss", name: "St. Sampson", flagUrl: wiki("Flag of Saint Sampson, Guernsey.svg") },
          { code: "gg-sv", name: "St. Saviour", flagUrl: wiki("Flag of Saint Saviour, Guernsey.svg") },
          { code: "gg-to", name: "Torteval", flagUrl: wiki("Flag of Torteval, Guernsey.svg") },
          { code: "gg-va", name: "Vale", flagUrl: wiki("Flag of Vale, Guernsey.svg") },
        ],
      },

      // ── Gibraltar (4 major areas) ────────────────────────────────────────
      {
        code: "GI", name: "Gibraltar", emoji: "🇬🇮", subTitle: "4 Areas", locked: false,
        subRegions: [
          { code: "gi-nr", name: "North District", noFlag: true },
          { code: "gi-sw", name: "South District", noFlag: true },
          { code: "gi-wt", name: "Town Area", noFlag: true },
          { code: "gi-ea", name: "East Side", noFlag: true },
        ],
      },

      // ── Faroe Islands (7 traditional regions) ───────────────────────────
      {
        code: "FO", name: "Faroe Islands", emoji: "🇫🇴", subTitle: "7 Regions", locked: false,
        subRegions: [
          { code: "fo-ea", name: "Eysturoy", noFlag: true },
          { code: "fo-no", name: "Norðoyggjar", noFlag: true },
          { code: "fo-os", name: "Osterø", noFlag: true },
          { code: "fo-sa", name: "Sandoy", noFlag: true },
          { code: "fo-st", name: "Streymoy", noFlag: true },
          { code: "fo-su", name: "Suðuroy", noFlag: true },
          { code: "fo-va", name: "Vágar", noFlag: true },
        ],
      },

      // ── Switzerland (26 cantons) ─────────────────────────────────────────
      {
        code: "CH", name: "Switzerland", emoji: "🇨🇭", subTitle: "26 Cantons", locked: false,
        subRegions: [
          { code: "ch-ag", name: "Aargau",                  flagUrl: wiki("Flag of Canton of Aargau.svg") },
          { code: "ch-ai", name: "Appenzell Innerrhoden",   flagUrl: wiki("Flag of Canton of Appenzell Innerrhoden.svg") },
          { code: "ch-ar", name: "Appenzell Ausserrhoden",  flagUrl: wiki("Flag of Canton of Appenzell Ausserrhoden.svg") },
          { code: "ch-be", name: "Bern",                    flagUrl: wiki("Flag of Canton of Bern.svg") },
          { code: "ch-bl", name: "Basel-Landschaft",        flagUrl: wiki("Flag of Canton of Basel-Landschaft.svg") },
          { code: "ch-bs", name: "Basel-Stadt",             flagUrl: wiki("Flag of Canton of Basel.svg") },
          { code: "ch-fr", name: "Fribourg",                flagUrl: wiki("Flag of Canton of Fribourg.svg") },
          { code: "ch-ge", name: "Geneva",                  flagUrl: wiki("Flag of Canton of Geneva.svg") },
          { code: "ch-gl", name: "Glarus",                  flagUrl: wiki("Flag of Canton of Glarus.svg") },
          { code: "ch-gr", name: "Graubünden",              flagUrl: wiki("Flag of Canton of Graubünden.svg") },
          { code: "ch-ju", name: "Jura",                    flagUrl: wiki("Flag of Canton of Jura.svg") },
          { code: "ch-lu", name: "Lucerne",                 flagUrl: wiki("Flag of Canton of Lucerne.svg") },
          { code: "ch-ne", name: "Neuchâtel",               flagUrl: wiki("Flag of Canton of Neuchâtel.svg") },
          { code: "ch-nw", name: "Nidwalden",               flagUrl: wiki("Flag of Canton of Nidwalden.svg") },
          { code: "ch-ow", name: "Obwalden",                flagUrl: wiki("Flag of Canton of Obwalden.svg") },
          { code: "ch-sg", name: "St. Gallen",              flagUrl: wiki("Flag of Canton of Sankt Gallen.svg") },
          { code: "ch-sh", name: "Schaffhausen",            flagUrl: wiki("Flag of Canton of Schaffhausen.svg") },
          { code: "ch-so", name: "Solothurn",               flagUrl: wiki("Flag of Canton of Solothurn.svg") },
          { code: "ch-sz", name: "Schwyz",                  flagUrl: wiki("Flag of Canton of Schwyz.svg") },
          { code: "ch-tg", name: "Thurgau",                 flagUrl: wiki("Flag of Canton of Thurgau.svg") },
          { code: "ch-ti", name: "Ticino",                  flagUrl: wiki("Flag of Canton of Ticino.svg") },
          { code: "ch-ur", name: "Uri",                     flagUrl: wiki("Flag of Canton of Uri.svg") },
          { code: "ch-vd", name: "Vaud",                    flagUrl: wiki("Flag of Canton of Vaud.svg") },
          { code: "ch-vs", name: "Valais",                  flagUrl: wiki("Flag of Canton of Valais.svg") },
          { code: "ch-zg", name: "Zug",                     flagUrl: wiki("Flag of Canton of Zug.svg") },
          { code: "ch-zh", name: "Zurich",                  flagUrl: wiki("Flag of Canton of Zürich.svg") },
        ],
      },

      // ── Austria (9 states) ───────────────────────────────────────────────
      {
        code: "AT", name: "Austria", emoji: "🇦🇹", subTitle: "9 States", locked: false,
        subRegions: [
          { code: "at-1", name: "Burgenland",    flagUrl: wiki("Flag of Burgenland (state).svg") },
          { code: "at-2", name: "Carinthia",     flagUrl: wiki("Flag of Carinthia (state).svg") },
          { code: "at-3", name: "Lower Austria", flagUrl: wiki("Flag of Lower Austria (state).svg") },
          { code: "at-4", name: "Upper Austria", flagUrl: wiki("Flag of Upper Austria (state).svg") },
          { code: "at-5", name: "Salzburg",      flagUrl: wiki("Flag of Salzburg (state).svg") },
          { code: "at-6", name: "Styria",        flagUrl: wiki("Flag of Styria (state).svg") },
          { code: "at-7", name: "Tyrol",         flagUrl: wiki("Flag of Tirol (state).svg") },
          { code: "at-8", name: "Vorarlberg",    flagUrl: wiki("Flag of Vorarlberg (state).svg") },
          { code: "at-9", name: "Vienna",        flagUrl: wiki("Flag of Vienna (state).svg") },
        ],
      },

      // ── Netherlands (12 provinces) ───────────────────────────────────────
      {
        code: "NL", name: "Netherlands", emoji: "🇳🇱", subTitle: "12 Provinces", locked: false,
        subRegions: [
          { code: "nl-dr", name: "Drenthe",       flagUrl: wiki("Flag of Drenthe.svg") },
          { code: "nl-fl", name: "Flevoland",     flagUrl: wiki("Flag of Flevoland.svg") },
          { code: "nl-fr", name: "Friesland",     flagUrl: wiki("Frisian flag.svg") },
          { code: "nl-ge", name: "Gelderland",    flagUrl: wiki("Flag of Gelderland.svg") },
          { code: "nl-gr", name: "Groningen",     flagUrl: wiki("Flag of Groningen.svg") },
          { code: "nl-li", name: "Limburg",       flagUrl: wiki("Flag of Limburg (Netherlands).svg") },
          { code: "nl-nb", name: "North Brabant", flagUrl: wiki("North Brabant-Flag.svg") },
          { code: "nl-nh", name: "North Holland", flagUrl: wiki("Flag of North Holland.svg") },
          { code: "nl-ov", name: "Overijssel",    flagUrl: wiki("Flag of Overijssel.svg") },
          { code: "nl-ut", name: "Utrecht",       flagUrl: wiki("Utrecht (province)-Flag.svg") },
          { code: "nl-ze", name: "Zeeland",       flagUrl: wiki("Flag of Zeeland.svg") },
          { code: "nl-zh", name: "South Holland", flagUrl: wiki("Flag of Zuid-Holland.svg") },
        ],
      },

      // ── Belgium (3 regions + 10 provinces) ──────────────────────────────
      {
        code: "BE", name: "Belgium", emoji: "🇧🇪", subTitle: "11 Provinces & Regions", locked: false,
        subRegions: [
          { code: "be-bru", name: "Brussels-Capital Region", flagUrl: wiki("Flag of the Brussels-Capital Region.svg") },
          { code: "be-van", name: "Antwerp",                 flagUrl: wiki("Flag of Antwerp.svg") },
          { code: "be-wht", name: "Hainaut",                 flagUrl: wiki("Flag of Hainaut.svg") },
          { code: "be-vli", name: "Limburg",                 flagUrl: wiki("Flag of Limburg (Belgium).svg") },
          { code: "be-wlg", name: "Liège",                   flagUrl: wiki("Flag of the Province of Liège.svg") },
          { code: "be-wlx", name: "Luxembourg",              flagUrl: wiki("Official flag of the Arelerland.svg") },
          { code: "be-wna", name: "Namur",                   flagUrl: wiki("Flag of Namur Province.svg") },
          { code: "be-vwv", name: "West Flanders",           flagUrl: wiki("Flag of West Flanders.svg") },
          { code: "be-vov", name: "East Flanders",           flagUrl: wiki("Flag of Oost-Vlaanderen.svg") },
          { code: "be-vbr", name: "Flemish Brabant",         flagUrl: wiki("Flemish Brabant flag.png") },
          { code: "be-wbr", name: "Walloon Brabant",         flagUrl: wiki("Flag Walloon-brabant.png") },
        ],
      },

      // ── Portugal (18 districts + 2 autonomous regions) ──────────────────
      {
        code: "PT", name: "Portugal", emoji: "🇵🇹", subTitle: "20 Districts & Regions", locked: false,
        subRegions: [
          { code: "pt-01", name: "Aveiro",         flagUrl: wiki("Aveiro Flag.svg") },
          { code: "pt-02", name: "Beja",           flagUrl: wiki("Flag of Beja.svg") },
          { code: "pt-03", name: "Braga",          flagUrl: wiki("Pt-brg1.png") },
          { code: "pt-04", name: "Bragança",       flagUrl: wiki("Pt-bgc1.png") },
          { code: "pt-05", name: "Castelo Branco", flagUrl: wiki("Pt-ctb1.png") },
          { code: "pt-06", name: "Coimbra",        flagUrl: wiki("Pt-cbr1.png") },
          { code: "pt-07", name: "Évora",          flagUrl: wiki("Pt-evr1.png") },
          { code: "pt-08", name: "Faro",           flagUrl: wiki("Faroflag.svg") },
          { code: "pt-09", name: "Guarda",         flagUrl: wiki("Pt-grd1.png") },
          { code: "pt-10", name: "Leiria", noFlag: true },
          { code: "pt-11", name: "Lisbon",         flagUrl: wiki("Flag of Lisbon.svg") },
          { code: "pt-12", name: "Portalegre",     flagUrl: wiki("Pt-ptg1.png") },
          { code: "pt-13", name: "Porto",          flagUrl: wiki("Flag of Porto.svg") },
          { code: "pt-14", name: "Santarém",       flagUrl: wiki("Santarém PT Flag.jpg") },
          { code: "pt-15", name: "Setúbal",        flagUrl: wiki("Pt-stb1.png") },
          { code: "pt-16", name: "Viana do Castelo", flagUrl: wiki("Pt-vct1.gif") },
          { code: "pt-17", name: "Vila Real",      flagUrl: wiki("Flag of Vila Real.png") },
          { code: "pt-18", name: "Viseu",          flagUrl: wiki("Bandeira de Viseu.jpg") },
          { code: "pt-20", name: "Azores",         flagUrl: wiki("Flag of the Azores.svg") },
          { code: "pt-30", name: "Madeira",        flagUrl: wiki("Flag of Madeira.svg") },
        ],
      },

      // ── Sweden (21 counties) ─────────────────────────────────────────────
      {
        code: "SE", name: "Sweden", emoji: "🇸🇪", subTitle: "21 Counties", locked: false,
        subRegions: [
          { code: "se-ab", name: "Stockholm",       flagUrl: wiki("Stockholms län vapenflagga.svg") },
          { code: "se-ac", name: "Västerbotten",    flagUrl: wiki("Västerbottens län vapenflagga.svg") },
          { code: "se-bd", name: "Norrbotten",      flagUrl: wiki("Norrbottens län vapenflagga.svg") },
          { code: "se-c",  name: "Uppsala",         flagUrl: wiki("Uppsala län vapenflagga.svg") },
          { code: "se-d",  name: "Södermanland",    flagUrl: wiki("Södermanlands län vapenflagga.svg") },
          { code: "se-e",  name: "Östergötland",    flagUrl: wiki("Östergötlands län vapenflagga.svg") },
          { code: "se-f",  name: "Jönköping",       flagUrl: wiki("Jönköpings län vapenflagga.svg") },
          { code: "se-g",  name: "Kronoberg",       flagUrl: wiki("Kronobergs län vapenflagga.svg") },
          { code: "se-h",  name: "Kalmar",          flagUrl: wiki("Kalmar län vapenflagga.svg") },
          { code: "se-i",  name: "Gotland",         flagUrl: wiki("Gotlands län vapenflagga.svg") },
          { code: "se-k",  name: "Blekinge",        flagUrl: wiki("Blekinge län vapenflagga.svg") },
          { code: "se-m",  name: "Skåne",           flagUrl: wiki("Skåne län vapenflagga.svg") },
          { code: "se-n",  name: "Halland",         flagUrl: wiki("Hallands län vapenflagga.svg") },
          { code: "se-o",  name: "Västra Götaland", flagUrl: wiki("Västra Götalands län vapenflagga.svg") },
          { code: "se-s",  name: "Värmland",        flagUrl: wiki("Värmlands län vapenflagga.svg") },
          { code: "se-t",  name: "Örebro",          flagUrl: wiki("Örebro län vapenflagga.svg") },
          { code: "se-u",  name: "Västmanland",     flagUrl: wiki("Västmanlands län vapenflagga.svg") },
          { code: "se-w",  name: "Dalarna",         flagUrl: wiki("Dalarnas län vapenflagga.svg") },
          { code: "se-x",  name: "Gävleborg",       flagUrl: wiki("Gävleborgs län vapenflagga.svg") },
          { code: "se-y",  name: "Västernorrland",  flagUrl: wiki("Västernorrlands län vapenflagga.svg") },
          { code: "se-z",  name: "Jämtland",        flagUrl: wiki("Jämtlands län vapenflagga.svg") },
        ],
      },

      // ── Norway (15 counties) ─────────────────────────────────────────────
      {
        code: "NO", name: "Norway", emoji: "🇳🇴", subTitle: "15 Counties", locked: false,
        // On 1 Jan 2024 Norway reversed the 2020 mergers: Viken split back into Østfold,
        // Akershus & Buskerud; Vestfold og Telemark and Troms og Finnmark also split —
        // returning to 15 counties. Innlandet, Agder, Vestland & Trøndelag stayed merged.
        subRegions: [
          { code: "no-31", name: "Østfold", flagUrl: wiki("Flag of Østfold.svg") },
          { code: "no-32", name: "Akershus", flagUrl: wiki("Flag of Akershus.svg") },
          { code: "no-03", name: "Oslo",                flagUrl: wiki("Flag of Oslo.svg") },
          { code: "no-33", name: "Buskerud", flagUrl: wiki("Flag of Buskerud.svg") },
          { code: "no-34", name: "Innlandet",           flagUrl: wiki("Flag of Innlandet.svg") },
          { code: "no-39", name: "Vestfold", flagUrl: wiki("Flag of Vestfold.svg") },
          { code: "no-40", name: "Telemark", flagUrl: wiki("Flag of Telemark.svg") },
          { code: "no-42", name: "Agder",               flagUrl: wiki("Flag of Agder.svg") },
          { code: "no-11", name: "Rogaland",            flagUrl: wiki("Flag of Rogaland.svg") },
          { code: "no-46", name: "Vestland",            flagUrl: wiki("Flag of Vestland.svg") },
          { code: "no-15", name: "Møre og Romsdal",     flagUrl: wiki("Flag of Møre og Romsdal.svg") },
          { code: "no-50", name: "Trøndelag",           flagUrl: wiki("Flag of Nord-Trøndelag.svg") },
          { code: "no-18", name: "Nordland",            flagUrl: wiki("Flag of Nordland.svg") },
          { code: "no-55", name: "Troms", flagUrl: wiki("Flag of Troms.svg") },
          { code: "no-56", name: "Finnmark", flagUrl: wiki("Flag of Finnmark.svg") },
        ],
      },

      // ── Denmark (5 regions) ──────────────────────────────────────────────
      {
        code: "DK", name: "Denmark", emoji: "🇩🇰", subTitle: "5 Regions + 2 Territories", locked: false,
        subRegions: [
          { code: "dk-81", name: "North Denmark",    flagUrl: wiki("Flag of Region Nordjylland.svg"),            group: "Regions" },
          { code: "dk-82", name: "Central Denmark",  flagUrl: wiki("Flag of Region Midtjylland.svg"),            group: "Regions" },
          { code: "dk-83", name: "Southern Denmark", flagUrl: wiki("Flag of Region Syddanmark.svg"),             group: "Regions" },
          { code: "dk-84", name: "Capital Region",   flagUrl: wiki("Flag of the Capital Region of Denmark.svg"), group: "Regions" },
          { code: "dk-85", name: "Zealand",          flagUrl: wiki("Flag of Region Sjælland.svg"),               group: "Regions" },
          // Autonomous constituent countries of the Kingdom of Denmark — both have flags
          { code: "dk-gl", name: "Greenland",        flagUrl: wiki("Flag of Greenland.svg"),          group: "Autonomous Territories" },
          { code: "dk-fo", name: "Faroe Islands",    flagUrl: wiki("Flag of the Faroe Islands.svg"),  group: "Autonomous Territories" },
        ],
      },

      // ── Finland (19 regions) ─────────────────────────────────────────────
      {
        code: "FI", name: "Finland", emoji: "🇫🇮", subTitle: "19 Regions", locked: false,
        subRegions: [
          { code: "fi-01", name: "Uusimaa",                    flagUrl: wiki("Flag of Uusimaa.svg") },
          { code: "fi-02", name: "South Karelia",              flagUrl: wiki("Etelä-Karjala maakuntaviiri.svg") },
          { code: "fi-03", name: "South Ostrobothnia",         flagUrl: wiki("Flag of Southern Ostrobothnia.svg") },
          { code: "fi-04", name: "South Savo",                 flagUrl: wiki("Flag of South Savonia.svg") },
          { code: "fi-05", name: "Kainuu",                     flagUrl: wiki("Flag of Kainuu.svg") },
          { code: "fi-06", name: "Tavastia Proper",            flagUrl: wiki("Flag of Tavastia Proper.svg") },
          { code: "fi-07", name: "Central Ostrobothnia",       flagUrl: wiki("Keski-Pohjanmaa.lippu.svg") },
          { code: "fi-08", name: "Central Finland",            flagUrl: wiki("Keski-suomi lippu.svg") },
          { code: "fi-09", name: "Kymenlaakso",                flagUrl: wiki("Kymenlaakso.vaakunaviiri.svg") },
          { code: "fi-10", name: "Lapland",                    flagUrl: wiki("Flag of Lapland.svg") },
          { code: "fi-11", name: "Pirkanmaa",                  flagUrl: wiki("Flag of Pirkanmaa.svg") },
          // Admin region has no official flag; this is the historical Ostrobothnia province banner
          { code: "fi-12", name: "Ostrobothnia",               flagUrl: wiki("Flag of Ostrobothnia.svg") },
          { code: "fi-13", name: "North Karelia",              flagUrl: wiki("North karelia flag.svg") },
          { code: "fi-14", name: "North Ostrobothnia",         flagUrl: wiki("Pennant of Pohjois-Pohjanmaa.svg") },
          { code: "fi-15", name: "North Savo",                 flagUrl: wiki("Flag of Northern Savonia.svg") },
          { code: "fi-16", name: "Päijänne Tavastia",          flagUrl: wiki("Päijät-Häme.lippu.svg") },
          { code: "fi-17", name: "Satakunta",                  flagUrl: wiki("Satakunta-flag.svg") },
          { code: "fi-18", name: "Southwest Finland",          flagUrl: wiki("Varsinais-Suomen maakuntaviiri.svg") },
          { code: "fi-19", name: "Åland Islands",              flagUrl: wiki("Flag of Åland.svg") },
        ],
      },

      // ── Poland (16 voivodeships) ─────────────────────────────────────────
      {
        code: "PL", name: "Poland", emoji: "🇵🇱", subTitle: "16 Voivodeships", locked: false,
        subRegions: [
          { code: "pl-ds", name: "Lower Silesian",       flagUrl: wiki("POL województwo dolnośląskie flag.svg") },
          { code: "pl-kp", name: "Kuyavian-Pomeranian",  flagUrl: wiki("POL województwo kujawsko-pomorskie flag.svg") },
          { code: "pl-lb", name: "Lubusz",               flagUrl: wiki("POL województwo lubuskie flag formal.svg") },
          { code: "pl-ld", name: "Łódź",                 flagUrl: wiki("POL województwo łódzkie flag (of the voivodeship office).svg") },
          { code: "pl-lu", name: "Lublin",               flagUrl: wiki("POL województwo lubelskie flag.svg") },
          { code: "pl-ma", name: "Lesser Poland",        flagUrl: wiki("POL województwo małopolskie flag.svg") },
          { code: "pl-mz", name: "Masovian",             flagUrl: wiki("POL województwo mazowieckie flag.svg") },
          { code: "pl-op", name: "Opole",                flagUrl: wiki("POL województwo opolskie flag formal.svg") },
          { code: "pl-pd", name: "Podlaskie",            flagUrl: wiki("POL województwo podlaskie flag.svg") },
          { code: "pl-pk", name: "Subcarpathian",        flagUrl: wiki("POL województwo podkarpackie flag.svg") },
          { code: "pl-pm", name: "Pomeranian",           flagUrl: wiki("POL województwo pomorskie flag.svg") },
          { code: "pl-sk", name: "Świętokrzyskie",       flagUrl: wiki("POL województwo świętokrzyskie flag.svg") },
          { code: "pl-sl", name: "Silesian",             flagUrl: wiki("POL województwo śląskie flag formal.svg") },
          { code: "pl-wn", name: "Warmian-Masurian",     flagUrl: wiki("POL województwo warmińsko-mazurskie flag.svg") },
          { code: "pl-wp", name: "Greater Poland",       flagUrl: wiki("POL województwo wielkopolskie flag.svg") },
          { code: "pl-zp", name: "West Pomeranian",      flagUrl: wiki("POL województwo zachodniopomorskie flag.svg") },
        ],
      },

      // ── Greece (13 regions) ──────────────────────────────────────────────
      {
        code: "GR", name: "Greece", emoji: "🇬🇷", subTitle: "13 Regions", locked: false,
        subRegions: [
          // The three "Macedonia" regions share the unofficial Vergina Sun flag of Greek Macedonia
          // The Vergina-Sun "Flag of Greek Macedonia" is a regional symbol for Macedonia as a
          // whole, not an official flag of each periphery — so it's kept only on Central
          // Macedonia; the other two have no distinct official flag (placeholder).
          { code: "gr-a", name: "East Macedonia & Thrace", noFlag: true },
          { code: "gr-b", name: "Central Macedonia",       flagUrl: wiki("Flag of Greek Macedonia.svg") },
          { code: "gr-c", name: "West Macedonia", noFlag: true },
          { code: "gr-d", name: "Epirus", noFlag: true },         // no official regional flag
          { code: "gr-e", name: "Thessaly", noFlag: true },       // no official regional flag
          { code: "gr-f", name: "Ionian Islands", noFlag: true }, // modern region has no flag (only a historical 19th-c. one)
          { code: "gr-g", name: "West Greece",             flagUrl: wiki("Flag of the Region of Western Greece.svg") },
          { code: "gr-h", name: "Central Greece", noFlag: true }, // no verified regional flag
          { code: "gr-i", name: "Attica",                  flagUrl: wiki("Bandera d'Àtica.svg") },
          { code: "gr-j", name: "Peloponnese", noFlag: true },    // no official regional flag
          { code: "gr-k", name: "North Aegean", noFlag: true },   // no official regional flag
          { code: "gr-l", name: "South Aegean",            flagUrl: wiki("Flag of the Region of South Aegean.svg") },
          // Modern Crete region has no official flag — this is the historical Cretan State flag
          { code: "gr-m", name: "Crete",                   flagUrl: wiki("Flag of Cretan State.svg") },
        ],
      },

      // ── Czech Republic (14 regions) ──────────────────────────────────────
      {
        code: "CZ", name: "Czech Republic", emoji: "🇨🇿", subTitle: "14 Regions", locked: false,
        subRegions: [
          { code: "cz-10", name: "Prague",              flagUrl: wiki("Flag of Prague.svg") },
          { code: "cz-20", name: "Central Bohemia",     flagUrl: wiki("Flag of Central Bohemian Region.svg") },
          { code: "cz-31", name: "South Bohemia",       flagUrl: wiki("Flag of South Bohemian Region.svg") },
          { code: "cz-32", name: "Pilsen",              flagUrl: wiki("Flag of Plzen Region.svg") },
          { code: "cz-41", name: "Karlovy Vary",        flagUrl: wiki("Flag of Karlovy Vary Region.svg") },
          { code: "cz-42", name: "Ústí nad Labem",      flagUrl: wiki("Flag of Usti nad Labem Region.svg") },
          { code: "cz-51", name: "Liberec",             flagUrl: wiki("Flag of Liberec Region.svg") },
          { code: "cz-52", name: "Hradec Králové",      flagUrl: wiki("Flag of Hradec Kralove Region.svg") },
          { code: "cz-53", name: "Pardubice",           flagUrl: wiki("Flag of Pardubice Region.svg") },
          { code: "cz-63", name: "Vysočina",            flagUrl: wiki("Flag of Vysocina Region.svg") },
          { code: "cz-64", name: "South Moravia",       flagUrl: wiki("Flag of South Moravian Region.svg") },
          { code: "cz-71", name: "Olomouc",             flagUrl: wiki("Flag of Olomouc Region.svg") },
          { code: "cz-72", name: "Zlín",                flagUrl: wiki("Flag of Zlin Region.svg") },
          { code: "cz-80", name: "Moravian-Silesian",   flagUrl: wiki("Flag of Moravian-Silesian Region.svg") },
        ],
      },

      // ── Hungary (19 counties + Budapest) ────────────────────────────────
      {
        code: "HU", name: "Hungary", emoji: "🇭🇺", subTitle: "20 Counties", locked: false,
        subRegions: [
          { code: "hu-ba", name: "Baranya",               flagUrl: wiki("Flag of Baranya County.svg") },
          { code: "hu-be", name: "Békés",                 flagUrl: wiki("FLAG-Békés-megye.svg") },
          { code: "hu-bk", name: "Bács-Kiskun",           flagUrl: wiki("Flag of Bács-Kiskun County.svg") },
          { code: "hu-bu", name: "Budapest",              flagUrl: wiki("Flag of Budapest (2011-).svg") },
          { code: "hu-bz", name: "Borsod-Abaúj-Zemplén", flagUrl: wiki("FLAG-Borsod-Abaúj-Zemplén-megye.svg") },
          { code: "hu-cs", name: "Csongrád-Csanád",       flagUrl: wiki("Flag of Csongrad-Csanad megye.svg") },
          { code: "hu-fe", name: "Fejér",                 flagUrl: wiki("FLAG-Fejér-megye.svg") },
          { code: "hu-gs", name: "Győr-Moson-Sopron",     flagUrl: wiki("FLAG-Gyor-Moson-Sopron-megye.svg") },
          { code: "hu-hb", name: "Hajdú-Bihar",           flagUrl: wiki("FLAG-Hajdú-Bihar-megye.svg") },
          { code: "hu-he", name: "Heves",                 flagUrl: wiki("FLAG-Heves-megye.svg") },
          { code: "hu-jn", name: "Jász-Nagykun-Szolnok",  flagUrl: wiki("FLAG-Jasz-Nagykun-Szolnok.svg") },
          { code: "hu-ke", name: "Komárom-Esztergom",     flagUrl: wiki("FLAG-Komárom-Esztergom-megye.svg") },
          { code: "hu-no", name: "Nógrád",                flagUrl: wiki("FLAG-Nograd.svg") },
          { code: "hu-pe", name: "Pest",                  flagUrl: wiki("FLAG-Pest-megye.svg") },
          { code: "hu-so", name: "Somogy",                flagUrl: wiki("FLAG-Somogy-megye.svg") },
          { code: "hu-sz", name: "Szabolcs-Szatmár-Bereg",flagUrl: wiki("Flag-Szabolcs-Szatmar-Bereg-megye.svg") },
          { code: "hu-to", name: "Tolna",                 flagUrl: wiki("FLAG-Tolna-megye.svg") },
          { code: "hu-va", name: "Vas",                   flagUrl: wiki("FLAG-Vas-megye.svg") },
          { code: "hu-ve", name: "Veszprém",              flagUrl: wiki("FLAG-Veszprém-megye.svg") },
          { code: "hu-za", name: "Zala",                  flagUrl: wiki("FLAG-Zala-megye.svg") },
        ],
      },

      // ── Romania (41 counties + Bucharest) ───────────────────────────────
      {
        code: "RO", name: "Romania", emoji: "🇷🇴", subTitle: "42 Counties", locked: false,
        subRegions: [
          { code: "ro-ab", name: "Alba",            flagUrl: wiki("RO Alba County Flag.svg") },
          { code: "ro-ar", name: "Arad",            flagUrl: wiki("ROU AR Arad Flag.svg") },
          { code: "ro-ag", name: "Argeș",           flagUrl: wiki("Arges flag.webp") },
          { code: "ro-bc", name: "Bacău",           flagUrl: wiki("Bacau flag.webp") },
          { code: "ro-bh", name: "Bihor",           flagUrl: wiki("Flag of Bihor County, Romania.svg") },
          { code: "ro-bn", name: "Bistrița-Năsăud", flagUrl: wiki("Bistrita-nasaud flag.webp") },
          { code: "ro-bt", name: "Botoșani",        flagUrl: wiki("Botosani flag.webp") },
          { code: "ro-bv", name: "Brașov",          flagUrl: wiki("Brasov flag.webp") },
          { code: "ro-br", name: "Brăila",          flagUrl: wiki("Braila flag.webp") },
          { code: "ro-b",  name: "Bucharest",       flagUrl: wiki("ROU Bucharest Flag.svg") },
          { code: "ro-bz", name: "Buzău",           flagUrl: wiki("Buzau flag.webp") },
          { code: "ro-cs", name: "Caraș-Severin",   flagUrl: wiki("Flag of Caras-Severin County.gif") },
          { code: "ro-cj", name: "Cluj",            flagUrl: wiki("Cluj flag.webp") },
          { code: "ro-ct", name: "Constanța",       flagUrl: wiki("Constanta flag.webp") },
          { code: "ro-cv", name: "Covasna",         flagUrl: wiki("Flag of Covasna County, Romania.svg") },
          { code: "ro-db", name: "Dâmbovița",       flagUrl: wiki("Dambovita flag.webp") },
          { code: "ro-dj", name: "Dolj",            flagUrl: wiki("Dolj flag.webp") },
          { code: "ro-gl", name: "Galați",          flagUrl: wiki("Galati flag.webp") },
          { code: "ro-gr", name: "Giurgiu",         flagUrl: wiki("Flag of Giurgiu County, Romania.svg") },
          { code: "ro-gj", name: "Gorj",            flagUrl: wiki("Gorj flag.webp") },
          { code: "ro-hr", name: "Harghita",        flagUrl: wiki("Flag of Harghita County.gif") },
          { code: "ro-hd", name: "Hunedoara",       flagUrl: wiki("Hunedoara flag.webp") },
          { code: "ro-il", name: "Ialomița",        flagUrl: wiki("Flag of Ialomiţa County, Romania.svg") },
          { code: "ro-is", name: "Iași",            flagUrl: wiki("Iasi flag.gif") },
          { code: "ro-if", name: "Ilfov",           flagUrl: wiki("Ilfov flag.webp") },
          { code: "ro-mm", name: "Maramureș",       flagUrl: wiki("Flag of Maramureș County.svg") },
          { code: "ro-mh", name: "Mehedinți",       flagUrl: wiki("Mehedinti flag.webp") },
          { code: "ro-ms", name: "Mureș",           flagUrl: wiki("Mures flag.webp") },
          { code: "ro-nt", name: "Neamț",           flagUrl: wiki("Neamt flag.png") },
          { code: "ro-ot", name: "Olt",             flagUrl: wiki("Olt flag.png") },
          { code: "ro-ph", name: "Prahova",         flagUrl: wiki("Prahova flag.png") },
          { code: "ro-sm", name: "Satu Mare",       flagUrl: wiki("Flag of Satu Mare County.png") },
          { code: "ro-sj", name: "Sălaj",           flagUrl: wiki("Salaj flag.webp") },
          { code: "ro-sb", name: "Sibiu",           flagUrl: wiki("Sibiu flag.webp") },
          { code: "ro-sv", name: "Suceava",         flagUrl: wiki("Suceava new flag (1).png") },
          { code: "ro-tr", name: "Teleorman",       flagUrl: wiki("Teleorman flag.webp") },
          { code: "ro-tm", name: "Timiș",           flagUrl: wiki("Timis flag.webp") },
          { code: "ro-tl", name: "Tulcea",          flagUrl: wiki("Tulcea flag.webp") },
          { code: "ro-vs", name: "Vaslui",          flagUrl: wiki("Vaslui flag.webp") },
          { code: "ro-vl", name: "Vâlcea",          flagUrl: wiki("Valcea flag.webp") },
          { code: "ro-vn", name: "Vrancea",         flagUrl: wiki("Vrancea flag.webp") },
          { code: "ro-cl", name: "Călărași",        flagUrl: wiki("Calarasi flag.webp") },
        ],
      },

      // ── Bulgaria (28 provinces) ──────────────────────────────────────────
      {
        code: "BG", name: "Bulgaria", emoji: "🇧🇬", subTitle: "28 Provinces", locked: false,
        // NOTE: Bulgarian provinces have no provincial flags of their own; these are the
        // flags of the capital city/municipality that shares each province's name (the
        // convention Wikipedia uses). Sofia Province is the exception — Sofia city is NOT
        // in it, so it has no flag. Pernik has no flag file on Commons. Smolyan & Targovishte
        // only exist as JPG photos of the municipal flag.
        subRegions: [
          { code: "bg-01", name: "Blagoevgrad",    flagUrl: wiki("Flag of Blagoevgrad.svg") },
          { code: "bg-02", name: "Burgas",         flagUrl: wiki("BG-Burgas flag.png") },
          { code: "bg-03", name: "Varna",          flagUrl: wiki("Знаме на Варна, България.svg") },
          { code: "bg-04", name: "Veliko Tarnovo", flagUrl: wiki("Flag of Veliko Tarnovo.svg") },
          { code: "bg-05", name: "Vidin",          flagUrl: wiki("Flag of Vidin.gif") },
          { code: "bg-06", name: "Vratsa",         flagUrl: wiki("Flag of Vratsa.svg") },
          { code: "bg-07", name: "Gabrovo",        flagUrl: wiki("BG Gabrovo flag.svg") },
          { code: "bg-08", name: "Dobrich",        flagUrl: wiki("Flag of Dobrich.svg") },
          { code: "bg-09", name: "Kardzhali",      flagUrl: wiki("Flag of Kardzhali.gif") },
          { code: "bg-10", name: "Kyustendil",     flagUrl: wiki("Flag of Kyustendil.svg") },
          { code: "bg-11", name: "Lovech",         flagUrl: wiki("Flag of Lovech.gif") },
          { code: "bg-12", name: "Montana",        flagUrl: wiki("Flag of Montana, Bulgaria.svg") },
          { code: "bg-13", name: "Pazardzhik",     flagUrl: wiki("Flag of Pazardzhik.gif") },
          { code: "bg-14", name: "Pernik", noFlag: true }, // no flag file on Commons (coat of arms only)
          { code: "bg-15", name: "Pleven",         flagUrl: wiki("Flag of Pleven.gif") },
          { code: "bg-16", name: "Plovdiv",        flagUrl: wiki("Plovdiv flag.svg") },
          { code: "bg-17", name: "Razgrad",        flagUrl: wiki("Razgrad flag.png") },
          { code: "bg-18", name: "Ruse",           flagUrl: wiki("Ruse flag.png") },
          { code: "bg-19", name: "Silistra",       flagUrl: wiki("Flag of Silistra.svg") },
          { code: "bg-20", name: "Sliven",         flagUrl: wiki("Sliven flag.png") },
          { code: "bg-21", name: "Smolyan",        flagUrl: wiki("Smolyan Municipality.jpg") },
          { code: "bg-22", name: "Sofia City",     flagUrl: wiki("BG Sofia flag.svg") },
          { code: "bg-23", name: "Sofia Province", noFlag: true }, // no flag (Sofia city is not in this province)
          { code: "bg-24", name: "Stara Zagora",   flagUrl: wiki("Flag of Stara Zagora (obverse).svg") },
          { code: "bg-25", name: "Targovishte",    flagUrl: wiki("Targovishte Municipality.jpg") },
          { code: "bg-26", name: "Haskovo",        flagUrl: wiki("Flag of Haskovo.gif") },
          { code: "bg-27", name: "Shumen",         flagUrl: wiki("Flag of Shumen.svg") },
          { code: "bg-28", name: "Yambol",         flagUrl: wiki("Flag of Yambol.gif") },
        ],
      },

      // ── Croatia (20 counties + City of Zagreb) ───────────────────────────
      {
        code: "HR", name: "Croatia", emoji: "🇭🇷", subTitle: "21 Counties", locked: false,
        subRegions: [
          { code: "hr-01", name: "Zagreb County",       flagUrl: wiki("Flag of Zagreb County.svg") },
          { code: "hr-02", name: "Krapina-Zagorje",     flagUrl: wiki("Flag of Krapina-Zagorje County.svg") },
          { code: "hr-03", name: "Sisak-Moslavina",     flagUrl: wiki("Flag of Sisak-Moslavina County.png") },
          { code: "hr-04", name: "Karlovac",            flagUrl: wiki("Flag of Karlovac County.svg") },
          { code: "hr-05", name: "Varaždin",            flagUrl: wiki("Flag of Varaždin County.png") },
          { code: "hr-06", name: "Koprivnica-Križevci", flagUrl: wiki("Flag of Koprivnica-Križevci County.png") },
          { code: "hr-07", name: "Bjelovar-Bilogora",   flagUrl: wiki("Zastava bjelovarsko bilogorske zupanije.gif") },
          { code: "hr-08", name: "Primorje-Gorski Kotar",flagUrl: wiki("Flag of Primorje-Gorski Kotar County.png") },
          { code: "hr-09", name: "Lika-Senj",           flagUrl: wiki("Flag of Lika-Senj County.svg") },
          { code: "hr-10", name: "Virovitica-Podravina", flagUrl: wiki("Flag of Virovitica-Podravina County.png") },
          { code: "hr-11", name: "Požega-Slavonia",     flagUrl: wiki("Flag of Požega-Slavonia County.png") },
          { code: "hr-12", name: "Brod-Posavina",       flagUrl: wiki("Flag of Brod-Posavina County.svg") },
          { code: "hr-13", name: "Zadar",               flagUrl: wiki("Flag of Zadar County.png") },
          { code: "hr-14", name: "Osijek-Baranja",      flagUrl: wiki("Zastava Osječko-baranjske županije.png") },
          { code: "hr-15", name: "Šibenik-Knin",        flagUrl: wiki("Flag of Šibenik-Knin County.svg") },
          { code: "hr-16", name: "Vukovar-Srijem",      flagUrl: wiki("Flag of Vukovar-Syrmia County.svg") },
          { code: "hr-17", name: "Split-Dalmatia",      flagUrl: wiki("Flag of Split-Dalmatia County.svg") },
          { code: "hr-18", name: "Istria",              flagUrl: wiki("Zastava Istarske županije.svg") },
          { code: "hr-19", name: "Dubrovnik-Neretva",   flagUrl: wiki("Flag of Dubrovnik-Neretva County.png") },
          { code: "hr-20", name: "Međimurje",           flagUrl: wiki("Flag of Međimurje County.svg") },
          { code: "hr-21", name: "City of Zagreb",      flagUrl: wiki("Flag of Zagreb.svg") },
        ],
      },

      // ── Slovakia (8 regions) ─────────────────────────────────────────────
      {
        code: "SK", name: "Slovakia", emoji: "🇸🇰", subTitle: "8 Regions", locked: false,
        subRegions: [
          { code: "sk-bc", name: "Banská Bystrica", flagUrl: wiki("Banskobystricky vlajka.svg") },
          { code: "sk-bl", name: "Bratislava",      flagUrl: wiki("Bratislavsky vlajka.svg") },
          { code: "sk-ki", name: "Košice",          flagUrl: wiki("Kosicky vlajka.svg") },
          { code: "sk-ni", name: "Nitra",           flagUrl: wiki("Nitriansky vlajka.svg") },
          { code: "sk-pv", name: "Prešov",          flagUrl: wiki("Presovsky vlajka.svg") },
          { code: "sk-ta", name: "Trnava",          flagUrl: wiki("Trnavsky vlajka.svg") },
          { code: "sk-tc", name: "Trenčín",         flagUrl: wiki("Trenciansky vlajka.svg") },
          { code: "sk-zi", name: "Žilina",          flagUrl: wiki("Zilinsky vlajka.svg") },
        ],
      },

      // ── Lithuania (10 counties) ──────────────────────────────────────────
      {
        code: "LT", name: "Lithuania", emoji: "🇱🇹", subTitle: "10 Counties", locked: false,
        subRegions: [
          { code: "lt-al", name: "Alytus",      flagUrl: wiki("Alytus County flag.svg") },
          // Commons stores these six with ASCII (no-diacritic) spellings and mixed extensions
          { code: "lt-kl", name: "Klaipėda",   flagUrl: wiki("Klaipeda County flag.png") },
          { code: "lt-ku", name: "Kaunas",      flagUrl: wiki("Kaunas County flag.png") },
          { code: "lt-mr", name: "Marijampolė",flagUrl: wiki("Marijampole County flag.svg") },
          { code: "lt-pn", name: "Panevėžys",  flagUrl: wiki("Panevezys County flag.svg") },
          { code: "lt-sa", name: "Šiauliai",   flagUrl: wiki("Siauliai County flag.svg") },
          { code: "lt-ta", name: "Tauragė",    flagUrl: wiki("Taurage County flag.png") },
          { code: "lt-te", name: "Telšiai",    flagUrl: wiki("Telšiai County flag.svg") },
          { code: "lt-ut", name: "Utena",      flagUrl: wiki("Utena County flag.svg") },
          { code: "lt-vl", name: "Vilnius",    flagUrl: wiki("Vilnius County flag.svg") },
        ],
      },

      // ── Latvia (6 planning regions) ──────────────────────────────────────
      {
        code: "LV", name: "Latvia", emoji: "🇱🇻", subTitle: "6 Regions", locked: false,
        subRegions: [
          { code: "lv-rix", name: "Riga",        flagUrl: wiki("Flag of Riga.svg") },
          { code: "lv-pie", name: "Pierīga", noFlag: true }, // planning region, no flag
          { code: "lv-vid", name: "Vidzeme", noFlag: true }, // no official flag (only an unofficial proposal exists)
          { code: "lv-kur", name: "Kurzeme", noFlag: true }, // no official flag (only an unofficial proposal exists)
          { code: "lv-zem", name: "Zemgale",     flagUrl: wiki("Official flag of Zemgale.svg") },
          { code: "lv-lat", name: "Latgale",     flagUrl: wiki("Official flag of Latgale.svg") },
        ],
      },

      // ── Estonia (15 counties) ────────────────────────────────────────────
      {
        code: "EE", name: "Estonia", emoji: "🇪🇪", subTitle: "15 Counties", locked: false,
        subRegions: [
          { code: "ee-37", name: "Harju",       flagUrl: wiki("Flag of et-Harju maakond.svg") },
          { code: "ee-39", name: "Hiiu",        flagUrl: wiki("Hiiumaa lipp.svg") },
          { code: "ee-44", name: "Ida-Viru",    flagUrl: wiki("Ida-Virumaa lipp.svg") },
          { code: "ee-49", name: "Jõgeva",      flagUrl: wiki("Jõgevamaa lipp.svg") },
          { code: "ee-51", name: "Järva",       flagUrl: wiki("Flag of et-Järva maakond.svg") },
          { code: "ee-57", name: "Lääne",       flagUrl: wiki("Läänemaa lipp.svg") },
          { code: "ee-59", name: "Lääne-Viru",  flagUrl: wiki("Lääne-Virumaa lipp.svg") },
          { code: "ee-65", name: "Põlva",       flagUrl: wiki("Põlvamaa lipp.svg") },
          { code: "ee-67", name: "Pärnu",       flagUrl: wiki("Pärnumaa lipp.svg") },
          { code: "ee-70", name: "Rapla",       flagUrl: wiki("Raplamaa lipp.svg") },
          { code: "ee-74", name: "Saare",       flagUrl: wiki("Saaremaa lipp.svg") },
          { code: "ee-78", name: "Tartu",       flagUrl: wiki("Tartumaa lipp.svg") },
          { code: "ee-82", name: "Valga",       flagUrl: wiki("Valgamaa lipp.svg") },
          { code: "ee-84", name: "Viljandi",    flagUrl: wiki("Viljandimaa lipp.svg") },
          { code: "ee-86", name: "Võru",        flagUrl: wiki("Võrumaa lipp.svg") },
        ],
      },

      // ── Ireland (26 counties) ────────────────────────────────────────────
      {
        code: "IE", name: "Ireland", emoji: "🇮🇪", subTitle: "4 Provinces · 26 Counties", locked: false,
        subRegions: [
          // Province flags — shown on top of each county group
          { code: "ie-prov-l", name: "Leinster", flagUrl: wiki("Leinster flag.svg"),  group: "Leinster", groupHeader: true },
          { code: "ie-prov-m", name: "Munster",  flagUrl: wiki("Munster flag.svg"),   group: "Munster",  groupHeader: true },
          { code: "ie-prov-c", name: "Connacht", flagUrl: wiki("Connacht flag.svg"),  group: "Connacht", groupHeader: true },
          { code: "ie-prov-u", name: "Ulster",   flagUrl: wiki("Flag of Ulster.svg"), group: "Ulster",   groupHeader: true },
          // Leinster – 12 counties (GAA colours, not official flags)
          { code: "ie-cw", name: "Carlow",    flagUrl: wiki("Colours_of_Carlow.svg"),      group: "Leinster" },
          { code: "ie-d",  name: "Dublin",    flagUrl: wiki("Colours_of_Dublin.svg"),      group: "Leinster" },
          { code: "ie-ke", name: "Kildare",   flagUrl: wiki("Colours_of_Kildare.svg"),     group: "Leinster" },
          { code: "ie-kk", name: "Kilkenny",  flagUrl: wiki("Colours_of_Kilkenny.svg"),    group: "Leinster" },
          { code: "ie-ls", name: "Laois",     flagUrl: wiki("Colours_of_Laois.svg"),       group: "Leinster" },
          { code: "ie-ld", name: "Longford",  flagUrl: wiki("Colours_of_Longford_GAA.svg"),group: "Leinster" },
          { code: "ie-lh", name: "Louth", flagUrl: wiki("Colours of Louth.svg"),                                                  group: "Leinster" },
          { code: "ie-mh", name: "Meath",     flagUrl: wiki("Colours_of_Meath_GAA.svg"),   group: "Leinster" },
          { code: "ie-oy", name: "Offaly",    flagUrl: wiki("Colours_of_Offaly.svg"),      group: "Leinster" },
          { code: "ie-wh", name: "Westmeath", flagUrl: wiki("Colours of Westmeath.svg"),                                              group: "Leinster" },
          { code: "ie-wx", name: "Wexford",   flagUrl: wiki("Colours_of_Wexford.svg"),     group: "Leinster" },
          { code: "ie-ww", name: "Wicklow", flagUrl: wiki("Colours of Wicklow.svg"),                                                group: "Leinster" },
          // Munster – 6 counties
          { code: "ie-ce", name: "Clare",     flagUrl: wiki("Colours_of_Clare.svg"),       group: "Munster" },
          { code: "ie-co", name: "Cork",      flagUrl: wiki("Colours_of_Cork.svg"),        group: "Munster" },
          { code: "ie-ky", name: "Kerry",     flagUrl: wiki("Colours_of_Kerry_GAA.svg"),   group: "Munster" },
          { code: "ie-lk", name: "Limerick", flagUrl: wiki("Limerick colours.PNG"),                                               group: "Munster" },
          { code: "ie-ta", name: "Tipperary", flagUrl: wiki("Tipperary colours.PNG"),                                              group: "Munster" },
          { code: "ie-wd", name: "Waterford", flagUrl: wiki("Waterford colours.PNG"),                                              group: "Munster" },
          // Connacht – 5 counties
          { code: "ie-g",  name: "Galway",    flagUrl: wiki("Colours_of_Galway.svg"),      group: "Connacht" },
          { code: "ie-lm", name: "Leitrim",   flagUrl: wiki("Colours_of_Leitrim.svg"),     group: "Connacht" },
          { code: "ie-mo", name: "Mayo",      flagUrl: wiki("Colours_of_Mayo.svg"),        group: "Connacht" },
          { code: "ie-rn", name: "Roscommon", flagUrl: wiki("Colours_of_Roscommon.svg"),   group: "Connacht" },
          { code: "ie-so", name: "Sligo",     flagUrl: wiki("Colours_of_Sligo.svg"),       group: "Connacht" },
          // Ulster (Irish counties) – 3 counties
          { code: "ie-cn", name: "Cavan", flagUrl: wiki("Colours of Cavan.svg"),                                                  group: "Ulster" },
          { code: "ie-dl", name: "Donegal",   flagUrl: wiki("Colours_of_Donegal_GAA.svg"), group: "Ulster" },
          { code: "ie-mn", name: "Monaghan",  flagUrl: wiki("Colours_of_Monaghan.svg"),    group: "Ulster" },
        ],
      },

      // ── Serbia (1 province + Belgrade + 25 districts) ───────────────────
      {
        code: "RS", name: "Serbia", emoji: "🇷🇸", subTitle: "Province & Districts", locked: false,
        subRegions: [
          // Autonomous province & capital city
          { code: "rs-vo", name: "Vojvodina",           flagUrl: wiki("Flag of Vojvodina.svg"),           group: "Provinces" },
          { code: "rs-00", name: "Belgrade",             flagUrl: wiki("Flag of Belgrade, Serbia.svg"),   group: "Provinces" },
          // Central Serbia – 17 districts
          { code: "rs-01", name: "Braničevo", noFlag: true,            group: "Central Serbia" },
          { code: "rs-02", name: "Jablanica", noFlag: true,            group: "Central Serbia" },
          { code: "rs-03", name: "Kolubara", noFlag: true,             group: "Central Serbia" },
          { code: "rs-04", name: "Mačva", noFlag: true,                group: "Central Serbia" },
          { code: "rs-05", name: "Moravica", noFlag: true,             group: "Central Serbia" },
          { code: "rs-06", name: "Nišava", noFlag: true,               group: "Central Serbia" },
          { code: "rs-07", name: "Pčinja", noFlag: true,               group: "Central Serbia" },
          { code: "rs-08", name: "Pirot", noFlag: true,                group: "Central Serbia" },
          { code: "rs-09", name: "Podunavlje", noFlag: true,           group: "Central Serbia" },
          { code: "rs-10", name: "Pomoravlje", noFlag: true,           group: "Central Serbia" },
          { code: "rs-11", name: "Rasina", noFlag: true,               group: "Central Serbia" },
          { code: "rs-12", name: "Raška", noFlag: true,                group: "Central Serbia" },
          { code: "rs-13", name: "Toplica", noFlag: true,              group: "Central Serbia" },
          { code: "rs-14", name: "Zaječar", noFlag: true,              group: "Central Serbia" },
          { code: "rs-15", name: "Zlatibor", noFlag: true,             group: "Central Serbia" },
          { code: "rs-16", name: "Šumadija", noFlag: true,             group: "Central Serbia" },
          { code: "rs-17", name: "Bor", noFlag: true,                  group: "Central Serbia" },
          // Vojvodina – 7 districts
          { code: "rs-19", name: "South Bačka", noFlag: true,          group: "Vojvodina" },
          { code: "rs-20", name: "North Bačka", noFlag: true,          group: "Vojvodina" },
          { code: "rs-21", name: "West Bačka", noFlag: true,           group: "Vojvodina" },
          { code: "rs-22", name: "North Banat", noFlag: true,          group: "Vojvodina" },
          { code: "rs-23", name: "Central Banat", noFlag: true,        group: "Vojvodina" },
          { code: "rs-24", name: "South Banat", noFlag: true,          group: "Vojvodina" },
          { code: "rs-25", name: "Srem", noFlag: true,                 group: "Vojvodina" },
        ],
      },

      // ── Bosnia and Herzegovina (FBiH cantons + RS + Brčko) ───────────────
      {
        code: "BA", name: "Bosnia & Herzegovina", emoji: "🇧🇦", subTitle: "12 Cantons & Entities", locked: false,
        subRegions: [
          // Federation of B&H – 10 cantons
          { code: "ba-f01", name: "Una-Sana",            flagUrl: wiki("Flag of Una-Sana.svg") },
          { code: "ba-f02", name: "Posavina",            flagUrl: wiki("Flag of Posavina.svg") },
          { code: "ba-f03", name: "Tuzla",               flagUrl: wiki("Flag of Tuzla Canton.svg") },
          { code: "ba-f04", name: "Zenica-Doboj",        flagUrl: wiki("Flag of Zenica-Doboj.svg") },
          { code: "ba-f05", name: "Bosnian Podrinje",    flagUrl: wiki("Flag of Bosnian Podrinje.svg") },
          { code: "ba-f06", name: "Central Bosnia",      flagUrl: wiki("Flag of Central Bosnia.svg") },
          { code: "ba-f07", name: "Herzegovina-Neretva", flagUrl: wiki("Flag of Herzegovina-Neretva.svg") },
          { code: "ba-f08", name: "West Herzegovina",    flagUrl: wiki("Flag of the Croatian Republic of Herzeg-Bosnia.svg") },
          { code: "ba-f09", name: "Sarajevo",            flagUrl: wiki("Flag of Sarajevo Canton.svg") },
          // West Herzegovina & Canton 10 share the (de facto) Herzeg-Bosnia tricolour
          { code: "ba-f10", name: "Canton 10 (Livno)",   flagUrl: wiki("Flag of the Croatian Republic of Herzeg-Bosnia.svg") },
          // Other entities
          { code: "ba-srp", name: "Republika Srpska",    flagUrl: wiki("Flag of Republika Srpska.svg") },
          { code: "ba-brc", name: "Brčko District", noFlag: true }, // officially has no flag of its own (uses BiH's)
        ],
      },

      // ── Albania (12 counties) ────────────────────────────────────────────
      {
        code: "AL", name: "Albania", emoji: "🇦🇱", subTitle: "12 Counties", locked: false,
        subRegions: [
          // Albanian counties (qark) use "Flag of <Name> County.png" files
          { code: "al-br", name: "Berat",        flagUrl: wiki("Flag of Berat.svg") },
          { code: "al-di", name: "Dibër",        flagUrl: wiki("Flag of Dibër County.png") },
          { code: "al-dl", name: "Durrës",       flagUrl: wiki("Flag of Durrës.svg") },
          { code: "al-el", name: "Elbasan",      flagUrl: wiki("Flag of Elbasan.svg") },
          { code: "al-fr", name: "Fier",         flagUrl: wiki("Flag of Fier County.png") },
          { code: "al-gj", name: "Gjirokastër",  flagUrl: wiki("Flag of Gjirokastër County.png") },
          { code: "al-ko", name: "Korçë",        flagUrl: wiki("Flag of Korçë.svg") },
          { code: "al-ku", name: "Kukës",        flagUrl: wiki("Flag of Kukës.svg") },
          { code: "al-le", name: "Lezhë",        flagUrl: wiki("Flag of Lezhë County.png") },
          { code: "al-mr", name: "Shkodër",      flagUrl: wiki("Flag of Shkodër County.png") },
          { code: "al-ti", name: "Tirana",       flagUrl: wiki("Flag of Tirana.svg") },
          { code: "al-vl", name: "Vlorë",        flagUrl: wiki("Flag of Vlorë.svg") },
        ],
      },

      // ── North Macedonia (8 statistical regions) ──────────────────────────
      {
        code: "MK", name: "North Macedonia", emoji: "🇲🇰", subTitle: "8 Regions", locked: false,
        subRegions: [
          { code: "mk-101", name: "Vardar", noFlag: true },
          { code: "mk-201", name: "East", noFlag: true },
          { code: "mk-301", name: "Southwest", noFlag: true },
          { code: "mk-401", name: "Southeast", noFlag: true },
          { code: "mk-501", name: "Pelagonia", noFlag: true },
          { code: "mk-601", name: "Polog", noFlag: true },
          { code: "mk-701", name: "Northeast", noFlag: true },
          { code: "mk-801", name: "Skopje", noFlag: true },
        ],
      },

      // ── Montenegro (25 municipalities) — listed as regions ───────────────
      {
        code: "ME", name: "Montenegro", emoji: "🇲🇪", subTitle: "25 Municipalities", locked: false,
        subRegions: [
          { code: "me-01", name: "Andrijevica", flagUrl: wiki("Flag of Andrijevica.gif") },
          { code: "me-02", name: "Bar", flagUrl: wiki("Flag of Bar, Montenegro.svg") },
          { code: "me-03", name: "Berane", flagUrl: wiki("Flag of Berane.png") },
          { code: "me-04", name: "Bijelo Polje", flagUrl: wiki("Flag of Bijelo Polje.png") },
          { code: "me-05", name: "Budva", flagUrl: wiki("Flag of Budva, Montenegro.svg") },
          { code: "me-06", name: "Cetinje", flagUrl: wiki("Flag of Cetinje.svg") },
          { code: "me-07", name: "Danilovgrad", flagUrl: wiki("Flag of Danilovgrad.png") },
          { code: "me-08", name: "Herceg Novi", flagUrl: wiki("Flag of Herceg Novi, Montenegro.svg") },
          { code: "me-09", name: "Kolašin", flagUrl: wiki("Flag of Kolašin, Montenegro.png") },
          { code: "me-10", name: "Kotor", flagUrl: wiki("Flag of Kotor, Montenegro.jpg") },
          { code: "me-11", name: "Mojkovac", flagUrl: wiki("Flag of Mojkovac.png") },
          { code: "me-12", name: "Nikšić", flagUrl: wiki("Flag of Nikšić.gif") },
          { code: "me-13", name: "Plav", flagUrl: wiki("Flag of Plav.gif") },
          { code: "me-14", name: "Pljevlja", flagUrl: wiki("Flag of Pljevlja.gif") },
          { code: "me-15", name: "Plužine", flagUrl: wiki("Flag of Plužine, Montenegro.svg") },
          { code: "me-16", name: "Podgorica", flagUrl: wiki("Flag of Podgorica, Montenegro.svg") },
          { code: "me-17", name: "Rožaje", flagUrl: wiki("Flag of Rozaje.svg") },
          { code: "me-18", name: "Šavnik", flagUrl: wiki("Flag of Šavnik, Montenegro.svg") },
          { code: "me-19", name: "Tivat", flagUrl: wiki("Flag of Tivat.svg") },
          { code: "me-20", name: "Ulcinj", flagUrl: wiki("Flag of Ulcinj.svg") },
          { code: "me-21", name: "Žabljak" },
          { code: "me-22", name: "Petnjica", flagUrl: wiki("Flag of Petnjica.png") },
          { code: "me-23", name: "Gusinje", flagUrl: wiki("Flag of Gusinje.gif") },
          { code: "me-24", name: "Tuzi", flagUrl: wiki("Flag of Tuzi.svg") },
          { code: "me-25", name: "Zeta" },
        ],
      },

      // ── Slovenia (12 statistical regions) ───────────────────────────────
      {
        code: "SI", name: "Slovenia", emoji: "🇸🇮", subTitle: "12 Regions", locked: false,
        subRegions: [
          { code: "si-01", name: "Pomurska", noFlag: true },
          { code: "si-02", name: "Podravska", noFlag: true },
          { code: "si-03", name: "Koroška", noFlag: true },
          { code: "si-04", name: "Savinjska", noFlag: true },
          { code: "si-05", name: "Zasavska", noFlag: true },
          { code: "si-06", name: "Posavska", noFlag: true },
          { code: "si-07", name: "Southeast Slovenia", noFlag: true },
          { code: "si-08", name: "Primorska-Notranjska", noFlag: true },
          { code: "si-09", name: "Gorenjska", noFlag: true },
          { code: "si-10", name: "Primorsko-Kraška", noFlag: true },
          { code: "si-11", name: "Goriška", noFlag: true },
          { code: "si-12", name: "Obalno-Kraška", noFlag: true },
        ],
      },

      // ── Ukraine (25 oblasts + Kyiv city) ────────────────────────────────
      {
        code: "UA", name: "Ukraine", emoji: "🇺🇦", subTitle: "27 Oblasts", locked: false,
        subRegions: [
          { code: "ua-05", name: "Vinnytsia",   flagUrl: wiki("Flag of Vinnytsia Oblast.svg") },
          { code: "ua-07", name: "Volyn",       flagUrl: wiki("Flag of Volyn Oblast.svg") },
          { code: "ua-09", name: "Luhansk",     flagUrl: wiki("Flag of Luhansk Oblast.svg") },
          { code: "ua-12", name: "Dnipropetrovsk",flagUrl: wiki("Flag of Dnipropetrovsk Oblast.svg") },
          { code: "ua-14", name: "Donetsk",     flagUrl: wiki("Flag of Donetsk Oblast.svg") },
          { code: "ua-18", name: "Zhytomyr",    flagUrl: wiki("Flag of Zhytomyr Oblast.svg") },
          { code: "ua-21", name: "Zakarpattia", flagUrl: wiki("Flag of Transcarpathian Oblast.svg") },
          { code: "ua-23", name: "Zaporizhzhia",flagUrl: wiki("Flag of Zaporizhia Oblast.svg") },
          { code: "ua-26", name: "Ivano-Frankivsk",flagUrl: wiki("Flag of Ivano-Frankivsk Oblast.svg") },
          { code: "ua-30", name: "Kyiv City",   flagUrl: wiki("Flag of Kyiv Kurovskyi.svg") },
          { code: "ua-32", name: "Kyiv Oblast", flagUrl: wiki("Flag of Kyiv Oblast.svg") },
          { code: "ua-35", name: "Kirovohrad",  flagUrl: wiki("Flag of Kirovohrad Oblast.svg") },
          { code: "ua-40", name: "Sevastopol",  flagUrl: wiki("Flag of Sevastopol.svg") },
          { code: "ua-43", name: "Crimea",      flagUrl: wiki("Flag of Crimea.svg") },
          { code: "ua-46", name: "Lviv",        flagUrl: wiki("Flag of Lviv Oblast.svg") },
          { code: "ua-48", name: "Mykolaiv",    flagUrl: wiki("Flag of Mykolaiv Oblast (2026).svg") },
          { code: "ua-51", name: "Odessa",      flagUrl: wiki("Flag of Odesa Oblast.svg") },
          { code: "ua-53", name: "Poltava",     flagUrl: wiki("Flag of Poltava Oblast.svg") },
          { code: "ua-56", name: "Rivne",       flagUrl: wiki("Flag of Rivne Oblast.svg") },
          { code: "ua-59", name: "Sumy",        flagUrl: wiki("Flag of Sumy Oblast.svg") },
          { code: "ua-61", name: "Ternopil",    flagUrl: wiki("Flag of Ternopil Oblast.svg") },
          { code: "ua-63", name: "Kharkiv",     flagUrl: wiki("Flag of Kharkiv Oblast.svg") },
          { code: "ua-65", name: "Kherson",     flagUrl: wiki("Flag of Kherson Oblast.svg") },
          { code: "ua-68", name: "Khmelnytskyi",flagUrl: wiki("Flag of Khmelnytskyi Oblast.svg") },
          { code: "ua-71", name: "Cherkasy",    flagUrl: wiki("Flag of Cherkasy Oblast.svg") },
          { code: "ua-74", name: "Chernihiv",   flagUrl: wiki("Flag of Chernihiv Oblast.svg") },
          { code: "ua-77", name: "Chernivtsi",  flagUrl: wiki("Flag of Chernivtsi Oblast.svg") },
        ],
      },

      // ── Belarus (6 oblasts + Minsk city) ────────────────────────────────
      {
        code: "BY", name: "Belarus", emoji: "🇧🇾", subTitle: "7 Oblasts", locked: false,
        subRegions: [
          { code: "by-br", name: "Brest",       flagUrl: wiki("Flag of Brest Voblast, Belarus.svg") },
          { code: "by-ho", name: "Homiel",      flagUrl: wiki("Flag of Homyel Voblast.svg") },
          { code: "by-hr", name: "Hrodna",      flagUrl: wiki("Flag of Hrodna Voblasts.svg") },
          { code: "by-ma", name: "Mahilyow",    flagUrl: wiki("Flag of Mahilyow Voblast.svg") },
          { code: "by-mi", name: "Minsk City",  flagUrl: wiki("Flag of Minsk, Belarus.svg") },
          { code: "by-mo", name: "Minsk Oblast",flagUrl: wiki("Flag of Minsk Voblast.svg") },
          { code: "by-vi", name: "Vitsebsk",    flagUrl: wiki("Flag of Vitsebsk region.svg") },
        ],
      },

      // ── Moldova (32 districts + municipalities) ──────────────────────────
      {
        code: "MD", name: "Moldova", emoji: "🇲🇩", subTitle: "35 Districts", locked: false,
        subRegions: [
          { code: "md-an", name: "Anenii Noi",   flagUrl: wiki("Flag of Anenii Noi District.gif") },
          { code: "md-bs", name: "Basarabeasca", flagUrl: wiki("Flag of Basarabeasca District.png") },
          { code: "md-br", name: "Briceni",      flagUrl: wiki("Flag of Briceni.svg") },
          { code: "md-ca", name: "Cahul",        flagUrl: wiki("Flag of District Cahul.svg") },
          { code: "md-ct", name: "Cantemir",     flagUrl: wiki("Flag of Cantemir District.gif") },
          { code: "md-cl", name: "Călărași",     flagUrl: wiki("Rajon Calarasi flag.gif") },
          { code: "md-cs", name: "Căușeni",      flagUrl: wiki("Flag of Căușeni District.jpg") },
          { code: "md-cm", name: "Cimișlia",     flagUrl: wiki("Cimislia flag.png") },
          { code: "md-cr", name: "Criuleni",     flagUrl: wiki("Drapel Raionul Criuleni.gif") },
          { code: "md-do", name: "Dondușeni",    flagUrl: wiki("Flag of Dondușeni District.gif") },
          { code: "md-dr", name: "Drochia",      flagUrl: wiki("Drochia rajon flag.png") },
          { code: "md-du", name: "Dubăsari",     flagUrl: wiki("Dubăsari District flag.svg") },
          { code: "md-ed", name: "Edineț",       flagUrl: wiki("Steag raionul edinet.svg") },
          { code: "md-fa", name: "Fălești",      flagUrl: wiki("Rajon Fălești Flag.gif") },
          { code: "md-fl", name: "Florești",     flagUrl: wiki("Flag of Florești District.gif") },
          { code: "md-gl", name: "Glodeni",      flagUrl: wiki("Flag of Glodeni District.gif") },
          { code: "md-hi", name: "Hîncești",     flagUrl: wiki("Hincesti rajon flag.gif") },
          { code: "md-ia", name: "Ialoveni",     flagUrl: wiki("Flag of Ialoveni District.gif") },
          { code: "md-le", name: "Leova",        flagUrl: wiki("Leova rajon flag.png") },
          { code: "md-ni", name: "Nisporeni",    flagUrl: wiki("Nisporeni rajon flag.gif") },
          { code: "md-oc", name: "Ocnița",       flagUrl: wiki("Ocnitar.gif") },
          { code: "md-or", name: "Orhei",        flagUrl: wiki("Orhei2.gif") },
          { code: "md-re", name: "Rezina",       flagUrl: wiki("Flag of District Rezina.svg") },
          { code: "md-ri", name: "Rîșcani",      flagUrl: wiki("Riscani rajon flag.gif") },
          { code: "md-si", name: "Sîngerei",     flagUrl: wiki("Singerei rajon flag.gif") },
          { code: "md-so", name: "Soroca",       flagUrl: wiki("Flag of District Soroca.svg") },
          { code: "md-st", name: "Strășeni",     flagUrl: wiki("Straseni rajon flag.gif") },
          { code: "md-sd", name: "Șoldănești",   flagUrl: wiki("Soldanesti rajon flag.gif") },
          { code: "md-sv", name: "Ștefan Vodă",  flagUrl: wiki("Stefan voda rajon flag.gif") },
          { code: "md-ta", name: "Taraclia",     flagUrl: wiki("Flag of Taraclia County.gif") },
          { code: "md-te", name: "Telenești",    flagUrl: wiki("TELENESTI DRAP.jpg") },
          { code: "md-un", name: "Ungheni",      flagUrl: wiki("Flag of District Ungheni.svg") },
          // Municipalities
          { code: "md-ch", name: "Chișinău", flagUrl: wiki("Flag of Chișinău.svg") },
          { code: "md-ba", name: "Bălți", flagUrl: wiki("Flag of Bălți.png") },
          // Autonomous regions
          { code: "md-ga", name: "Gagauzia",     flagUrl: wiki("Flag of Gagauzia.svg") },
        ],
      },

      // ── Andorra (7 parishes) ─────────────────────────────────────────────
      {
        code: "AD", name: "Andorra", emoji: "🇦🇩", subTitle: "7 Parishes", locked: false,
        subRegions: [
          { code: "ad-02", name: "Canillo",              flagUrl: wiki("Hypothetical flag of Canillo.svg") },
          { code: "ad-03", name: "Encamp",               flagUrl: wiki("Hypothetical flag of Encamp.svg") },
          { code: "ad-04", name: "La Massana",           flagUrl: wiki("Hypothetical flag of La Massana.svg") },
          { code: "ad-05", name: "Ordino",               flagUrl: wiki("Hypothetical flag of Ordino.svg") },
          { code: "ad-06", name: "Sant Julià de Lòria",  flagUrl: wiki("Hypothetical flag of San Julián de Loria.svg") },
          { code: "ad-07", name: "Andorra la Vella",     flagUrl: wiki("Flag of Andorra la Vella.svg") },
          { code: "ad-08", name: "Escaldes-Engordany",   flagUrl: wiki("Hypothetical flag of Escaldes-Engordany.svg") },
        ],
      },

      // ── Cyprus (6 districts) ─────────────────────────────────────────────
      {
        code: "CY", name: "Cyprus", emoji: "🇨🇾", subTitle: "6 Districts", locked: false,
        subRegions: [
          { code: "cy-01", name: "Nicosia", noFlag: true },
          { code: "cy-02", name: "Limassol", noFlag: true },
          { code: "cy-03", name: "Larnaca", noFlag: true },
          { code: "cy-04", name: "Famagusta", noFlag: true },
          { code: "cy-05", name: "Paphos", noFlag: true },
          { code: "cy-06", name: "Kyrenia", noFlag: true },
        ],
      },

      // ── Iceland (8 regions) ──────────────────────────────────────────────
      {
        code: "IS", name: "Iceland", emoji: "🇮🇸", subTitle: "8 Regions", locked: false,
        subRegions: [
          { code: "is-1", name: "Capital Region", noFlag: true },
          { code: "is-2", name: "Southern Peninsula", noFlag: true },
          { code: "is-3", name: "West", noFlag: true },
          { code: "is-4", name: "Westfjords", noFlag: true },
          { code: "is-5", name: "Northwest", noFlag: true },
          { code: "is-6", name: "Northeast", noFlag: true },
          { code: "is-7", name: "East", noFlag: true },
          { code: "is-8", name: "South", noFlag: true },
        ],
      },

      // ── Kosovo (7 districts) ─────────────────────────────────────────────
      {
        code: "XK", name: "Kosovo", emoji: "🇽🇰", subTitle: "7 Districts", locked: false,
        subRegions: [
          // Kosovo's districts have no flags (only municipalities can); the two verified
          // namesake municipality flags are shown, the rest are name-only.
          { code: "xk-pr", name: "Pristina",  flagUrl: wiki("Prishtina-flag.svg") },
          { code: "xk-pe", name: "Peja", flagUrl: wiki("Flag of Peja.png") },       // no district flag
          { code: "xk-gj", name: "Gjakova",   flagUrl: wiki("Flag of Gjakova.svg") },
          { code: "xk-mi", name: "Mitrovica", flagUrl: wiki("Flag of Mitrovica.png") },  // no district flag
          { code: "xk-pz", name: "Prizren", flagUrl: wiki("Flag of Prizren.png") },    // no district flag (only a municipal emblem)
          { code: "xk-fe", name: "Ferizaj", flagUrl: wiki("Flag of Ferizaj.png") },    // no district flag (only a municipal emblem)
          { code: "xk-gi", name: "Gjilan", flagUrl: wiki("Flag of Gjilan.png") },     // no district flag (only a municipal emblem)
        ],
      },

      // ── Liechtenstein (11 communes) ──────────────────────────────────────
      {
        code: "LI", name: "Liechtenstein", emoji: "🇱🇮", subTitle: "11 Communes", locked: false,
        subRegions: [
          { code: "li-01", name: "Balzers",       flagUrl: wiki("Flag of Balzers Liechtenstein-1.svg") },
          { code: "li-02", name: "Eschen",        flagUrl: wiki("Flag of Eschen Liechtenstein-1.svg") },
          { code: "li-03", name: "Gamprin",       flagUrl: wiki("Flag of Gamprin Liechtenstein-1.svg") },
          { code: "li-04", name: "Mauren",        flagUrl: wiki("Flag of Mauren Liechtenstein-1.svg") },
          { code: "li-05", name: "Planken",       flagUrl: wiki("Flag of Planken Liechtenstein-1.svg") },
          { code: "li-06", name: "Ruggell",       flagUrl: wiki("Flag of Ruggell Liechtenstein-1.svg") },
          { code: "li-07", name: "Schaan",        flagUrl: wiki("Flag of Schaan Liechtenstein-1.svg") },
          { code: "li-08", name: "Schellenberg",  flagUrl: wiki("Flag of Schellenberg Liechtenstein-1.svg") },
          { code: "li-09", name: "Triesen",       flagUrl: wiki("Flag of Triesen Liechtenstein-1.svg") },
          { code: "li-10", name: "Triesenberg",   flagUrl: wiki("Flag of Triesenberg Liechtenstein-1.svg") },
          { code: "li-11", name: "Vaduz",         flagUrl: wiki("Flag of Vaduz Liechtenstein-1.svg") },
        ],
      },

      // ── Luxembourg (12 cantons) ──────────────────────────────────────────
      {
        code: "LU", name: "Luxembourg", emoji: "🇱🇺", subTitle: "12 Cantons", locked: false,
        subRegions: [
          { code: "lu-ca", name: "Capellen", noFlag: true },
          { code: "lu-cl", name: "Clervaux", noFlag: true },
          { code: "lu-di", name: "Diekirch", noFlag: true },
          { code: "lu-ec", name: "Echternach", noFlag: true },
          { code: "lu-es", name: "Esch-sur-Alzette", noFlag: true },
          { code: "lu-gr", name: "Grevenmacher", noFlag: true },
          { code: "lu-lu", name: "Luxembourg", noFlag: true },
          { code: "lu-me", name: "Mersch", noFlag: true },
          { code: "lu-rd", name: "Redange", noFlag: true },
          { code: "lu-rm", name: "Remich", noFlag: true },
          { code: "lu-vd", name: "Vianden", noFlag: true },
          { code: "lu-wi", name: "Wiltz", noFlag: true },
        ],
      },

      // ── Malta (5 regions) ────────────────────────────────────────────────
      {
        code: "MT", name: "Malta", emoji: "🇲🇹", subTitle: "5 Regions", locked: false,
        subRegions: [
          { code: "mt-01", name: "Gozo & Comino", flagUrl: wiki("Flag of Gozo.svg") },
          { code: "mt-02", name: "Northern", flagUrl: wiki("Flag of Northern Region, Malta.svg") },
          { code: "mt-03", name: "Northern Harbour", flagUrl: wiki("Flag of Central Region, Malta.svg") },
          { code: "mt-04", name: "South Eastern", flagUrl: wiki("Flag of Southeastern Region, Malta.svg") },
          { code: "mt-05", name: "Southern Harbour", flagUrl: wiki("Flag of Southern Region, Malta.svg") },
        ],
      },

      // ── Monaco (4 quarters) ──────────────────────────────────────────────
      {
        code: "MC", name: "Monaco", emoji: "🇲🇨", subTitle: "4 Quarters", locked: false,
        subRegions: [
          { code: "mc-cl", name: "La Colle", noFlag: true },
          { code: "mc-co", name: "La Condamine", noFlag: true },
          { code: "mc-fo", name: "Fontvieille", noFlag: true },
          { code: "mc-mc", name: "Monaco-Ville", noFlag: true },
        ],
      },

      // ── San Marino (9 municipalities) ────────────────────────────────────
      {
        code: "SM", name: "San Marino", emoji: "🇸🇲", subTitle: "9 Municipalities", locked: false,
        subRegions: [
          { code: "sm-01", name: "Acquaviva",      flagUrl: wiki("Acquaviva (RSM)-Bandiera.svg") },
          { code: "sm-02", name: "Borgo Maggiore", flagUrl: wiki("Borgo Maggiore (RSM)-Bandiera.svg") },
          { code: "sm-03", name: "Chiesanuova",    flagUrl: wiki("Chiesanuova (RSM)-Bandiera.svg") },
          { code: "sm-04", name: "Domagnano",      flagUrl: wiki("Domagnano (RSM)-Bandiera.svg") },
          { code: "sm-05", name: "Faetano",        flagUrl: wiki("Faetano (RSM)-Bandiera.svg") },
          { code: "sm-06", name: "Fiorentino",     flagUrl: wiki("Fiorentino (RSM)-Bandiera.svg") },
          { code: "sm-07", name: "Montegiardino",  flagUrl: wiki("Montegiardino (RSM)-Bandiera.svg") },
          { code: "sm-08", name: "San Marino",     flagUrl: wiki("San Marino (RSM)-Bandiera.svg") },
          { code: "sm-09", name: "Serravalle",     flagUrl: wiki("Serravalle (RSM)-Bandiera.svg") },
        ],
      },

      // ── Russia (85 federal subjects) ────────────────────────────────────
      {
        code: "RU", name: "Russia", emoji: "🇷🇺", subTitle: "85 Federal Subjects", locked: false,
        subRegions: [
          // Republics
          { code: "ru-ad",  name: "Adygea",                  flagUrl: wiki("Flag of Adygea.svg"),                         group: "Republics" },
          { code: "ru-al",  name: "Altai Republic",           flagUrl: wiki("Flag of Altai Republic.svg"),                  group: "Republics" },
          { code: "ru-ba",  name: "Bashkortostan",            flagUrl: wiki("Flag of Bashkortostan.svg"),                   group: "Republics" },
          { code: "ru-bu",  name: "Buryatia",                 flagUrl: wiki("Flag of Buryatia.svg"),                        group: "Republics" },
          { code: "ru-ce",  name: "Chechnya",                 flagUrl: wiki("Flag of the Chechen Republic.svg"),            group: "Republics" },
          { code: "ru-cu",  name: "Chuvashia",                flagUrl: wiki("Flag of Chuvashia.svg"),                       group: "Republics" },
          // Crimea: annexed from Ukraine in 2014; included here to match Russia's own
          // "85 federal subjects" count (which also adds the federal city of Sevastopol).
          { code: "ru-cr",  name: "Crimea",                   flagUrl: wiki("Flag of Crimea.svg"),                          group: "Republics" },
          { code: "ru-da",  name: "Dagestan",                 flagUrl: wiki("Flag of Dagestan.svg"),                        group: "Republics" },
          { code: "ru-in",  name: "Ingushetia",               flagUrl: wiki("Flag of Ingushetia.svg"),                      group: "Republics" },
          { code: "ru-kb",  name: "Kabardino-Balkaria",       flagUrl: wiki("Flag of Kabardino-Balkaria.svg"),              group: "Republics" },
          { code: "ru-kl",  name: "Kalmykia",                 flagUrl: wiki("Flag of Kalmykia.svg"),                        group: "Republics" },
          { code: "ru-kc",  name: "Karachay-Cherkessia",      flagUrl: wiki("Flag of Karachay-Cherkessia.svg"),             group: "Republics" },
          { code: "ru-kr",  name: "Karelia",                  flagUrl: wiki("Flag of Karelia.svg"),                         group: "Republics" },
          { code: "ru-kk",  name: "Khakassia",                flagUrl: wiki("Flag of Khakassia.svg"),                       group: "Republics" },
          { code: "ru-ko",  name: "Komi",                     flagUrl: wiki("Flag of Komi.svg"),                            group: "Republics" },
          { code: "ru-me",  name: "Mari El",                  flagUrl: wiki("Flag of Mari El.svg"),                         group: "Republics" },
          { code: "ru-mo",  name: "Mordovia",                 flagUrl: wiki("Flag of Mordovia.svg"),                        group: "Republics" },
          { code: "ru-se",  name: "North Ossetia",            flagUrl: wiki("Flag of North Ossetia.svg"),                   group: "Republics" },
          { code: "ru-sa",  name: "Sakha (Yakutia)",          flagUrl: wiki("Flag of Sakha.svg"),                           group: "Republics" },
          { code: "ru-ta",  name: "Tatarstan",                flagUrl: wiki("Flag of Tatarstan.svg"),                       group: "Republics" },
          { code: "ru-ty",  name: "Tuva",                     flagUrl: wiki("Flag of Tuva.svg"),                            group: "Republics" },
          { code: "ru-ud",  name: "Udmurtia",                 flagUrl: wiki("Flag of Udmurtia.svg"),                        group: "Republics" },
          // Krais
          { code: "ru-alt", name: "Altai Krai",               flagUrl: wiki("Flag of Altai Krai.svg"),                      group: "Krais" },
          { code: "ru-kam", name: "Kamchatka Krai",           flagUrl: wiki("Flag of Kamchatka Krai.svg"),                  group: "Krais" },
          { code: "ru-kha", name: "Khabarovsk Krai",          flagUrl: wiki("Flag of Khabarovsk Krai.svg"),                 group: "Krais" },
          { code: "ru-kda", name: "Krasnodar Krai",           flagUrl: wiki("Flag of Krasnodar Krai.svg"),                  group: "Krais" },
          { code: "ru-kya", name: "Krasnoyarsk Krai",         flagUrl: wiki("Flag of Krasnoyarsk Krai.svg"),                group: "Krais" },
          { code: "ru-per", name: "Perm Krai",                flagUrl: wiki("Flag of Perm Krai.svg"),                       group: "Krais" },
          { code: "ru-pri", name: "Primorsky Krai",           flagUrl: wiki("Flag of Primorsky Krai.svg"),                  group: "Krais" },
          { code: "ru-sta", name: "Stavropol Krai",           flagUrl: wiki("Flag of Stavropol Krai.svg"),                  group: "Krais" },
          { code: "ru-zab", name: "Zabaykalsky Krai",         flagUrl: wiki("Flag of Zabaykalsky Krai.svg"),                group: "Krais" },
          // Federal Cities
          { code: "ru-mow", name: "Moscow",                   flagUrl: wiki("Flag of Moscow, Russia.svg"),                  group: "Federal Cities" },
          { code: "ru-spb", name: "Saint Petersburg",         flagUrl: wiki("Flag of Saint Petersburg.svg"),                group: "Federal Cities" },
          { code: "ru-sev", name: "Sevastopol",               flagUrl: wiki("Flag of Sevastopol.svg"),                      group: "Federal Cities" },
          // Oblasts
          { code: "ru-amu", name: "Amur Oblast",              flagUrl: wiki("Flag of Amur Oblast.svg"),                     group: "Oblasts" },
          { code: "ru-ark", name: "Arkhangelsk Oblast",       flagUrl: wiki("Flag of Arkhangelsk Oblast.svg"),              group: "Oblasts" },
          { code: "ru-ast", name: "Astrakhan Oblast",         flagUrl: wiki("Flag of Astrakhan Oblast.svg"),                group: "Oblasts" },
          { code: "ru-bel", name: "Belgorod Oblast",          flagUrl: wiki("Flag of Belgorod Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-bry", name: "Bryansk Oblast",           flagUrl: wiki("Flag of Bryansk Oblast.svg"),                  group: "Oblasts" },
          { code: "ru-che", name: "Chelyabinsk Oblast",       flagUrl: wiki("Flag of Chelyabinsk Oblast.svg"),              group: "Oblasts" },
          { code: "ru-irk", name: "Irkutsk Oblast",           flagUrl: wiki("Flag of Irkutsk Oblast.svg"),                  group: "Oblasts" },
          { code: "ru-iva", name: "Ivanovo Oblast",           flagUrl: wiki("Flag of Ivanovo Oblast.svg"),                  group: "Oblasts" },
          { code: "ru-kal", name: "Kaliningrad Oblast",       flagUrl: wiki("Flag of Kaliningrad Oblast.svg"),              group: "Oblasts" },
          { code: "ru-klu", name: "Kaluga Oblast",            flagUrl: wiki("Flag of Kaluga Oblast.svg"),                   group: "Oblasts" },
          { code: "ru-kem", name: "Kemerovo Oblast",          flagUrl: wiki("Flag of Kemerovo Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-kir", name: "Kirov Oblast",             flagUrl: wiki("Flag of Kirov Oblast.svg"),                    group: "Oblasts" },
          { code: "ru-kos", name: "Kostroma Oblast",          flagUrl: wiki("Flag of Kostroma Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-kgn", name: "Kurgan Oblast",            flagUrl: wiki("Flag of Kurgan Oblast.svg"),                   group: "Oblasts" },
          { code: "ru-krs", name: "Kursk Oblast",             flagUrl: wiki("Flag of Kursk Oblast.svg"),                    group: "Oblasts" },
          { code: "ru-len", name: "Leningrad Oblast",         flagUrl: wiki("Flag of Leningrad Oblast.svg"),                group: "Oblasts" },
          { code: "ru-lip", name: "Lipetsk Oblast",           flagUrl: wiki("Flag of Lipetsk Oblast.svg"),                  group: "Oblasts" },
          { code: "ru-mag", name: "Magadan Oblast",           flagUrl: wiki("Flag of Magadan Oblast.svg"),                  group: "Oblasts" },
          { code: "ru-mos", name: "Moscow Oblast",            flagUrl: wiki("Flag of Moscow oblast.svg"),                   group: "Oblasts" },
          { code: "ru-mur", name: "Murmansk Oblast",          flagUrl: wiki("Flag of Murmansk Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-niz", name: "Nizhny Novgorod Oblast",   flagUrl: wiki("Flag of Nizhny Novgorod Region.svg"),          group: "Oblasts" },
          { code: "ru-nov", name: "Novgorod Oblast",          flagUrl: wiki("Flag of Novgorod Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-nsk", name: "Novosibirsk Oblast",       flagUrl: wiki("Flag of Novosibirsk Oblast.svg"),              group: "Oblasts" },
          { code: "ru-oms", name: "Omsk Oblast",              flagUrl: wiki("Flag of Omsk Oblast.svg"),                     group: "Oblasts" },
          { code: "ru-ore", name: "Orenburg Oblast",          flagUrl: wiki("Flag of Orenburg Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-orl", name: "Oryol Oblast",             flagUrl: wiki("Flag of Oryol Oblast.svg"),                    group: "Oblasts" },
          { code: "ru-pnz", name: "Penza Oblast",             flagUrl: wiki("Flag of Penza Oblast.svg"),                    group: "Oblasts" },
          { code: "ru-psk", name: "Pskov Oblast",             flagUrl: wiki("Flag of Pskov Oblast.svg"),                    group: "Oblasts" },
          { code: "ru-ros", name: "Rostov Oblast",            flagUrl: wiki("Flag of Rostov Oblast.svg"),                   group: "Oblasts" },
          { code: "ru-rya", name: "Ryazan Oblast",            flagUrl: wiki("Flag of Ryazan Oblast.svg"),                   group: "Oblasts" },
          { code: "ru-sak", name: "Sakhalin Oblast",          flagUrl: wiki("Flag of Sakhalin Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-sam", name: "Samara Oblast",            flagUrl: wiki("Flag of Samara Oblast.svg"),                   group: "Oblasts" },
          { code: "ru-sar", name: "Saratov Oblast",           flagUrl: wiki("Flag of Saratov Oblast.svg"),                  group: "Oblasts" },
          { code: "ru-smo", name: "Smolensk Oblast",          flagUrl: wiki("Flag of Smolensk Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-sve", name: "Sverdlovsk Oblast",        flagUrl: wiki("Flag of Sverdlovsk Oblast.svg"),               group: "Oblasts" },
          { code: "ru-tam", name: "Tambov Oblast",            flagUrl: wiki("Flag of Tambov Oblast.svg"),                   group: "Oblasts" },
          { code: "ru-tom", name: "Tomsk Oblast",             flagUrl: wiki("Flag of Tomsk Oblast.svg"),                    group: "Oblasts" },
          { code: "ru-tul", name: "Tula Oblast",              flagUrl: wiki("Flag of Tula Oblast.svg"),                     group: "Oblasts" },
          { code: "ru-tve", name: "Tver Oblast",              flagUrl: wiki("Flag of Tver Oblast.svg"),                     group: "Oblasts" },
          { code: "ru-tyu", name: "Tyumen Oblast",            flagUrl: wiki("Flag of Tyumen Oblast.svg"),                   group: "Oblasts" },
          { code: "ru-uln", name: "Ulyanovsk Oblast",         flagUrl: wiki("Flag of Ulyanovsk Oblast.svg"),                group: "Oblasts" },
          { code: "ru-vla", name: "Vladimir Oblast",          flagUrl: wiki("Flag of Vladimir Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-vgg", name: "Volgograd Oblast",         flagUrl: wiki("Flag of Volgograd Oblast.svg"),                group: "Oblasts" },
          { code: "ru-vlg", name: "Vologda Oblast",           flagUrl: wiki("Flag of Vologda oblast.svg"),                  group: "Oblasts" },
          { code: "ru-vor", name: "Voronezh Oblast",          flagUrl: wiki("Flag of Voronezh Oblast.svg"),                 group: "Oblasts" },
          { code: "ru-yar", name: "Yaroslavl Oblast",         flagUrl: wiki("Flag of Yaroslavl Oblast.svg"),                group: "Oblasts" },
          // Autonomous Oblast & Okrugs
          { code: "ru-yev", name: "Jewish Autonomous Oblast", flagUrl: wiki("Flag of the Jewish Autonomous Oblast.svg"),    group: "Autonomous Regions" },
          { code: "ru-chu", name: "Chukotka",                 flagUrl: wiki("Flag of Chukotka.svg"),                        group: "Autonomous Regions" },
          { code: "ru-khn", name: "Khanty-Mansiysk (Yugra)", flagUrl: wiki("Flag of Yugra.svg"),                           group: "Autonomous Regions" },
          { code: "ru-nen", name: "Nenets",                   flagUrl: wiki("Flag of Nenets Autonomous District.svg"),      group: "Autonomous Regions" },
          { code: "ru-yan", name: "Yamalo-Nenets",            flagUrl: wiki("Flag of Yamal-Nenets Autonomous District.svg"), group: "Autonomous Regions" },
        ],
      },

      // ── Vatican City (4 areas) ───────────────────────────────────────────
      {
        code: "VA", name: "Vatican City", emoji: "🇻🇦", subTitle: "4 Areas", locked: false,
        subRegions: [
          { code: "va-vt", name: "Vatican Hill", noFlag: true },
          { code: "va-pa", name: "Papal Gardens", noFlag: true },
          { code: "va-st", name: "St. Peter's", noFlag: true },
          { code: "va-ca", name: "Castel Gandolfo", noFlag: true },
        ],
      },
    ],
  },
]

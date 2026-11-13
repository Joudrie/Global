// Latin-letter spellings for the non-Latin capital names in Capitals Abroad.
//
// Only three standard, deterministic systems, one per language:
//   Russian    BGN/PCGN (1947), without the ’ and ” marks for ь and ъ
//   Ukrainian  the official national system (Cabinet of Ministers, 2010)
//   Greek      ELOT 743 (2001), the system on Greek road signs and passports
// Chinese, Japanese, Korean, Arabic, Hebrew, Hindi, Thai, Georgian and
// Armenian names are only used when Wikidata itself gives a romanisation of
// that exact name (see fetch.mjs); they are never guessed here.

const RU = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}
const RU_VOWELS = new Set('аеёиоуыэюяйъь')

const UK = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i',
  ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', "'": '', '’': '', 'ʼ': '',
}
// At the start of a word these letters are written differently (є → ye, not ie).
const UK_INITIAL = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' }

const isUpper = ch => ch !== ch.toLowerCase()
const cap = (s, upper) => (upper && s ? s[0].toUpperCase() + s.slice(1) : s)
const wordStart = (text, i) => i === 0 || /[\s\-–(]/.test(text[i - 1])

export function romaniseRussian(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], lo = ch.toLowerCase()
    if (!(lo in RU)) { out += ch; continue }
    let r = RU[lo]
    // е is "ye" at the start of a word and after a vowel, й, ъ or ь (Yerevan).
    if (lo === 'е' && (wordStart(text, i) || RU_VOWELS.has(text[i - 1].toLowerCase()))) r = 'ye'
    // ё after ж, ч, ш, щ is just "o".
    if (lo === 'ё' && i > 0 && 'жчшщ'.includes(text[i - 1].toLowerCase())) r = 'o'
    out += cap(r, isUpper(ch))
  }
  return out
}

export function romaniseUkrainian(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], lo = ch.toLowerCase()
    if (!(lo in UK)) { out += ch; continue }
    let r = wordStart(text, i) && UK_INITIAL[lo] ? UK_INITIAL[lo] : UK[lo]
    // "зг" is written "zgh" so it isn't read as "zh".
    if (lo === 'г' && i > 0 && text[i - 1].toLowerCase() === 'з') r = 'gh'
    out += cap(r, isUpper(ch))
  }
  return out
}

const EL = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm',
  ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
}
const EL_PAIRS = { αι: 'ai', ει: 'ei', οι: 'oi', υι: 'yi', ου: 'ou', γγ: 'ng', γκ: 'gk', γξ: 'nx', γχ: 'nch', μπ: 'mp', ντ: 'nt' }
// αυ, ευ, ηυ: "v" before a vowel or voiced consonant, "f" before a voiceless one or at the end.
const EL_U = { α: 'a', ε: 'e', η: 'i' }
const EL_VOICELESS = new Set('θκξπστφχψ')

export function romaniseGreek(text) {
  // Split off accents but remember the dialytika (¨), which stops two vowels
  // from being read as one sound (Ταΐφ is Ta-i-f, not Tai-f).
  const chars = []
  for (const ch of text.normalize('NFD')) {
    if (ch === '\u0308') { if (chars.length) chars[chars.length - 1].diaer = true; continue }
    if (/[\u0300-\u036f]/.test(ch)) continue
    chars.push({ ch, lo: ch.toLowerCase(), diaer: false })
  }
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i], next = chars[i + 1]
    if (!(c.lo in EL)) { out += c.ch; continue }
    const pair = next && !next.diaer ? c.lo + next.lo : ''
    if (pair && EL_U[c.lo] && next.lo === 'υ') {
      const after = chars[i + 2]?.lo
      const f = !after || !(after in EL) || EL_VOICELESS.has(after)
      out += cap(EL_U[c.lo] + (f ? 'f' : 'v'), isUpper(c.ch)); i++; continue
    }
    if (pair && EL_PAIRS[pair]) { out += cap(EL_PAIRS[pair], isUpper(c.ch)); i++; continue }
    out += cap(EL[c.lo], isUpper(c.ch))
  }
  return out
}

export const ROMANISERS = { ru: romaniseRussian, uk: romaniseUkrainian, el: romaniseGreek }

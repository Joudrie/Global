// Latin-letter spellings for the non-Latin city names in Cities Abroad.
//
// One standard, deterministic system per language, so every spelling can be
// checked by rule:
//   Russian     BGN/PCGN (1947), without the ’ and ” marks for ь and ъ
//   Ukrainian   the official national system (Cabinet of Ministers, 2010)
//   Belarusian  BGN/PCGN (1979), without the ’ and ” marks
//   Bulgarian   the Streamlined System (official since 2009)
//   Serbian     Serbian Latin (Gaj's alphabet), letter for letter
//   Macedonian  Macedonian Latin (ǵ, ḱ, dz, lj, nj, dž), letter for letter
//   Greek       ELOT 743 (2001), the system on Greek road signs and passports,
//               but with BGN/PCGN's b, d and g for μπ, ντ and γκ at the start of a
//               word or after a consonant (Μπακού is Bakou, not Mpakou)
//   Georgian    the national system (2002), used on Georgian road signs
//   Armenian    BGN/PCGN (1981), without the ’ marks for aspirated consonants
//   Korean      Revised Romanization (2000), from the Hangul, with its main sound
//               changes across syllables (liaison, nasal and l assimilation)
//   Japanese    modified Hepburn, for names written wholly in katakana; ー
//               lengthens the vowel before it (ウィーン is Wīn)
// Chinese, Arabic, Hebrew, Hindi and Thai have no such rule-based spelling for
// these names, so the game leaves them out.

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
const EL_PAIRS = { αι: 'ai', ει: 'ei', οι: 'oi', υι: 'yi', ου: 'ou', γγ: 'ng', γκ: 'ng', γξ: 'nx', γχ: 'nch', μπ: 'mb', ντ: 'nd' }
// μπ, ντ, γκ say b, d, g at the start of a word or after a consonant.
const EL_HARD = { μπ: 'b', ντ: 'd', γκ: 'g' }
const EL_VOWELS = new Set('αεηιουω')
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
    if (pair && EL_HARD[pair]) {
      const prev = chars[i - 1]?.lo
      const hard = !prev || !(prev in EL) || !EL_VOWELS.has(prev)
      // Final -εντ/-ιντ is English "Saint" (Σεντ Τζονς, Σαιντ Τζόρτζις), so "nt";
      // other final ντ is "d" (Ριάντ, Riad).
      const after = chars[i + 2]?.lo
      const end = !after || !(after in EL)
      const final = pair === 'ντ' && end && (prev === 'ε' || prev === 'ι') ? 'nt' : pair === 'ντ' && end ? 'd' : ''
      out += cap(final || (hard ? EL_HARD[pair] : EL_PAIRS[pair]), isUpper(c.ch)); i++; continue
    }
    if (pair && EL_PAIRS[pair]) { out += cap(EL_PAIRS[pair], isUpper(c.ch)); i++; continue }
    out += cap(EL[c.lo], isUpper(c.ch))
  }
  return out
}


// ── Belarusian (BGN/PCGN) ─────────────────────────────────────────────────
const BE = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', і: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ў: 'w', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', "'": '', '’': '', 'ʼ': '',
}
const BE_AFTER_YE = new Set([...'аеёіоуыэюяйўь', "'", '’', 'ʼ'])
export function romaniseBelarusian(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], lo = ch.toLowerCase()
    if (!(lo in BE)) { out += ch; continue }
    let r = BE[lo]
    // е is "ye" at the start of a word, after a vowel, й, ў, ь or an apostrophe.
    if (lo === 'е' && (wordStart(text, i) || BE_AFTER_YE.has(text[i - 1].toLowerCase()))) r = 'ye'
    out += cap(r, isUpper(ch))
  }
  return out
}

// ── Bulgarian (Streamlined System) ────────────────────────────────────────
const BG = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
}
const wordEnd = (text, i) => i >= text.length - 1 || /[\s\-–)]/.test(text[i + 1])
export function romaniseBulgarian(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], lo = ch.toLowerCase()
    if (!(lo in BG)) { out += ch; continue }
    let r = BG[lo]
    // -ия at the end of a word is "ia" (София is Sofia).
    if (lo === 'я' && wordEnd(text, i) && i > 0 && text[i - 1].toLowerCase() === 'и') r = 'a'
    out += cap(r, isUpper(ch))
  }
  return out
}

// ── Serbian and Macedonian (their Latin alphabets) ────────────────────────
const SR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k',
  л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u',
  ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
}
const MK = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'ǵ', е: 'e', ж: 'ž', з: 'z', ѕ: 'dz', и: 'i', ј: 'j',
  к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'ḱ',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
}
const letterForLetter = table => text => {
  let out = ''
  for (const ch of text) {
    const lo = ch.toLowerCase()
    out += lo in table ? cap(table[lo], isUpper(ch)) : ch
  }
  return out
}
export const romaniseSerbian = letterForLetter(SR)
export const romaniseMacedonian = letterForLetter(MK)

// ── Georgian (national system, 2002) ──────────────────────────────────────
const KA = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k', ლ: 'l', მ: 'm',
  ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u', ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q',
  შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts', ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
}
// Georgian has no capital letters; a name starts with one in Latin.
export function romaniseGeorgian(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    out += ch in KA ? cap(KA[ch], wordStart(text, i)) : ch
  }
  return out
}

// ── Armenian (BGN/PCGN, 1981) ─────────────────────────────────────────────
const HY = {
  ա: 'a', բ: 'b', գ: 'g', դ: 'd', ե: 'e', զ: 'z', է: 'e', ը: 'y', թ: 't', ժ: 'zh', ի: 'i', լ: 'l',
  խ: 'kh', ծ: 'ts', կ: 'k', հ: 'h', ձ: 'dz', ղ: 'gh', ճ: 'ch', մ: 'm', յ: 'y', ն: 'n', շ: 'sh', ո: 'o',
  չ: 'ch', պ: 'p', ջ: 'j', ռ: 'r', ս: 's', վ: 'v', տ: 't', ր: 'r', ց: 'ts', ւ: 'w', փ: 'p', ք: 'k',
  օ: 'o', ֆ: 'f', և: 'ev',
}
const HY_VOWELS = new Set('աեէըիոօւ')
export function romaniseArmenian(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], lo = ch.toLowerCase(), next = text[i + 1]?.toLowerCase()
    if (!(lo in HY)) { out += ch; continue }
    const start = wordStart(text, i), afterVowel = i > 0 && HY_VOWELS.has(text[i - 1].toLowerCase())
    let r = HY[lo]
    if (lo === 'ո' && next === 'ւ') { r = 'u'; i++ }                 // ու is u
    else if (lo === 'ե' && (start || afterVowel)) r = 'ye'           // ե is ye at the start and after a vowel
    else if (lo === 'ո' && start) r = 'vo'                           // ո is vo at the start
    else if (lo === 'և' && (start || afterVowel)) r = 'yev'
    out += cap(r, isUpper(ch))
  }
  return out
}

// ── Korean (Revised Romanization, 2000) ───────────────────────────────────
const KO_INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const KO_VOWEL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
// Final consonants (jongseong) by index: the letters they are made of.
const KO_FINAL = ['', 'ㄱ', 'ㄲ', 'ㄱㅅ', 'ㄴ', 'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄹ', 'ㄹㄱ', 'ㄹㅁ', 'ㄹㅂ', 'ㄹㅅ', 'ㄹㅌ', 'ㄹㅍ', 'ㄹㅎ', 'ㅁ', 'ㅂ', 'ㅂㅅ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const KO_JAMO_INITIAL = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
// A final consonant before another consonant, or at the end of a word: its sound.
const KO_CODA = { ㄱ: 'k', ㄲ: 'k', ㅋ: 'k', ㄴ: 'n', ㄷ: 't', ㅅ: 't', ㅆ: 't', ㅈ: 't', ㅊ: 't', ㅌ: 't', ㅎ: 't', ㄹ: 'l', ㅁ: 'm', ㅂ: 'p', ㅍ: 'p', ㅇ: 'ng' }
// Its sound class, for the nasal and l assimilations.
const KO_CLASS = { ㄱ: 'k', ㄲ: 'k', ㅋ: 'k', ㄷ: 't', ㅅ: 't', ㅆ: 't', ㅈ: 't', ㅊ: 't', ㅌ: 't', ㅎ: 't', ㅂ: 'p', ㅍ: 'p', ㄴ: 'n', ㄹ: 'l', ㅁ: 'm', ㅇ: 'ng' }

export function romaniseKorean(text) {
  return text.split(/([\s\-–·]+)/).map((word, wi) => {
    if (wi % 2) return word.replace(/·/g, ' ')
    // Each syllable block as its initial, vowel and final letters.
    const syl = [...word].map(ch => {
      const code = ch.codePointAt(0) - 0xac00
      if (code < 0 || code > 11171) return { raw: ch }
      return { ini: KO_JAMO_INITIAL[Math.floor(code / 588)], vow: KO_VOWEL[Math.floor((code % 588) / 28)], fin: [...KO_FINAL[code % 28]], ll: false }
    })
    let out = ''
    for (let i = 0; i < syl.length; i++) {
      const s = syl[i]
      const next = syl[i + 1] && !syl[i + 1].raw ? syl[i + 1] : null
      if (s.raw) { out += s.raw; continue }
      out += (s.ll ? 'l' : KO_INITIAL[KO_JAMO_INITIAL.indexOf(s.ini)]) + s.vow
      if (!s.fin.length) continue
      // Liaison: a final before a vowel moves on to start the next syllable
      // (ㅎ falls silent); of a double final only the second letter moves.
      if (next && next.ini === 'ㅇ' && s.fin.at(-1) !== 'ㅇ') {
        if (s.fin.length === 2) out += KO_CODA[s.fin[0]]
        if (s.fin.at(-1) !== 'ㅎ') next.ini = s.fin.at(-1)
        continue
      }
      // A double final before a consonant sounds as one of its letters.
      const last = s.fin.length === 2 ? (['ㄹㄱ', 'ㄹㅁ', 'ㄹㅍ'].includes(s.fin.join('')) ? s.fin[1] : s.fin[0]) : s.fin[0]
      const cls = KO_CLASS[last]
      if (next) {
        // ㅎ before ㄱ, ㄷ, ㅈ makes them aspirated (k, t, ch).
        if (last === 'ㅎ' && 'ㄱㄷㅈ'.includes(next.ini)) { next.ini = { ㄱ: 'ㅋ', ㄷ: 'ㅌ', ㅈ: 'ㅊ' }[next.ini]; continue }
        // ㄹ next to ㄴ or ㄹ is "ll" (Silla, Bereullin); after another consonant ㄹ is n.
        if (next.ini === 'ㄹ' || (next.ini === 'ㄴ' && cls === 'l')) {
          if (cls === 'l' || cls === 'n') { out += 'l'; next.ll = true; continue }
          next.ini = 'ㄴ'
          out += { k: 'ng', t: 'n', p: 'm', m: 'm', ng: 'ng' }[cls]
          continue
        }
        // A stop before ㄴ or ㅁ becomes a nasal (k → ng, t → n, p → m).
        if ((next.ini === 'ㄴ' || next.ini === 'ㅁ') && ['k', 't', 'p'].includes(cls)) { out += { k: 'ng', t: 'n', p: 'm' }[cls]; continue }
      }
      out += KO_CODA[last]
    }
    return out.replace(/^\p{Ll}/u, c => c.toUpperCase())
  }).join('')
}

// ── Japanese katakana (modified Hepburn) ──────────────────────────────────
const KANA = {
  ア: 'a', イ: 'i', ウ: 'u', エ: 'e', オ: 'o', カ: 'ka', キ: 'ki', ク: 'ku', ケ: 'ke', コ: 'ko',
  サ: 'sa', シ: 'shi', ス: 'su', セ: 'se', ソ: 'so', タ: 'ta', チ: 'chi', ツ: 'tsu', テ: 'te', ト: 'to',
  ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no', ハ: 'ha', ヒ: 'hi', フ: 'fu', ヘ: 'he', ホ: 'ho',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo', ヤ: 'ya', ユ: 'yu', ヨ: 'yo',
  ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro', ワ: 'wa', ヰ: 'i', ヱ: 'e', ヲ: 'o', ン: 'n',
  ガ: 'ga', ギ: 'gi', グ: 'gu', ゲ: 'ge', ゴ: 'go', ザ: 'za', ジ: 'ji', ズ: 'zu', ゼ: 'ze', ゾ: 'zo',
  ダ: 'da', ヂ: 'ji', ヅ: 'zu', デ: 'de', ド: 'do', バ: 'ba', ビ: 'bi', ブ: 'bu', ベ: 'be', ボ: 'bo',
  パ: 'pa', ピ: 'pi', プ: 'pu', ペ: 'pe', ポ: 'po', ヴ: 'vu',
  ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o', ャ: 'ya', ュ: 'yu', ョ: 'yo', ヮ: 'wa',
}
// Two-kana sounds: a kana and a small one after it.
const KANA_PAIRS = {
  キャ: 'kya', キュ: 'kyu', キョ: 'kyo', シャ: 'sha', シュ: 'shu', ショ: 'sho', シェ: 'she',
  チャ: 'cha', チュ: 'chu', チョ: 'cho', チェ: 'che', ニャ: 'nya', ニュ: 'nyu', ニョ: 'nyo',
  ヒャ: 'hya', ヒュ: 'hyu', ヒョ: 'hyo', ミャ: 'mya', ミュ: 'myu', ミョ: 'myo', リャ: 'rya', リュ: 'ryu', リョ: 'ryo',
  ギャ: 'gya', ギュ: 'gyu', ギョ: 'gyo', ジャ: 'ja', ジュ: 'ju', ジョ: 'jo', ジェ: 'je', ビャ: 'bya', ビュ: 'byu', ビョ: 'byo',
  ピャ: 'pya', ピュ: 'pyu', ピョ: 'pyo', ティ: 'ti', トゥ: 'tu', ディ: 'di', ドゥ: 'du', デュ: 'dyu', テュ: 'tyu',
  ファ: 'fa', フィ: 'fi', フェ: 'fe', フォ: 'fo', フュ: 'fyu', ウィ: 'wi', ウェ: 'we', ウォ: 'wo',
  ヴァ: 'va', ヴィ: 'vi', ヴェ: 've', ヴォ: 'vo', ヴュ: 'vyu', ツァ: 'tsa', ツィ: 'tsi', ツェ: 'tse', ツォ: 'tso',
  イェ: 'ye', クァ: 'kwa', クィ: 'kwi', クェ: 'kwe', クォ: 'kwo', グァ: 'gwa', スィ: 'si', ズィ: 'zi',
}
const MACRON = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' }
/** True when a name is written wholly in katakana (with ー, ・ and spaces). */
export const isKatakana = text => /^[ァ-ヺー・\s]+$/u.test(text)

export function romaniseJapanese(text) {
  let out = ''
  let double = false
  const chars = [...text]
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i], pair = ch + (chars[i + 1] ?? '')
    if (ch === 'ッ') { double = true; continue }
    if (ch === 'ー') { const v = out.at(-1); if (MACRON[v]) out = out.slice(0, -1) + MACRON[v]; continue }
    if (ch === '・' || /\s/.test(ch)) { out += ' '; continue }
    let r = KANA_PAIRS[pair]
    if (r) i++
    else r = KANA[ch]
    if (r === undefined) { out += ch; continue }
    if (double) { out += r.startsWith('ch') ? 't' : r[0]; double = false }
    // ン before a vowel or y is written n' so it isn't read as na, ni…
    if (ch === 'ン' && /^[aiueoy]/.test(KANA_PAIRS[chars[i + 1] + (chars[i + 2] ?? '')] ?? KANA[chars[i + 1]] ?? '')) r = "n'"
    out += r
  }
  return out.replace(/(^|\s)(\p{Ll})/gu, (_, sp, c) => sp + c.toUpperCase())
}

export const ROMANISERS = {
  ru: romaniseRussian, uk: romaniseUkrainian, be: romaniseBelarusian, bg: romaniseBulgarian,
  sr: romaniseSerbian, mk: romaniseMacedonian, el: romaniseGreek, ka: romaniseGeorgian,
  hy: romaniseArmenian, ko: romaniseKorean, ja: romaniseJapanese,
}

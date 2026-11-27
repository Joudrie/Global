// Demonyms: believable wrong answers made by rule, for when a hand-written
// fake fails verification (it turned out to be a real word for the place).
// They use the real endings English demonyms use (-ian, -ite, -ese, -er, -an,
// -ish, -ine, -ino, -eño) on the place's name, never the answer's own ending,
// and never one slip from the answer. verify.mjs checks each one like a
// hand-written fake and takes the first that passes.

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

const ENDINGS = ['ian', 'ite', 'ese', 'er', 'an', 'ish', 'ine', 'ino', 'eño']

/** Wrong answers for a place, most believable first: its name with each ending
 *  (a final vowel dropped before a vowel ending), leaving out the answer's own
 *  ending, anything in `accepted`, and anything one slip from the answer. */
export function generateFakes(place, answer, accepted = [], also = []) {
  const ownEnding = ENDINGS.filter(e => fold(answer).endsWith(fold(e))).sort((a, b) => b.length - a.length)[0]
  const taken = new Set([answer, ...accepted].map(fold))
  const out = []
  // The place's name as people say it: no "Isle of", "Saint" or "City", no accents.
  const bases = [place, ...also].map(n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(the|isle of|saint|st\.?)\s+/i, '').replace(/\s+(city|upon tyne|islands?)$/i, '').replace(/,.*$/, '').trim())
  for (const name of [...new Set(bases)]) {
    const stem = name.replace(/[aeiouy]+$/i, '')
    for (const e of ENDINGS) {
      if (e === ownEnding) continue
      if ((e === 'ino' || e === 'eño') && !/[oa]$/.test(fold(answer))) continue // Spanish endings only fake a Spanish-looking answer
      const base = /^[aeiouy]/.test(e) && stem.length >= 3 ? stem : name
      const fake = base + e
      const f = fold(fake)
      if (taken.has(f) || distance(f, fold(answer)) <= 1 || out.some(o => fold(o) === f)) continue
      out.push(fake)
    }
  }
  // Closest in length to the answer first: a fake much shorter or longer stands out.
  return out.sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length))
}

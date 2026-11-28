// Coats of arms (Codex, beta): src/data/coatsOfArms.ts and public/arms/, built
// by scripts/arms/fetch.mjs. Every country in scope has a freely licensed,
// credited image on disk or a stated reason for its absence; nothing out of
// scope yet; former arms in order with their files; and the Codex loads all
// of it only when the section opens.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const { COATS_OF_ARMS, ARMS_SKIPPED, ARMS_SCOPE, ARMS_SCOPE_RE } = await src('data/coatsOfArms.ts')
const { FLAGS } = await src('data/flags.ts')
const { CODEX_COUNTS } = await src('data/codexCounts.ts')

const byCode = new Map(FLAGS.map(f => [f.code, f]))
const onDisk = p => fs.existsSync(path.join(ROOT, 'public', p)) && fs.statSync(path.join(ROOT, 'public', p)).size > 0
const FREE = /^(Public domain|CC0|CC BY(-SA)? \d\.\d)$/
const PNG = /^\/arms\/(thumb\/)?[a-z]{2}(-\d+)?\.png$/

function checkCredit(c, where) {
  assert.match(c.licence, FREE, `${where}: licence "${c.licence}" isn't public domain or CC`)
  assert.match(c.commons, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:\S+$/, `${where}: Commons page`)
  assert.equal(typeof c.author, 'string', `${where}: author`)
  if (c.licenceUrl) assert.match(c.licenceUrl, /^https?:\/\//, `${where}: licence link`)
}

test('the scope is every country', () => {
  assert.equal(ARMS_SCOPE, 'A–Z')
  assert.ok(FLAGS.every(f => ARMS_SCOPE_RE.test(f.name)))
})

test('every country in scope has arms with a free, credited image on disk, or a reason', () => {
  const inScope = FLAGS.filter(f => ARMS_SCOPE_RE.test(f.name))
  assert.equal(inScope.length, FLAGS.length, 'every country')
  const has = new Map(COATS_OF_ARMS.map(a => [a.code, a]))
  const skipped = new Map(ARMS_SKIPPED.map(s => [s.code, s.reason]))
  for (const f of inScope) {
    const a = has.get(f.code)
    if (!a) {
      assert.ok(skipped.get(f.code)?.length > 20, `${f.name}: no arms and no reason`)
      continue
    }
    assert.ok(!skipped.has(f.code), `${f.name}: both covered and skipped`)
    assert.match(a.src, PNG, `${f.name}: src`)
    assert.match(a.thumb, PNG, `${f.name}: thumb`)
    assert.ok(onDisk(a.src) && onDisk(a.thumb), `${f.name}: image files missing`)
    // "Coat of arms of Albania"; a few emblems have names of their own ("Blue Sky with a White Sun").
    assert.match(a.name, /^[A-Z][^()]{5,70}$/, `${f.name}: name "${a.name}"`)
    assert.ok(['arms', 'emblem', 'seal', 'crest'].includes(a.kind), `${f.name}: kind`)
    assert.ok(a.ratio > 0.2 && a.ratio < 5, `${f.name}: ratio`)
    if (a.adopted !== undefined) assert.ok(a.adopted >= 1000 && a.adopted <= new Date().getFullYear(), `${f.name}: adopted ${a.adopted}`)
    if (a.description) assert.ok(a.description.length >= 20 && a.description.length <= 360, `${f.name}: description length`)
    checkCredit(a, f.name)
  }
  assert.equal(new Set(COATS_OF_ARMS.map(a => a.code)).size, COATS_OF_ARMS.length, 'one entry per country')
})

test('every entry is a country in the Codex', () => {
  for (const x of [...COATS_OF_ARMS, ...ARMS_SKIPPED]) assert.ok(byCode.get(x.code), `${x.code}: not in flags.ts`)
})

test('no emblems of fascist or Nazi-era regimes', () => {
  const FASCIST = /Nazi|Arrow Cross|Usta[šs]e|Independent State of Croatia|Italian Social Republic|fasces|Francoist|Nedi[ćc]|Quisling|Vichy|Slovak State|Protectorate of Bohemia/i
  for (const a of COATS_OF_ARMS) for (const x of a.former) {
    assert.doesNotMatch(x.name, FASCIST, `${a.code} ${x.name}`)
    assert.doesNotMatch(x.commons, /Hungary_\(1945\)|Croatia_\(1941/, `${a.code} ${x.commons}`)
  }
})

test('former arms run newest first (undated ones last), each with its file and credit', () => {
  let n = 0, undated = 0
  for (const a of COATS_OF_ARMS) {
    let prev = Infinity
    let seenUndated = false
    for (const x of a.former) {
      const where = `${a.code} ${x.name} (${x.from ?? '?'}–${x.to ?? '?'})`
      if (x.from === undefined) {
        // No source dates it: shown as "Date unknown", after the dated ones.
        assert.equal(x.to, undefined, `${where}: an end year without a start`)
        seenUndated = true
        undated++
      } else {
        assert.ok(!seenUndated, `${where}: a dated one after an undated one`)
        assert.ok(Number.isInteger(x.from) && Number.isInteger(x.to) && x.from <= x.to, `${where}: years`)
        assert.ok(x.from <= prev, `${where}: out of order`)
        assert.ok(x.to <= new Date().getFullYear(), `${where}: ends in the future`)
        if (a.adopted) assert.ok(x.from <= a.adopted, `${where}: starts after the current one was adopted (${a.adopted})`)
        prev = x.from
      }
      assert.match(x.src, PNG, `${where}: src`)
      assert.ok(onDisk(x.src), `${where}: file missing`)
      assert.ok(x.name.length > 3 && x.name.length <= 90, `${where}: name`)
      assert.doesNotMatch(x.name, /\d{4}|[,;:]$|\bthe the\b/i, `${where}: name carries dates or loose punctuation`)
      if (x.light !== undefined) assert.equal(x.light, true)
      checkCredit(x, where)
      n++
    }
    assert.ok(a.former.filter(x => x.from === undefined).length <= 4, `${a.code}: at most four undated`)
    assert.equal(new Set(a.former.map(x => x.src)).size, a.former.length, `${a.code}: one file per version`)
  }
  assert.ok(n >= 250, `former arms: ${n}`)
  assert.ok(undated < n / 5, 'mostly dated')
})

test('pale, colourless emblems are flagged for a backing (Afghanistan)', () => {
  assert.equal(COATS_OF_ARMS.find(a => a.code === 'AF')?.light, true)
  assert.equal(COATS_OF_ARMS.find(a => a.code === 'AL')?.light, undefined)
})

test('credits name a person or body, not Commons boilerplate', () => {
  for (const c of COATS_OF_ARMS.flatMap(a => [a, ...a.former])) {
    assert.ok(c.author.length <= 60, `${c.commons}: author too long`)
    assert.doesNotMatch(c.author, /W3C|Legal disclaimer|see file history|\.svg|Unknown Unknown|^[,;:]/i, `${c.commons}: "${c.author}"`)
  }
})

test('every file in public/arms belongs to an entry', () => {
  const used = new Set(COATS_OF_ARMS.flatMap(a => [a.src, a.thumb, ...a.former.map(x => x.src)]))
  const files = fs.readdirSync(path.join(ROOT, 'public/arms'), { recursive: true })
    .filter(f => fs.statSync(path.join(ROOT, 'public/arms', f)).isFile())
    .map(f => `/arms/${f.split(path.sep).join('/')}`)
  assert.deepEqual(files.filter(f => !used.has(f)), [])
})

test('the closed section\'s count matches the data', () => {
  assert.equal(CODEX_COUNTS.arms, COATS_OF_ARMS.length, 'update CODEX_COUNTS.arms in src/data/codexCounts.ts')
})

test('the Codex loads the arms only when the section opens', () => {
  const screen = read('src/components/CodexScreen.tsx')
  // Static imports of the data or the detail would put them in the Codex's first load.
  for (const m of screen.matchAll(/^import\s+(?!type\b)[^\n]*from\s+'([^']+)'/gm)) {
    assert.ok(!/coatsOfArms|CodexArms/.test(m[1]), `CodexScreen imports ${m[1]} eagerly`)
  }
  assert.match(screen, /import\('\.\.\/data\/coatsOfArms'\)/, 'dynamic import of the data')
  assert.match(screen, /lazy\(\(\) => import\('\.\/CodexArms'\)\)/, 'the detail is lazy')
  // The shared history browser stays free of both countries' and arms' data.
  const shared = read('src/components/CodexHistory.tsx')
  for (const m of shared.matchAll(/^import\s+(?!type\b)[^\n]*from\s+'([^']+)'/gm)) {
    assert.ok(!/\/data\//.test(m[1]), `CodexHistory imports ${m[1]}`)
  }
  // The section is hidden while searching, like the other themed sections.
  assert.match(screen, /\{!isSearching && <ArmsCodexSection \/>\}/)
})

test('the Coats of Arms flashcard deck: every country with arms, by region, one line on the back', async () => {
  const { armsDeck, DECK_COUNTS, DECK_REGIONS } = await src('data/codexDecks.ts')
  const groups = armsDeck(COATS_OF_ARMS, FLAGS)
  const cards = groups.flatMap(g => g.cards)
  assert.equal(cards.length, COATS_OF_ARMS.length)
  assert.equal(DECK_COUNTS.arms, cards.length)
  assert.ok(DECK_REGIONS.includes('arms'))
  assert.deepEqual(groups.map(g => g.label), ['Europe', 'Africa', 'Asia', 'Americas', 'Middle East', 'Oceania'])
  for (const c of cards) {
    const a = COATS_OF_ARMS.find(x => `arms-${x.code}` === c.key)
    assert.equal(c.flagUrl, a.src)
    assert.equal(c.subtitle, a.name)
    assert.equal(c.name, byCode.get(a.code).name)
    if (c.note && !a.note) assert.ok(a.description.startsWith(c.note) && c.note.length >= 20, `${c.key}: the description's first sentence`)
  }
  assert.equal(cards.find(c => c.key === 'arms-AF').pale, true)
})

test('the test site rebases /arms/ under its sub-path', () => {
  const ROOTS = read('scripts/test-site.mjs').match(/const ROOTS = '([^']+)'/)[1].split('|')
  assert.ok(ROOTS.includes('arms'))
})

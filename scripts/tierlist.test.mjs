// Tier List Maker: the lists beyond countries that replaced "Other" (every
// flag that was there is in exactly one), and moving a saved "Other" list
// into them.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const TL = await src('utils/tierList.ts')
const { IDENTITY_FLAGS, OTHER_IDENTITY_FLAGS, LGBTQ_FLAGS, SIGNAL_FLAGS } = await src('data/identityFlags.ts')
const { ruleFor } = await src('utils/mergeProgress.ts')

const fakeStore = (init = {}) => {
  const m = new Map(Object.entries(init))
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), dump: () => Object.fromEntries(m) }
}
const P = s => JSON.parse(s)
const listsOf = code => TL.SUBCATEGORIES.filter(s => s.flags.some(f => f.code === code)).map(s => s.id)

test('every flag that was in "Other" is in exactly one list', () => {
  const former = OTHER_IDENTITY_FLAGS.filter(f => f.flagUrl && !f.noFlag)
  assert.ok(former.length > 280, `only ${former.length}`)
  for (const f of former) assert.equal(listsOf(f.id).length, 1, `${f.id} is in ${listsOf(f.id).join(', ') || 'no list'}`)
  // Entries with no flag of their own (a few micronations) were blank tiles; they stay out.
  for (const f of OTHER_IDENTITY_FLAGS.filter(f => f.noFlag || !f.flagUrl)) assert.equal(listsOf(f.id).length, 0, f.id)
})

test('the lists: none empty, none too long, no flag twice, no signal flags', () => {
  assert.deepEqual(TL.SUB_IDS, ['pride', 'separatist', 'regions', 'peoples', 'indigenous', 'micronations', 'orgs', 'movements'])
  const seen = new Set()
  for (const s of TL.SUBCATEGORIES) {
    assert.ok(s.flags.length >= 10, `${s.id} has ${s.flags.length}`)
    assert.ok(s.flags.length <= 120, `${s.id} has ${s.flags.length}`)
    assert.ok(s.label && s.title)
    for (const f of s.flags) {
      assert.ok(!seen.has(f.code), `${f.code} twice`)
      seen.add(f.code)
      assert.ok(f.flagUrl && f.name, f.code)
    }
  }
  for (const f of SIGNAL_FLAGS) assert.ok(!seen.has(f.id), f.id)
  // Pride: every LGBTQ+ flag, which the tier list never had before.
  for (const f of LGBTQ_FLAGS) assert.deepEqual(listsOf(f.id), ['pride'], f.id)
  // Hand placements name real flags, in a list other than their category's default.
  const ids = new Set(IDENTITY_FLAGS.map(f => f.id))
  for (const [id, sub] of Object.entries(TL.HAND_PLACED)) {
    assert.ok(ids.has(id), `no flag ${id}`)
    assert.deepEqual(listsOf(id), [sub], id)
  }
  // A few placements a player would expect.
  for (const [id, sub] of [['tibet', 'separatist'], ['somaliland', 'separatist'], ['wales', 'regions'], ['scotland', 'regions'], ['brittany', 'regions'],
    ['catalonia-senyera', 'regions'], ['nato', 'orgs'], ['united-nations', 'orgs'], ['flag-of-europe', 'orgs'], ['gadsden', 'movements'],
    ['romani', 'peoples'], ['amazigh', 'peoples'], ['aboriginal-au', 'indigenous'], ['sealand', 'micronations'], ['pride-progress', 'pride']]) {
    assert.deepEqual(listsOf(id), [sub], id)
  }
})

test('each list saves under the tier-list prefix, which has a merge rule', () => {
  for (const id of TL.SUB_IDS) {
    const key = TL.tierKey(id)
    assert.ok(key.startsWith('globalio_tierlist_'))
    assert.equal(ruleFor(key)?.rule, 'unionKeepLocal', key)
  }
  assert.equal(TL.OTHER_KEY, 'globalio_tierlist_Other')
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/TierListScreen.tsx'), 'utf8')
  assert.doesNotMatch(screen, /['"]Other['"]/, 'no "Other" chip')
  assert.doesNotMatch(screen, /OTHER_IDENTITY_FLAGS/)
})

test('a saved "Other" list moves into the new lists', () => {
  const store = fakeStore({
    globalio_tierlist_Other: JSON.stringify({
      tibet: 'S', scotland: 'A', nato: 'B', sealand: 'C', romani: 'D', gadsden: 'F', 'disability-pride': 'S',
      melchizedek: 'A',        // a micronation with no flag: dropped
      'gone-flag': 'B',        // not in the data any more: dropped
      maori: 'pool',
    }),
    globalio_tierlist_regions: JSON.stringify({ scotland: 'F', wales: 'S' }), // placed since: kept
    globalio_tierlist_Europe: JSON.stringify({ FR: 'S' }),
  })
  assert.equal(TL.migrateOther(store), true)
  const out = store.dump()
  assert.equal(out.globalio_tierlist_Other, undefined, 'the old list is removed')
  assert.deepEqual(P(out.globalio_tierlist_separatist), { tibet: 'S' })
  assert.deepEqual(P(out.globalio_tierlist_regions), { scotland: 'F', wales: 'S' }, "a flag already placed in its new list keeps that tier")
  assert.deepEqual(P(out.globalio_tierlist_orgs), { nato: 'B' })
  assert.deepEqual(P(out.globalio_tierlist_micronations), { sealand: 'C' })
  assert.deepEqual(P(out.globalio_tierlist_peoples), { romani: 'D' })
  assert.deepEqual(P(out.globalio_tierlist_movements), { gadsden: 'F' })
  assert.deepEqual(P(out.globalio_tierlist_pride), { 'disability-pride': 'S' })
  assert.deepEqual(P(out.globalio_tierlist_indigenous), { maori: 'pool' })
  assert.equal(out.globalio_tierlist_Europe, JSON.stringify({ FR: 'S' }), 'country lists are untouched')
  // Nothing left to move: running again changes nothing.
  const before = store.dump()
  assert.equal(TL.migrateOther(store), false)
  assert.deepEqual(store.dump(), before)
})

test('the move keeps every flag of a full "Other" list, and leaves a broken one alone', () => {
  const all = Object.fromEntries(OTHER_IDENTITY_FLAGS.filter(f => !f.noFlag).map((f, i) => [f.id, 'SABCDF'[i % 6]]))
  const store = fakeStore({ globalio_tierlist_Other: JSON.stringify(all) })
  TL.migrateOther(store)
  const merged = {}
  for (const id of TL.SUB_IDS) Object.assign(merged, P(store.getItem(TL.tierKey(id)) ?? '{}'))
  assert.deepEqual(merged, all)

  const broken = fakeStore({ globalio_tierlist_Other: '{not json' })
  assert.equal(TL.migrateOther(broken), false)
  assert.deepEqual(broken.dump(), { globalio_tierlist_Other: '{not json' })
  assert.equal(TL.migrateOther(fakeStore()), false)
})

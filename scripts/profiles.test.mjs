// Profiles: username and bio rules (and that the database has the same word
// list), the stats summary and achievements worked out from a save, profile
// links, the saved card (drawn on a fake canvas), the account calls against a
// fake Supabase (claim, a taken name, search, a player's profile, private and
// hidden ones, the SQL not run yet), the on/off switch, and the SQL files.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const TX = await src('profile/text.ts')
const W = await src('profile/words.ts')
const ST = await src('profile/stats.ts')
const ACH = await src('profile/achievements.ts')
const { ACHIEVEMENTS } = await src('data/achievements.ts')
const L = await src('profile/local.ts')
const LINK = await src('profile/link.ts')
const CARD = await src('profile/card.ts')
const PUB = await src('profile/public.ts')
const P = await src('account/profiles.ts')
const A = await src('accounts.ts')
const { mergeSnapshots, MAIN_KEY, ruleFor } = await src('utils/mergeProgress.ts')
const { encodeDesign, decodeDesign } = await src('utils/flagStudio.ts')
const { FLAGS } = await src('data/flags.ts')

const S = v => JSON.stringify(v)
const main = (over = {}) => S({
  username: '', learnedFlags: [], learnedSubs: [], crowns: [], currentStreak: 0, longestStreak: 0,
  lastDailyDate: null, dailyHistory: {}, funFactStreak: 0, lastFunFactDate: null, lastShareResult: null,
  premium: false, gamesPlayed: 0, ...over,
})

class MemoryStorage {
  constructor(init = {}) { this.m = new Map(Object.entries(init)) }
  get length() { return this.m.size }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) { this.m.set(k, String(v)) }
  removeItem(k) { this.m.delete(k) }
}

// ── Usernames and bios ──────────────────────────────────────────────────────

test('usernames: 3–20 letters, digits or _', () => {
  for (const ok of ['map_lover', 'Ann', 'a_b', 'Flag_Fan_2026', 'x'.repeat(20), '12345', 'Niger', 'Montenegro', 'class', 'bass', 'grass', 'therapist', 'grape', 'Essex', 'analysis', 'spicy', 'pakistan', 'cocktail', 'peacock', 'badminton', 'seanbean', 'Testing']) {
    assert.equal(TX.usernameProblem(ok), null, ok)
  }
  for (const bad of ['ab', 'x'.repeat(21), 'has space', 'émile', 'dash-name', 'dot.name', '___', '', '@ann']) {
    assert.equal(TX.usernameProblem(bad), 'format', bad)
  }
})

test('usernames: offensive words are refused, leetspeak and stretching too', () => {
  for (const bad of ['fuck', 'FUCK_you', 'sh1t_head', 'FUUUCK', '5h17', 'a55', 'x_ass_x', 'b00bs', 'n1gg3r', 'p0rn', 'kkk_member', 'KYS', 'D1ck', 'diiick', 'fag0t', 'Dyke']) {
    assert.equal(TX.usernameProblem(bad), 'offensive', bad)
  }
})

test('usernames: reserved names are refused, with digits and Globalio anywhere', () => {
  for (const bad of ['admin', 'Admin', 'ADMIN_2', 'admin123', 'adm1n', 's3an', 'Sean', 'globalio', 'globalio_fan', 'TheGlobalioTeam', 'joudrie99', 'moderator', 'support', 'official', 'null', 'undefined', 'root', 'system', 'staff']) {
    assert.equal(TX.usernameProblem(bad), 'reserved', bad)
  }
})

test('bios: up to 120 characters, no links, no offensive words; spaces tidied', () => {
  assert.equal(TX.bioProblem(''), null)
  assert.equal(TX.bioProblem('Learning every flag in Africa'), null)
  assert.equal(TX.bioProblem('push it real good, Paris history, grapes and therapists'), null)
  assert.equal(TX.bioProblem('a'.repeat(120)), null)
  assert.equal(TX.bioProblem('a'.repeat(121)), 'length')
  assert.equal(TX.bioProblem('🌍'.repeat(120)), null, 'an emoji counts once')
  assert.equal(TX.bioProblem('see www.example.com'), 'link')
  assert.equal(TX.bioProblem('https://x.y'), 'link')
  assert.equal(TX.bioProblem('no sh1t'), 'offensive')
  assert.equal(TX.bioProblem('what a f u c k'), null, 'spaced-out letters are not caught (kept simple)')
  assert.equal(TX.cleanBio('  two   spaces\nand a line  '), 'two spaces and a line')
})

test('the database has the same word list as src/profile/words.ts', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261127100000_profiles.sql'), 'utf8')
  const block = sql.slice(sql.indexOf('insert into private.username_words'), sql.indexOf('on conflict (word, kind) do nothing'))
  const inSql = new Set([...block.matchAll(/\('([a-z]+)', '([a-z_]+)'\)/g)].map(m => `${m[2]}:${m[1]}`))
  const inTs = new Set([
    ...W.OFFENSIVE_ANYWHERE.map(w => `offensive_anywhere:${w}`), ...W.OFFENSIVE_WORDS.map(w => `offensive_word:${w}`),
    ...W.RESERVED_WORDS.map(w => `reserved_word:${w}`), ...W.RESERVED_ANYWHERE.map(w => `reserved_anywhere:${w}`),
  ])
  assert.deepEqual([...inSql].sort(), [...inTs].sort(), 'copy the lists into the migration (and profiles-setup.sql)')
  for (const w of [...W.OFFENSIVE_ANYWHERE, ...W.OFFENSIVE_WORDS, ...W.RESERVED_WORDS]) assert.match(w, /^[a-z]{2,30}$/)
  const setup = fs.readFileSync(path.join(ROOT, 'supabase/profiles-setup.sql'), 'utf8')
  assert.ok(setup.includes(`| username_words       | ${inTs.size} words`), 'profiles-setup.sql: the expected word count is out of date')
})

// ── Stats, achievements and the profile from a save ─────────────────────────

const now = Date.UTC(2026, 10, 27, 12)
const sample = () => ({
  [MAIN_KEY]: main({
    learnedFlags: ['FR', 'JP', 'KE', 'JP', 'XX'], crowns: ['europe', 'quickplay', 'world'], currentStreak: 8, longestStreak: 12,
    lastDailyDate: '2026-11-26', gamesPlayed: 40,
    dailyHistory: { '2026-10-03': { score: 7, total: 10 }, '2026-11-26': { score: 10, total: 10 } },
  }),
  globalio_total_plays: '57',
  globalio_hl_best: '14',
  globalio_doa_best: '0',
  globalio_realorbot_best: '27',
  globalio_flagfusion_best: S({ easy: 900, hard: 1300 }),
  globalio_citiesabroad_best: S({ 'easy-type': 340, 'hard-choice': 120 }),
  globalio_prideroulette_best: '6', globalio_prideroulette_best_42: '9',
  globalio_notagame_best: '99',
  globalio_gacha: S({ collected: ['FR', 'JP', 'FR'], xp: 3 }),
  globalio_flagstudio_v1: S({ current: null, saved: [{ id: 'd1', name: 'Mine', base: 'stripes', parts: {}, overlays: [], updated: 5 }] }),
  globalio_first_seen: String(Date.UTC(2026, 8, 14)),
  globalio_achievements: S({ 'daily-first': now - 5000, 'learn-50': now, junk: 4 }),
})

test('stats summary from a sample save', () => {
  const s = ST.statsOf(sample())
  assert.equal(s.flags, 3, 'learned country flags, each once, unknown codes left out')
  assert.equal(s.flagsOf, FLAGS.length)
  assert.equal(s.crowns, 2, 'only the Flag Set crowns')
  assert.equal(s.streak, 8)
  assert.equal(s.streakDay, '2026-11-26')
  assert.equal(s.bestStreak, 12)
  assert.equal(s.dailies, 2)
  assert.equal(s.games, 57, 'the higher of games launched and finished')
  assert.equal(s.collection, 2)
  assert.deepEqual(s.bests, { higherlower: 14, realorbot: 27, flagfusion: 1300, abroad: 340, prideroulette: 9 }, 'Cities Abroad\'s best is Abroad\'s')
  assert.equal(s.since, '2026-09')
  assert.equal(s.achievements, 2, 'unknown ids are ignored')
  assert.deepEqual(s.activity.map(a => a[0]), ['learn-50', 'daily-first'], 'newest first')
  assert.ok(S(s).length < 2000, 'small')
  assert.deepEqual(ST.bestsList(s).map(b => b.title).sort(), ['Abroad', 'Flag Fusion', 'Higher / Lower', 'Pride Roulette', 'Real or Bot'])
  assert.ok(ST.bestsList(s).every(b => b.value > 0))
})

test('a streak shows as 0 once it lapses', () => {
  const s = ST.statsOf(sample())
  assert.equal(ST.shownStreak(s, '2026-11-26'), 8)
  assert.equal(ST.shownStreak(s, '2026-11-27'), 8)
  assert.equal(ST.shownStreak(s, '2026-11-28'), 0)
  assert.equal(ST.shownStreak(s, '2026-12-01'), 0)
})

test('someone else’s stats are checked: junk is dropped or clamped', () => {
  assert.deepEqual(ST.readStats(null), ST.EMPTY_STATS)
  const r = ST.readStats({ flags: 5000, flagsOf: 197, crowns: 99, streak: -4, bests: { realorbot: 12, made_up: 9, forgery: 'x' }, since: 'never', activity: [['learn-50', 5], ['fake', 6], 'x'], achievements: 1e9 })
  assert.equal(r.flags, 197)
  assert.equal(r.crowns, ST.CROWN_COUNT)
  assert.equal(r.streak, 0)
  assert.deepEqual(r.bests, { realorbot: 12 })
  assert.equal(r.since, null)
  assert.deepEqual(r.activity, [['learn-50', 5]])
  assert.equal(r.achievements, ACHIEVEMENTS.length)
})

test('achievements earned from a save, and only new ones', () => {
  const snap = sample()
  const got = ACH.earned(snap)
  for (const id of ['daily-perfect', 'streak-7', 'crown-first', 'realorbot-10', 'realorbot-25', 'flagfusion-first', 'flagfusion-hard', 'studio-first', 'games-50']) assert.ok(got.includes(id), id)
  for (const id of ['daily-first', 'learn-50', 'streak-30', 'learn-100', 'crown-all', 'flagle-win', 'connections-win', 'gacha-25']) assert.ok(!got.includes(id), id)
  assert.equal(ACH.earned({}).length, 0, 'an empty save earns nothing')
  // Every achievement has an icon, a group and a way to get it; ids are unique.
  const ids = ACHIEVEMENTS.map(a => a.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ACHIEVEMENTS.length >= 20 && ACHIEVEMENTS.length <= 30)
  for (const a of ACHIEVEMENTS) assert.ok(a.title && a.how && a.icon && a.group && /^[a-z0-9-]+$/.test(a.id), a.id)
})

test('unlocks sync: every unlock from both devices, at the earlier time', () => {
  const a = { globalio_achievements: S({ 'daily-first': 100, 'learn-50': 300 }) }
  const b = { globalio_achievements: S({ 'learn-50': 200, 'streak-7': 400 }) }
  for (const merged of [mergeSnapshots(a, b), mergeSnapshots(b, a)]) {
    assert.deepEqual(JSON.parse(merged.globalio_achievements), { 'daily-first': 100, 'learn-50': 200, 'streak-7': 400 })
  }
  assert.equal(ruleFor('globalio_achievements').rule, 'min')
  assert.equal(mergeSnapshots({ globalio_first_seen: '500' }, { globalio_first_seen: '300' }).globalio_first_seen, '300')
})

test('the profile on a device: later change wins, junk is dropped', () => {
  const older = { globalio_profile: S({ picture: { kind: 'flag', code: 'JP' }, banner: 'waves', bio: 'old', pinned: [], designs: [], date: '2026-11-26T10:00:00.000Z' }) }
  const newer = { globalio_profile: S({ picture: { kind: 'flag', code: 'FR' }, banner: 'hills', bio: 'new', pinned: ['learn-50'], designs: [], date: '2026-11-27T10:00:00.000Z' }) }
  for (const m of [mergeSnapshots(older, newer), mergeSnapshots(newer, older)]) assert.equal(L.profileOf(m).bio, 'new')
  const junk = L.profileOf({ globalio_profile: S({ picture: { kind: 'flag', code: 'ZZ' }, banner: 'nope', bio: 'x'.repeat(300), pinned: ['learn-50', 'fake', 'learn-50', 'daily-first', 'streak-7', 'learn-100'], designs: [1, 'd1'] }) })
  assert.equal(junk.picture, null)
  assert.equal(junk.banner, 'plain')
  assert.equal(junk.bio.length, 120)
  assert.deepEqual(junk.pinned, ['learn-50', 'daily-first', 'streak-7'])
  assert.deepEqual(junk.designs, ['d1'])
  assert.equal(L.monthName('2026-11'), 'November 2026')
  assert.equal(L.monthName('2026-13'), null)
})

test('the public row: only what is meant to be public', () => {
  const upload = { id: 'd2', name: 'Secret name', base: 'stripes', parts: {}, overlays: [{ id: 'o', kind: 'image', src: 'data:image/png;base64,AAAA', x: 1, y: 1, size: 9, rot: 0, color: '' }], updated: 9 }
  const plain = { id: 'd1', name: 'My nation', motto: 'Private motto', base: 'stripes', stripes: { dir: 'h', w: [1, 1, 1] }, parts: { 0: { f: '#C8102E' } }, overlays: [], updated: 5 }
  const snap = { ...sample(),
    globalio_flagstudio_v1: S({ current: null, saved: [upload, plain] }),
    globalio_profile: S({ picture: { kind: 'design', id: 'd1' }, banner: 'compass', bio: 'Hi', pinned: ['learn-50'], designs: ['d2', 'd1'], date: 'x' }) }
  const row = PUB.publicRowOf(snap, encodeDesign)
  assert.equal(row.picture.kind, 'design')
  const pic = decodeDesign(row.picture.design)
  assert.equal(pic.name, 'Shared flag', 'no name in the public copy')
  assert.equal(pic.motto, undefined, 'no motto either')
  assert.equal(row.designs.length, 1, 'a design with an uploaded picture is never public')
  assert.equal(row.banner, 'sun', 'a banner from the first set reads as the closest one now')
  assert.deepEqual(row.pinned, ['learn-50'])
  assert.equal(row.stats.flags, 3)
  assert.ok(!S(row).includes('Secret name') && !S(row).includes('AAAA') && !S(row).includes('My nation'))
  const withUploadPic = PUB.publicRowOf({ ...snap, globalio_profile: S({ picture: { kind: 'design', id: 'd2' } }) }, encodeDesign)
  assert.equal(withUploadPic.picture, null)
  assert.ok(S(row).length < 8192)
})

// ── Links ───────────────────────────────────────────────────────────────────

test('profile links: ?u=username, on globalio.app and the test site', () => {
  assert.equal(LINK.profileLinkUser('?u=Map_Lover'), 'Map_Lover')
  assert.equal(LINK.profileLinkUser('?profiles=1&u=%40ann'), 'ann')
  assert.equal(LINK.profileLinkUser('?u= ann '), 'ann')
  for (const bad of ['', '?u=', '?u=ab', '?u=has%20space', '?u=<script>', `?u=${'x'.repeat(21)}`, '?play=flagle', '?u=___']) assert.equal(LINK.profileLinkUser(bad), null, bad)
  assert.equal(LINK.profileLink('ann', 'https://globalio.app', '/'), 'https://globalio.app/?u=ann')
  assert.equal(LINK.profileLink('ann', 'https://joudrie.github.io', '/Global/'), 'https://joudrie.github.io/Global/?u=ann')
})

// ── The card ────────────────────────────────────────────────────────────────

function fakeCtx() {
  const calls = []
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '10px x', textAlign: 'left', textBaseline: 'alphabetic',
    measureText(t) { const size = Number(/(\d+)px/.exec(this.font)?.[1] ?? 10); return { width: [...t].length * size * 0.56 } },
    fillText(t, x, y) { calls.push({ t, x, y, w: this.measureText(t).width, align: this.textAlign }) },
  }
  for (const m of ['fillRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'fill', 'stroke', 'save', 'restore', 'clip', 'drawImage', 'rect']) ctx[m] = () => {}
  return { ctx, calls }
}

const cardOf = over => ({
  name: 'Map_Lover', badge: 'Founding player', rank: 'Wayfinder', since: 'November 2026', bio: 'Learning every flag in Africa this year.',
  flags: 123, flagsOf: 197,
  tiles: [{ label: 'Crowns of 7', value: 3 }, { label: 'Day streak', value: 8 }, { label: 'Best streak', value: 12 }, { label: 'Daily Games', value: 40 }, { label: 'Games played', value: 210 }, { label: 'Gacha flags', value: 57 }],
  bests: [{ title: 'Real or Bot', value: 27 }, { title: 'Flag Fusion', value: 1300 }], pinned: ['learn-50', 'streak-7', 'realorbot-25'], link: 'globalio.app/?u=Map_Lover', ...over,
})

test('the card draws without throwing, and no text runs off it', () => {
  for (const d of [
    cardOf(),
    cardOf({ name: 'W'.repeat(20), badge: 'A very long badge name for testing it', bio: 'word '.repeat(60), bests: [], pinned: [] }),
    cardOf({ name: 'Explorer', badge: null, bio: '', since: null, tiles: cardOf().tiles.map(t => ({ ...t, value: 123456789 })), flags: 0 }),
  ]) {
    const { ctx, calls } = fakeCtx()
    CARD.drawProfileCard(ctx, d, { banner: {}, picture: { img: {}, w: 300, h: 200 }, pins: [{}, null, {}] })
    assert.ok(calls.length > 10)
    for (const c of calls) {
      const left = c.align === 'right' ? c.x - c.w : c.x
      assert.ok(left >= 0 && left + c.w <= CARD.CARD_W + 0.5, `"${c.t}" runs off the card`)
      assert.ok(c.y > 0 && c.y < CARD.CARD_H, `"${c.t}" is off the card`)
    }
    assert.ok(calls.some(c => c.t === 'Globalio'), 'the wordmark')
    assert.ok(calls.some(c => c.t.startsWith('globalio.app')), 'the link')
  }
  assert.equal(CARD.CARD_W, 1080)
  assert.equal(CARD.CARD_H, 1350)
})

// ── The account calls, against a fake Supabase ──────────────────────────────

/** A fake Supabase client: the profiles table with the database's rules, and
 *  the two lookups (public, not hidden profiles only). */
function fakeSupabase({ missing = false, offline = false } = {}) {
  const db = { rows: new Map(), badges: new Map(), calls: [] }
  const res = (data, error = null, status = 200) => Promise.resolve({ data, error, status })
  const fail = () => offline ? res(null, { message: 'TypeError: Failed to fetch' }, 0)
    : missing ? res(null, { code: 'PGRST205', message: 'Could not find the table public.profiles in the schema cache' }, 404) : null
  const check = row => {
    const p = TX.usernameProblem(row.username)
    if (p === 'format') return { code: '23514', message: 'new row violates check constraint "profiles_username_format"' }
    if (p) return { code: '23514', message: `username_not_allowed: ${p}` }
    for (const [uid, r] of db.rows) if (uid !== row.user_id && r.username.toLowerCase() === row.username.toLowerCase()) return { code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' }
    return null
  }
  const mine = r => r && { username: r.username, is_public: r.is_public, hidden_by_owner: r.hidden_by_owner, created_at: r.created_at }
  const client = {
    from(table) {
      assert.equal(table, 'profiles')
      const q = { op: 'select', filters: {} }
      const b = {
        select() { return b }, eq(k, v) { q.filters[k] = v; return b },
        insert(row) { q.op = 'insert'; q.row = row; return b }, update(patch) { q.op = 'update'; q.patch = patch; return b },
        maybeSingle() { return b.run() }, single() { return b.run() },
        run() {
          db.calls.push(q)
          const f = fail(); if (f) return f
          if (q.op === 'select') return res(mine(db.rows.get(q.filters.user_id)) ?? null)
          if (q.op === 'insert') {
            if (db.rows.has(q.row.user_id)) return res(null, { code: '23505', message: 'duplicate key value violates unique constraint "profiles_pkey"' }, 409)
            const e = check(q.row); if (e) return res(null, e, e.code === '23505' ? 409 : 400)
            const row = { is_public: true, hidden_by_owner: false, created_at: '2026-11-27T10:00:00Z', ...q.row }
            db.rows.set(row.user_id, row)
            return res(mine(row), null, 201)
          }
          const row = db.rows.get(q.filters.user_id)
          if (!row) return res(null)
          if ('hidden_by_owner' in q.patch) return res(null, { code: '42501', message: 'permission denied for table profiles' }, 403)
          const next = { ...row, ...q.patch }
          if (q.patch.username && q.patch.username !== row.username) { const e = check(next); if (e) return res(null, e, 400) }
          db.rows.set(row.user_id, next)
          return res(mine(next))
        },
      }
      return b
    },
    rpc(name, args) {
      db.calls.push({ op: 'rpc', name, args })
      if (offline) return res(null, { message: 'TypeError: Failed to fetch' }, 0)
      if (missing) return res(null, { code: 'PGRST202', message: `Could not find the function public.${name}(${Object.keys(args)}) in the schema cache` }, 404)
      const shown = [...db.rows.values()].filter(r => r.is_public && !r.hidden_by_owner)
      const out = r => ({ username: r.username, picture: r.picture ?? null, badge: db.badges.get(r.user_id) ?? null })
      if (name === 'find_players') return res(shown.filter(r => r.username.toLowerCase().startsWith(args.prefix.toLowerCase())).sort((a, b) => a.username.localeCompare(b.username)).slice(0, 10).map(out))
      if (name === 'get_player') return res(shown.filter(r => r.username.toLowerCase() === args.player.toLowerCase()).map(r => ({ ...out(r), banner: r.banner, bio: r.bio, pinned: r.pinned ?? [], designs: r.designs ?? [], stats: r.stats ?? {}, created_at: r.created_at })))
      return res(null, { code: 'PGRST202', message: 'no such function' }, 404)
    },
  }
  return { db, client }
}

const ROW = () => PUB.publicRowOf(sample(), () => '')

test('claim a username, then change it; the row starts public with the profile', async () => {
  const { db, client } = fakeSupabase()
  const me = P.supabaseProfiles(client, 'u1')
  assert.equal(await me.mine(), null)
  const mine = await P.claimUsername(me, 'Map_Lover', ROW(), null)
  assert.deepEqual({ u: mine.username, pub: mine.isPublic, hidden: mine.hidden }, { u: 'Map_Lover', pub: true, hidden: false })
  const row = db.rows.get('u1')
  assert.equal(row.stats.flags, 3)
  assert.ok(!('user_id' in (await me.find('map'))[0]), 'lookups never carry an account id')
  const changed = await P.claimUsername(me, 'Atlas_Fan', ROW(), mine)
  assert.equal(changed.username, 'Atlas_Fan')
  assert.equal(db.rows.size, 1)
})

test('a taken username (any case) says so; offensive and reserved never reach the server', async () => {
  const { db, client } = fakeSupabase()
  await P.claimUsername(P.supabaseProfiles(client, 'u1'), 'Map_Lover', ROW(), null)
  const other = P.supabaseProfiles(client, 'u2')
  await assert.rejects(P.claimUsername(other, 'MAP_LOVER', ROW(), null), e => e.kind === 'taken' && e.message === TX.USERNAME_MESSAGE.taken)
  const before = db.calls.length
  await assert.rejects(P.claimUsername(other, 'sh1t_head', ROW(), null), e => e.kind === 'not_allowed' && e.reason === 'offensive')
  await assert.rejects(P.claimUsername(other, 'Admin_2', ROW(), null), e => e.kind === 'not_allowed' && e.reason === 'reserved')
  await assert.rejects(P.claimUsername(other, 'a b', ROW(), null), e => e.kind === 'invalid')
  assert.equal(db.calls.length, before, 'checked before any request')
})

test('the database’s refusal reads the same as the app’s', () => {
  assert.equal(P.profileError({ code: '23514', message: 'username_not_allowed: reserved' }, 400).message, TX.USERNAME_MESSAGE.reserved)
  assert.equal(P.profileError({ code: '23514', message: 'username_not_allowed: offensive' }, 400).message, TX.USERNAME_MESSAGE.offensive)
  assert.equal(P.profileError({ code: '23514', message: 'bio_not_allowed' }, 400).reason, 'bio')
  assert.equal(P.profileError({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' }, 409).kind, 'taken')
  assert.equal(P.profileError({ code: '42501', message: 'permission denied' }, 403).kind, 'signed_out')
})

test('a bio the database refuses doesn’t stop the claim', async () => {
  const calls = []
  const b = {
    async create(username, row) {
      calls.push(row.bio)
      if (row.bio) throw P.profileError({ code: '23514', message: 'bio_not_allowed' }, 400)
      return { username, isPublic: true, hidden: false, createdAt: null }
    },
  }
  const mine = await P.claimUsername(b, 'Map_Lover', { ...ROW(), bio: 'a word only the database blocks' }, null)
  assert.equal(mine.username, 'Map_Lover')
  assert.deepEqual(calls, ['a word only the database blocks', null])
})

test('another device made the row first: the claim becomes a change', async () => {
  const { db, client } = fakeSupabase()
  db.rows.set('u1', { user_id: 'u1', username: 'Old_Name', is_public: true, hidden_by_owner: false, created_at: 'x' })
  const mine = await P.claimUsername(P.supabaseProfiles(client, 'u1'), 'New_Name', ROW(), null)
  assert.equal(mine.username, 'New_Name')
})

test('search and view show public profiles only; private and hidden ones never', async () => {
  const { db, client } = fakeSupabase()
  for (const [uid, username, extra] of [['u1', 'Map_Lover', {}], ['u2', 'Map_Private', { is_public: false }], ['u3', 'Map_Hidden', { hidden_by_owner: true }], ['u4', 'Mapster', {}]]) {
    db.rows.set(uid, { user_id: uid, username, is_public: true, hidden_by_owner: false, created_at: '2026-11-27T10:00:00Z', stats: { flags: 9, flagsOf: 197 }, bio: 'hello', banner: 'waves', ...extra })
  }
  db.badges.set('u1', 'Founding player')
  const anon = P.supabaseProfiles(client, null)
  const found = await P.searchPlayers(anon, 'map')
  assert.deepEqual(found.map(p => p.username), ['Map_Lover', 'Mapster'])
  assert.equal(found[0].badge, 'Founding player')
  assert.deepEqual(await P.searchPlayers(anon, '  '), [], 'nothing to search for: no request')
  assert.deepEqual(await P.searchPlayers(anon, "x'; drop"), [], 'not a username: no request')
  const p = await P.viewPlayer(anon, 'map_lover')
  assert.equal(p.username, 'Map_Lover')
  assert.equal(p.stats.flags, 9)
  assert.equal(p.bio, 'hello')
  assert.equal(p.banner, 'waves')
  assert.equal(await P.viewPlayer(anon, 'Map_Private'), null)
  assert.equal(await P.viewPlayer(anon, 'Map_Hidden'), null)
  assert.equal(await P.viewPlayer(anon, 'nobody_here'), null)
  await assert.rejects(anon.mine(), e => e.kind === 'signed_out', 'signed out: no own row')
})

test('before the SQL is run: a quiet "Profiles aren’t available yet"', async () => {
  const { client } = fakeSupabase({ missing: true })
  const anon = P.supabaseProfiles(client, null)
  await assert.rejects(P.searchPlayers(anon, 'map'), e => e.kind === 'unavailable' && e.message === 'Profiles aren’t available yet.')
  await assert.rejects(P.viewPlayer(anon, 'map_lover'), e => e.kind === 'unavailable')
  await assert.rejects(P.supabaseProfiles(client, 'u1').mine(), e => e.kind === 'unavailable')
  await assert.rejects(P.claimUsername(P.supabaseProfiles(client, 'u1'), 'Map_Lover', ROW(), null), e => e.kind === 'unavailable')
  const off = fakeSupabase({ offline: true })
  await assert.rejects(P.searchPlayers(P.supabaseProfiles(off.client, null), 'map'), e => e.kind === 'offline')
})

// ── The switch and the SQL ──────────────────────────────────────────────────

test('public profiles are live (switched on 2026-11-27 after the owner ran supabase/profiles-setup.sql)', () => {
  assert.equal(A.PROFILES_LIVE, true)
  globalThis.window = { location: { search: '' } }
  globalThis.localStorage = new MemoryStorage()
  assert.equal(A.profilesVisible(), true, 'shown to everyone, no ?profiles=1 needed')
  delete globalThis.window
})

const sqlFile = f => fs.readFileSync(path.join(ROOT, 'supabase', f), 'utf8')

test('supabase/profiles-setup.sql is the profiles migration, unchanged, plus a check', () => {
  const setup = sqlFile('profiles-setup.sql')
  assert.ok(setup.includes(sqlFile('migrations/20261127100000_profiles.sql').trim()), 'paste the migration into profiles-setup.sql again')
  assert.match(setup, /has_function_privilege\('anon', 'public\.find_players\(text\)'/)
})

test('the lookups return only safe columns, from the private schema', () => {
  const m = sqlFile('migrations/20261127100000_profiles.sql')
  for (const fn of ['find_players', 'get_player']) {
    const sig = m.match(new RegExp(`create or replace function public\\.${fn}\\([^)]*\\)\\s*returns table \\(([^)]*)\\)`))?.[1]
    assert.ok(sig, fn)
    assert.ok(!/user_id|email|hidden|is_public/.test(sig), `${fn} returns ${sig}`)
    assert.match(m, new RegExp(`function public\\.${fn}[\\s\\S]*?security invoker[\\s\\S]*?private\\.${fn}\\(`))
    assert.match(m, new RegExp(`grant execute on function public\\.${fn}\\(text\\) to anon, authenticated;`))
  }
  assert.match(m, /where p\.is_public and not p\.hidden_by_owner[\s\S]*where p\.is_public and not p\.hidden_by_owner/)
  assert.match(m, /references auth\.users \(id\) on delete cascade/, 'deleting an account deletes its profile')
  assert.ok(!/grant (insert|update)[^;]*hidden_by_owner/.test(m), 'players can never set hidden_by_owner')
})

test('supabase/profiles-rls-check.sql runs in one transaction that is rolled back, and counts its checks', () => {
  const text = sqlFile('profiles-rls-check.sql')
  const code = text.replace(/--.*$/gm, '').trim()
  assert.match(code, /^begin;/)
  assert.match(code, /rollback;$/)
  assert.ok(!/\bcommit\b/i.test(code))
  const numbers = new Set([...code.matchAll(/(?:refused\(|values \(|select )(\d+), '/g)].map(m => +m[1]))
  assert.ok(text.includes(`"${numbers.size} of ${numbers.size} checks passed"`), `the header should expect ${numbers.size} checks`)
})

// ── Banners ─────────────────────────────────────────────────────────────────

const BAN = await src('profile/banners.ts')
const { T } = await src('ui/tokens.ts')

test('banners: the tan paper and at most one other colour each, from the palette', () => {
  const tans = new Set([T.void, T.bg].map(c => c.toLowerCase()))
  const palette = new Set([T.text, T.amber, T.cyan, T.green, T.warm].map(c => c.toLowerCase()))
  assert.ok(BAN.BANNERS.length >= 10)
  assert.equal(new Set(BAN.BANNERS.map(b => b.id)).size, BAN.BANNERS.length, 'ids are unique')
  assert.equal(BAN.BANNERS[0].id, BAN.DEFAULT_BANNER)
  for (const b of BAN.BANNERS) {
    const colours = new Set([...BAN.bannerSvg(b.id).matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1].toLowerCase()))
    const others = [...colours].filter(c => !tans.has(c))
    assert.ok(others.length <= 1, `${b.id} uses ${others.join(', ')}`)
    assert.equal(others[0] ?? null, b.accent?.toLowerCase() ?? null, `${b.id}: its accent is the one colour it adds`)
    if (b.accent) assert.ok(palette.has(b.accent.toLowerCase()), `${b.id}: ${b.accent} is not in the palette`)
    assert.ok(BAN.bannerSvg(b.id).length < 12000, `${b.id} stays small`)
  }
})

test('banners: old ids read as the closest new one, flags by code, anything else plain tan', () => {
  for (const [old, now] of Object.entries(BAN.LEGACY)) {
    assert.ok(BAN.BANNERS.some(b => b.id === now), `${old} → ${now}`)
    assert.ok(!BAN.BANNERS.some(b => b.id === old), `${old} is a current id, so it needs no mapping`)
  }
  for (const old of ['parchment', 'contours', 'graticule', 'waves', 'compass', 'routes', 'hills', 'tricolour', 'bands', 'nordic', 'saltire']) {
    assert.ok(BAN.BANNERS.some(b => b.id === BAN.bannerOf(old)), old)
  }
  assert.equal(BAN.bannerOf('compass'), 'sun')
  assert.equal(BAN.bannerOf('nordic'), 'nordic')
  assert.equal(BAN.bannerOf('flag:JP'), 'flag:JP')
  assert.equal(BAN.bannerFlag('flag:JP'), 'JP')
  for (const bad of ['flag:ZZ', 'flag:jp', 'flag:', 'flag:JPN', 'nope', '', null, 7, undefined]) assert.equal(BAN.bannerOf(bad), 'plain', String(bad))
  assert.equal(BAN.bannerFlag('nordic'), null)
  assert.equal(L.profileOf({ globalio_profile: S({ banner: 'flag:BR' }) }).banner, 'flag:BR')
  assert.equal(L.profileOf({ globalio_profile: S({ banner: 'hills' }) }).banner, 'chevron')
})

test('banners: the database accepts every preset and every flag, and nothing else', () => {
  for (const f of ['migrations/20261127100000_profiles.sql', 'profiles-setup.sql']) {
    const sql = fs.readFileSync(path.join(ROOT, 'supabase', f), 'utf8')
    const shapes = [...sql.matchAll(/profiles_banner_shape check \(banner is null or banner ~ '([^']+)'\)/g)].map(m => m[1])
    assert.ok(shapes.length >= 2, `${f}: the check is in the table and re-added for a table that already exists`)
    assert.equal(new Set(shapes).size, 1, `${f}: one definition`)
    assert.match(sql, /drop constraint if exists profiles_banner_shape/)
    const re = new RegExp(shapes[0])
    for (const b of BAN.BANNERS) assert.ok(re.test(b.id), `${f}: ${b.id}`)
    for (const flag of FLAGS) assert.ok(re.test(BAN.flagBanner(flag.code)), `${f}: flag:${flag.code}`)
    for (const bad of ['flag:jp', 'flag:JPN', 'Flag:JP', 'x'.repeat(25), 'a b', '<b>']) assert.ok(!re.test(bad), `${f}: ${bad}`)
  }
})

// ── The sample profile (?demo=1) ────────────────────────────────────────────

const DEMO = await src('profile/demo.ts')

test('?demo=1 shows the sample profile; nothing else does', () => {
  assert.equal(LINK.demoParam('?demo=1'), true)
  assert.equal(LINK.demoParam('?profiles=1&demo=1'), true)
  for (const q of ['', '?demo=yes', '?demo=0', '?demos=1']) assert.equal(LINK.demoParam(q), false, q)
  globalThis.window = { location: { search: '?demo=1' } }
  assert.equal(LINK.demoOn(), true)
  delete globalThis.window
  assert.equal(LINK.demoOn(), false, 'no window: no sample')
  assert.equal(ruleFor('globalio_profile_look'), null, 'the layout trial left no storage key behind')
})

test('the sample profile never touches storage, and is a valid public profile', () => {
  const touched = []
  globalThis.localStorage = new Proxy({}, { get: (_, k) => { touched.push(String(k)); throw new Error(`storage used: ${String(k)}`) } })
  const d = DEMO.demoProfile(Date.UTC(2026, 10, 27, 12))
  assert.deepEqual(touched, [])
  delete globalThis.localStorage
  assert.equal(d.name, 'Bob')
  const p = d.player
  // It reads back unchanged through the same checks a server profile goes through.
  assert.deepEqual(ST.readStats(JSON.parse(JSON.stringify(p.stats))), p.stats)
  assert.deepEqual(PUB.readPicture(p.picture), p.picture)
  assert.equal(TX.usernameProblem(p.username), null)
  assert.equal(TX.bioProblem(p.bio), null)
  assert.equal(p.pinned.length, 3)
  for (const id of p.pinned) assert.ok(d.unlocks[id], `${id} is pinned but not unlocked`)
  assert.equal(Object.keys(d.unlocks).length, 12)
  assert.equal(p.stats.achievements, 12)
  for (const id of Object.keys(d.unlocks)) assert.ok(ACHIEVEMENTS.some(a => a.id === id), id)
  assert.ok(p.designs.length >= 6)
  for (const code of p.designs) {
    const back = decodeDesign(code)
    assert.ok(back && typeof back.base === 'string', 'a real Flag Studio share code')
    assert.equal(encodeDesign({ ...back, name: '' }), code, 'round-trips')
  }
  assert.equal(ST.shownStreak(p.stats, p.stats.streakDay), 34, 'the streak shows as current')
  // Shown read-only: no edit controls are passed, and the files never write.
  const demoSrc = fs.readFileSync(path.join(ROOT, 'src/profile/demo.ts'), 'utf8')
  assert.ok(!/localStorage|sessionStorage|saveProfile|^import (?!type)/m.test(demoSrc), 'demo.ts imports nothing at run time and stores nothing')
  const you = fs.readFileSync(path.join(ROOT, 'src/components/YouTab.tsx'), 'utf8')
  const demoUse = you.match(/<ProfileView data=\{demoView\}[^>]*>/)?.[0]
  assert.ok(demoUse && !/\bown=/.test(demoUse), 'the sample profile is drawn without edit controls')
})

// ── The creator's crown and check ───────────────────────────────────────────

test('only the Creator badge (set by the owner in entitlements) gets the crown and check', async () => {
  const V = await src('profile/verified.ts')
  assert.equal(V.isCreator('Creator'), true)
  assert.equal(V.isCreator(' creator '), true)
  for (const b of [null, undefined, '', 'Founding player', 'Creator!', 'Co-creator']) assert.equal(V.isCreator(b), false, String(b))
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261126100000_accounts.sql'), 'utf8')
  assert.ok(!/grant\s+(insert|update)[^;]*public\.entitlements[^;]*to\s+(anon|authenticated)/i.test(sql), 'players must never be able to write their own badge')
})

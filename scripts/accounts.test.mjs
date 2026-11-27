// Accounts: the sync engine (src/account/engine.ts) with a fake account backend
// and this browser's real save code (src/account/device.ts → utils/backup.ts)
// over in-memory localStorage; the on/off switches in src/accounts.ts; and the
// SQL in supabase/.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const { SyncEngine, SyncError, fingerprint } = await src('account/engine.ts')
const { browserDevice } = await src('account/device.ts')
const A = await src('accounts.ts')
const B = await src('utils/backup.ts')
const { MAIN_KEY } = await src('utils/mergeProgress.ts')

// ── helpers ──────────────────────────────────────────────────────────────────

class MemoryStorage {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); this.quota = Infinity }
  get length() { return this.m.size }
  get size() { let n = 0; for (const [k, v] of this.m) n += k.length + v.length; return n }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) {
    const old = this.m.has(k) ? k.length + this.m.get(k).length : 0
    if (this.size - old + k.length + String(v).length > this.quota) throw new Error('QuotaExceededError')
    this.m.set(k, String(v))
  }
  removeItem(k) { this.m.delete(k) }
  clear() { this.m.clear() }
  dump() { return Object.fromEntries(this.m) }
}

const S = v => JSON.stringify(v)
const main = (over = {}) => S({
  username: '', learnedFlags: [], learnedSubs: [], crowns: [], currentStreak: 0, longestStreak: 0,
  lastDailyDate: null, dailyHistory: {}, funFactStreak: 0, lastFunFactDate: null, lastShareResult: null,
  premium: false, gamesPlayed: 0, ...over,
})
const mainOf = save => JSON.parse(save[MAIN_KEY])
const SESSION = { [A.SESSION_KEY]: S({ access_token: 'secret-token', refresh_token: 'r' }) }

/** A device: its own localStorage, and the real browser device code run against it. */
function makeDevice(init = {}) {
  const storage = new MemoryStorage(init)
  const on = fn => (...args) => { const was = globalThis.localStorage; globalThis.localStorage = storage; try { return fn(...args) } finally { globalThis.localStorage = was } }
  return {
    storage,
    device: { read: on(browserDevice.read), merge: on(browserDevice.merge), grantSupporter: on(browserDevice.grantSupporter) },
    main: () => JSON.parse(storage.getItem(MAIN_KEY)),
    learn(code) {
      const m = JSON.parse(storage.getItem(MAIN_KEY) ?? main())
      m.learnedFlags = [...m.learnedFlags, code]
      storage.setItem(MAIN_KEY, S(m))
    },
  }
}

/** The account row on a fake server, with the same rules as the real one:
 *  the server sets the version, and an update must name the current one. */
function makeBackend({ row = null, ent = null } = {}) {
  let n = 0
  const b = {
    row: row && { data: { ...row }, version: `v${++n}` },
    ent,
    offline: false,
    calls: [],
    /** Runs once before the next update reaches the row (another device saving first). */
    beforeUpdate: null,
    fail() { if (b.offline) throw new SyncError('offline', 'Failed to fetch') },
    async pull() { b.calls.push('pull'); b.fail(); return b.row && { data: { ...b.row.data }, version: b.row.version } },
    async create(data) {
      b.calls.push('create'); b.fail()
      if (b.row) return 'conflict'
      b.row = { data: { ...data }, version: `v${++n}` }
      return b.row.version
    },
    async update(data, version) {
      b.calls.push('update'); b.fail()
      const hook = b.beforeUpdate; b.beforeUpdate = null
      if (hook) await hook()
      if (!b.row || b.row.version !== version) return 'conflict'
      b.row = { data: { ...data }, version: `v${++n}` }
      return b.row.version
    },
    async entitlements() { b.calls.push('entitlements'); b.fail(); return b.ent },
    /** Another device writing straight to the row. */
    write(data) { b.row = { data: { ...data }, version: `v${++n}` } },
  }
  return b
}

/** A manual clock for the engine's timers. */
function makeClock() {
  const c = {
    t: 0, tasks: [],
    now: () => c.t,
    schedule(fn, ms) { const task = { at: c.t + ms, fn }; c.tasks.push(task); return () => { c.tasks = c.tasks.filter(x => x !== task) } },
    async advance(ms) {
      const end = c.t + ms
      for (;;) {
        await settle()
        const due = c.tasks.filter(x => x.at <= end).sort((a, b) => a.at - b.at)[0]
        if (!due) break
        c.tasks = c.tasks.filter(x => x !== due)
        c.t = due.at
        due.fn()
      }
      c.t = end
      await settle()
    },
  }
  return c
}
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }

function makeEngine(dev, backend, clock = makeClock()) {
  const states = []
  const engine = new SyncEngine({ backend, device: dev.device, schedule: clock.schedule, now: clock.now, onChange: s => states.push(s.status) })
  return { engine, clock, states }
}

// ── first sign-in ───────────────────────────────────────────────────────────

test('first sign-in merges this device and the account both ways', async () => {
  const phone = makeDevice({
    ...SESSION,
    [MAIN_KEY]: main({ learnedFlags: ['FR', 'DE'], longestStreak: 3, gamesPlayed: 4 }),
    globalio_hl_best: '12',
    google_adsense_settings: '{"x":1}', // another script's storage
  })
  const backend = makeBackend({ row: { [MAIN_KEY]: main({ learnedFlags: ['JP'], longestStreak: 9, gamesPlayed: 2 }), globalio_hl_best: '20', globalio_onboarded: '1' } })
  const { engine } = makeEngine(phone, backend)
  await engine.start()

  const here = phone.main()
  assert.deepEqual(here.learnedFlags.sort(), ['DE', 'FR', 'JP'])
  assert.equal(here.longestStreak, 9)
  assert.equal(here.gamesPlayed, 4)
  assert.equal(phone.storage.getItem('globalio_hl_best'), '20')
  assert.equal(phone.storage.getItem('globalio_onboarded'), '1')
  assert.deepEqual(mainOf(backend.row.data).learnedFlags.sort(), ['DE', 'FR', 'JP'])
  assert.deepEqual(backend.row.data, phone.device.read())
  assert.equal(engine.state.status, 'synced')
  assert.ok(engine.state.lastSynced != null)
})

test('the account never receives the sign-in session or other scripts’ storage', async () => {
  const phone = makeDevice({ ...SESSION, [`${A.ACCOUNT_KEY_PREFIX}_meta`]: '{}', [MAIN_KEY]: main({ learnedFlags: ['FR'] }), google_adsense_settings: '{}', '__fc': '1' })
  const backend = makeBackend()
  await makeEngine(phone, backend).engine.start()
  assert.deepEqual(backend.calls.slice(0, 2), ['pull', 'create'])
  assert.deepEqual(Object.keys(backend.row.data), [MAIN_KEY])
  assert.ok(!JSON.stringify(backend.row.data).includes('secret-token'))
})

test('a new account starts from this device’s progress', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['BR'] }), globalio_doa_best: '7' })
  const backend = makeBackend()
  await makeEngine(phone, backend).engine.start()
  assert.deepEqual(mainOf(backend.row.data).learnedFlags, ['BR'])
  assert.equal(backend.row.data.globalio_doa_best, '7')
})

test('an empty device signing in gets the account’s progress', async () => {
  const tablet = makeDevice()
  const backend = makeBackend({ row: { [MAIN_KEY]: main({ learnedFlags: ['KE', 'NG'], currentStreak: 5, lastDailyDate: '2026-11-25' }) } })
  await makeEngine(tablet, backend).engine.start()
  assert.deepEqual(tablet.main().learnedFlags.sort(), ['KE', 'NG'])
  assert.equal(tablet.main().currentStreak, 5)
  assert.deepEqual(backend.calls, ['pull', 'entitlements']) // nothing new to send
})

// ── two devices ─────────────────────────────────────────────────────────────

test('two devices converge on the same progress', async () => {
  const backend = makeBackend()
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }), globalio_hl_best: '30' })
  const laptop = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['US'] }), globalio_hl_best: '18', globalio_realorbot_best: '9' })
  const p = makeEngine(phone, backend), l = makeEngine(laptop, backend)
  await p.engine.start()
  await l.engine.start()
  await p.engine.pull() // the phone's tab is shown again

  for (const dev of [phone, laptop]) {
    assert.deepEqual(dev.main().learnedFlags.sort(), ['FR', 'US'])
    assert.equal(dev.storage.getItem('globalio_hl_best'), '30')
    assert.equal(dev.storage.getItem('globalio_realorbot_best'), '9')
  }
  assert.deepEqual(phone.device.read(), laptop.device.read())
  assert.deepEqual(backend.row.data, phone.device.read())
})

test('a device that saved in between is merged, not overwritten', async () => {
  const backend = makeBackend()
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const laptop = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['US'] }) })
  const p = makeEngine(phone, backend), l = makeEngine(laptop, backend)
  await p.engine.start()
  await l.engine.start()

  // Both play; the laptop's save lands while the phone's is on its way.
  phone.learn('IT')
  laptop.learn('CA')
  backend.beforeUpdate = () => l.engine.flush()
  await p.engine.flush()
  await settle()

  assert.deepEqual(mainOf(backend.row.data).learnedFlags.sort(), ['CA', 'FR', 'IT', 'US'])
  assert.ok(backend.calls.filter(c => c === 'update').length >= 3, 'the phone retried after the conflict')
  await l.engine.pull()
  assert.deepEqual(laptop.main().learnedFlags.sort(), ['CA', 'FR', 'IT', 'US'])
  assert.deepEqual(phone.main().learnedFlags.sort(), ['CA', 'FR', 'IT', 'US'])
})

test('two devices creating the account row at once both end up in it', async () => {
  const backend = makeBackend()
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const laptop = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['US'] }) })
  const p = makeEngine(phone, backend), l = makeEngine(laptop, backend)
  await Promise.all([p.engine.start(), l.engine.start()]) // both pull "no row", both create
  await p.engine.pull()
  assert.deepEqual(mainOf(backend.row.data).learnedFlags.sort(), ['FR', 'US'])
  assert.deepEqual(phone.main().learnedFlags.sort(), ['FR', 'US'])
  assert.deepEqual(laptop.main().learnedFlags.sort(), ['FR', 'US'])
})

// ── while signed in ─────────────────────────────────────────────────────────

test('a change is pushed about 5 seconds after the save stops changing', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const backend = makeBackend()
  const { engine, clock } = makeEngine(phone, backend)
  await engine.start()
  const updates = () => backend.calls.filter(c => c === 'update').length

  engine.tick() // nothing changed: nothing scheduled
  assert.equal(clock.tasks.length, 0)

  phone.learn('PE')
  engine.tick()
  await clock.advance(4000)
  assert.equal(updates(), 0)
  phone.learn('CL') // still playing: the push waits again
  engine.tick()
  await clock.advance(4000)
  assert.equal(updates(), 0)
  await clock.advance(1100)
  assert.equal(updates(), 1)
  assert.deepEqual(mainOf(backend.row.data).learnedFlags.sort(), ['CL', 'FR', 'PE'])
  assert.ok(!backend.calls.slice(3).includes('pull'), 'a push merges with the version it last read, no extra read')
})

test('non-stop play still syncs within 30 seconds', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main() })
  const backend = makeBackend()
  const { engine, clock } = makeEngine(phone, backend)
  await engine.start()
  const flags = ['AD', 'AE', 'AF', 'AG', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG']
  for (const f of flags) { phone.learn(f); engine.tick(); await clock.advance(2000) }
  assert.ok(backend.calls.includes('update'), 'pushed while the save kept changing')
})

test('flush on leaving the page pushes right away; nothing to push sends nothing', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main() })
  const backend = makeBackend()
  const { engine } = makeEngine(phone, backend)
  await engine.start()
  const before = backend.calls.length
  await engine.flush()
  assert.equal(backend.calls.length, before)
  phone.learn('NO')
  await engine.flush()
  assert.deepEqual(mainOf(backend.row.data).learnedFlags, ['NO'])
})

test('showing the tab again brings in what another device played', async () => {
  const backend = makeBackend({ row: { [MAIN_KEY]: main({ learnedFlags: ['FR'] }) } })
  const phone = makeDevice()
  const { engine } = makeEngine(phone, backend)
  await engine.start()
  backend.write({ [MAIN_KEY]: main({ learnedFlags: ['FR', 'MX'] }), globalio_statclash_best: '11' })
  await engine.pull()
  assert.deepEqual(phone.main().learnedFlags.sort(), ['FR', 'MX'])
  assert.equal(phone.storage.getItem('globalio_statclash_best'), '11')
})

// ── offline and failures ────────────────────────────────────────────────────

test('offline: progress stays, retries quietly, and syncs when back', async () => {
  const phone = makeDevice({ ...SESSION, [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const backend = makeBackend({ row: { [MAIN_KEY]: main({ learnedFlags: ['JP'] }) } })
  backend.offline = true
  const { engine, clock } = makeEngine(phone, backend)
  await engine.start()
  assert.equal(engine.state.status, 'offline')
  assert.deepEqual(phone.main().learnedFlags, ['FR'])

  phone.learn('DE') // keeps playing offline
  engine.tick()
  await clock.advance(4000)
  assert.equal(engine.state.status, 'offline')
  assert.deepEqual(phone.main().learnedFlags, ['FR', 'DE'])

  backend.offline = false
  await clock.advance(20000) // the next retry
  assert.equal(engine.state.status, 'synced')
  assert.deepEqual(mainOf(backend.row.data).learnedFlags.sort(), ['DE', 'FR', 'JP'])
  assert.deepEqual(phone.main().learnedFlags.sort(), ['DE', 'FR', 'JP'])
  assert.equal(phone.storage.getItem(A.SESSION_KEY), SESSION[A.SESSION_KEY])
})

test('retries back off, and the connection coming back retries at once', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const backend = makeBackend()
  backend.offline = true
  const { engine, clock } = makeEngine(phone, backend)
  await engine.start()
  await clock.advance(5000)
  await clock.advance(15000)
  const pulls = backend.calls.filter(c => c === 'pull').length
  assert.equal(pulls, 3) // start, +5 s, +15 s
  assert.equal(clock.tasks.length, 1)
  assert.equal(clock.tasks[0].at - clock.t, 30000)
  backend.offline = false
  engine.retryNow()
  await settle()
  assert.equal(engine.state.status, 'synced')
  assert.deepEqual(mainOf(backend.row.data).learnedFlags, ['FR'])
})

test('a refused write (too big, not allowed) shows an error, never touches this device, and isn’t resent unchanged', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const backend = makeBackend()
  const create = backend.create
  let creates = 0
  backend.create = async data => { creates++; if (creates <= 1) throw new SyncError('rejected', 'violates check constraint "progress_data_size"'); return create(data) }
  const { engine, clock } = makeEngine(phone, backend)
  await engine.start()
  assert.equal(engine.state.status, 'error')
  assert.deepEqual(phone.main().learnedFlags, ['FR'])
  engine.tick(); await clock.advance(10 * 60000)
  assert.equal(creates, 1, 'the same save is not sent again and again')
  phone.learn('DE') // the save changes: try again
  engine.tick(); await clock.advance(6000)
  assert.equal(creates, 2)
  assert.equal(engine.state.status, 'synced')
})

test('an older or emptier account never lowers this device’s progress', async () => {
  const mine = {
    [MAIN_KEY]: main({ learnedFlags: ['FR', 'DE', 'IT'], crowns: ['europe'], currentStreak: 6, longestStreak: 6, lastDailyDate: '2026-11-26', gamesPlayed: 40, premium: true }),
    globalio_hl_best: '33',
    globalio_gacha: S({ collected: ['FR', 'DE'], xp: 50, tokens: 0, lastDaily: '2026-11-26' }),
  }
  const stale = {
    [MAIN_KEY]: main({ learnedFlags: ['FR'], currentStreak: 2, longestStreak: 2, lastDailyDate: '2026-11-01', gamesPlayed: 3 }),
    globalio_hl_best: '5',
    globalio_gacha: S({ collected: [], xp: 0, tokens: 1, lastDaily: '2026-11-01' }),
  }
  for (const remote of [stale, {}, { [MAIN_KEY]: 'not json', globalio_hl_best: '{' }]) {
    const phone = makeDevice({ ...mine })
    const backend = makeBackend({ row: remote })
    await makeEngine(phone, backend).engine.start()
    const m = phone.main()
    assert.deepEqual(m.learnedFlags.sort(), ['DE', 'FR', 'IT'])
    assert.deepEqual(m.crowns, ['europe'])
    assert.equal(m.currentStreak, 6)
    assert.equal(m.gamesPlayed, 40)
    assert.equal(m.premium, true)
    assert.equal(phone.storage.getItem('globalio_hl_best'), '33')
    assert.deepEqual(JSON.parse(phone.storage.getItem('globalio_gacha')).collected.sort(), ['DE', 'FR'])
  }
})

test('junk in the account row is ignored: no crash, and the session is never overwritten', async () => {
  const phone = makeDevice({ ...SESSION, [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const backend = makeBackend({ row: { [A.SESSION_KEY]: 'stolen', [MAIN_KEY]: main({ learnedFlags: ['US'] }), google_ads: 'x', globalio_x: 5, globalio_y: ['a'] } })
  await makeEngine(phone, backend).engine.start()
  assert.equal(phone.storage.getItem(A.SESSION_KEY), SESSION[A.SESSION_KEY])
  assert.equal(phone.storage.getItem('google_ads'), null)
  assert.equal(phone.storage.getItem('globalio_x'), null)
  assert.deepEqual(phone.main().learnedFlags.sort(), ['FR', 'US'])
})

test('full storage: this device is left as it was, and the account still gets everything', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  phone.storage.quota = phone.storage.size + 10
  const backend = makeBackend({ row: { [MAIN_KEY]: main({ learnedFlags: ['US'] }), globalio_hl_best: '40' } })
  await makeEngine(phone, backend).engine.start()
  assert.deepEqual(phone.main().learnedFlags, ['FR'])
  assert.equal(phone.storage.getItem('globalio_hl_best'), null)
  assert.deepEqual(mainOf(backend.row.data).learnedFlags.sort(), ['FR', 'US'])
  assert.equal(backend.row.data.globalio_hl_best, '40')
})

test('after sign-out nothing more is written, here or to the account', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const backend = makeBackend({ row: { [MAIN_KEY]: main({ learnedFlags: ['US'] }) } })
  const { engine, clock } = makeEngine(phone, backend)
  const pull = backend.pull
  backend.pull = async () => { const r = await pull(); engine.stop(); return r } // signed out mid-request
  await engine.start()
  assert.deepEqual(phone.main().learnedFlags, ['FR'])
  assert.deepEqual(mainOf(backend.row.data).learnedFlags, ['US'])
  phone.learn('DE'); engine.tick(); await clock.advance(60000)
  assert.ok(!backend.calls.includes('update'))
})

// ── entitlements ────────────────────────────────────────────────────────────

test('an account marked Supporter turns Supporter on here and shows the badge', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  const backend = makeBackend({ ent: { supporter: true, badge: 'Founding supporter' } })
  const { engine } = makeEngine(phone, backend)
  await engine.start()
  assert.equal(phone.main().premium, true)
  assert.deepEqual(phone.main().learnedFlags, ['FR'])
  assert.equal(engine.state.supporter, true)
  assert.equal(engine.state.badge, 'Founding supporter')
})

test('no entitlement leaves Supporter as it was', async () => {
  for (const premium of [false, true]) {
    const phone = makeDevice({ [MAIN_KEY]: main({ premium }) })
    const { engine } = makeEngine(phone, makeBackend({ ent: null }))
    await engine.start()
    assert.equal(phone.main().premium, premium)
    assert.equal(engine.state.badge, null)
  }
})

test('a failed entitlements read keeps the badge it had and still counts as synced', async () => {
  const phone = makeDevice({ [MAIN_KEY]: main() })
  const backend = makeBackend({ ent: { supporter: true, badge: 'Tester' } })
  const { engine } = makeEngine(phone, backend)
  await engine.start()
  backend.entitlements = async () => { throw new SyncError('offline', 'Failed to fetch') }
  await engine.pull()
  assert.equal(engine.state.status, 'synced')
  assert.equal(engine.state.badge, 'Tester')
})

// ── switches, keys, backups ─────────────────────────────────────────────────

test('with no publishable key, accounts are off and nothing loads', async () => {
  assert.equal(A.ACCOUNTS_LIVE, true, 'accounts are live (switched on 2026-11-26 after a real sign-in on the test site)')
  assert.equal(A.accountsConfigured(''), false)
  assert.equal(A.accountsConfigured('   '), false)
  assert.equal(A.accountsConfigured('sb_publishable_abc'), true)
  if (!A.accountsConfigured()) {
    globalThis.localStorage = new MemoryStorage({ ...SESSION })
    assert.equal(A.startAccountSync(), false)
    await assert.rejects(A.loadAccountService())
  }
  assert.equal(A.accountsVisible(), true) // live: shown to everyone, no ?accounts=1 needed
})

test('the key in the code is a publishable key, never a secret one', () => {
  const key = A.SUPABASE_PUBLISHABLE_KEY
  assert.ok(key === '' || key.startsWith('sb_publishable_') || jwtRole(key) === 'anon', 'only the publishable (or legacy anon) key belongs in src/accounts.ts')
  const all = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter(f => /\.(ts|tsx)$/.test(f))
  for (const f of all) {
    const text = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')
    assert.ok(!/sb_secret_[A-Za-z0-9]/.test(text), `${f}: a Supabase secret key`)
    for (const jwt of text.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) ?? []) assert.notEqual(jwtRole(jwt), 'service_role', `${f}: a service_role key`)
  }
})
function jwtRole(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role } catch { return null }
}

test('backups never hold the sign-in session, and a restore keeps you signed in', () => {
  const storage = new MemoryStorage({ ...SESSION, [`${A.ACCOUNT_KEY_PREFIX}_preview`]: '1', [MAIN_KEY]: main({ learnedFlags: ['FR'] }) })
  globalThis.localStorage = storage
  const code = B.exportProgress()
  const backup = B.readBackup(code)
  assert.deepEqual(Object.keys(backup), [MAIN_KEY])
  for (const mode of ['combine', 'replace']) {
    assert.ok(B.restoreBackup({ [MAIN_KEY]: main({ learnedFlags: ['US'] }), [A.SESSION_KEY]: 'from a backup' }, mode))
    assert.equal(storage.getItem(A.SESSION_KEY), SESSION[A.SESSION_KEY])
    assert.equal(storage.getItem(`${A.ACCOUNT_KEY_PREFIX}_preview`), '1')
  }
})

test('fingerprint notices any change and ignores key order', () => {
  const a = { x: '1', y: '2' }
  assert.equal(fingerprint(a), fingerprint({ y: '2', x: '1' }))
  assert.notEqual(fingerprint(a), fingerprint({ x: '1', y: '3' }))
  assert.notEqual(fingerprint(a), fingerprint({ x: '1' }))
  assert.notEqual(fingerprint({ ab: 'c' }), fingerprint({ a: 'bc' }))
})

// ── SQL ─────────────────────────────────────────────────────────────────────

const sql = f => fs.readFileSync(path.join(ROOT, 'supabase', f), 'utf8')
const MIGRATIONS = fs.readdirSync(path.join(ROOT, 'supabase/migrations')).sort().map(f => `migrations/${f}`)
// setup.sql is the accounts migrations; profiles have their own (profiles-setup.sql, see profiles.test.mjs).
const ACCOUNT_MIGRATIONS = MIGRATIONS.filter(m => !m.includes('_profiles'))

test('supabase/setup.sql is the migrations, unchanged, plus a check', () => {
  const setup = sql('setup.sql')
  let at = 0
  for (const m of ACCOUNT_MIGRATIONS) {
    const i = setup.indexOf(sql(m).trim(), at)
    assert.ok(i >= 0, `setup.sql is missing ${m} (or it changed): paste the migration in again`)
    at = i
  }
  assert.match(setup, /relrowsecurity/)
})

test('the migrations can run twice', () => {
  for (const m of MIGRATIONS) {
    const text = sql(m).replace(/--.*$/gm, '')
    assert.ok(!/create\s+table\s+(?!if not exists)/i.test(text), `${m}: create table without if not exists`)
    assert.ok(!/create\s+schema\s+(?!if not exists)/i.test(text), `${m}: create schema without if not exists`)
    assert.ok(!/create\s+function/i.test(text), `${m}: create function without or replace`)
    for (const [, name, table] of text.matchAll(/create\s+policy\s+("[^"]+")\s+on\s+([\w.]+)/gi)) {
      assert.ok(text.includes(`drop policy if exists ${name} on ${table};`), `${m}: policy ${name} isn't dropped first`)
    }
    for (const [, name, table] of text.matchAll(/create\s+trigger\s+(\w+)\s+[\s\S]*?\bon\s+([\w.]+)/gi)) {
      assert.ok(text.includes(`drop trigger if exists ${name} on ${table};`), `${m}: trigger ${name} isn't dropped first`)
    }
  }
})

test('supabase/rls-check.sql runs in one transaction that is rolled back', () => {
  const text = sql('rls-check.sql').replace(/--.*$/gm, '').trim()
  assert.match(text, /^begin;/)
  assert.match(text, /rollback;$/)
  assert.ok(!/\bcommit\b/i.test(text))
  assert.match(text, /set local role authenticated/)
  assert.match(text, /set_config\('request\.jwt\.claims'/)
})

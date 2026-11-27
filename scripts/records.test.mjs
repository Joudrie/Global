// Game records: Gauntlet's best run and pass per region, The Peel's best
// streak and points, and Dead or Alive moving on by itself after an answer.
// Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = f => import(path.join(ROOT, 'src', f))
const G = await src('utils/gauntlet.ts')
const R = await src('utils/records.ts')
const A = await src('utils/autoAdvance.ts')
const { mergeSnapshots: merge, ruleFor } = await src('utils/mergeProgress.ts')
const ACH = await src('profile/achievements.ts')
const read = f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')
const S = v => JSON.stringify(v)
const both = (key, a, b) => [merge({ [key]: a }, { [key]: b })[key], merge({ [key]: b }, { [key]: a })[key]]

// ── Gauntlet ────────────────────────────────────────────────────────────────

test('gauntlet: a run raises the best, a pass is kept with its first date', () => {
  let r = {}
  r = G.recordRun(r, 'asia', 12, 33, 1000)
  assert.deepEqual(r.asia, { best: 12, completed: false, firstCompleted: null })
  assert.equal(G.recordRun(r, 'asia', 5, 33, 2000), r, 'a worse run changes nothing')
  r = G.recordRun(r, 'asia', 22, 33, 3000)
  assert.equal(r.asia.best, 22)
  r = G.recordRun(r, 'asia', 33, 33, 4000)
  assert.deepEqual(r.asia, { best: 33, completed: true, firstCompleted: 4000 })
  r = G.recordRun(r, 'asia', 33, 33, 9000)
  assert.equal(r.asia.firstCompleted, 4000, 'passing again keeps the first date')
  r = G.recordRun(r, 'asia', 3, 33, 9500)
  assert.ok(r.asia.completed, 'a later failed run never takes the pass away')
  assert.deepEqual(G.passedRegions(r), ['asia'])
  assert.equal(G.bestShare(r.asia, 35), 1, 'passed reads full even if flags were added since')
  assert.equal(G.bestShare({ best: 22, completed: false, firstCompleted: null }, 33), 22 / 33)
  assert.equal(G.bestShare(undefined, 33), 0)
  assert.equal(G.gauntletRegionKey('Middle East'), 'middle-east')
})

test('gauntlet: stored values are read safely', () => {
  assert.deepEqual(G.readGauntlet(null), {})
  assert.deepEqual(G.readGauntlet('nope'), {})
  assert.deepEqual(G.readGauntlet('[1,2]'), {})
  assert.deepEqual(G.readGauntlet(S({ world: { best: '9', completed: 'yes', firstCompleted: -4 }, europe: 3, africa: { best: 7.9, completed: true, firstCompleted: 55 } })), {
    world: { best: 0, completed: false, firstCompleted: null },
    africa: { best: 7, completed: true, firstCompleted: 55 },
  })
})

test('gauntlet: two devices combine to the best of both, either way round', () => {
  const key = G.GAUNTLET_KEY
  assert.equal(ruleFor(key).rule, 'gauntlet', 'its own rule, ahead of the best-score pattern')
  const phone = S({ asia: { best: 33, completed: true, firstCompleted: 5000 }, europe: { best: 10, completed: false, firstCompleted: null } })
  const laptop = S({ asia: { best: 33, completed: true, firstCompleted: 2000 }, europe: { best: 31, completed: false, firstCompleted: null }, world: { best: 4, completed: false, firstCompleted: null } })
  const [ab, ba] = both(key, phone, laptop)
  assert.equal(ab, ba)
  assert.deepEqual(JSON.parse(ab), {
    asia: { best: 33, completed: true, firstCompleted: 2000 },
    europe: { best: 31, completed: false, firstCompleted: null },
    world: { best: 4, completed: false, firstCompleted: null },
  })
  // passed on one device only: passed, with that device's date
  const [x] = both(key, S({ oceania: { best: 14, completed: true, firstCompleted: 700 } }), S({ oceania: { best: 9, completed: false, firstCompleted: null } }))
  assert.deepEqual(JSON.parse(x).oceania, { best: 14, completed: true, firstCompleted: 700 })
  // idempotent
  const once = merge({ [key]: phone }, { [key]: laptop })
  assert.deepEqual(merge(once, { [key]: laptop }), once)
  assert.deepEqual(merge(once, { [key]: phone }), once)
  // junk on one side never wins over a real record
  assert.equal(merge({ [key]: 'oops' }, { [key]: phone })[key], phone)
})

test('gauntlet: Survivor and Iron will unlock from the saved passes', () => {
  const none = ACH.earned({ [G.GAUNTLET_KEY]: S({ asia: { best: 30, completed: false, firstCompleted: null } }) })
  assert.ok(!none.includes('gauntlet-pass') && !none.includes('gauntlet-world'))
  const asia = ACH.earned({ [G.GAUNTLET_KEY]: S({ asia: { best: 33, completed: true, firstCompleted: 1 } }) })
  assert.ok(asia.includes('gauntlet-pass') && !asia.includes('gauntlet-world'))
  const world = ACH.earned({ [G.GAUNTLET_KEY]: S({ world: { best: 197, completed: true, firstCompleted: 1 } }) })
  assert.ok(world.includes('gauntlet-pass') && world.includes('gauntlet-world'))
})

test('gauntlet screen saves through the record helpers', () => {
  const s = read('components/GauntletScreen.tsx')
  assert.match(s, /recordRun\(loadGauntlet\(\), config\.id/)
  assert.match(s, /saveGauntlet\(next\)/)
  assert.match(s, /New best: \$\{score\} \/ \$\{total\}/)
  assert.match(s, /eyebrow="Gauntlet passed"/)
})

// ── The Peel ────────────────────────────────────────────────────────────────

test('the peel: best streak and best points, each kept and synced as the higher', () => {
  assert.equal(ruleFor('globalio_thepeel_best').rule, 'max')
  const [ab, ba] = both('globalio_thepeel_best', S({ streak: 5, points: 900 }), S({ streak: 3, points: 2400 }))
  assert.equal(ab, ba)
  assert.deepEqual(JSON.parse(ab), { points: 2400, streak: 5 })
  const prev = R.readRecord(S({ streak: 4, points: 3000, junk: 'x' }), ['streak', 'points'])
  assert.deepEqual(prev, { streak: 4, points: 3000 })
  assert.deepEqual(R.readRecord('broken', ['streak', 'points']), { streak: 0, points: 0 })
  assert.deepEqual(R.raiseRecord(prev, { streak: 5, points: 2000 }), { next: { streak: 5, points: 3000 }, raised: ['streak'] })
  assert.deepEqual(R.raiseRecord(prev, { streak: 2, points: 100 }).raised, [])
  const screen = read('components/ThePeelScreen.tsx')
  assert.match(screen, /const BEST_KEY = "globalio_thepeel_best"/)
  assert.match(screen, /"New best!"/)
})

// ── Dead or Alive: moving on by itself ──────────────────────────────────────

function fakeClock() {
  let now = 0, id = 0
  const timers = new Map()
  return {
    now: () => now,
    set: (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id },
    clear: i => { timers.delete(i) },
    advance(ms) {
      const end = now + ms
      for (;;) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > end) break
        now = next[1].at; timers.delete(next[0]); next[1].fn()
      }
      now = end
    },
  }
}

test('dead or alive: right answers move on after 1.2 s, wrong after 2 s, a run that ended stays', () => {
  assert.equal(A.advanceDelay({ correct: true, ended: false }), 1200)
  assert.equal(A.advanceDelay({ correct: false, ended: false }), 2000)
  assert.equal(A.advanceDelay({ correct: false, ended: true }), null)
  assert.equal(A.advanceDelay({ correct: true, ended: true }), null)
})

test('dead or alive: the wait fires once, pauses while hidden, and Next skips it', () => {
  const c = fakeClock()
  let n = 0
  const t = A.advanceTimer(() => n++, 1200, c)
  c.advance(1199); assert.equal(n, 0)
  c.advance(1); assert.equal(n, 1)
  t.flush(); c.advance(5000); assert.equal(n, 1, 'Next after it fired does nothing more')

  const hidden = A.advanceTimer(() => n++, 1200, c)
  c.advance(500); hidden.pause()
  c.advance(60_000); assert.equal(n, 1, 'nothing happens while the tab is hidden')
  hidden.resume(); c.advance(699); assert.equal(n, 1)
  c.advance(1); assert.equal(n, 2, 'it picks up with the time that was left')

  const skipped = A.advanceTimer(() => n++, 1200, c)
  c.advance(300); skipped.flush(); assert.equal(n, 3, 'Next moves on at once')
  c.advance(2000); assert.equal(n, 3, 'and the timer never fires on top of it')

  const gone = A.advanceTimer(() => n++, 1200, c)
  gone.cancel(); c.advance(5000); gone.resume(); c.advance(5000); assert.equal(n, 3, 'cancelled stays cancelled')

  const screen = read('components/DeadOrAliveScreen.tsx')
  assert.match(screen, /advanceDelay\(\{ correct: reveal\.correct, ended: !reveal\.correct \}\)/)
  assert.match(screen, /visibilitychange/)
  assert.doesNotMatch(screen, /10000/, 'the old 10 s wait is gone')
})

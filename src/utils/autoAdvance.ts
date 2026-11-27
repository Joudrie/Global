// Moving on by itself after an answer is revealed (Dead or Alive).
//
// The reveal stays up long enough to read: a right answer for 1.2 s, a wrong
// one for 2 s. An answer that ends the run never moves on, so the end screen
// stays. The wait pauses while the tab is hidden and picks up where it left
// off, and it fires at most once: the Next button calls flush() to skip it.
// Pure apart from the default clock, so Node tests can drive it.

export const ADVANCE_MS = { correct: 1200, wrong: 2000 } as const

/** How long to wait before the next round, or null to stay (the run is over). */
export function advanceDelay({ correct, ended }: { correct: boolean; ended: boolean }): number | null {
  if (ended) return null
  return correct ? ADVANCE_MS.correct : ADVANCE_MS.wrong
}

export interface Clock {
  now(): number
  set(fn: () => void, ms: number): unknown
  clear(id: unknown): void
}

const realClock: Clock = {
  now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
  set: (fn, ms) => setTimeout(fn, ms),
  clear: id => clearTimeout(id as ReturnType<typeof setTimeout>),
}

export interface AdvanceTimer {
  /** Stop the clock (tab hidden). */
  pause(): void
  /** Start it again with the time that was left. */
  resume(): void
  /** Never fire. */
  cancel(): void
  /** Fire now if it hasn't yet (the Next button). */
  flush(): void
  readonly done: boolean
}

export function advanceTimer(fn: () => void, ms: number, clock: Clock = realClock): AdvanceTimer {
  let left = ms
  let started = clock.now()
  let id: unknown = null
  let done = false
  const fire = () => { if (done) return; done = true; id = null; fn() }
  const stop = () => { if (id !== null) { clock.clear(id); id = null } }
  id = clock.set(fire, ms)
  return {
    pause() {
      if (done || id === null) return
      stop()
      left = Math.max(0, left - (clock.now() - started))
    },
    resume() {
      if (done || id !== null) return
      started = clock.now()
      id = clock.set(fire, left)
    },
    cancel() { done = true; stop() },
    flush() { if (done) return; stop(); fire() },
    get done() { return done },
  }
}

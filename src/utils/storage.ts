const STORAGE_KEY = 'dailyglobe_v1'

export interface DailyResult {
  score: number
  total: number
  date: string
  answers: ('correct' | 'wrong')[]
}

export interface AppState {
  username: string
  learnedFlags: string[]
  learnedSubs: string[]
  crowns: string[]
  currentStreak: number
  longestStreak: number
  lastDailyDate: string | null
  dailyHistory: Record<string, DailyResult>
  funFactStreak: number
  lastFunFactDate: string | null
  lastShareResult: ShareResult | null
  /** Supporter (one-time $1.99) — true hides every ad across the app. */
  premium: boolean
  /** Count of completed main games — drives the "every 4th game" ad break. */
  gamesPlayed: number
}

export interface ShareResult {
  game: string
  score: string        // e.g. "8/10" or "750 pts"
  emojiGrid: string[]  // ['🟩','🟥',...]
  date: string
  streak?: number
}

const DEFAULT_STATE: AppState = {
  username: "",
  learnedFlags: [],
  learnedSubs: [],
  crowns: [],
  currentStreak: 0,
  longestStreak: 0,
  lastDailyDate: null,
  dailyHistory: {},
  funFactStreak: 0,
  lastFunFactDate: null,
  lastShareResult: null,
  premium: false,
  gamesPlayed: 0,
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function saveState(state: AppState): void {
  // Never let a storage failure (quota exceeded, Safari Private Mode, storage
  // disabled) bubble out of the persist effect and white-screen the app.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* best-effort persistence — ignore */
  }
}

export function markFlagLearned(state: AppState, code: string): AppState {
  if (state.learnedFlags.includes(code)) return state
  return { ...state, learnedFlags: [...state.learnedFlags, code] }
}

export function markSubLearned(state: AppState, code: string): AppState {
  if (state.learnedSubs.includes(code)) return state
  return { ...state, learnedSubs: [...state.learnedSubs, code] }
}

export function recordDailyResult(state: AppState, result: DailyResult): AppState {
  const today = result.date
  const yesterday = getPreviousDay(today)

  const streakBroken = state.lastDailyDate !== yesterday && state.lastDailyDate !== today
  const alreadyDoneToday = state.lastDailyDate === today

  let newStreak = state.currentStreak
  if (!alreadyDoneToday) {
    newStreak = streakBroken ? 1 : state.currentStreak + 1
  }

  return {
    ...state,
    lastDailyDate: today,
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    dailyHistory: { ...state.dailyHistory, [today]: result },
  }
}

// The streak to show on `today`. currentStreak is only recalculated when a
// daily is finished, so after a missed day it still holds the old run; it is
// already broken unless the last daily was today or yesterday.
export function displayStreak(state: AppState, today: string): number {
  const last = state.lastDailyDate
  return last === today || last === getPreviousDay(today) ? state.currentStreak : 0
}

export function recordFunFactViewed(state: AppState, date: string): AppState {
  if (state.lastFunFactDate === date) return state
  const yesterday = getPreviousDay(date)
  const streakBroken = state.lastFunFactDate !== yesterday
  const newStreak = streakBroken ? 1 : (state.funFactStreak ?? 0) + 1
  return { ...state, lastFunFactDate: date, funFactStreak: newStreak }
}

export function saveShareResult(state: AppState, result: ShareResult): AppState {
  return { ...state, lastShareResult: result }
}

export function awardCrown(state: AppState, setId: string): AppState {
  if (state.crowns.includes(setId)) return state
  return { ...state, crowns: [...state.crowns, setId] }
}

export function setPremium(state: AppState, on: boolean): AppState {
  return { ...state, premium: on }
}

export function recordGamePlayed(state: AppState): AppState {
  return { ...state, gamesPlayed: (state.gamesPlayed ?? 0) + 1 }
}

// Read the Supporter flag straight from storage so ad components can gate
// themselves without threading AppState through every screen. Components
// re-evaluate this on the re-render that follows an owner unlock.
export function isSupporter(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? !!JSON.parse(raw).premium : false
  } catch {
    return false
  }
}

function getPreviousDay(dateStr: string): string {
  // Parse the y-m-d components and do the math purely in UTC so the result is
  // independent of the viewer's timezone / DST (todayString() is a local y-m-d).
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10)
}

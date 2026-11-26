// This browser's save, as the sync engine sees it (see ./engine.ts → Device).
import type { Device } from "./engine"
import { gameSnapshot, mergeIntoDevice } from "../utils/backup"
import { MAIN_KEY } from "../utils/mergeProgress"
import { loadState, saveState, setPremium } from "../utils/storage"

export const browserDevice: Device = {
  read: gameSnapshot,
  merge: mergeIntoDevice,
  grantSupporter() {
    const s = loadState()
    if (s.premium) return
    saveState(setPremium(s, true))
    // The open app re-reads its save (and ads hide) without a reload.
    try { window.dispatchEvent(new StorageEvent("storage", { key: MAIN_KEY })) } catch { /* not a browser */ }
  },
}

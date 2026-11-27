// What a player can write on their profile: the username rules and the bio
// rules. The database checks the same things (private.text_problem in the
// profiles migration), so the app can't be talked out of them; checking here
// first just gives a quicker, friendlier answer. See ./words.ts for how
// words are matched.
import { OFFENSIVE_ANYWHERE, OFFENSIVE_WORDS, RESERVED_ANYWHERE, RESERVED_WORDS } from "./words"

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
export const BIO_MAX = 120
/** 3–20 letters, digits or underscores, with at least one letter or digit. */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/

export type UsernameProblem = "format" | "offensive" | "reserved"
export type BioProblem = "length" | "link" | "offensive"

const LEET: Record<string, string> = { "0": "o", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g" }
const leet = (s: string, one: "i" | "l") => s.replace(/[01345789]/g, d => (d === "1" ? one : LEET[d] ?? d))
const collapse = (s: string) => s.replace(/(.)\1+/g, "$1")
/** A word that still reads as itself stretched out ("fuuuck"). */
const stretchable = (w: string) => w.length >= 4 && !/(.)\1/.test(w)

/** The three readings of one lower-case word (see ./words.ts). */
export function readings(word: string): string[] {
  return [...new Set([leet(word, "i"), leet(word, "l"), word.replace(/[0-9]/g, "")])].filter(Boolean)
}

function hits(words: string[], list: readonly string[], anywhere: boolean): boolean {
  for (const word of words) {
    for (const f of readings(word)) {
      const c = collapse(f)
      for (const w of list) {
        if (anywhere ? f.includes(w) : f === w) return true
        if (stretchable(w) && (anywhere ? c.includes(w) : c === w)) return true
      }
    }
  }
  return false
}

const offensive = (words: string[]) => hits(words, OFFENSIVE_ANYWHERE, true) || hits(words, OFFENSIVE_WORDS, false)

/** Why a username can't be used, or null when it can. Case doesn't matter
 *  for any rule (and "Ann" and "ann" are the same username). */
export function usernameProblem(name: string): UsernameProblem | null {
  if (typeof name !== "string" || !USERNAME_RE.test(name) || !/[A-Za-z0-9]/.test(name)) return "format"
  const low = name.toLowerCase()
  const words = [...low.split("_").filter(Boolean), low.replace(/_/g, "")]
  if (offensive(words)) return "offensive"
  if (hits(words, RESERVED_WORDS, false) || hits(words, RESERVED_ANYWHERE, true)) return "reserved"
  return null
}

export const USERNAME_MESSAGE: Record<UsernameProblem | "taken", string> = {
  format: `Use ${USERNAME_MIN}–${USERNAME_MAX} letters, numbers or _ (no spaces).`,
  offensive: "That one isn’t allowed. Try another.",
  reserved: "That one is reserved. Try another.",
  taken: "That one is taken. Try another.",
}

/** A bio as it's saved: one line, single spaces. */
export const cleanBio = (s: string) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "")
export const bioLength = (s: string) => Array.from(s).length

/** Why a bio can't be saved, or null. Empty is fine (no bio). */
export function bioProblem(bio: string): BioProblem | null {
  const b = cleanBio(bio)
  if (bioLength(b) > BIO_MAX) return "length"
  if (/(https?:|www\.|:\/\/)/i.test(b)) return "link"
  if (offensive(b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))) return "offensive"
  return null
}

export const BIO_MESSAGE: Record<BioProblem, string> = {
  length: `Keep it to ${BIO_MAX} characters.`,
  link: "Links can’t go in a bio.",
  offensive: "A word in there isn’t allowed. Try different words.",
}

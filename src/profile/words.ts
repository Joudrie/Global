// Words a username or bio may not use. The one list for the app; the database
// keeps the same words in private.username_words (see
// supabase/migrations/20261127100000_profiles.sql), and scripts/profiles.test.mjs
// fails if the two drift apart. The owner can add a word to the database alone
// at any time (an insert into private.username_words); the app's copy only
// saves a round trip.
//
// How a word is matched (src/profile/text.ts does it, and the database the
// same way): the text is lower-cased and split into words at anything that
// isn't a letter or digit (a username only splits at "_"). Each word is read
// three ways: with common leetspeak digits turned back into letters
// (0→o 1→i 3→e 4→a 5→s 7→t 8→b 9→g), the same with 1→l, and with every
// digit dropped. A username is also read as one word with the "_" removed.
//
// - ANYWHERE: blocked wherever it appears inside a word ("xfuckx").
// - WORDS: blocked only as a whole word ("ass" blocks "ass" and "a55",
//   not "class" or "bass").
// - RESERVED (usernames only): names people could mistake for Globalio or
//   its staff. RESERVED_WORDS match a whole word; RESERVED_ANYWHERE anywhere.
//
// A word with no letter twice in a row, 4 or more letters long, also matches
// stretched out ("fuuuck"). Kept modest on purpose: the owner can hide or
// rename any profile (see the end of the profiles migration).

export const OFFENSIVE_ANYWHERE = [
  "fuck", "shit", "cunt", "nigger", "nigga", "faggot", "fagot", "retard", "whore", "slut", "bitch",
  "bastard", "asshole", "arsehole", "dickhead", "cocksucker", "wanker", "twat", "penis",
  "vagina", "pussy", "dildo", "jizz", "cumshot", "porn", "hentai", "blowjob", "handjob",
  "molest", "pedophile", "paedophile", "hitler", "neonazi", "kkk", "wetback", "tranny",
  "kike", "bollock", "killyourself",
] as const

export const OFFENSIVE_WORDS = [
  "ass", "arse", "fag", "fags", "cum", "tit", "tits", "dick", "cock", "sex", "anal",
  "homo", "spic", "chink", "coon", "paki", "negro", "dyke", "rape", "rapist", "pedo",
  "paedo", "nazi", "nazis", "wank", "boob", "boobs", "kys", "spaz", "heil", "thot",
] as const

export const RESERVED_WORDS = [
  "admin", "administrator", "mod", "mods", "moderator", "globalio", "support", "staff",
  "official", "sean", "joudrie", "root", "system", "null", "undefined", "help", "team",
  "owner", "dev", "developer", "api", "www", "anonymous", "guest", "deleted", "unknown",
  "everyone", "nobody", "test", "username",
] as const

export const RESERVED_ANYWHERE = ["globalio", "joudrie", "moderator", "administrator"] as const

// Shared by collect.mjs / download.mjs / genhosted.mjs. canonName() and
// commonsFileOf() must match src/data/hostedUrl.ts (the app looks up
// HOSTED_FLAGS with the same canonical key).
export const DIR = "scripts/flags/cf"
export const FILES = `${DIR}/files.txt`
export const MAN = `${DIR}/manifest.json`
export const MISSING = `${DIR}/missing.json`
export const OUT = "public/cf"
export const UA = "GlobalioFlagFetcher/2.0 (https://globalio.app; sjoudrie@gmail.com)"

export function canonName(file) {
  let t = file
  if (t.includes("%")) {
    try { t = decodeURIComponent(t) } catch { /* bare % — keep as-is */ }
  }
  t = t.replace(/ /g, "_").normalize("NFC")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function commonsFileOf(url) {
  let m = url.match(/^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?#]+)/)
  if (m) return m[1]
  m = url.match(/^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)\//)
  if (m) return m[1]
  m = url.match(/^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/)
  return m ? m[1] : null
}

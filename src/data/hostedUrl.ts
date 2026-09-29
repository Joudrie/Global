import { HOSTED_FLAGS } from "./hostedFlags"

// Wikimedia URL/filename → our same-origin copy under /cf/ (scripts/flags/cf).
// Imports only HOSTED_FLAGS, so a screen can lazy-load it for a few images
// without pulling LOCAL_FLAGS. The full resolver is commonsFlag() in flagUrl.ts.

export const FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/"

/** Canonical Commons filename, the key HOSTED_FLAGS uses: percent-escapes
 *  decoded, spaces as underscores, NFC, first letter upper-case (as Commons does).
 *  Must match canonName() in scripts/flags/cf/common.mjs. */
export function canonName(file: string): string {
  let t = file
  if (t.includes("%")) {
    try { t = decodeURIComponent(t) } catch { /* bare % — keep as-is */ }
  }
  t = t.replace(/ /g, "_").normalize("NFC")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Commons filename inside a Wikimedia image URL (Special:FilePath, or an
 *  upload.wikimedia.org original or thumbnail), else null. */
export function commonsFileOf(url: string): string | null {
  let m = url.match(/^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?#]+)/)
  if (m) return m[1]
  m = url.match(/^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)\//)
  if (m) return m[1]
  m = url.match(/^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/)
  return m ? m[1] : null
}

/** Our hosted copy of a Commons file, if downloaded. */
export const hostedFile = (file: string): string | undefined => HOSTED_FLAGS[canonName(file)]

/** Any image URL → our hosted copy when it is a Wikimedia URL we have; else unchanged. */
export function hostUrl(url: string): string {
  const file = commonsFileOf(url)
  return (file && hostedFile(file)) || url
}

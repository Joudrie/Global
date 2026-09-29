import { LOCAL_FLAGS } from "./localFlags"
import { FILEPATH, hostUrl, hostedFile } from "./hostedUrl"

// One resolver for every Wikimedia Commons flag in the app. Order:
//   1. LOCAL_FLAGS (repairs, /flags/wm copies, "" = no flag). A repair that
//      points at another Commons file is itself resolved through step 2.
//   2. HOSTED_FLAGS: our same-origin copy under /cf/ (scripts/flags/cf).
//   3. The live Commons hotlink, so anything not yet hosted still renders.
// Keep this out of the home screen's initial bundle: both maps are large.

export { canonName, commonsFileOf, hostUrl, hostedFile } from "./hostedUrl"

/** Commons filename → the best image URL we can serve (see order above). */
export function commonsFlag(file: string): string {
  const local = LOCAL_FLAGS[file.replace(/ /g, "_")]
  if (local !== undefined) return local.startsWith("http") ? hostUrl(local) : local
  return hostedFile(file) ?? FILEPATH + file
}

// What the Codex's closed "Beyond countries" sections show before their data
// loads (it loads when a section opens), written out so the Codex tab opens
// without loading every gallery. scripts/bundle.test.mjs checks these match
// the data: update them when the galleries change.
export const CODEX_COUNTS = {
  /** Mega Codex A–Z: every flag in the app (megaCodex.ts ALL_FLAGS_AZ). */
  mega: 5018,
  /** Peoples & Cultures rows (codexGalleries.ts peoplesRegions). */
  peoples: 1163,
  /** The Identity categories shown as their own sections, in order. */
  identity: [["Pride & LGBTQ+", 44], ["Separatist & Autonomous", 142], ["Civic & Ideological", 42]] as [string, number][],
  micronations: 58,
  /** Extinct & Former States rows (codexGalleries.ts extinctRegions). */
  extinct: 570,
  /** City Flags (beta): Europe's and the U.S. cities (cityAtlas.ts ALL_ATLAS_CITIES). */
  cities: 615,
  orgs: 67,
  signal: 27,
  /** Coats of arms (beta): countries with one so far (coatsOfArms.ts COATS_OF_ARMS). */
  arms: 192,
}

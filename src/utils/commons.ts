// Per-entry citation (K2): the Wikimedia Commons file-description page for a
// flag, where its source and licence live. Only flags that resolve to Commons
// get a link; local and self-hosted copies have no Commons page, so they get
// none rather than a broken one.
export const commonsSource = (url: string): string | null => {
  const m = url.match(/Special:FilePath\/([^?#]+)/)
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : null
}

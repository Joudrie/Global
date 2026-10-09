// Vite plugin: resolves the data files' flag URLs at build time.
//
// codex.ts, historicalFlags.ts, identityFlags.ts and friends call
// fp("Some_flag.svg") hundreds of times as they load, and fp needs the
// LOCAL_FLAGS and HOSTED_FLAGS maps (src/data/flagUrl.ts, ~75 KB gzipped).
// Replacing each call that has a plain string argument with the URL it returns
// lets the bundler drop those maps from every screen that only reads the data.
// Calls with any other argument stay as they are and still work at run time.
// Node (tests, prerender) runs the same functions, so the values cannot drift.
import { commonsFlag } from '../src/data/flagUrl.ts'

const LITERAL = String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`
// Every data file's fp(), plus per-file helpers that wrap it.
const RESOLVERS = {
  fp: { file: /\/src\/data\/[^/]+\.ts$/, url: f => commonsFlag(f) },
  // challenges.ts: const wiki = (file) => commonsFlag(file.replace(/ /g, '_'))
  wiki: { file: /\/src\/data\/challenges\.ts$/, url: f => commonsFlag(f.replace(/ /g, '_')) },
}

export function flagUrlsPlugin() {
  return {
    name: 'flag-urls',
    enforce: 'pre', // see the TypeScript source, before it is compiled
    transform(code, id) {
      const names = Object.keys(RESOLVERS).filter(n => RESOLVERS[n].file.test(id))
      if (!names.length || /\/(flagUrl|hostedUrl)\.ts$/.test(id)) return
      const call = new RegExp(String.raw`\b(${names.join('|')})\(\s*${LITERAL}\s*\)`, 'g')
      let n = 0
      const out = code.replace(call, (_, name, lit) => {
        n++
        return JSON.stringify(RESOLVERS[name].url(Function(`return ${lit}`)()))
      })
      return n ? { code: out, map: null } : undefined
    },
  }
}

// Flag Fusion's poster: the example fusion (Brazil's layout, Afghanistan's
// emblem, Bhutan's colours) as one SVG, public/fusion/example.svg. The game
// tile, the start screen and How it works show it. Run after structures.mjs
// and stencils.mjs:
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/flag-fusion/poster.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const { exampleFusion, fusionSvg, emblemUrl } = await import(path.join(ROOT, 'src/utils/flagFusion.ts'))
const f = exampleFusion()
const stencil = fs.readFileSync(path.join(ROOT, 'public', emblemUrl(f.emblem.code)), 'utf8')
fs.writeFileSync(path.join(ROOT, 'public/fusion/example.svg'), fusionSvg(f, stencil) + '\n')
console.log(`[poster] ${f.structure.code} + ${f.emblem.code} + ${f.colours.code}: ${f.fill.join(' ')}, emblem ${f.tint}`)

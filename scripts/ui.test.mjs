// UI regressions found in QA, checked in the source (the tests run in Node,
// with no browser): layouts that broke at 320px, focus that jumped, copy
// that pointed at a feature that's switched off.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const components = fs.readdirSync(path.join(ROOT, 'src/components')).filter(f => f.endsWith('.tsx'))

/** Every `<input …/>` / `<textarea …/>` tag in a file, with its attributes. */
const fields = s => [...s.matchAll(/<(input|textarea)\b[\s\S]*?\/>/g)].map(m => m[0])

test('a text box that flexes in a row can shrink (no sideways scroll at 320px)', () => {
  // An <input> is ~20 characters wide by default; with flex: 1 and no
  // minWidth: 0 it pushed Flag Outline's Guess button off a 320px screen.
  const bad = []
  for (const f of components) {
    for (const tag of fields(read(`src/components/${f}`))) {
      if (tag.startsWith('<input') && /\bflex: 1\b/.test(tag) && !/minWidth: 0/.test(tag)) bad.push(`${f}: ${tag.slice(0, 80)}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('Edit profile sets itself up once, so saving a choice never moves the focus', () => {
  // Its setup (focus the heading, scroll to the designs, Escape) depended on
  // onClose, a new function on every render of the You tab: each saved
  // choice, the name and every sync re-ran it and the focus jumped away.
  const s = read('src/components/ProfileEditor.tsx')
  const setup = s.slice(s.indexOf('useEffect(() => {\n    const back'), s.indexOf('const save ='))
  assert.match(setup, /close\.current\(\)/, 'Escape closes through the ref')
  assert.match(setup, /\}, \[\]\)/, 'the setup effect has no dependencies')
  assert.doesNotMatch(setup, /\[onClose\]/)
})

test('profile, account and restore text boxes show a focus ring', () => {
  const css = read('src/index.css')
  assert.match(css, /\.pf-input:focus-visible \{ outline: 2px solid/)
  for (const f of ['YouProfile', 'ProfileEditor', 'FindPlayer', 'AccountCard', 'RestoreBackup']) {
    const s = read(`src/components/${f}.tsx`)
    for (const tag of fields(s)) {
      if (/type="(file|radio|checkbox)"/.test(tag)) continue
      assert.match(tag, /className="pf-input"/, `${f}: ${tag.slice(0, 60)}`)
    }
  }
  // inputStyle() in AccountCard and the editor's choice tiles used to switch the ring off.
  assert.doesNotMatch(read('src/components/AccountCard.tsx'), /outline: "none"/)
  assert.doesNotMatch(read('src/components/ProfileEditor.tsx').match(/const choice[\s\S]*?as const\)/)[0], /outline/)
})

test('Flag Fusion: the help pill is a 44px button with a name, icon-only on narrow phones', () => {
  const s = read('src/components/FlagFusionScreen.tsx')
  const help = s.slice(s.indexOf('function HelpButton'), s.indexOf('/* ── Start'))
  assert.match(help, /aria-label="How it works"/)
  assert.match(help, /height: 44, minWidth: 44/)
  assert.match(s, /@media \(max-width: 389px\) \{ \.ff-help \{ padding: 0; \} \.ff-help-label \{ display: none; \} \}/)
})

test('no message points to the email sign-in link while it is switched off', async () => {
  const { EMAIL_SIGNIN } = await import(path.join(ROOT, 'src/accounts.ts'))
  const s = read('src/account/service.ts')
  for (const m of s.matchAll(/^(?!\s*\/\/).*email link.*$/gm)) {
    assert.match(m[0], /EMAIL_SIGNIN \?/, `unguarded: ${m[0].trim().slice(0, 90)}`)
  }
  assert.equal(typeof EMAIL_SIGNIN, 'boolean')
})

test('the Daily Game keeps its name on the card and in Restore', () => {
  assert.match(read('src/components/ProfileView.tsx'), /label: "Daily Games"/)
  const restore = read('src/components/RestoreBackup.tsx')
  assert.doesNotMatch(restore, /[Dd]aily puzzle/)
  assert.match(restore, /"Daily Games played"/)
})

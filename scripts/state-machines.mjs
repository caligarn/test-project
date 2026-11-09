// Writes docs/state-machines.md from src/machines (Mermaid diagrams + tables).
//   node scripts/state-machines.mjs          write the file
//   node scripts/state-machines.mjs --check  exit 1 if the file is out of date
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { renderMachinesDoc } from './stateMachinesDoc.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'docs', 'state-machines.md')
const { MACHINES } = await import('../src/machines/index.js')
const text = renderMachinesDoc(MACHINES)

if (process.argv.includes('--check')) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : ''
  if (current !== text) {
    console.error('docs/state-machines.md is out of date. Run: npm run docs:machines')
    process.exit(1)
  }
  console.log('docs/state-machines.md is up to date')
} else {
  writeFileSync(out, text)
  console.log(`Wrote docs/state-machines.md (${MACHINES.length} machines)`)
}

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const swPath = resolve('dist/sw.js')
const handler = readFileSync('src/sw/sw-push-handler.js', 'utf8')
const existing = readFileSync(swPath, 'utf8')

if (!existing.includes('addEventListener(\'push\'')) {
  writeFileSync(swPath, existing + '\n\n// === Push & Sync Handler ===\n' + handler)
  console.log('✓ Push handler berhasil ditambahkan ke dist/sw.js')
} else {
  console.log('✓ Push handler sudah ada, skip.')
}
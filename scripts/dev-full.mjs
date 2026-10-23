// Lance en une commande le Worker + D1 local (wrangler dev, port 8787) et le
// serveur Vite (port 5173), qui redirige /api vers le Worker (vite.config.js).
//   npm run dev:full
// Ouvrir http://localhost:5173. Ctrl+C arrête les deux.
//
// wrangler dev exécute d'abord build.command (npm run build) pour servir
// dist/ ; seul Vite sert le site en développement, avec rechargement à chaud.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
if (!existsSync(resolve(root, '.dev.vars'))) {
  console.warn('⚠ .dev.vars absent : lancez `npm run admin:set-password` pour activer l’espace admin.')
}

const children = [
  spawn('npx', ['wrangler', 'dev', '--port', '8787', '--ip', '127.0.0.1'], { cwd: root, stdio: 'inherit' }),
  spawn('npx', ['vite'], { cwd: root, stdio: 'inherit' }),
]

let stopping = false
const stop = (code = 0) => {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  process.exitCode = code
}
for (const child of children) child.on('exit', (code) => stop(code ?? 0))
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

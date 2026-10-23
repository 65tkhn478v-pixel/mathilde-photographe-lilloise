// Définit le mot de passe de l'espace admin en local.
//   npm run admin:set-password
// Demande le mot de passe deux fois (saisie masquée), génère un hash
// PBKDF2-SHA256 et un SESSION_SECRET aléatoire, puis écrit .dev.vars (ignoré
// par git). Le mot de passe en clair n'est écrit nulle part.
//
// 100 000 itérations : c'est le maximum accepté par PBKDF2 dans les Workers
// Cloudflare (au-delà, crypto.subtle.deriveBits échoue).

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

const ITERATIONS = 100_000
const DEV_VARS = resolve(import.meta.dirname, '..', '.dev.vars')
const MIN_LENGTH = 12

function askHidden(prompt) {
  return new Promise((resolvePromise, reject) => {
    const { stdin, stdout } = process
    stdout.write(prompt)
    if (!stdin.isTTY) {
      // Entrée redirigée (tests automatisés) : lecture d'une ligne, sans écho.
      let buf = ''
      const onData = (chunk) => {
        buf += chunk
        const i = buf.indexOf('\n')
        if (i !== -1) {
          stdin.off('data', onData)
          stdin.pause()
          stdin.unshift(Buffer.from(buf.slice(i + 1)))
          stdout.write('\n')
          resolvePromise(buf.slice(0, i).replace(/\r$/, ''))
        }
      }
      stdin.setEncoding('utf8')
      stdin.on('data', onData)
      stdin.resume()
      return
    }
    let value = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onKey = (key) => {
      for (const ch of key) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onKey)
          stdout.write('\n')
          resolvePromise(value)
          return
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false)
          stdout.write('\n')
          reject(new Error('Annulé.'))
          return
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1)
        else value += ch
      }
    }
    stdin.on('data', onKey)
  })
}

const password = await askHidden('Nouveau mot de passe admin : ')
if (password.length < MIN_LENGTH) {
  console.error(`Le mot de passe doit faire au moins ${MIN_LENGTH} caractères.`)
  process.exit(1)
}
const confirm = await askHidden('Confirmez le mot de passe : ')
if (password !== confirm) {
  console.error('Les deux saisies ne correspondent pas. Rien n’a été modifié.')
  process.exit(1)
}

const salt = randomBytes(16)
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256')
const values = {
  ADMIN_PASSWORD_HASH: `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`,
  SESSION_SECRET: randomBytes(32).toString('base64url'),
}

// Conserve les autres variables éventuellement présentes dans .dev.vars.
const kept = existsSync(DEV_VARS)
  ? readFileSync(DEV_VARS, 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !/^(ADMIN_PASSWORD_HASH|SESSION_SECRET)=/.test(line))
  : []
const lines = [...kept, ...Object.entries(values).map(([k, v]) => `${k}="${v}"`)]
writeFileSync(DEV_VARS, `${lines.join('\n')}\n`, { mode: 0o600 })

console.log('.dev.vars mis à jour (ADMIN_PASSWORD_HASH et SESSION_SECRET).')
console.log('Redémarrez `npm run dev:full` pour prendre en compte le nouveau mot de passe.')
console.log('En production : copiez ces deux valeurs avec `wrangler secret put` (voir README).')

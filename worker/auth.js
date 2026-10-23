// Session admin : cookie signé HMAC-SHA256, sans état côté serveur.
// Changer SESSION_SECRET invalide toutes les sessions en cours.

import { SESSION_DAYS } from '../shared/booking.js'
import { hmacSign, hmacVerify } from './crypto.js'

const COOKIE_NAME = 'ml_session'
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60

function cookieAttributes(maxAge) {
  return `Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}

export async function createSessionCookie(env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const payload = `v1.${exp}`
  const sig = await hmacSign(env.SESSION_SECRET, payload)
  return `${COOKIE_NAME}=${payload}.${sig}; ${cookieAttributes(SESSION_SECONDS)}`
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; ${cookieAttributes(0)}`
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

export async function hasValidSession(request, env) {
  if (!env.SESSION_SECRET) return false
  const value = readCookie(request, COOKIE_NAME)
  if (!value) return false
  const match = /^(v1\.(\d+))\.([A-Za-z0-9_-]+)$/.exec(value)
  if (!match) return false
  const [, payload, exp, sig] = match
  if (Number(exp) * 1000 <= Date.now()) return false
  return hmacVerify(env.SESSION_SECRET, payload, sig)
}

/**
 * Protection CSRF des requêtes admin modifiantes, en plus de SameSite=Strict :
 * l'en-tête Origin doit être présent et correspondre à l'hôte appelé.
 */
export function isSameOrigin(request) {
  const origin = request.headers.get('Origin')
  if (!origin) return false
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

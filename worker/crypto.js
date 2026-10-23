// Primitives Web Crypto (natives dans les Workers) : PBKDF2, HMAC, aléa.

const encoder = new TextEncoder()

export function base64ToBytes(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export function bytesToBase64Url(bytes) {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return base64ToBytes(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
}

/** Comparaison en temps constant (indépendant de la position de la 1re différence). */
export function timingSafeEqual(a, b) {
  const x = new Uint8Array(a)
  const y = new Uint8Array(b)
  let diff = x.length ^ y.length
  const len = Math.max(x.length, y.length)
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

/**
 * Vérifie un mot de passe contre un hash "pbkdf2$<itérations>$<sel base64>$<hash base64>"
 * (PBKDF2-HMAC-SHA256, produit par scripts/set-admin-password.mjs).
 */
export async function verifyPassword(password, stored) {
  const parts = (stored ?? '').split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 1) return false
  let salt, expected
  try {
    salt = base64ToBytes(parts[2])
    expected = base64ToBytes(parts[3])
  } catch {
    return false
  }
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    expected.length * 8
  )
  return timingSafeEqual(bits, expected)
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export async function hmacSign(secret, message) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(message))
  return bytesToBase64Url(sig)
}

/** Vérification HMAC en temps constant (crypto.subtle.verify). */
export async function hmacVerify(secret, message, signature) {
  let sig
  try {
    sig = base64UrlToBytes(signature)
  } catch {
    return false
  }
  return crypto.subtle.verify('HMAC', await hmacKey(secret), sig, encoder.encode(message))
}

export function randomString(alphabet, length) {
  // Rejet des octets hors multiple de la taille de l'alphabet : pas de biais.
  const limit = 256 - (256 % alphabet.length)
  let out = ''
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < limit && out.length < length) out += alphabet[b % alphabet.length]
    }
  }
  return out
}

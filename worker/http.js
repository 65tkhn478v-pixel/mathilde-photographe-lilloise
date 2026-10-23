// Réponses JSON de l'API. Messages en français, sans détail technique.

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  })
}

export function error(status, message, extra = {}) {
  return json({ error: message, ...extra }, status)
}

export const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans un instant.'

const MAX_BODY_BYTES = 16 * 1024

/** Lit un corps JSON (objet), ou renvoie null s'il est absent, trop gros ou invalide. */
export async function readJson(request) {
  const text = await request.text()
  if (!text || text.length > MAX_BODY_BYTES) return null
  try {
    const data = JSON.parse(text)
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') ?? 'local'
}

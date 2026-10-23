// Compteurs anti-abus en D1. Le sujet est un HMAC de l'IP : l'adresse IP en
// clair n'est jamais stockée.

import { hmacSign } from './crypto.js'

export async function ipSubject(env, ip) {
  return hmacSign(env.SESSION_SECRET ?? 'local', `ip:${ip}`)
}

const minutesAgo = (now, minutes) => new Date(now.getTime() - minutes * 60_000).toISOString()

/** Vrai si le sujet est actuellement bloqué pour cette action. */
export async function isBlocked(db, subject, action, now) {
  const row = await db
    .prepare('SELECT blocked_until FROM rate_limits WHERE subject = ? AND action = ?')
    .bind(subject, action)
    .first()
  return Boolean(row?.blocked_until && row.blocked_until > now.toISOString())
}

/**
 * Incrémente le compteur dans une fenêtre glissante de `windowMinutes`.
 * Si `blockMinutes` est fourni et que le compteur atteint `limit`, bloque le
 * sujet pour cette durée. Renvoie le nombre d'occurrences dans la fenêtre.
 */
export async function hit(db, subject, action, { now, windowMinutes, limit, blockMinutes }) {
  const nowIso = now.toISOString()
  const cutoff = minutesAgo(now, windowMinutes)
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (subject, action, count, window_start) VALUES (?1, ?2, 1, ?3)
       ON CONFLICT (subject, action) DO UPDATE SET
         count = CASE WHEN window_start < ?4 THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN window_start < ?4 THEN ?3 ELSE window_start END
       RETURNING count`
    )
    .bind(subject, action, nowIso, cutoff)
    .first()
  if (blockMinutes && row.count >= limit) {
    await db
      .prepare('UPDATE rate_limits SET blocked_until = ? WHERE subject = ? AND action = ?')
      .bind(new Date(now.getTime() + blockMinutes * 60_000).toISOString(), subject, action)
      .run()
  }
  return row.count
}

export async function reset(db, subject, action) {
  await db.prepare('DELETE FROM rate_limits WHERE subject = ? AND action = ?').bind(subject, action).run()
}

/** Nettoyage opportuniste des compteurs périmés (plus d'un jour). */
export async function sweep(db, now) {
  await db
    .prepare('DELETE FROM rate_limits WHERE window_start < ? AND (blocked_until IS NULL OR blocked_until < ?)')
    .bind(minutesAgo(now, 24 * 60), now.toISOString())
    .run()
}

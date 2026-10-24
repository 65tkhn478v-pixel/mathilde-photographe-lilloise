// API admin. Toutes les routes sauf /login exigent une session valide
// (vérifiée dans worker/index.js).

import {
  DAY_LAST_END,
  DAY_START_TIMES,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MINUTES,
  RETENTION_MONTHS,
  SLOT_DURATIONS,
} from '../shared/booking.js'
import { addDays, zonedToUtc, dateKey, formatRange, timeKey, weekStart } from '../shared/time.js'
import { clearSessionCookie, createSessionCookie } from './auth.js'
import { verifyPassword } from './crypto.js'
import {
  ACTIVE,
  adminSlotById,
  adminSlotsBetween,
  bookingById,
  bookingsWhere,
  overlapping,
  pendingCount,
  serializeAdminSlot,
} from './db.js'
import { clientIp, error, json, readJson } from './http.js'
import { hit, ipSubject, isBlocked, reset, sweep } from './rateLimit.js'

const LOGIN_FAILED = 'Mot de passe incorrect.'
const LOGIN_BLOCKED = 'Trop de tentatives. Réessayez dans un quart d’heure.'
const NOT_FOUND = 'Élément introuvable. Il a peut-être déjà été supprimé.'

// ---- Session ---------------------------------------------------------------

export async function login(request, env) {
  if (!env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) {
    return error(503, 'Espace non configuré : le mot de passe administrateur n’a pas encore été défini.')
  }
  const db = env.DB
  const now = new Date()
  await sweep(db, now)
  const subject = await ipSubject(env, clientIp(request))
  if (await isBlocked(db, subject, 'login', now)) return error(429, LOGIN_BLOCKED)

  const body = await readJson(request)
  const password = typeof body?.password === 'string' ? body.password : ''
  const ok = password.length > 0 && password.length <= 256 && (await verifyPassword(password, env.ADMIN_PASSWORD_HASH))

  if (!ok) {
    await hit(db, subject, 'login', {
      now,
      windowMinutes: LOGIN_WINDOW_MINUTES,
      limit: LOGIN_MAX_FAILURES,
      blockMinutes: LOGIN_WINDOW_MINUTES,
    })
    return error(401, LOGIN_FAILED)
  }

  await reset(db, subject, 'login')
  return json({ authenticated: true }, 200, { 'Set-Cookie': await createSessionCookie(env) })
}

export function logout() {
  return json({ authenticated: false }, 200, { 'Set-Cookie': clearSessionCookie() })
}

export async function session(request, env) {
  return json({ authenticated: true, pending_count: await pendingCount(env.DB) })
}

// ---- Créneaux --------------------------------------------------------------

const isIso = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))

export async function listSlots(request, env) {
  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (!isIso(from) || !isIso(to)) return error(422, 'Période invalide.')
  const nowIso = new Date().toISOString()
  const rows = await adminSlotsBetween(env.DB, new Date(from).toISOString(), new Date(to).toISOString())
  return json({ slots: rows.map((r) => serializeAdminSlot(r, nowIso)), pending_count: await pendingCount(env.DB) })
}

/**
 * Vue mensuelle : créneaux du mois et des semaines visibles avant / après
 * (grille du lundi au dimanche), découpés en jours de Paris, avec leur
 * demande active éventuelle. Un seul appel par mois affiché.
 */
export async function calendar(request, env) {
  const month = new URL(request.url).searchParams.get('month') ?? ''
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return error(422, 'Mois invalide.')
  const first = `${month}-01`
  const nextMonth = Number(m[2]) === 12 ? `${Number(m[1]) + 1}-01-01` : `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-01`
  const gridStart = weekStart(first)
  const gridEnd = addDays(weekStart(addDays(nextMonth, -1)), 7)
  const nowIso = new Date().toISOString()
  const rows = await adminSlotsBetween(
    env.DB,
    zonedToUtc(gridStart, '00:00').toISOString(),
    zonedToUtc(gridEnd, '00:00').toISOString()
  )
  return json({
    month,
    grid_start: gridStart,
    grid_end: gridEnd,
    slots: rows.map((r) => serializeAdminSlot(r, nowIso)),
    pending_count: await pendingCount(env.DB),
  })
}

// ---- Jour (panneau de saisie rapide) ---------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function dayBounds(date) {
  const from = zonedToUtc(date, '00:00')
  const to = zonedToUtc(addDays(date, 1), '00:00')
  return from && to ? [from.toISOString(), to.toISOString()] : null
}

async function dayState(env, date, bounds) {
  const nowIso = new Date().toISOString()
  const rows = await adminSlotsBetween(env.DB, bounds[0], bounds[1])
  return {
    date,
    slots: rows.map((r) => serializeAdminSlot(r, nowIso)),
    pending_count: await pendingCount(env.DB),
  }
}

export async function getDay(request, env, { date }) {
  const bounds = DATE_PATTERN.test(date) && dayBounds(date)
  if (!bounds) return error(422, 'Date invalide.')
  return json(await dayState(env, date, bounds))
}

/**
 * Remplace les créneaux d'un jour par la liste reçue (heure de Paris).
 * Crée les nouveaux, supprime les créneaux retirés (jamais un créneau ayant
 * une demande active), en une seule opération atomique.
 */
export async function putDay(request, env, { date }) {
  const bounds = DATE_PATTERN.test(date) && dayBounds(date)
  if (!bounds) return error(422, 'Date invalide.')
  const now = new Date()
  const nowIso = now.toISOString()
  if (date < dateKey(now)) return error(422, 'Ce jour est passé : ses créneaux ne peuvent plus être modifiés.')

  const body = await readJson(request)
  const inputs = Array.isArray(body?.slots) ? body.slots : null
  if (!inputs || inputs.length > 60) return error(422, 'Liste de créneaux invalide.')

  const wanted = []
  for (const input of inputs) {
    const start = zonedToUtc(date, input?.start)
    const end = zonedToUtc(date, input?.end)
    if (!start || !end) {
      return error(422, "Horaire invalide (cette heure n'existe pas ce jour-là, à cause du changement d'heure).")
    }
    if (end <= start) return error(422, "L'heure de fin doit être après l'heure de début.")
    const key = `${start.toISOString()}|${end.toISOString()}`
    if (!wanted.some((w) => w.key === key)) {
      wanted.push({ key, start_at: start.toISOString(), end_at: end.toISOString(), startTime: input.start, endTime: input.end })
    }
  }

  const db = env.DB
  const existing = await adminSlotsBetween(db, bounds[0], bounds[1])
  const keyOf = (s) => `${s.start_at}|${s.end_at}`
  const kept = existing.filter((s) => wanted.some((w) => w.key === keyOf(s)))
  const removed = existing.filter((s) => !kept.includes(s))
  const created = wanted.filter((w) => !existing.some((s) => keyOf(s) === w.key))

  const lockedRemoved = removed.filter((s) => s.booking_id)
  if (lockedRemoved.length) {
    const s = lockedRemoved[0]
    return error(
      409,
      `Le créneau ${formatRange(s.start_at, s.end_at)} est réservé (${s.first_name}) : il ne peut pas être retiré ici. Gérez la demande dans l’onglet Demandes.`
    )
  }

  for (const w of created) {
    const minutes = (Date.parse(w.end_at) - Date.parse(w.start_at)) / 60_000
    if (!DAY_START_TIMES.includes(w.startTime)) {
      return error(422, 'Les nouveaux créneaux commencent entre 8h00 et 20h00, toutes les 30 minutes.')
    }
    if (!SLOT_DURATIONS.includes(minutes)) return error(422, 'Les nouveaux créneaux durent 1h ou 2h.')
    if (w.endTime > DAY_LAST_END) {
      return error(422, `Le créneau de ${formatRange(w.start_at, w.end_at)} finirait après 21h : les créneaux se terminent au plus tard à 21h00.`)
    }
    if (w.start_at <= nowIso) return error(422, `Le créneau de ${formatRange(w.start_at, w.end_at)} est déjà passé.`)
  }

  // Aucun chevauchement impliquant un nouveau créneau.
  const final = [...kept.map((s) => ({ start_at: s.start_at, end_at: s.end_at })), ...created]
  for (const w of created) {
    const clash = final.find((o) => o !== w && o.start_at < w.end_at && o.end_at > w.start_at)
    if (clash) {
      return error(
        422,
        `Les créneaux ${formatRange(w.start_at, w.end_at)} et ${formatRange(clash.start_at, clash.end_at)} se chevauchent.`
      )
    }
  }

  const statements = [
    // Garde-fou : si une demande arrive entre-temps, le créneau n'est pas supprimé.
    ...removed.map((s) =>
      db
        .prepare(`DELETE FROM slots WHERE id = ? AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = slots.id AND b.status IN ${ACTIVE})`)
        .bind(s.id)
    ),
    ...created.map((w) =>
      db.prepare('INSERT INTO slots (start_at, end_at, closed, created_at) VALUES (?, ?, 0, ?)').bind(w.start_at, w.end_at, nowIso)
    ),
  ]
  if (statements.length) await db.batch(statements)

  return json({ ...(await dayState(env, date, bounds)), created: created.length, deleted: removed.length })
}

/** Convertit { date, start, end } (heure de Paris) en instants UTC validés. */
function parseSlotInput(input, nowIso) {
  const start = zonedToUtc(input?.date, input?.start)
  const end = zonedToUtc(input?.date, input?.end)
  if (!start || !end) return { error: "Date ou horaire invalide (attention aux heures qui n'existent pas lors du changement d'heure)." }
  if (end <= start) return { error: "L'heure de fin doit être après l'heure de début." }
  if (input.end > DAY_LAST_END) return { error: 'Les créneaux se terminent au plus tard à 21h00.' }
  if (start.toISOString() <= nowIso) return { error: 'Ce créneau est déjà passé.' }
  return { start_at: start.toISOString(), end_at: end.toISOString() }
}

export async function createSlots(request, env) {
  const body = await readJson(request)
  const inputs = Array.isArray(body?.slots) ? body.slots : null
  if (!inputs || inputs.length === 0 || inputs.length > 50) return error(422, 'Aucun créneau à créer.')

  const now = new Date()
  const nowIso = now.toISOString()
  const parsed = []
  for (const input of inputs) {
    const p = parseSlotInput(input, nowIso)
    if (p.error) return error(422, p.error)
    parsed.push(p)
  }

  const created = []
  const overlaps = []
  for (const p of parsed) {
    const conflicts = await overlapping(env.DB, p.start_at, p.end_at)
    const row = await env.DB
      .prepare('INSERT INTO slots (start_at, end_at, closed, created_at) VALUES (?, ?, 0, ?) RETURNING id')
      .bind(p.start_at, p.end_at, nowIso)
      .first()
    created.push({ id: row.id, ...p })
    if (conflicts.length) overlaps.push({ slot: { id: row.id, ...p }, with: conflicts })
  }
  return json({ created, overlaps }, 201)
}

export async function duplicateWeek(request, env) {
  const body = await readJson(request)
  const weekStartKey = body?.week_start
  const weeks = Number(body?.weeks)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartKey ?? '') || !Number.isInteger(weeks) || weeks < 1 || weeks > 8) {
    return error(422, 'Choisissez une semaine et un nombre de semaines entre 1 et 8.')
  }
  const from = zonedToUtc(weekStartKey, '00:00')
  const to = zonedToUtc(addDays(weekStartKey, 7), '00:00')
  if (!from || !to) return error(422, 'Semaine invalide.')

  const db = env.DB
  const nowIso = new Date().toISOString()
  const source = await adminSlotsBetween(db, from.toISOString(), to.toISOString())
  if (source.length === 0) return json({ created: 0, skipped: 0, source: 0 })

  let created = 0
  let skipped = 0
  const statements = []
  const seen = new Set()
  for (let k = 1; k <= weeks; k++) {
    for (const slot of source) {
      // Même heure de Paris, 7×k jours plus tard : un créneau à 14h reste à
      // 14h même si la semaine cible est de l'autre côté d'un changement d'heure.
      const start = zonedToUtc(addDays(dateKey(new Date(slot.start_at)), 7 * k), timeKey(new Date(slot.start_at)))
      const end = zonedToUtc(addDays(dateKey(new Date(slot.end_at)), 7 * k), timeKey(new Date(slot.end_at)))
      if (!start || !end || end <= start || start.toISOString() <= nowIso) {
        skipped++
        continue
      }
      const key = `${start.toISOString()}|${end.toISOString()}`
      const existing = await db
        .prepare('SELECT 1 FROM slots WHERE start_at = ? AND end_at = ?')
        .bind(start.toISOString(), end.toISOString())
        .first()
      if (existing || seen.has(key)) {
        skipped++
        continue
      }
      seen.add(key)
      statements.push(
        db
          .prepare('INSERT INTO slots (start_at, end_at, closed, created_at) VALUES (?, ?, 0, ?)')
          .bind(start.toISOString(), end.toISOString(), nowIso)
      )
      created++
    }
  }
  if (statements.length) await db.batch(statements)
  return json({ created, skipped, source: source.length })
}

export async function updateSlot(request, env, { id }) {
  const body = await readJson(request)
  if (typeof body?.closed !== 'boolean') return error(422, 'Action invalide.')
  const slot = await adminSlotById(env.DB, id)
  if (!slot) return error(404, NOT_FOUND)
  if (body.closed && slot.booking_id) {
    return error(409, 'Ce créneau a une demande en cours : refusez-la avant de fermer le créneau.')
  }
  await env.DB.prepare('UPDATE slots SET closed = ? WHERE id = ?').bind(body.closed ? 1 : 0, id).run()
  const updated = await adminSlotById(env.DB, id)
  return json({ slot: serializeAdminSlot(updated, new Date().toISOString()) })
}

export async function deleteSlot(request, env, { id }) {
  const slot = await adminSlotById(env.DB, id)
  if (!slot) return error(404, NOT_FOUND)
  if (slot.booking_id) {
    return error(409, 'Ce créneau a une demande en cours : refusez-la ou supprimez-la avant de supprimer le créneau.')
  }
  // Les demandes refusées liées à ce créneau sont effacées avec lui (ON DELETE CASCADE).
  await env.DB.prepare('DELETE FROM slots WHERE id = ?').bind(id).run()
  return json({ deleted: true })
}

// ---- Demandes --------------------------------------------------------------

const DECLINED_RECENT_DAYS = 30

export async function listBookings(request, env) {
  const db = env.DB
  const now = new Date()
  const nowIso = now.toISOString()
  const recent = new Date(now.getTime() - DECLINED_RECENT_DAYS * 86_400_000).toISOString()
  const [pending, confirmed, declined] = await Promise.all([
    bookingsWhere(db, "b.status = 'pending'", []),
    bookingsWhere(db, "b.status = 'confirmed' AND s.end_at > ?", [nowIso]),
    bookingsWhere(db, "b.status = 'declined' AND b.decided_at >= ? AND s.end_at > ?", [recent, nowIso], 'b.decided_at DESC'),
  ])
  return json({ pending, confirmed, declined, pending_count: pending.length })
}

async function decide(env, id, from, to) {
  const booking = await bookingById(env.DB, id)
  if (!booking) return error(404, NOT_FOUND)
  if (!from.includes(booking.status)) return error(409, 'Cette demande a déjà été traitée.')
  try {
    await env.DB
      .prepare('UPDATE bookings SET status = ?, decided_at = ? WHERE id = ?')
      .bind(to, new Date().toISOString(), id)
      .run()
  } catch (err) {
    // Repasser une demande refusée en active alors qu'une autre a pris le créneau.
    if (String(err?.message).includes('UNIQUE')) return error(409, 'Ce créneau est déjà pris par une autre demande.')
    throw err
  }
  return json({ booking: await bookingById(env.DB, id), pending_count: await pendingCount(env.DB) })
}

export const confirmBooking = (request, env, { id }) => decide(env, id, ['pending'], 'confirmed')
// Refuser libère le créneau : il n'a plus de demande active, il redevient ouvert.
export const declineBooking = (request, env, { id }) => decide(env, id, ['pending', 'confirmed'], 'declined')

export async function deleteBooking(request, env, { id }) {
  const result = await env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run()
  if (!result.meta.changes) return error(404, NOT_FOUND)
  return json({ deleted: true, pending_count: await pendingCount(env.DB) })
}

// ---- Historique et purge ---------------------------------------------------

function retentionCutoff(now) {
  const d = new Date(now)
  d.setUTCMonth(d.getUTCMonth() - RETENTION_MONTHS)
  return d.toISOString()
}

export async function history(request, env) {
  const db = env.DB
  const nowIso = new Date().toISOString()
  const { results: slots } = await db
    .prepare('SELECT id, start_at, end_at, closed FROM slots WHERE end_at <= ? ORDER BY start_at DESC LIMIT 300')
    .bind(nowIso)
    .all()
  const bookings = await bookingsWhere(db, 's.end_at <= ?', [nowIso], 's.start_at DESC, b.created_at')
  const bySlot = new Map()
  for (const b of bookings) {
    if (!bySlot.has(b.slot.id)) bySlot.set(b.slot.id, [])
    bySlot.get(b.slot.id).push(b)
  }
  const purgeable = await db
    .prepare('SELECT COUNT(*) AS n FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.start_at < ?')
    .bind(retentionCutoff(new Date()))
    .first()
  return json({
    slots: slots.map((s) => ({ ...s, closed: Boolean(s.closed), bookings: bySlot.get(s.id) ?? [] })),
    purgeable: purgeable.n,
    retention_months: RETENTION_MONTHS,
  })
}

/** Efface les demandes dont la séance date de plus de RETENTION_MONTHS mois (et ces vieux créneaux). */
export async function purge(request, env) {
  const cutoff = retentionCutoff(new Date())
  const [bookings, slots] = await env.DB.batch([
    env.DB.prepare('DELETE FROM bookings WHERE slot_id IN (SELECT id FROM slots WHERE start_at < ?)').bind(cutoff),
    env.DB.prepare(`DELETE FROM slots WHERE start_at < ? AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = slots.id AND b.status IN ${ACTIVE})`).bind(cutoff),
  ])
  return json({ deleted_bookings: bookings.meta.changes, deleted_slots: slots.meta.changes })
}

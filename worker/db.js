// Requêtes D1 partagées. L'état d'un créneau n'est jamais stocké : il est
// déduit de `closed`, de la demande active éventuelle et de la date.

export const ACTIVE = "('pending', 'confirmed')"

const SLOT_WITH_ACTIVE_BOOKING = `
  SELECT s.id, s.start_at, s.end_at, s.closed,
         b.id AS booking_id, b.status AS booking_status, b.reference,
         b.session_type, b.first_name, b.last_name
  FROM slots s
  LEFT JOIN bookings b ON b.slot_id = s.id AND b.status IN ${ACTIVE}`

export function slotState(row, nowIso) {
  if (row.booking_status === 'confirmed') return 'confirmed'
  if (row.booking_status === 'pending') return 'pending'
  if (row.end_at <= nowIso) return 'past'
  if (row.closed) return 'closed'
  return 'open'
}

export function serializeAdminSlot(row, nowIso) {
  return {
    id: row.id,
    start_at: row.start_at,
    end_at: row.end_at,
    closed: Boolean(row.closed),
    state: slotState(row, nowIso),
    booking: row.booking_id
      ? {
          id: row.booking_id,
          status: row.booking_status,
          reference: row.reference,
          session_type: row.session_type,
          first_name: row.first_name,
          last_name: row.last_name,
        }
      : null,
  }
}

export async function adminSlotsBetween(db, fromIso, toIso) {
  const { results } = await db
    .prepare(`${SLOT_WITH_ACTIVE_BOOKING} WHERE s.start_at >= ? AND s.start_at < ? ORDER BY s.start_at`)
    .bind(fromIso, toIso)
    .all()
  return results
}

export async function adminSlotById(db, id) {
  return db.prepare(`${SLOT_WITH_ACTIVE_BOOKING} WHERE s.id = ?`).bind(id).first()
}

/** Créneaux réservables : futurs, non fermés, sans demande active. */
export async function availableSlots(db, nowIso) {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.start_at, s.end_at FROM slots s
       WHERE s.closed = 0 AND s.start_at > ?
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status IN ${ACTIVE})
       ORDER BY s.start_at
       LIMIT 500`
    )
    .bind(nowIso)
    .all()
  return results
}

export async function overlapping(db, startIso, endIso) {
  const { results } = await db
    .prepare('SELECT id, start_at, end_at FROM slots WHERE start_at < ? AND end_at > ? ORDER BY start_at')
    .bind(endIso, startIso)
    .all()
  return results
}

const BOOKING_COLUMNS = `
  b.id, b.reference, b.session_type, b.first_name, b.last_name, b.email, b.phone,
  b.message, b.status, b.created_at, b.decided_at,
  s.id AS slot_id, s.start_at, s.end_at`

export function serializeBooking(row) {
  return {
    id: row.id,
    reference: row.reference,
    session_type: row.session_type,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    created_at: row.created_at,
    decided_at: row.decided_at,
    slot: { id: row.slot_id, start_at: row.start_at, end_at: row.end_at },
  }
}

export async function bookingsWhere(db, where, binds, order = 's.start_at') {
  const { results } = await db
    .prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE ${where} ORDER BY ${order}`)
    .bind(...binds)
    .all()
  return results.map(serializeBooking)
}

export async function bookingById(db, id) {
  const row = await db
    .prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE b.id = ?`)
    .bind(id)
    .first()
  return row ? serializeBooking(row) : null
}

export async function pendingCount(db) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending'").first()
  return row.n
}

export function isUniqueViolation(err, column) {
  const msg = String(err?.message ?? err)
  return msg.includes('UNIQUE constraint failed') && msg.includes(column)
}

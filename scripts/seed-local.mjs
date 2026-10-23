// Données fictives pour la base D1 LOCALE uniquement (jamais une migration) :
//   npm run db:seed:local
// Vide les tables puis crée des créneaux sur les deux prochaines semaines
// (jours ouvrés), dont un « en attente » et un « confirmé » au nom de
// « Client Test », plus un créneau passé avec une demande pour l'historique.

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { addDays, dateKey, zonedToUtc } from '../shared/time.js'

const root = resolve(import.meta.dirname, '..')
const now = new Date()
const nowIso = now.toISOString()
const today = dateKey(now)
const q = (v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)

const slots = []
for (let day = 1; day <= 14; day++) {
  const key = addDays(today, day)
  const weekday = (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7 // 0 = lundi
  if (weekday > 4) continue
  for (const [start, end] of weekday % 2 === 0 ? [['10:00', '12:00'], ['14:00', '16:00']] : [['14:00', '16:00']]) {
    slots.push({ start: zonedToUtc(key, start).toISOString(), end: zonedToUtc(key, end).toISOString() })
  }
}
// Un créneau passé (historique).
const pastKey = addDays(today, -10)
slots.unshift({ start: zonedToUtc(pastKey, '14:00').toISOString(), end: zonedToUtc(pastKey, '16:00').toISOString() })

const sql = [
  'DELETE FROM bookings;',
  'DELETE FROM slots;',
  'DELETE FROM rate_limits;',
  "DELETE FROM sqlite_sequence WHERE name IN ('slots', 'bookings');",
  ...slots.map((s) => `INSERT INTO slots (start_at, end_at, closed, created_at) VALUES (${q(s.start)}, ${q(s.end)}, 0, ${q(nowIso)});`),
]

const booking = (slotIndex, ref, type, status, message, instagram = null) =>
  `INSERT INTO bookings (reference, slot_id, session_type, first_name, last_name, email, phone, instagram, message, consent_at, status, created_at, decided_at)
   VALUES (${q(ref)}, ${slotIndex + 1}, ${q(type)}, 'Client', 'Test', 'client.test@example.com', '06 00 00 00 00', ${q(instagram)}, ${q(message)}, ${q(nowIso)}, ${q(status)}, ${q(nowIso)}, ${status === 'pending' ? 'NULL' : q(nowIso)});`

// La référence reste une colonne interne (jamais affichée).
sql.push(booking(0, 'HST2K', 'famille', 'confirmed', 'Demande de test (historique).'))
sql.push(booking(1, 'TEST2', 'grossesse', 'pending', 'Demande de test : séance grossesse.', 'client.test'))
sql.push(booking(3, 'TEST3', 'portrait', 'confirmed', null))
sql.push(booking(5, 'TEST4', 'naissance', 'declined', 'Demande de test refusée.'))
// Un créneau fermé.
sql.push(`UPDATE slots SET closed = 1 WHERE id = ${slots.length};`)

const dir = resolve(root, '.wrangler')
mkdirSync(dir, { recursive: true })
const file = resolve(dir, 'seed-local.sql')
writeFileSync(file, sql.join('\n'))

execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', `--file=${file}`], { cwd: root, stdio: 'inherit' })
console.log(`Seed local : ${slots.length} créneaux (dont 1 fermé), 4 demandes « Client Test ».`)

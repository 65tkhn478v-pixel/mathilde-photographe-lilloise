// API publique : créneaux disponibles et création d'une demande.

import {
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  MAX_BOOKINGS_PER_IP_PER_HOUR,
  MAX_PENDING_PER_EMAIL,
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_PATTERN,
  REFERENCE_ALPHABET,
  REFERENCE_LENGTH,
  SESSION_TYPE_VALUES,
} from '../shared/booking.js'
import { availableSlots, isUniqueViolation } from './db.js'
import { randomString } from './crypto.js'
import { clientIp, error, json, readJson } from './http.js'
import { hit, ipSubject, sweep } from './rateLimit.js'

const SLOT_TAKEN = "Ce créneau vient d'être demandé par quelqu'un d'autre. Choisissez un autre horaire."

export async function getSlots(request, env) {
  const slots = await availableSlots(env.DB, new Date().toISOString())
  return json({ slots })
}

const str = (v) => (typeof v === 'string' ? v.trim() : '')

/** Validation stricte. Renvoie { data } ou { errors } (messages par champ). */
export function validateBooking(body) {
  const errors = {}
  const data = {
    slot_id: Number(body.slot_id),
    session_type: str(body.session_type),
    first_name: str(body.first_name),
    last_name: str(body.last_name),
    email: str(body.email).toLowerCase(),
    phone: str(body.phone) || null,
    message: str(body.message) || null,
  }

  if (!Number.isInteger(data.slot_id) || data.slot_id < 1) errors.slot_id = 'Choisissez un créneau.'
  if (!SESSION_TYPE_VALUES.includes(data.session_type)) errors.session_type = 'Choisissez un type de séance.'
  if (!data.first_name) errors.first_name = 'Indiquez votre prénom.'
  else if (data.first_name.length > NAME_MAX_LENGTH) errors.first_name = 'Ce prénom est trop long.'
  if (!data.last_name) errors.last_name = 'Indiquez votre nom.'
  else if (data.last_name.length > NAME_MAX_LENGTH) errors.last_name = 'Ce nom est trop long.'
  if (!data.email) errors.email = 'Indiquez votre adresse mail.'
  else if (data.email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(data.email))
    errors.email = "Cette adresse mail ne semble pas valide."
  if (data.phone && !PHONE_PATTERN.test(data.phone)) errors.phone = 'Ce numéro ne semble pas valide.'
  if (data.message && data.message.length > MESSAGE_MAX_LENGTH)
    errors.message = `Votre message dépasse ${MESSAGE_MAX_LENGTH} caractères.`
  if (body.consent !== true) errors.consent = 'Merci de cocher la case pour que je puisse traiter votre demande.'

  return Object.keys(errors).length ? { errors } : { data }
}

export async function createBooking(request, env) {
  const body = await readJson(request)
  if (!body) return error(422, 'Votre demande est incomplète. Vérifiez le formulaire.')

  const { data, errors } = validateBooking(body)

  // Champ piège : un humain ne le voit pas et ne le remplit jamais. On répond
  // comme si tout s'était bien passé, sans rien enregistrer.
  if (str(body.website)) {
    return json({ reference: randomString(REFERENCE_ALPHABET, REFERENCE_LENGTH) }, 201)
  }

  if (errors) return error(422, 'Certaines informations sont à corriger.', { errors })

  const db = env.DB
  const now = new Date()
  const nowIso = now.toISOString()

  await sweep(db, now)
  const subject = await ipSubject(env, clientIp(request))
  const count = await hit(db, subject, 'booking', { now, windowMinutes: 60, limit: MAX_BOOKINGS_PER_IP_PER_HOUR })
  if (count > MAX_BOOKINGS_PER_IP_PER_HOUR) {
    return error(429, 'Vous avez déjà envoyé plusieurs demandes. Réessayez un peu plus tard ou écrivez-moi directement.')
  }

  const pending = await db
    .prepare("SELECT COUNT(*) AS n FROM bookings WHERE email = ? AND status = 'pending'")
    .bind(data.email)
    .first()
  if (pending.n >= MAX_PENDING_PER_EMAIL) {
    return error(429, 'Vous avez déjà des demandes en attente. Mathilde revient vers vous très vite.')
  }

  const slot = await db.prepare('SELECT id, start_at, end_at, closed FROM slots WHERE id = ?').bind(data.slot_id).first()
  if (!slot || slot.closed || slot.start_at <= nowIso) return error(409, SLOT_TAKEN)

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = randomString(REFERENCE_ALPHABET, REFERENCE_LENGTH)
    try {
      await db
        .prepare(
          `INSERT INTO bookings (reference, slot_id, session_type, first_name, last_name, email, phone, message, consent_at, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
        )
        .bind(
          reference,
          slot.id,
          data.session_type,
          data.first_name,
          data.last_name,
          data.email,
          data.phone,
          data.message,
          nowIso,
          nowIso
        )
        .run()
      return json(
        {
          reference,
          booking: {
            reference,
            session_type: data.session_type,
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone: data.phone,
            message: data.message,
            slot: { id: slot.id, start_at: slot.start_at, end_at: slot.end_at },
          },
        },
        201
      )
    } catch (err) {
      // Index unique partiel : une autre demande active existe déjà sur ce créneau.
      if (isUniqueViolation(err, 'bookings.slot_id')) return error(409, SLOT_TAKEN)
      // Référence déjà utilisée (très improbable) : on en tire une autre.
      if (isUniqueViolation(err, 'bookings.reference')) continue
      throw err
    }
  }
  throw new Error('reference generation failed')
}

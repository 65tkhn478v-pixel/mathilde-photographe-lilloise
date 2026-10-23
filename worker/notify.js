// Notification facultative de Mathilde à chaque nouvelle demande, via l'API
// Resend. Active seulement si le secret RESEND_API_KEY est défini.
//
// Sans domaine vérifié, Resend n'autorise l'expéditeur onboarding@resend.dev
// que vers l'adresse du compte Resend : le compte doit donc être créé avec
// l'adresse de Mathilde (voir README).

import { sessionLabel } from '../shared/booking.js'
import { formatDayFull, formatDayShort, formatTime } from '../shared/time.js'

const RESEND_URL = 'https://api.resend.com/emails'
const FROM = 'Site Mathilde Lecomte <onboarding@resend.dev>'
const TO = 'lecomtemathildeproo@gmail.com'

export function notificationEmail(booking, adminUrl) {
  const type = sessionLabel(booking.session_type)
  const start = booking.slot.start_at
  const subject = `Nouvelle demande : ${type} – ${formatDayShort(start)} ${formatTime(start)}`
  const text = [
    'Nouvelle demande de séance sur le site.',
    '',
    `Séance : ${type}`,
    `Date : ${formatDayFull(start)}`,
    `Horaire : ${formatTime(start)} – ${formatTime(booking.slot.end_at)}`,
    '',
    `${booking.first_name} ${booking.last_name}`,
    `Email : ${booking.email}`,
    `Téléphone : ${booking.phone || 'non renseigné'}`,
    `Instagram : ${booking.instagram ? `@${booking.instagram}` : 'non renseigné'}`,
    '',
    'Message :',
    booking.message || '(aucun message)',
    '',
    `Pour confirmer ou refuser : ${adminUrl}`,
  ].join('\n')
  return { from: FROM, to: [TO], reply_to: booking.email, subject, text }
}

/** Envoie la notification. Ne lève jamais : un échec n'affecte pas la demande. */
export async function notifyNewBooking(env, booking, adminUrl) {
  try {
    const response = await fetch(env.RESEND_API_URL || RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationEmail(booking, adminUrl)),
    })
    // Jamais de donnée personnelle dans les logs : seulement le statut HTTP.
    if (!response.ok) console.error('notify_failed', response.status)
  } catch (err) {
    console.error('notify_error', err?.name)
  }
}

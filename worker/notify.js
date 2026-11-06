// Notification facultative de Mathilde à chaque nouvelle demande, via l'API
// Resend. Active seulement si le secret RESEND_API_KEY est défini.
//
// Sans domaine vérifié, Resend n'autorise l'expéditeur onboarding@resend.dev
// que vers l'adresse du compte Resend : le compte doit donc être créé avec
// l'adresse de Mathilde (voir README).

import { sessionLabel } from '../shared/booking.js'
import { formatDayFull, formatDayShort, formatTime } from '../shared/time.js'
import { galleryTypeLabel } from '../shared/galleries.js'

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

/** Envoie un mail à Mathilde. Ne lève jamais : un échec n'affecte pas l'action du client. */
async function sendToMathilde(env, message) {
  try {
    const response = await fetch(env.RESEND_API_URL || RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    // Jamais de donnée personnelle dans les logs : seulement le statut HTTP.
    if (!response.ok) console.error('notify_failed', response.status)
  } catch (err) {
    console.error('notify_error', err?.name)
  }
}

/** Nouvelle demande de séance. */
export async function notifyNewBooking(env, booking, adminUrl) {
  await sendToMathilde(env, notificationEmail(booking, adminUrl))
}

/** Sélection validée par le client dans sa galerie. */
export function selectionEmail(gallery, adminUrl) {
  const type = galleryTypeLabel(gallery.session_type)
  return {
    from: FROM,
    to: [TO],
    reply_to: gallery.client_email,
    subject: `Sélection reçue : ${gallery.client_name} – ${type}`,
    text: [
      'Un client vient de valider sa sélection.',
      '',
      `Client : ${gallery.client_name}`,
      `Séance : ${type}`,
      `Photos choisies : ${gallery.count} / ${gallery.included_count}`,
      '',
      'Commentaire :',
      gallery.comment || '(aucun commentaire)',
      '',
      `Voir la galerie (onglet Galeries) : ${adminUrl}`,
    ].join('\n'),
  }
}

export async function notifySelectionValidated(env, gallery, adminUrl) {
  await sendToMathilde(env, selectionEmail(gallery, adminUrl))
}

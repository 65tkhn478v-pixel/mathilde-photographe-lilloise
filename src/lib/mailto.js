// Mails pré-remplis (liens mailto:). Aucun mail n'est envoyé par le serveur :
// c'est le client (ou Mathilde, dans l'admin) qui ouvre son logiciel de mail.
// L'adresse du domicile de Mathilde n'apparaît jamais ici.

import { CONTACT_EMAIL } from '../data/site'
import { sessionLabel } from '../../shared/booking.js'
import { formatDayFull, formatDayShort, formatTime } from '../../shared/time.js'

const CRLF = '\r\n'
// Au-delà, certains clients mail (surtout sur mobile) tronquent ou refusent le lien.
export const MAILTO_MAX_LENGTH = 1800
const TRUNCATED_NOTE = '(message complet visible dans votre espace)'

function mailtoUrl(to, subject, body) {
  // encodeURIComponent encode les sauts de ligne \r\n en %0D%0A.
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Récapitulatif texte d'une demande (corps du mail et « Copier le récapitulatif »). */
export function bookingRecapLines(booking, message = booking.message) {
  return [
    `Séance : ${sessionLabel(booking.session_type)}`,
    `Date : ${formatDayFull(booking.slot.start_at)}`,
    `Horaire : ${formatTime(booking.slot.start_at)} – ${formatTime(booking.slot.end_at)}`,
    `Référence : ${booking.reference}`,
    '',
    `${booking.first_name} ${booking.last_name}`,
    `Email : ${booking.email}`,
    `Téléphone : ${booking.phone || 'non renseigné'}`,
    ...(message ? ['', 'Message :', message] : []),
  ]
}

export function bookingRecapText(booking) {
  return bookingRecapLines(booking).join('\n')
}

function bookingBody(booking, message) {
  return ['Bonjour Mathilde,', '', 'Je viens de demander un créneau sur votre site.', '', ...bookingRecapLines(booking, message)].join(
    CRLF
  )
}

/** Mail du client vers Mathilde, ouvert après l'enregistrement de la demande. */
export function bookingMailto(booking) {
  const subject = `Demande de séance ${sessionLabel(booking.session_type)} – ${formatDayShort(
    booking.slot.start_at
  )}, ${formatTime(booking.slot.start_at)}`

  let url = mailtoUrl(CONTACT_EMAIL, subject, bookingBody(booking, booking.message))
  if (url.length <= MAILTO_MAX_LENGTH || !booking.message) return { url, truncated: false }

  // Message trop long pour un lien mailto fiable : on le raccourcit dans le
  // mail seulement (il reste complet en base, visible dans l'admin).
  let length = booking.message.length
  while (length > 0) {
    length = Math.floor(length * 0.9)
    const cut = `${booking.message.slice(0, length).trimEnd()}… ${TRUNCATED_NOTE}`
    url = mailtoUrl(CONTACT_EMAIL, subject, bookingBody(booking, cut))
    if (url.length <= MAILTO_MAX_LENGTH) return { url, truncated: true }
  }
  return { url: mailtoUrl(CONTACT_EMAIL, subject, bookingBody(booking, TRUNCATED_NOTE)), truncated: true }
}

/** Mail de Mathilde vers le client (bouton « Écrire » de l'admin), qu'elle complète avant envoi. */
export function replyMailto(booking) {
  const type = sessionLabel(booking.session_type).toLowerCase()
  const date = formatDayFull(booking.slot.start_at).replace(/ \d{4}$/, '')
  const subject = `Votre séance ${type} du ${date}`
  const body = [
    `Bonjour ${booking.first_name},`,
    '',
    `Merci pour votre demande de séance ${type} le ${date} de ${formatTime(booking.slot.start_at)} à ${formatTime(
      booking.slot.end_at
    )}.`,
    '',
    '',
    '',
    'Mathilde',
  ].join(CRLF)
  return mailtoUrl(booking.email, subject, body)
}

export function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

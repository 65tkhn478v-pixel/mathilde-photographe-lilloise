// Liens de contact de l'admin (Mathilde vers ses clients). Aucun mail n'est
// envoyé par le serveur : « Écrire » ouvre le logiciel de mail de Mathilde
// avec un brouillon qu'elle complète. L'adresse du domicile n'apparaît jamais ici.

import { sessionLabel } from '../../shared/booking.js'
import { formatDayFull, formatTime } from '../../shared/time.js'

const CRLF = '\r\n'

/** Brouillon de réponse au client (bouton « Écrire »). */
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
  // encodeURIComponent encode les sauts de ligne \r\n en %0D%0A.
  return `mailto:${booking.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/** Ouvre une conversation privée Instagram avec le client (lien officiel ig.me). */
export function instagramHref(pseudo) {
  return `https://ig.me/m/${encodeURIComponent(pseudo)}`
}

/** Coordonnées en texte (bouton « Copier les coordonnées »). */
export function contactText(booking) {
  return [
    `${booking.first_name} ${booking.last_name}`,
    booking.email,
    booking.phone,
    booking.instagram && `Instagram : @${booking.instagram}`,
  ]
    .filter(Boolean)
    .join('\n')
}

// Textes et formats de l'admin des galeries.
import { galleryTypeLabel } from '../../../../shared/galleries.js'
import { dateKey, formatDayFull, formatKeyLong } from '../../../../shared/time.js'

/** Les échéances sont stockées en fin de journée exclusive : jour affiché = la veille à minuit. */
export const lastDayKey = (iso) => (iso ? dateKey(new Date(Date.parse(iso) - 1000)) : null)
export const lastDayLabel = (iso) => (iso ? formatKeyLong(lastDayKey(iso)).replace(/^./, (c) => c.toLowerCase()) : '')
export const dayLabel = (iso) => (iso ? formatDayFull(iso) : '')
export const shootLabel = (key) => (key ? formatKeyLong(key) : '')
export const firstName = (name) => name.split(/\s+/)[0]

export const galleryLink = (slug) => `${window.location.origin}/galerie/${slug}`

/** Étape et action suivante attendue, affichées sur chaque galerie. */
export function nextStep(g) {
  const c = g.counts
  switch (g.status) {
    case 'draft':
      return c.proofs ? 'Prête : ouvrez la sélection au client' : 'Déposez les aperçus de la séance'
    case 'selection_open':
      return g.selection_deadline_passed
        ? 'Date limite dépassée : prolongez-la ou écrivez au client'
        : `En attente du choix du client (${c.selected} / ${g.included_count})`
    case 'selection_validated':
      return c.finals ? 'À livrer' : 'Sélection reçue : à retoucher'
    case 'delivered':
      return `Livrée — téléchargement jusqu’au ${lastDayLabel(g.delivery_expires_at)}`
    default:
      return `Expirée — suppression le ${lastDayLabel(g.purge_at)}`
  }
}

/** Message de partage (lien + code), au vouvoiement. */
export function shareMessage(g, code) {
  return [
    `Bonjour ${firstName(g.client_name)},`,
    '',
    `Votre galerie est en ligne : ${galleryLink(g.slug)}`,
    `Code d’accès : ${code}`,
    '',
    `Choisissez vos ${g.included_count} photos préférées avant le ${lastDayLabel(g.selection_deadline)} : je les retoucherai ensuite avec soin.`,
    'Votre sélection est enregistrée au fur et à mesure, vous pouvez la reprendre à tout moment jusqu’à la validation.',
    '',
    'À très vite,',
    'Mathilde',
  ].join('\n')
}

/** Message de livraison (lien, sans le code), envoyé par Mathilde elle-même. */
export function deliveryMessage(g) {
  return [
    `Bonjour ${firstName(g.client_name)},`,
    '',
    `Vos photos retouchées sont prêtes : ${galleryLink(g.slug)}`,
    `Vous pouvez les télécharger en haute définition jusqu’au ${lastDayLabel(g.delivery_expires_at)}, avec le même code d’accès que pour la sélection.`,
    '',
    'Mathilde',
  ].join('\n')
}

const TITLES = /^(m|mme|mlle|mr|mrs|ms|monsieur|madame|mademoiselle|famille|dr|docteur|maître|me)\.?$/i

/**
 * Prénom pour saluer le client : premier mot du nom enregistré, seulement
 * s'il ressemble clairement à un prénom (pas de civilité, d'initiale, de
 * couple « X et Y »…). Sinon null : le message commence par « Bonjour, ».
 */
export function greetingFirstName(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  if (!first || TITLES.test(first)) return null
  if (words.some((w) => /^(et|&|\+|\/)$/i.test(w))) return null
  if (!/^\p{Lu}\p{Ll}+(?:[-'’]\p{Lu}?\p{Ll}+)*$/u.test(first)) return null
  return first
}

/** Message de demande d'avis Google, au vouvoiement, envoyé par Mathilde elle-même. */
export function reviewMessage(g, reviewUrl) {
  const first = greetingFirstName(g.client_name)
  return `${first ? `Bonjour ${first},` : 'Bonjour,'} j’espère que vos photos vous plaisent ! Si vous avez deux minutes, un petit avis sur Google m’aiderait beaucoup : ${reviewUrl}. Merci encore pour votre confiance, Mathilde`
}

/** Noms de fichiers sélectionnés, sans extension, séparés par des virgules (filtre texte de Lightroom). */
export function lightroomList(photos) {
  return photos.map((p) => p.original_filename.replace(/\.[^.]+$/, '')).join(', ')
}

export const typeLabel = galleryTypeLabel
export const statusBadge = (status) => `gallery_${status}`

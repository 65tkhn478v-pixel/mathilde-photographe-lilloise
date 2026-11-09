// Préparation des témoignages (src/data/temoignages.js) : validation légère,
// tri, date en français, coupe des messages longs sur l'accueil.

export const SEANCES = ['grossesse', 'naissance', 'famille', 'portrait', 'mariage']
export const HOME_LIMIT = 3
// Au-delà, le message est coupé sur l'accueil (entier sur À propos).
export const LONG_MESSAGE = 400
const EXCERPT = 320

const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])$/
const text = (v) => (typeof v === 'string' ? v.trim() : '')

/** Entrées valides, de la plus récente à la plus ancienne, avec une ancre stable. */
export function prepareTestimonials(list, warn = () => {}) {
  const valid = []
  ;(Array.isArray(list) ? list : []).forEach((entry, i) => {
    const nom = text(entry?.nom)
    const date = text(entry?.date)
    const message = text(entry?.message)
    const missing = [!nom && 'nom', !DATE_RE.test(date) && 'date (AAAA-MM)', !message && 'message'].filter(Boolean)
    if (missing.length) {
      warn(`Témoignage n° ${i + 1} ignoré : ${missing.join(', ')} manquant ou invalide.`)
      return
    }
    let seance = text(entry.seance).toLowerCase()
    if (seance && !SEANCES.includes(seance)) {
      warn(`Témoignage n° ${i + 1} : séance « ${entry.seance} » inconnue, mention ignorée (${SEANCES.join(', ')}).`)
      seance = ''
    }
    valid.push({ nom, date, message, seance, order: i })
  })
  // Plus récent d'abord ; à date égale, l'ordre du fichier.
  valid.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? 1 : -1))
  return valid.map((t, i) => ({ ...t, id: `temoignage-${i + 1}` }))
}

const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** « 2026-03 » → « mars 2026 ». */
export function formatMonth(date) {
  const [, y, m] = DATE_RE.exec(date)
  return monthFormat.format(new Date(Date.UTC(Number(y), Number(m) - 1, 1)))
}

/** Message coupé proprement (fin de mot) s'il dépasse LONG_MESSAGE caractères. */
export function excerpt(message) {
  if (message.length <= LONG_MESSAGE) return { text: message, cut: false }
  const head = message.slice(0, EXCERPT)
  const space = head.lastIndexOf(' ')
  const cutAt = space > EXCERPT * 0.6 ? space : EXCERPT
  return { text: `${head.slice(0, cutAt).replace(/[\s,;:.–—-]+$/u, '')}…`, cut: true }
}

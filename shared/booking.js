// Constantes de la réservation, partagées entre le Worker (worker/) et le
// site React (src/). Une seule source pour chaque règle.

// Séances réservables en ligne (en semaine, au domicile de Mathilde).
// Mariage et projets plus importants : pas de réservation en ligne, le site
// renvoie vers le formulaire de contact.
export const SESSION_TYPES = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'famille', label: 'Famille' },
  { value: 'grossesse', label: 'Grossesse' },
  { value: 'naissance', label: 'Naissance' },
]

export const SESSION_TYPE_VALUES = SESSION_TYPES.map((t) => t.value)

export function sessionLabel(value) {
  return SESSION_TYPES.find((t) => t.value === value)?.label ?? value
}

// Durée de conservation des demandes, en mois après la date de la séance.
// Durée à valider avec la cliente. Utilisée par la purge (Worker), l'admin
// et la section « Données personnelles » des mentions légales.
export const RETENTION_MONTHS = 12

export const MESSAGE_MAX_LENGTH = 1000
export const NAME_MAX_LENGTH = 80
export const EMAIL_MAX_LENGTH = 254

// Anti-abus côté réservation.
export const MAX_PENDING_PER_EMAIL = 2
export const MAX_BOOKINGS_PER_IP_PER_HOUR = 5

// Anti-bruteforce de la connexion admin.
export const LOGIN_MAX_FAILURES = 5
export const LOGIN_WINDOW_MINUTES = 15

export const SESSION_DAYS = 7

// Référence courte : sans 0/O/1/I pour être dictée ou recopiée sans erreur.
export const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const REFERENCE_LENGTH = 5

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_PATTERN = /^[0-9+().\s-]{6,25}$/

// Instagram : pseudo seul, sans « @ », 30 caractères max (lettres, chiffres,
// points, underscores). On accepte « @compte », « compte » ou une URL de profil.
export const INSTAGRAM_MAX_LENGTH = 30
const INSTAGRAM_PATTERN = /^[A-Za-z0-9._]{1,30}$/
const INSTAGRAM_URL = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([^/?#]*)/i

/** Renvoie { value } (pseudo normalisé ou null si vide) ou { error }. */
export function normalizeInstagram(input) {
  let v = typeof input === 'string' ? input.trim() : ''
  if (!v) return { value: null }
  const url = INSTAGRAM_URL.exec(v)
  if (url) v = url[1]
  v = v.replace(/^@+/, '').replace(/\/+$/, '')
  if (!INSTAGRAM_PATTERN.test(v)) {
    return { error: 'Ce compte Instagram ne semble pas valide (lettres, chiffres, points et _ uniquement, 30 caractères max).' }
  }
  return { value: v.toLowerCase() }
}

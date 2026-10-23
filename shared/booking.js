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

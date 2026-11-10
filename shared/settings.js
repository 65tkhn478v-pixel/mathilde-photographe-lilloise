// Réglages par défaut modifiables par Mathilde (page Paramètres de l'espace
// admin). Chaque valeur a un défaut ici, utilisé tant qu'elle n'a pas été
// modifiée (table `settings`, migration 0004). Partagé entre le Worker
// (validation, application) et le site (formulaire, affichage).

import { GALLERY_RETENTION, INCLUDED_MAX, INCLUDED_MIN, WATERMARK_TEXT } from './galleries.js'

// Fiche Google de Mathilde (Google Maps). Ce lien ouvre la fiche : le client
// touche ensuite « Avis » puis « Écrire un avis ». Un lien direct vers le
// formulaire (https://g.page/r/…/review) pourra le remplacer ici, en une
// ligne, ou depuis la page Paramètres.
export const GOOGLE_REVIEW_URL = 'https://maps.app.goo.gl/RHZBVwBgdk8gGizH6'

// Offre gratuite de Cloudflare R2 : 10 Go-mois de stockage pour tout le compte.
// Cloudflare compte 1 Go = 2^30 octets.
export const GB = 2 ** 30
export const STORAGE_INCLUDED_BYTES = 10 * GB

const REVIEW_HOSTS = ['google.com', 'google.fr', 'g.page', 'maps.app.goo.gl', 'goo.gl']

/** Lien d'avis accepté : https uniquement, domaine Google (ou sous-domaine). */
export function isGoogleReviewUrl(value) {
  if (typeof value !== 'string' || value.length > 300) return false
  let url
  try {
    url = new URL(value.trim())
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
  const host = url.hostname.toLowerCase()
  return REVIEW_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
}

/** Lien d'avis à utiliser : le réglage s'il est valide, sinon la constante. */
export const reviewUrlOrDefault = (value) => (isGoogleReviewUrl(value) ? value.trim() : GOOGLE_REVIEW_URL)

export const SETTINGS_FIELDS = {
  included_default: { type: 'int', default: 20, min: INCLUDED_MIN, max: INCLUDED_MAX },
  selection_days: { type: 'int', default: GALLERY_RETENTION.selectionDays, min: 1, max: 365 },
  delivery_days: { type: 'int', default: GALLERY_RETENTION.deliveryDays, min: 1, max: 365 },
  proofs_after_delivery_days: { type: 'int', default: GALLERY_RETENTION.proofsAfterDeliveryDays, min: 0, max: 90 },
  watermark_text: { type: 'text', default: WATERMARK_TEXT, min: 1, max: 60 },
  review_url: { type: 'url', default: GOOGLE_REVIEW_URL },
}

export const DEFAULT_SETTINGS = Object.fromEntries(Object.entries(SETTINGS_FIELDS).map(([k, f]) => [k, f.default]))

const MESSAGES = {
  included_default: `Entre ${INCLUDED_MIN} et ${INCLUDED_MAX} photos.`,
  selection_days: 'Entre 1 et 365 jours.',
  delivery_days: 'Entre 1 et 365 jours.',
  proofs_after_delivery_days: 'Entre 0 et 90 jours.',
  watermark_text: 'Entre 1 et 60 caractères.',
  review_url: 'Indiquez un lien https vers votre fiche Google (google.com, google.fr, g.page, maps.app.goo.gl ou goo.gl).',
}

/** Valide une valeur ; renvoie { value } ou { error }. */
export function validateSetting(key, raw) {
  const field = SETTINGS_FIELDS[key]
  if (!field) return { error: 'Réglage inconnu.' }
  if (field.type === 'int') {
    const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw
    if (!Number.isInteger(n) || n < field.min || n > field.max) return { error: MESSAGES[key] }
    return { value: n }
  }
  if (field.type === 'text') {
    const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
    if ([...text].length < field.min || [...text].length > field.max) return { error: MESSAGES[key] }
    return { value: text }
  }
  if (!isGoogleReviewUrl(raw)) return { error: MESSAGES[key] }
  return { value: raw.trim() }
}

/** Valide un ensemble de réglages (seules les clés connues sont lues). */
export function validateSettings(input) {
  const values = {}
  const errors = {}
  for (const key of Object.keys(SETTINGS_FIELDS)) {
    if (input?.[key] === undefined) continue
    const result = validateSetting(key, input[key])
    if (result.error) errors[key] = result.error
    else values[key] = result.value
  }
  return { values, errors }
}

/** Fusionne des valeurs stockées (texte) avec les défauts ; une valeur invalide est ignorée. */
export function mergeSettings(stored = {}) {
  const merged = { ...DEFAULT_SETTINGS }
  for (const [key, raw] of Object.entries(stored)) {
    if (!SETTINGS_FIELDS[key]) continue
    const parsed = SETTINGS_FIELDS[key].type === 'int' ? Number(raw) : raw
    const result = validateSetting(key, parsed)
    if (!result.error) merged[key] = result.value
  }
  return merged
}

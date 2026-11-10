// Réglages publics (lien d'avis Google, durées des galeries), lus une seule
// fois par visite sur /api/settings (réponse mise en cache 5 min). Tant
// qu'ils ne sont pas chargés, ou si la requête échoue, les valeurs par défaut
// du code s'appliquent : le lien d'avis retombe sur GOOGLE_REVIEW_URL.
import { useEffect, useState } from 'react'
import { GALLERY_RETENTION } from '../../shared/galleries.js'
import { DEFAULT_SETTINGS, reviewUrlOrDefault } from '../../shared/settings.js'

const FALLBACK = {
  review_url: reviewUrlOrDefault(DEFAULT_SETTINGS.review_url),
  selection_days: DEFAULT_SETTINGS.selection_days,
  delivery_days: DEFAULT_SETTINGS.delivery_days,
  undelivered_purge_days: GALLERY_RETENTION.undeliveredPurgeDays,
}

let cached = null
let pending = null

function load() {
  pending ??= fetch('/api/settings', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      cached = data ? { ...FALLBACK, ...data, review_url: reviewUrlOrDefault(data.review_url) } : FALLBACK
      return cached
    })
    .catch(() => {
      cached = FALLBACK
      return cached
    })
  return pending
}

export function usePublicSettings() {
  const [settings, setSettings] = useState(cached ?? FALLBACK)
  useEffect(() => {
    if (cached) return undefined
    let active = true
    load().then((s) => active && setSettings(s))
    return () => {
      active = false
    }
  }, [])
  return settings
}

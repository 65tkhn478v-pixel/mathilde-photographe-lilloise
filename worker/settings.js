// Réglages par défaut (page Paramètres) : lecture, enregistrement, retour aux
// valeurs d'origine, et lecture publique minimale (lien d'avis, durées).
// Les réglages s'appliquent aux nouvelles galeries et aux prochaines actions :
// les galeries existantes gardent leurs dates.

import { GALLERY_RETENTION } from '../shared/galleries.js'
import { DEFAULT_SETTINGS, mergeSettings, reviewUrlOrDefault, validateSettings } from '../shared/settings.js'
import { error, json, readJson } from './http.js'

/** Réglages en vigueur (défauts du code, remplacés par les valeurs enregistrées valides). */
export async function getSettings(db) {
  try {
    const { results } = await db.prepare('SELECT key, value FROM settings').all()
    return mergeSettings(Object.fromEntries(results.map((r) => [r.key, r.value])))
  } catch {
    // Table absente (migration pas encore appliquée) : valeurs par défaut.
    return { ...DEFAULT_SETTINGS }
  }
}

export async function readSettings(request, env) {
  return json({ settings: await getSettings(env.DB), defaults: DEFAULT_SETTINGS })
}

export async function saveSettings(request, env) {
  const body = (await readJson(request)) ?? {}
  const { values, errors } = validateSettings(body)
  if (Object.keys(errors).length) return error(422, 'Certains réglages sont à corriger.', { errors })
  if (!Object.keys(values).length) return error(422, 'Aucun réglage à enregistrer.')
  const nowIso = new Date().toISOString()
  await env.DB.batch(
    Object.entries(values).map(([key, value]) =>
      env.DB
        .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
        .bind(key, String(value), nowIso)
    )
  )
  return json({ settings: await getSettings(env.DB), defaults: DEFAULT_SETTINGS })
}

export async function resetSettings(request, env) {
  await env.DB.prepare('DELETE FROM settings').run()
  return json({ settings: { ...DEFAULT_SETTINGS }, defaults: DEFAULT_SETTINGS })
}

/**
 * Lecture publique, sans session : uniquement ce que le site affiche déjà
 * (lien d'avis du footer et de la galerie livrée, durées des mentions
 * légales). Mise en cache 5 minutes.
 */
export async function publicSettings(request, env) {
  const s = await getSettings(env.DB)
  return json(
    {
      review_url: reviewUrlOrDefault(s.review_url),
      selection_days: s.selection_days,
      delivery_days: s.delivery_days,
      undelivered_purge_days: GALLERY_RETENTION.undeliveredPurgeDays,
    },
    200,
    { 'Cache-Control': 'public, max-age=300' }
  )
}

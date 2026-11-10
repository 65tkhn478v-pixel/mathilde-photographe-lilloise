// Stockage des galeries (page Paramètres) : place utilisée, vérification
// directe dans R2 (orphelins), et gestes de tri.
//
// - Le total vient de D1 (taille réelle de chaque version enregistrée au
//   dépôt) : instantané, sans lister le bucket.
// - « Vérifier sur le serveur » liste R2 page par page (1 000 objets par
//   requête : peu de CPU par appel, compatible avec le plan gratuit), renseigne
//   les tailles manquantes des photos déposées avant cette mise à jour, et
//   repère les fichiers orphelins (présents dans R2, absents de la base).
// - Un fichier déposé depuis moins de 2 minutes n'est jamais considéré comme
//   orphelin : un dépôt écrit dans R2 puis enregistre la photo en base dans la
//   même requête, quelques millisecondes plus tard.
// Aucun journal ne contient de nom ni de nom de fichier.

import { STORAGE_INCLUDED_BYTES } from '../shared/settings.js'
import { json, readJson } from './http.js'

const VERSIONS = ['thumb', 'preview', 'blur', 'hd']
const KEY_PATTERN = /^galleries\/([a-z0-9]+)\/(proof|final)\/(\d+)\/(thumb|preview|blur|hd)$/
const RECENT_MS = 2 * 60 * 1000

const sizeExpr = (alias) => VERSIONS.map((v) => `COALESCE(${alias}.${v}_bytes, 0)`).join(' + ')
const unknownExpr = (alias) => VERSIONS.map((v) => `(${alias}.has_${v} = 1 AND ${alias}.${v}_bytes IS NULL)`).join(' + ')

/** Place utilisée, par galerie (aperçus / finales), triée par poids décroissant. */
export async function storageSummary(env, effectiveStatus) {
  const { results } = await env.DB.prepare(
    `SELECT g.id, g.client_name, g.session_type, g.status, g.purge_at, g.delivered_at, g.delivery_expires_at, g.proofs_purged_at,
       COALESCE(SUM(CASE WHEN p.kind = 'proof' THEN ${sizeExpr('p')} END), 0) AS proofs_bytes,
       COALESCE(SUM(CASE WHEN p.kind = 'final' THEN ${sizeExpr('p')} END), 0) AS finals_bytes,
       COALESCE(SUM(CASE WHEN p.kind = 'proof' THEN p.has_thumb + p.has_preview + p.has_blur END), 0) AS proof_files,
       COALESCE(SUM(${unknownExpr('p')}), 0) AS unknown_files
     FROM galleries g LEFT JOIN gallery_photos p ON p.gallery_id = g.id
     GROUP BY g.id`
  ).all()
  const nowIso = new Date().toISOString()
  const galleries = results
    .map((g) => ({
      id: g.id,
      client_name: g.client_name,
      session_type: g.session_type,
      status: effectiveStatus(g, nowIso),
      purge_at: g.purge_at,
      delivery_expires_at: g.delivery_expires_at,
      proofs_purged_at: g.proofs_purged_at,
      proofs_bytes: g.proofs_bytes,
      finals_bytes: g.finals_bytes,
      total_bytes: g.proofs_bytes + g.finals_bytes,
      proof_files: g.proof_files,
      unknown_files: g.unknown_files,
    }))
    .sort((a, b) => b.total_bytes - a.total_bytes || a.purge_at.localeCompare(b.purge_at))
  const sum = (k) => galleries.reduce((n, g) => n + g[k], 0)
  return {
    included_bytes: STORAGE_INCLUDED_BYTES,
    total: { proofs: sum('proofs_bytes'), finals: sum('finals_bytes'), all: sum('total_bytes') },
    unknown_files: sum('unknown_files'),
    galleries,
  }
}

/**
 * Une page du bucket (1 000 objets au plus) comparée à la base :
 * { objects, bytes, referenced, orphans: [{ key, size }], recent, other, backfills }.
 */
async function scanPage(env, cursor) {
  const list = await env.GALLERY_BUCKET.list({ cursor: cursor || undefined, limit: 1000 })
  const parsed = list.objects.map((o) => ({ o, m: KEY_PATTERN.exec(o.key) }))
  const storageKeys = [...new Set(parsed.filter((x) => x.m).map((x) => x.m[1]))]
  const rows = new Map()
  for (let i = 0; i < storageKeys.length; i += 50) {
    const chunk = storageKeys.slice(i, i + 50)
    const { results } = await env.DB
      .prepare(
        `SELECT g.storage_key, p.id, p.kind, ${VERSIONS.map((v) => `p.has_${v}, p.${v}_bytes`).join(', ')}
         FROM gallery_photos p JOIN galleries g ON g.id = p.gallery_id
         WHERE g.storage_key IN (${chunk.map(() => '?').join(', ')})`
      )
      .bind(...chunk)
      .all()
    for (const r of results) rows.set(`${r.storage_key}/${r.kind}/${r.id}`, r)
  }
  const now = Date.now()
  const page = { objects: 0, bytes: 0, referenced: 0, orphans: [], recent: 0, other: 0, backfills: [] }
  for (const { o, m } of parsed) {
    page.objects++
    page.bytes += o.size
    if (!m) {
      // Hors du dossier des galeries : compté, jamais supprimé ici.
      page.other++
      continue
    }
    const [, storageKey, kind, id, version] = m
    const row = rows.get(`${storageKey}/${kind}/${id}`)
    if (row && row[`has_${version}`] === 1) {
      page.referenced++
      if (row[`${version}_bytes`] !== o.size) page.backfills.push({ id: row.id, version, size: o.size })
    } else if (now - new Date(o.uploaded).getTime() < RECENT_MS) {
      page.recent++
    } else {
      page.orphans.push({ key: o.key, size: o.size })
    }
  }
  return { page, cursor: list.truncated ? list.cursor : null }
}

async function applyBackfills(env, backfills) {
  for (let i = 0; i < backfills.length; i += 100) {
    await env.DB.batch(
      backfills
        .slice(i, i + 100)
        .map((b) => env.DB.prepare(`UPDATE gallery_photos SET ${b.version}_bytes = ? WHERE id = ?`).bind(b.size, b.id))
    )
  }
}

/** POST /api/admin/storage/verify { cursor } : une page de vérification. */
export async function verifyStorage(request, env) {
  const body = (await readJson(request)) ?? {}
  const { page, cursor } = await scanPage(env, typeof body.cursor === 'string' ? body.cursor : null)
  await applyBackfills(env, page.backfills)
  return json({
    objects: page.objects,
    bytes: page.bytes,
    referenced: page.referenced,
    recent: page.recent,
    other: page.other,
    backfilled: page.backfills.length,
    orphans: { count: page.orphans.length, bytes: page.orphans.reduce((n, o) => n + o.size, 0) },
    cursor,
  })
}

/** POST /api/admin/storage/orphans/delete { cursor } : supprime les orphelins d'une page (revérifiés à l'instant). */
export async function deleteOrphans(request, env) {
  const body = (await readJson(request)) ?? {}
  const { page, cursor } = await scanPage(env, typeof body.cursor === 'string' ? body.cursor : null)
  if (page.orphans.length) await env.GALLERY_BUCKET.delete(page.orphans.map((o) => o.key))
  console.log('storage_orphans_deleted', page.orphans.length)
  return json({ deleted: page.orphans.length, bytes: page.orphans.reduce((n, o) => n + o.size, 0), cursor })
}

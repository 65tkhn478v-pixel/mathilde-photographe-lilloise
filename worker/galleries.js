// Galeries clients : création et suivi (admin), accès par lien + code,
// sélection puis livraison (client), fichiers privés dans R2, purge RGPD.
//
// Sécurité :
// - slug et préfixe R2 aléatoires (non devinables), bucket jamais public ;
// - code d'accès stocké uniquement sous forme de HMAC (SESSION_SECRET) ;
// - session client par galerie (cookie signé limité au chemin de la galerie,
//   invalidé quand un nouveau code est généré) ;
// - statut vérifié côté serveur pour chaque photo servie ;
// - galerie introuvable, en brouillon ou expirée : réponse identique.
// Aucun journal ne contient de nom, d'email ou de nom de fichier.

import {
  GALLERY_CODE_ALPHABET,
  GALLERY_CODE_LENGTH,
  GALLERY_RETENTION,
  GALLERY_SESSION_TYPES,
  FINAL_CONTENT_TYPES,
  FINAL_MAX_BYTES,
  INCLUDED_MAX,
  INCLUDED_MIN,
  MULTIPART_PART_BYTES,
  PHOTO_FORMATS,
  PHOTO_VERSIONS,
  VERSION_MAX_BYTES,
  galleryTypeLabel,
  normalizeGalleryCode,
} from '../shared/galleries.js'
import { EMAIL_PATTERN } from '../shared/booking.js'
import { addDays, dateKey, zonedToUtc } from '../shared/time.js'
import { hasValidSession } from './auth.js'
import { hmacSign, hmacVerify, randomString } from './crypto.js'
import { clientIp, error, json, readJson } from './http.js'
import { hit, ipSubject, isBlocked, reset, sweep } from './rateLimit.js'
import { notifySelectionValidated } from './notify.js'
import { getSettings } from './settings.js'
import { storageSummary } from './storage.js'

const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const SESSION_DAYS = 30
const COOKIE_NAME = 'ml_galerie'
const UNAVAILABLE = 'Cette galerie n’est plus disponible. Écrivez-moi si besoin.'
const NOT_FOUND = 'Élément introuvable. Il a peut-être déjà été supprimé.'
const ROBOTS = { 'X-Robots-Tag': 'noindex, nofollow, noarchive' }
const CODE_MAX_FAILURES = 10
const CODE_WINDOW_MINUTES = 15

const DAY_MS = 86_400_000
const plusDays = (iso, days) => new Date(Date.parse(iso) + days * DAY_MS).toISOString()
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
/** Fin de la journée (heure de Paris) d'une date "YYYY-MM-DD", en UTC. */
const endOfDay = (key) => (DATE_PATTERN.test(key) ? zonedToUtc(addDays(key, 1), '00:00')?.toISOString() ?? null : null)
const str = (v) => (typeof v === 'string' ? v.trim() : '')
const gjson = (data, status = 200, headers = {}) => json(data, status, { ...ROBOTS, ...headers })
const gerror = (status, message, extra = {}) => json({ error: message, ...extra }, status, ROBOTS)

// ---- Lecture des galeries -------------------------------------------------

const GALLERY_COLUMNS = `
  g.*,
  (SELECT COUNT(*) FROM gallery_photos p WHERE p.gallery_id = g.id AND p.kind = 'proof' AND p.complete = 1) AS proofs_count,
  (SELECT COUNT(*) FROM gallery_photos p WHERE p.gallery_id = g.id AND p.kind = 'final' AND p.complete = 1) AS finals_count,
  (SELECT COUNT(*) FROM gallery_selections s WHERE s.gallery_id = g.id) AS selected_count,
  COALESCE(
    (SELECT p.id FROM gallery_photos p WHERE p.id = g.cover_photo_id AND p.gallery_id = g.id AND p.complete = 1),
    (SELECT p.id FROM gallery_photos p WHERE p.gallery_id = g.id AND p.kind = 'proof' AND p.complete = 1 ORDER BY p.sort_key LIMIT 1),
    (SELECT p.id FROM gallery_photos p WHERE p.gallery_id = g.id AND p.kind = 'final' AND p.complete = 1 ORDER BY p.sort_key LIMIT 1)
  ) AS cover_id`

async function galleryById(db, id) {
  return db.prepare(`SELECT ${GALLERY_COLUMNS} FROM galleries g WHERE g.id = ?`).bind(id).first()
}

async function galleryBySlug(db, slug) {
  return db.prepare(`SELECT ${GALLERY_COLUMNS} FROM galleries g WHERE g.slug = ?`).bind(slug).first()
}

/** Statut réel à l'instant présent (une livraison échue est expirée avant même le passage du nettoyage). */
export function effectiveStatus(g, nowIso) {
  if (g.status === 'expired') return 'expired'
  if (g.purge_at <= nowIso) return 'expired'
  if (g.status === 'delivered' && g.delivery_expires_at && g.delivery_expires_at <= nowIso) return 'expired'
  return g.status
}

const CLIENT_VISIBLE = ['selection_open', 'selection_validated', 'delivered']

function serializeAdminGallery(g, nowIso) {
  return {
    id: g.id,
    slug: g.slug,
    client_name: g.client_name,
    client_email: g.client_email,
    session_type: g.session_type,
    shoot_date: g.shoot_date,
    included_count: g.included_count,
    status: effectiveStatus(g, nowIso),
    access_version: g.access_version,
    cover_id: g.cover_id,
    selection_deadline: g.selection_deadline,
    selection_deadline_passed: g.selection_deadline <= nowIso,
    selection_opened_at: g.selection_opened_at,
    selection_validated_at: g.selection_validated_at,
    client_comment: g.client_comment,
    delivered_at: g.delivered_at,
    delivery_expires_at: g.delivery_expires_at,
    purge_at: g.purge_at,
    proofs_purged_at: g.proofs_purged_at,
    booking_id: g.booking_id,
    created_at: g.created_at,
    counts: { proofs: g.proofs_count, finals: g.finals_count, selected: g.selected_count },
  }
}

async function toRetouchCount(db, nowIso) {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM galleries WHERE status = 'selection_validated' AND purge_at > ?")
    .bind(nowIso)
    .first()
  return row.n
}

// ---- Code d'accès et session client ----------------------------------------

async function hashCode(env, slug, code) {
  return hmacSign(env.SESSION_SECRET, `gallery-code:${slug}:${code}`)
}

async function newCode(env, slug) {
  const code = randomString(GALLERY_CODE_ALPHABET, GALLERY_CODE_LENGTH)
  return { code, hash: await hashCode(env, slug, code) }
}

async function galleryCookie(env, g) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400
  const payload = `g1.${g.id}.${g.access_version}.${exp}`
  const sig = await hmacSign(env.SESSION_SECRET, payload)
  return `${COOKIE_NAME}=${payload}.${sig}; Path=/api/galerie/${g.slug}; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}`
}

async function hasGallerySession(request, env, g) {
  if (!env.SESSION_SECRET) return false
  const header = request.headers.get('Cookie') ?? ''
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name !== COOKIE_NAME) continue
    const match = /^(g1\.(\d+)\.(\d+)\.(\d+))\.([A-Za-z0-9_-]+)$/.exec(rest.join('='))
    if (!match) continue
    const [, payload, id, version, exp, sig] = match
    if (Number(id) !== g.id || Number(version) !== g.access_version || Number(exp) * 1000 <= Date.now()) continue
    if (await hmacVerify(env.SESSION_SECRET, payload, sig)) return true
  }
  return false
}

/**
 * Accès client à une galerie : session de la galerie, ou session admin
 * (« Voir comme le client », en lecture seule, brouillons compris).
 * Renvoie null si la galerie est introuvable / indisponible (réponse unique).
 */
async function clientAccess(request, env, slug) {
  const g = await galleryBySlug(env.DB, slug)
  if (!g) return { g: null }
  const nowIso = new Date().toISOString()
  const status = effectiveStatus(g, nowIso)
  const admin = await hasValidSession(request, env)
  if (!admin && !CLIENT_VISIBLE.includes(status)) return { g: null }
  if (admin && status === 'expired') return { g: null }
  const session = admin || (await hasGallerySession(request, env, g))
  return { g, status, nowIso, session, admin }
}

const unavailable = () => gerror(404, UNAVAILABLE, { code: 'unavailable' })

function clientTitle(g) {
  const firstName = g.client_name.split(/\s+/)[0]
  if (g.session_type === 'autre') return `Séance photo · ${firstName}`
  if (g.session_type === 'mariage') return `Mariage · ${firstName}`
  return `Séance ${galleryTypeLabel(g.session_type).toLowerCase()} · ${firstName}`
}

// ---- R2 ---------------------------------------------------------------------

const objectKey = (g, kind, photoId, version) => `galleries/${g.storage_key}/${kind}/${photoId}/${version}`

/** Supprime tous les objets d'un préfixe : { objects, bytes } effacés. */
async function deletePrefixStats(env, prefix) {
  let objects = 0
  let bytes = 0
  let cursor
  do {
    const list = await env.GALLERY_BUCKET.list({ prefix, cursor, limit: 1000 })
    const keys = list.objects.map((o) => o.key)
    if (keys.length) {
      await env.GALLERY_BUCKET.delete(keys)
      objects += keys.length
      bytes += list.objects.reduce((n, o) => n + o.size, 0)
    }
    cursor = list.truncated ? list.cursor : undefined
  } while (cursor)
  return { objects, bytes }
}

const deletePrefix = async (env, prefix) => (await deletePrefixStats(env, prefix)).objects

function contentDisposition(filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

/** Sert un objet R2 en streaming, avec ETag (réponse 304 si inchangé). */
async function serveObject(env, request, key, { download = null, maxAge = 86_400 } = {}) {
  const object = await env.GALLERY_BUCKET.get(key, { onlyIf: request.headers })
  if (!object) return gerror(404, NOT_FOUND)
  const headers = new Headers(ROBOTS)
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Cache-Control', `private, max-age=${maxAge}`)
  headers.set('X-Content-Type-Options', 'nosniff')
  if (!object.body) return new Response(null, { status: 304, headers })
  headers.set('Content-Length', String(object.size))
  if (download) headers.set('Content-Disposition', contentDisposition(download))
  return new Response(object.body, { headers })
}

// ---- Admin : liste, création, détail ----------------------------------------

export async function listGalleries(request, env) {
  const nowIso = new Date().toISOString()
  const { results } = await env.DB.prepare(`SELECT ${GALLERY_COLUMNS} FROM galleries g ORDER BY g.created_at DESC`).all()
  return json({
    galleries: results.map((g) => serializeAdminGallery(g, nowIso)),
    to_retouch: await toRetouchCount(env.DB, nowIso),
  })
}

function validateGalleryInput(body, { partial = false } = {}) {
  const errors = {}
  const data = {}
  const has = (k) => !partial || body[k] !== undefined
  if (has('client_name')) {
    data.client_name = str(body.client_name)
    if (!data.client_name || data.client_name.length > 80) errors.client_name = 'Indiquez le nom du client (80 caractères max).'
  }
  if (has('client_email')) {
    data.client_email = str(body.client_email).toLowerCase()
    if (!EMAIL_PATTERN.test(data.client_email) || data.client_email.length > 254) errors.client_email = 'Adresse mail invalide.'
  }
  if (has('session_type')) {
    data.session_type = str(body.session_type)
    if (!GALLERY_SESSION_TYPES.some((t) => t.value === data.session_type)) errors.session_type = 'Choisissez un type de séance.'
  }
  if (has('shoot_date')) {
    data.shoot_date = str(body.shoot_date)
    if (!DATE_PATTERN.test(data.shoot_date)) errors.shoot_date = 'Date du shooting invalide.'
  }
  if (has('included_count')) {
    data.included_count = Number(body.included_count)
    if (!Number.isInteger(data.included_count) || data.included_count < INCLUDED_MIN || data.included_count > INCLUDED_MAX) {
      errors.included_count = `Entre ${INCLUDED_MIN} et ${INCLUDED_MAX} photos.`
    }
  }
  if (has('selection_deadline')) {
    data.selection_deadline = endOfDay(str(body.selection_deadline))
    if (!data.selection_deadline) errors.selection_deadline = 'Date limite invalide.'
  }
  return { data, errors }
}

export async function createGallery(request, env) {
  if (!env.SESSION_SECRET) return error(503, 'Espace non configuré.')
  const body = (await readJson(request)) ?? {}
  const now = new Date()
  const nowIso = now.toISOString()
  // Réglages par défaut (page Paramètres) : appliqués aux nouvelles galeries seulement.
  const defaults = await getSettings(env.DB)
  if (!body.selection_deadline) body.selection_deadline = addDays(dateKey(now), defaults.selection_days)
  if (body.included_count === undefined) body.included_count = defaults.included_default
  const { data, errors } = validateGalleryInput(body)
  if (!errors.selection_deadline && data.selection_deadline <= nowIso) errors.selection_deadline = 'La date limite doit être dans le futur.'
  if (Object.keys(errors).length) return error(422, 'Certaines informations sont à corriger.', { errors })

  let bookingId = null
  if (body.booking_id != null) {
    bookingId = Number(body.booking_id)
    const booking = await env.DB.prepare("SELECT id FROM bookings WHERE id = ? AND status = 'confirmed'").bind(bookingId).first()
    if (!booking) return error(422, 'Réservation introuvable ou non confirmée.')
  }

  const slug = randomString(SLUG_ALPHABET, 20)
  const storageKey = randomString(SLUG_ALPHABET, 24)
  const { code, hash } = await newCode(env, slug)
  const purgeAt = plusDays(data.selection_deadline, GALLERY_RETENTION.undeliveredPurgeDays)
  const row = await env.DB
    .prepare(
      `INSERT INTO galleries (slug, storage_key, client_name, client_email, session_type, shoot_date, included_count,
         status, access_code_hash, access_version, selection_deadline, purge_at, booking_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, 1, ?, ?, ?, ?, ?) RETURNING id`
    )
    .bind(
      slug,
      storageKey,
      data.client_name,
      data.client_email,
      data.session_type,
      data.shoot_date,
      data.included_count,
      hash,
      data.selection_deadline,
      purgeAt,
      bookingId,
      nowIso,
      nowIso
    )
    .first()
  const g = await galleryById(env.DB, row.id)
  return json({ gallery: serializeAdminGallery(g, nowIso), code }, 201)
}

export async function galleryDetail(request, env, { id }) {
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const nowIso = new Date().toISOString()
  const { results: photos } = await env.DB
    .prepare(
      `SELECT p.id, p.kind, p.original_filename, p.size_bytes, p.width, p.height, p.complete, p.format, p.mime_type, p.metadata_stripped,
              EXISTS (SELECT 1 FROM gallery_selections s WHERE s.photo_id = p.id) AS selected
       FROM gallery_photos p WHERE p.gallery_id = ? ORDER BY p.kind, p.sort_key`
    )
    .bind(id)
    .all()
  return json({
    gallery: serializeAdminGallery(g, nowIso),
    photos: photos.map((p) => ({ ...p, complete: Boolean(p.complete), selected: Boolean(p.selected) })),
  })
}

export async function updateGallery(request, env, { id }) {
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const body = (await readJson(request)) ?? {}
  const { data, errors } = validateGalleryInput(body, { partial: true })
  const nowIso = new Date().toISOString()
  if (body.delivery_expires_at !== undefined) {
    data.delivery_expires_at = endOfDay(str(body.delivery_expires_at))
    if (!data.delivery_expires_at) errors.delivery_expires_at = 'Date invalide.'
  }
  if (body.purge_at !== undefined) {
    data.purge_at = endOfDay(str(body.purge_at))
    if (!data.purge_at || data.purge_at <= nowIso) errors.purge_at = 'La date de suppression doit être dans le futur.'
  }
  if (body.cover_photo_id !== undefined) {
    const cover = await env.DB
      .prepare('SELECT id FROM gallery_photos WHERE id = ? AND gallery_id = ? AND complete = 1')
      .bind(Number(body.cover_photo_id), id)
      .first()
    if (!cover) errors.cover_photo_id = 'Photo introuvable.'
    else data.cover_photo_id = cover.id
  }
  if (data.included_count !== undefined && data.included_count < g.selected_count) {
    errors.included_count = `Le client a déjà sélectionné ${g.selected_count} photos.`
  }
  if (Object.keys(errors).length) return error(422, 'Certaines informations sont à corriger.', { errors })

  // Dates de conservation cohérentes : sans date explicite, la suppression
  // suit la date limite (galerie non livrée) ou l'expiration de la livraison.
  if (data.selection_deadline && !data.purge_at && !g.delivered_at) {
    data.purge_at = plusDays(data.selection_deadline, GALLERY_RETENTION.undeliveredPurgeDays)
  }
  if (data.delivery_expires_at && !data.purge_at) data.purge_at = data.delivery_expires_at
  if (data.delivery_expires_at && g.status === 'expired' && data.delivery_expires_at > nowIso) data.status = 'delivered'

  const fields = Object.keys(data)
  if (!fields.length) return json({ gallery: serializeAdminGallery(g, nowIso) })
  await env.DB
    .prepare(`UPDATE galleries SET ${fields.map((f) => `${f} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
    .bind(...fields.map((f) => data[f]), nowIso, id)
    .run()
  return json({ gallery: serializeAdminGallery(await galleryById(env.DB, id), nowIso) })
}

export async function regenerateCode(request, env, { id }) {
  if (!env.SESSION_SECRET) return error(503, 'Espace non configuré.')
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const { code, hash } = await newCode(env, g.slug)
  // Le nouveau numéro de version invalide toutes les sessions client en cours.
  await env.DB
    .prepare('UPDATE galleries SET access_code_hash = ?, access_version = access_version + 1, updated_at = ? WHERE id = ?')
    .bind(hash, new Date().toISOString(), id)
    .run()
  return json({ code, gallery: serializeAdminGallery(await galleryById(env.DB, id), new Date().toISOString()) })
}

async function transition(env, id, update) {
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const nowIso = new Date().toISOString()
  const result = update(g, nowIso)
  if (result.error) return error(409, result.error)
  const fields = Object.keys(result.set)
  await env.DB
    .prepare(`UPDATE galleries SET ${fields.map((f) => `${f} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND status = ?`)
    .bind(...fields.map((f) => result.set[f]), nowIso, id, g.status)
    .run()
  return json({ gallery: serializeAdminGallery(await galleryById(env.DB, id), nowIso) })
}

export const openSelection = (request, env, { id }) =>
  transition(env, id, (g, nowIso) => {
    if (g.status !== 'draft') return { error: 'La sélection est déjà ouverte.' }
    if (!g.proofs_count) return { error: 'Déposez au moins une photo avant d’ouvrir la sélection.' }
    if (g.selection_deadline <= nowIso) return { error: 'La date limite est dépassée : reportez-la d’abord.' }
    return { set: { status: 'selection_open', selection_opened_at: nowIso } }
  })

export const reopenSelection = (request, env, { id }) =>
  transition(env, id, (g, nowIso) => {
    if (g.status !== 'selection_validated') return { error: 'La sélection n’est pas validée.' }
    if (g.selection_deadline <= nowIso) return { error: 'La date limite est dépassée : reportez-la d’abord (Conservation).' }
    return { set: { status: 'selection_open', selection_validated_at: null } }
  })

export async function deliverGallery(request, env, { id }) {
  // Durée de téléchargement : réglage en vigueur au moment de la livraison.
  const { delivery_days: deliveryDays } = await getSettings(env.DB)
  return transition(env, id, (g, nowIso) => {
    if (!['selection_open', 'selection_validated'].includes(g.status)) return { error: 'Cette galerie ne peut pas être livrée.' }
    if (!g.finals_count) return { error: 'Déposez au moins une photo finale avant de livrer.' }
    const expires = plusDays(nowIso, deliveryDays)
    return { set: { status: 'delivered', delivered_at: nowIso, delivery_expires_at: expires, purge_at: expires } }
  })
}

/** Supprime une galerie entièrement et immédiatement (D1 + R2). */
async function destroyGallery(env, g) {
  const { results: uploads } = await env.DB
    .prepare('SELECT u.* FROM gallery_uploads u JOIN gallery_photos p ON p.id = u.photo_id WHERE p.gallery_id = ?')
    .bind(g.id)
    .all()
  await abortUploads(env, uploads)
  const objects = await deletePrefix(env, `galleries/${g.storage_key}/`)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM gallery_selections WHERE gallery_id = ?').bind(g.id),
    env.DB.prepare('DELETE FROM gallery_photos WHERE gallery_id = ?').bind(g.id),
    env.DB.prepare('DELETE FROM galleries WHERE id = ?').bind(g.id),
  ])
  return objects
}

export async function deleteGallery(request, env, { id }) {
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const objects = await destroyGallery(env, g)
  return json({ deleted: true, objects })
}

// ---- Admin : stockage et tri (page Paramètres) -------------------------------

export async function storage(request, env) {
  return json(await storageSummary(env, effectiveStatus))
}

/**
 * Supprime les aperçus de sélection d'une galerie livrée (versions filigranées
 * et couverture floutée) : les photos finales et l'accès du client restent
 * intacts ; les noms des photos sélectionnées restent lisibles dans l'admin.
 */
export async function clearProofs(request, env, { id }) {
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const nowIso = new Date().toISOString()
  if (effectiveStatus(g, nowIso) !== 'delivered') {
    return error(409, 'Seuls les aperçus d’une galerie livrée peuvent être supprimés.')
  }
  const freed = await deletePrefixStats(env, `galleries/${g.storage_key}/proof/`)
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE gallery_photos SET has_thumb = 0, has_preview = 0, has_blur = 0, complete = 0,
         thumb_bytes = NULL, preview_bytes = NULL, blur_bytes = NULL
       WHERE gallery_id = ? AND kind = 'proof'`
    ).bind(id),
    env.DB.prepare(
      `UPDATE galleries SET proofs_purged_at = COALESCE(proofs_purged_at, ?), updated_at = ?,
         cover_photo_id = CASE WHEN cover_photo_id IN (SELECT id FROM gallery_photos WHERE gallery_id = ? AND kind = 'proof') THEN NULL ELSE cover_photo_id END
       WHERE id = ?`
    ).bind(nowIso, nowIso, id, id),
  ])
  return json({ freed_bytes: freed.bytes, objects: freed.objects, gallery: serializeAdminGallery(await galleryById(env.DB, id), nowIso) })
}

/** Avance la suppression automatique : date antérieure à l'actuelle, jamais dans le passé. */
export async function advancePurge(request, env, { id }) {
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const body = (await readJson(request)) ?? {}
  const purgeAt = endOfDay(str(body.date))
  const nowIso = new Date().toISOString()
  if (!purgeAt) return error(422, 'Date invalide.', { errors: { date: 'Date invalide.' } })
  if (purgeAt <= nowIso) return error(422, 'La date ne peut pas être dans le passé.', { errors: { date: 'La date ne peut pas être dans le passé.' } })
  if (purgeAt >= g.purge_at) {
    return error(422, 'Choisissez une date antérieure à la suppression prévue.', { errors: { date: 'Choisissez une date antérieure à la suppression prévue.' } })
  }
  // Le téléchargement ne peut pas durer au-delà de la suppression.
  const expires = g.delivery_expires_at && g.delivery_expires_at > purgeAt ? purgeAt : g.delivery_expires_at
  await env.DB
    .prepare('UPDATE galleries SET purge_at = ?, delivery_expires_at = ?, updated_at = ? WHERE id = ?')
    .bind(purgeAt, expires, nowIso, id)
    .run()
  return json({ gallery: serializeAdminGallery(await galleryById(env.DB, id), nowIso) })
}

/** Réservations confirmées récentes (préremplissage d'une galerie). */
export async function bookingsForGallery(request, env) {
  const since = plusDays(new Date().toISOString(), -120)
  const { results } = await env.DB
    .prepare(
      `SELECT b.id, b.first_name, b.last_name, b.email, b.session_type, s.start_at
       FROM bookings b JOIN slots s ON s.id = b.slot_id
       WHERE b.status = 'confirmed' AND s.start_at >= ?
       ORDER BY s.start_at DESC LIMIT 50`
    )
    .bind(since)
    .all()
  return json({ bookings: results })
}

// ---- Admin : photos ---------------------------------------------------------

const sortKey = (name) => name.toLowerCase().replace(/\d+/g, (d) => d.padStart(10, '0'))

/** Enregistre une photo (ou retrouve celle déjà déposée : reprise sans doublon). */
export async function registerPhoto(request, env, { id }) {
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const body = (await readJson(request)) ?? {}
  const kind = body.kind
  const name = str(body.original_filename)
  const size = Number(body.size_bytes)
  const width = Number(body.width)
  const height = Number(body.height)
  if (!PHOTO_VERSIONS[kind] || !name || name.length > 200 || !(size > 0) || !(width > 0) || !(height > 0)) {
    return error(422, 'Photo invalide.')
  }
  // Format détecté dans le navigateur (signature du fichier) et, pour une
  // finale, type du fichier livré et retrait des métadonnées.
  const format = PHOTO_FORMATS.includes(body.format) ? body.format : null
  const mimeType = kind === 'final' && FINAL_CONTENT_TYPES.includes(body.mime_type) ? body.mime_type : null
  const stripped = kind === 'final' && typeof body.metadata_stripped === 'boolean' ? Number(body.metadata_stripped) : null
  if (effectiveStatus(g, new Date().toISOString()) === 'expired') return error(409, 'Cette galerie a expiré.')
  if (kind === 'proof' && !['draft', 'selection_open'].includes(g.status)) {
    return error(409, 'La sélection est terminée : les aperçus ne peuvent plus être modifiés.')
  }
  const nowIso = new Date().toISOString()
  await env.DB
    .prepare(
      `INSERT INTO gallery_photos (gallery_id, kind, original_filename, size_bytes, width, height, sort_key, created_at,
         format, mime_type, metadata_stripped)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (gallery_id, kind, original_filename, size_bytes) DO UPDATE SET
         format = COALESCE(excluded.format, gallery_photos.format),
         mime_type = COALESCE(excluded.mime_type, gallery_photos.mime_type),
         metadata_stripped = COALESCE(excluded.metadata_stripped, gallery_photos.metadata_stripped)`
    )
    .bind(id, kind, name, size, Math.round(width), Math.round(height), sortKey(name), nowIso, format, mimeType, stripped)
    .run()
  const photo = await env.DB
    .prepare(
      `SELECT id, kind, original_filename, complete, has_thumb, has_preview, has_blur, has_hd
       FROM gallery_photos WHERE gallery_id = ? AND kind = ? AND original_filename = ? AND size_bytes = ?`
    )
    .bind(id, kind, name, size)
    .first()
  // Envoi en morceaux déjà commencé : la reprise part des morceaux manquants.
  const upload = await env.DB.prepare('SELECT * FROM gallery_uploads WHERE photo_id = ?').bind(photo.id).first()
  return json({
    photo: {
      ...photo,
      complete: Boolean(photo.complete),
      hd_upload: upload ? multipartState(upload) : null,
    },
  })
}

export async function uploadVersion(request, env, { id, pid, version }) {
  const g = await galleryById(env.DB, id)
  if (!g) return error(404, NOT_FOUND)
  const photo = await env.DB.prepare('SELECT id, kind FROM gallery_photos WHERE id = ? AND gallery_id = ?').bind(pid, id).first()
  if (!photo || !PHOTO_VERSIONS[photo.kind].includes(version)) return error(404, NOT_FOUND)
  const length = Number(request.headers.get('Content-Length'))
  const max = VERSION_MAX_BYTES[version]
  if (!length) return error(411, 'Taille du fichier inconnue.')
  if (length > max) {
    return error(413, `Fichier trop lourd : ${Math.round(max / 1_000_000)} Mo maximum par photo.`)
  }
  const type = (request.headers.get('Content-Type') ?? '').split(';')[0].toLowerCase()
  const allowed = version === 'hd' ? FINAL_CONTENT_TYPES : ['image/webp', 'image/jpeg']
  if (!allowed.includes(type)) return error(415, version === 'hd' ? 'Ce fichier n’est pas une photo reconnue.' : 'Format WebP ou JPEG attendu.')

  // Écriture en streaming vers R2 (le fichier n'est jamais chargé en mémoire).
  await env.GALLERY_BUCKET.put(objectKey(g, photo.kind, photo.id, version), request.body, {
    httpMetadata: { contentType: type },
  })
  return json({ complete: await markVersion(env, photo.id, version, length, version === 'hd' ? type : null) })
}

/** Version présente dans R2 : drapeau, taille réelle stockée, photo complète ou non. */
async function markVersion(env, photoId, version, bytes, mimeType = null) {
  await env.DB.batch([
    env.DB
      .prepare(`UPDATE gallery_photos SET has_${version} = 1, ${version}_bytes = ?, mime_type = COALESCE(?, mime_type) WHERE id = ?`)
      .bind(bytes, mimeType, photoId),
    env.DB
      .prepare(
        `UPDATE gallery_photos SET complete = (has_thumb = 1 AND has_preview = 1 AND has_blur = 1 AND (kind = 'proof' OR has_hd = 1))
         WHERE id = ?`
      )
      .bind(photoId),
  ])
  const updated = await env.DB.prepare('SELECT complete FROM gallery_photos WHERE id = ?').bind(photoId).first()
  return Boolean(updated.complete)
}

// ---- Admin : photo finale en plusieurs morceaux (multipart R2) ---------------

const multipartState = (u) => ({
  part_size: u.part_size,
  total_bytes: u.total_bytes,
  content_type: u.content_type,
  parts: JSON.parse(u.parts).map((p) => p.partNumber),
})
const partCount = (u) => Math.ceil(u.total_bytes / u.part_size)

/** Abandonne proprement des envois en cours (aucun objet n'est créé dans R2). */
async function abortUploads(env, uploads) {
  for (const u of uploads) {
    try {
      await env.GALLERY_BUCKET.resumeMultipartUpload(u.object_key, u.upload_id).abort()
    } catch {
      // Déjà terminé ou expiré : rien à abandonner.
    }
    await env.DB.prepare('DELETE FROM gallery_uploads WHERE photo_id = ?').bind(u.photo_id).run()
  }
  return uploads.length
}

async function finalPhoto(env, id, pid) {
  const g = await galleryById(env.DB, id)
  const photo = g && (await env.DB.prepare("SELECT id, kind FROM gallery_photos WHERE id = ? AND gallery_id = ? AND kind = 'final'").bind(pid, id).first())
  return photo ? { g, photo } : null
}

/** Ouvre (ou retrouve, pour une reprise) l'envoi en morceaux du fichier HD. */
export async function startMultipart(request, env, { id, pid }) {
  const found = await finalPhoto(env, id, pid)
  if (!found) return error(404, NOT_FOUND)
  const body = (await readJson(request)) ?? {}
  const size = Number(body.size)
  const type = str(body.content_type).toLowerCase()
  if (!Number.isInteger(size) || size <= 0) return error(422, 'Taille du fichier inconnue.')
  if (size > FINAL_MAX_BYTES) return error(413, 'Fichier trop lourd : 4 Go maximum par photo.')
  if (!FINAL_CONTENT_TYPES.includes(type)) return error(415, 'Ce fichier n’est pas une photo reconnue.')
  const existing = await env.DB.prepare('SELECT * FROM gallery_uploads WHERE photo_id = ?').bind(pid).first()
  if (existing && existing.total_bytes === size && existing.content_type === type) return json(multipartState(existing))
  if (existing) await abortUploads(env, [existing])
  const key = objectKey(found.g, 'final', pid, 'hd')
  const upload = await env.GALLERY_BUCKET.createMultipartUpload(key, { httpMetadata: { contentType: type } })
  const row = {
    photo_id: pid,
    object_key: key,
    upload_id: upload.uploadId,
    part_size: MULTIPART_PART_BYTES,
    total_bytes: size,
    content_type: type,
    parts: '[]',
  }
  await env.DB
    .prepare(
      `INSERT INTO gallery_uploads (photo_id, object_key, upload_id, part_size, total_bytes, content_type, parts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', ?)`
    )
    .bind(pid, key, row.upload_id, row.part_size, size, type, new Date().toISOString())
    .run()
  return json(multipartState(row), 201)
}

const NO_UPLOAD = () => error(404, 'Envoi introuvable : il va reprendre depuis le début.', { code: 'no-upload' })

export async function uploadPart(request, env, { id, pid, part }) {
  const found = await finalPhoto(env, id, pid)
  if (!found) return error(404, NOT_FOUND)
  const u = await env.DB.prepare('SELECT * FROM gallery_uploads WHERE photo_id = ?').bind(pid).first()
  if (!u) return NO_UPLOAD()
  const number = Number(part)
  const count = partCount(u)
  if (!Number.isInteger(number) || number < 1 || number > count) return error(422, 'Morceau invalide.')
  const expected = number < count ? u.part_size : u.total_bytes - (count - 1) * u.part_size
  const length = Number(request.headers.get('Content-Length'))
  if (length !== expected) return error(422, 'Taille du morceau inattendue.')
  let uploaded
  try {
    uploaded = await env.GALLERY_BUCKET.resumeMultipartUpload(u.object_key, u.upload_id).uploadPart(number, request.body)
  } catch {
    // Envoi expiré ou abandonné côté R2 : le navigateur recommence.
    await env.DB.prepare('DELETE FROM gallery_uploads WHERE photo_id = ?').bind(pid).run()
    return NO_UPLOAD()
  }
  // Les morceaux d'un fichier sont envoyés l'un après l'autre : mise à jour simple.
  const fresh = await env.DB.prepare('SELECT parts FROM gallery_uploads WHERE photo_id = ?').bind(pid).first()
  if (!fresh) return NO_UPLOAD()
  const parts = JSON.parse(fresh.parts).filter((p) => p.partNumber !== number)
  parts.push({ partNumber: number, etag: uploaded.etag })
  await env.DB.prepare('UPDATE gallery_uploads SET parts = ? WHERE photo_id = ?').bind(JSON.stringify(parts), pid).run()
  return json({ part: number, parts: parts.length, of: count })
}

export async function completeMultipart(request, env, { id, pid }) {
  const found = await finalPhoto(env, id, pid)
  if (!found) return error(404, NOT_FOUND)
  const u = await env.DB.prepare('SELECT * FROM gallery_uploads WHERE photo_id = ?').bind(pid).first()
  if (!u) return NO_UPLOAD()
  const parts = JSON.parse(u.parts).sort((a, b) => a.partNumber - b.partNumber)
  if (parts.length !== partCount(u) || parts.some((p, i) => p.partNumber !== i + 1)) {
    return error(409, 'Envoi incomplet : certains morceaux manquent.', { parts: parts.map((p) => p.partNumber) })
  }
  let object
  try {
    object = await env.GALLERY_BUCKET.resumeMultipartUpload(u.object_key, u.upload_id).complete(parts)
  } catch {
    await abortUploads(env, [u])
    return NO_UPLOAD()
  }
  await env.DB.prepare('DELETE FROM gallery_uploads WHERE photo_id = ?').bind(pid).run()
  return json({ complete: await markVersion(env, pid, 'hd', object.size, u.content_type) })
}

export async function abortMultipart(request, env, { id, pid }) {
  const found = await finalPhoto(env, id, pid)
  if (!found) return error(404, NOT_FOUND)
  const u = await env.DB.prepare('SELECT * FROM gallery_uploads WHERE photo_id = ?').bind(pid).first()
  return json({ aborted: u ? await abortUploads(env, [u]) : 0 })
}

export async function deletePhoto(request, env, { id, pid }) {
  const g = await galleryById(env.DB, id)
  const photo = g && (await env.DB.prepare('SELECT id, kind FROM gallery_photos WHERE id = ? AND gallery_id = ?').bind(pid, id).first())
  if (!photo) return error(404, NOT_FOUND)
  const { results: uploads } = await env.DB.prepare('SELECT * FROM gallery_uploads WHERE photo_id = ?').bind(photo.id).all()
  await abortUploads(env, uploads)
  await deletePrefix(env, `galleries/${g.storage_key}/${photo.kind}/${photo.id}/`)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM gallery_selections WHERE photo_id = ?').bind(photo.id),
    env.DB.prepare('DELETE FROM gallery_photos WHERE id = ?').bind(photo.id),
    env.DB.prepare('UPDATE galleries SET cover_photo_id = NULL WHERE id = ? AND cover_photo_id = ?').bind(id, photo.id),
  ])
  return json({ deleted: true })
}

export async function adminPhoto(request, env, { id, pid, version }) {
  const g = await galleryById(env.DB, id)
  const photo = g && (await env.DB.prepare('SELECT * FROM gallery_photos WHERE id = ? AND gallery_id = ?').bind(pid, id).first())
  if (!photo || !PHOTO_VERSIONS[photo.kind].includes(version)) return error(404, NOT_FOUND)
  return serveObject(env, request, objectKey(g, photo.kind, photo.id, version), {
    download: version === 'hd' ? photo.original_filename : null,
  })
}

// ---- Client -----------------------------------------------------------------

/**
 * Photo de couverture : après la livraison, toujours une photo finale (sans
 * filigrane) — la couverture choisie si c'est une finale, sinon la première.
 */
async function coverPhoto(db, g, status) {
  if (!g.cover_id) return null
  const cover = await db.prepare('SELECT id, kind FROM gallery_photos WHERE id = ?').bind(g.cover_id).first()
  if (status !== 'delivered' || cover?.kind === 'final') return cover
  return db
    .prepare("SELECT id, kind FROM gallery_photos WHERE gallery_id = ? AND kind = 'final' AND complete = 1 ORDER BY sort_key LIMIT 1")
    .bind(g.id)
    .first()
}

/** Informations publiques minimales (écran d'accès). */
export async function galleryPublic(request, env, { slug }) {
  const access = await clientAccess(request, env, slug)
  if (!access.g) return unavailable()
  return gjson({ title: clientTitle(access.g), authenticated: Boolean(access.session), preview: access.admin })
}

/** Mini couverture floutée (32 px) affichée derrière l'écran de code. */
export async function galleryCoverBlur(request, env, { slug }) {
  const access = await clientAccess(request, env, slug)
  const photo = access.g && (await coverPhoto(env.DB, access.g, access.status))
  if (!photo) return unavailable()
  return serveObject(env, request, objectKey(access.g, photo.kind, photo.id, 'blur'), { maxAge: 3600 })
}

export async function galleryLogin(request, env, { slug }) {
  if (!env.SESSION_SECRET) return gerror(503, 'Galerie momentanément indisponible.')
  const access = await clientAccess(request, env, slug)
  if (!access.g) return unavailable()
  const g = access.g
  const now = new Date()
  await sweep(env.DB, now)
  const subject = await ipSubject(env, clientIp(request))
  const action = `gallery:${g.id}`
  if (await isBlocked(env.DB, subject, action, now)) {
    return gerror(429, 'Trop de tentatives. Réessayez dans un quart d’heure.')
  }
  const body = await readJson(request)
  const code = normalizeGalleryCode(body?.code)
  const ok =
    code.length === GALLERY_CODE_LENGTH &&
    (await hmacVerify(env.SESSION_SECRET, `gallery-code:${g.slug}:${code}`, g.access_code_hash))
  if (!ok) {
    await hit(env.DB, subject, action, {
      now,
      windowMinutes: CODE_WINDOW_MINUTES,
      limit: CODE_MAX_FAILURES,
      blockMinutes: CODE_WINDOW_MINUTES,
    })
    return gerror(401, 'Ce code ne correspond pas. Vérifiez-le et réessayez.')
  }
  await reset(env.DB, subject, action)
  return gjson({ ok: true }, 200, { 'Set-Cookie': await galleryCookie(env, g) })
}

export async function galleryContent(request, env, { slug }) {
  const { g, status, nowIso, session, admin } = await clientAccess(request, env, slug)
  if (!g) return unavailable()
  if (!session) return gerror(401, 'Entrez votre code pour accéder à la galerie.', { code: 'locked' })
  const delivered = status === 'delivered'
  const kind = delivered ? 'final' : 'proof'
  const { results: photos } = await env.DB
    .prepare(
      `SELECT id, width, height, original_filename FROM gallery_photos
       WHERE gallery_id = ? AND kind = ? AND complete = 1 ORDER BY sort_key`
    )
    .bind(g.id, kind)
    .all()
  const { results: selected } = await env.DB
    .prepare('SELECT photo_id FROM gallery_selections WHERE gallery_id = ?')
    .bind(g.id)
    .all()
  return gjson({
    title: clientTitle(g),
    status,
    preview: admin,
    shoot_date: g.shoot_date,
    included_count: g.included_count,
    selection_deadline: g.selection_deadline,
    selection_locked: status !== 'selection_open' || g.selection_deadline <= nowIso || admin,
    deadline_passed: g.selection_deadline <= nowIso,
    selection_validated_at: g.selection_validated_at,
    delivery_expires_at: g.delivery_expires_at,
    cover_id: (await coverPhoto(env.DB, g, status))?.id ?? null,
    photos: photos.map((p) => ({
      id: p.id,
      w: p.width,
      h: p.height,
      // Le nom d'origine ne sert qu'au téléchargement des photos finales.
      ...(delivered ? { name: p.original_filename } : {}),
    })),
    selected: selected.map((s) => s.photo_id),
  })
}

async function selectionGuard(request, env, slug) {
  const access = await clientAccess(request, env, slug)
  if (!access.g) return { response: unavailable() }
  if (!access.session) return { response: gerror(401, 'Entrez votre code pour accéder à la galerie.', { code: 'locked' }) }
  if (access.admin) return { response: gerror(403, 'Aperçu : la sélection du client n’est pas modifiable.') }
  if (access.status !== 'selection_open' || access.g.selection_deadline <= access.nowIso) {
    return { response: gerror(409, 'La sélection n’est plus modifiable. Écrivez-moi si besoin.', { code: 'locked' }) }
  }
  return access
}

async function selectedCount(db, galleryId) {
  return (await db.prepare('SELECT COUNT(*) AS n FROM gallery_selections WHERE gallery_id = ?').bind(galleryId).first()).n
}

export async function selectPhoto(request, env, { slug, pid }) {
  const access = await selectionGuard(request, env, slug)
  if (access.response) return access.response
  const { g, nowIso } = access
  // Une seule instruction : la limite est vérifiée et appliquée de façon
  // atomique, même si plusieurs sélections arrivent en même temps.
  const result = await env.DB
    .prepare(
      `INSERT INTO gallery_selections (gallery_id, photo_id, selected_at)
       SELECT ?1, p.id, ?3 FROM gallery_photos p JOIN galleries g ON g.id = p.gallery_id
       WHERE p.id = ?2 AND p.gallery_id = ?1 AND p.kind = 'proof' AND p.complete = 1
         AND g.status = 'selection_open' AND g.selection_deadline > ?3
         AND (SELECT COUNT(*) FROM gallery_selections s WHERE s.gallery_id = ?1) < g.included_count
       ON CONFLICT (gallery_id, photo_id) DO NOTHING`
    )
    .bind(g.id, pid, nowIso)
    .run()
  const count = await selectedCount(env.DB, g.id)
  if (!result.meta.changes) {
    const already = await env.DB
      .prepare('SELECT 1 FROM gallery_selections WHERE gallery_id = ? AND photo_id = ?')
      .bind(g.id, pid)
      .first()
    if (already) return gjson({ selected: true, count })
    const photo = await env.DB
      .prepare("SELECT 1 FROM gallery_photos WHERE id = ? AND gallery_id = ? AND kind = 'proof' AND complete = 1")
      .bind(pid, g.id)
      .first()
    if (!photo) return gerror(404, NOT_FOUND)
    return gerror(
      409,
      `Vous avez déjà choisi vos ${g.included_count} photos. Retirez-en une pour en ajouter une autre.`,
      { code: 'limit', count }
    )
  }
  return gjson({ selected: true, count })
}

export async function unselectPhoto(request, env, { slug, pid }) {
  const access = await selectionGuard(request, env, slug)
  if (access.response) return access.response
  await env.DB.prepare('DELETE FROM gallery_selections WHERE gallery_id = ? AND photo_id = ?').bind(access.g.id, pid).run()
  return gjson({ selected: false, count: await selectedCount(env.DB, access.g.id) })
}

export async function validateSelection(request, env, { slug }, ctx) {
  const access = await selectionGuard(request, env, slug)
  if (access.response) return access.response
  const { g, nowIso } = access
  const body = (await readJson(request)) ?? {}
  const comment = str(body.comment).slice(0, 500) || null
  const count = await selectedCount(env.DB, g.id)
  if (!count) return gerror(422, 'Choisissez au moins une photo avant de valider.')
  const purgeAt = [g.purge_at, plusDays(nowIso, GALLERY_RETENTION.undeliveredPurgeDays)].sort().pop()
  const result = await env.DB
    .prepare(
      `UPDATE galleries SET status = 'selection_validated', selection_validated_at = ?, client_comment = ?,
         purge_at = ?, updated_at = ? WHERE id = ? AND status = 'selection_open'`
    )
    .bind(nowIso, comment, purgeAt, nowIso, g.id)
    .run()
  if (!result.meta.changes) return gerror(409, 'La sélection n’est plus modifiable.', { code: 'locked' })
  // Notification de Mathilde (même mécanisme que les réservations) : ne
  // retarde jamais la réponse, inactive sans RESEND_API_KEY.
  if (env.RESEND_API_KEY && ctx?.waitUntil) {
    const adminUrl = new URL('/espace-mathilde', request.url).toString()
    ctx.waitUntil(notifySelectionValidated(env, { ...g, comment, count }, adminUrl))
  }
  return gjson({ validated: true, count })
}

export async function clientPhoto(request, env, { slug, pid, version }) {
  const { g, status, session } = await clientAccess(request, env, slug)
  if (!g) return unavailable()
  if (!session) return gerror(401, 'Entrez votre code pour accéder à la galerie.', { code: 'locked' })
  const photo = await env.DB
    .prepare('SELECT id, kind, original_filename FROM gallery_photos WHERE id = ? AND gallery_id = ? AND complete = 1')
    .bind(pid, g.id)
    .first()
  if (!photo || !PHOTO_VERSIONS[photo.kind].includes(version)) return gerror(404, NOT_FOUND)
  // Aucune photo finale avant la livraison.
  if (photo.kind === 'final' && status !== 'delivered') return gerror(404, NOT_FOUND)
  return serveObject(env, request, objectKey(g, photo.kind, photo.id, version), {
    download: version === 'hd' ? photo.original_filename : null,
    maxAge: version === 'hd' ? 3600 : 86_400,
  })
}

// ---- Nettoyage (Cron quotidien + bouton admin) ------------------------------

/**
 * 1. Livraisons échues → Expirée.
 * 2. Galeries dont la date de suppression est passée → supprimées (D1 + R2).
 * 3. Aperçus de sélection supprimés 7 jours après la livraison.
 */
export async function runGalleryCleanup(env, now = new Date()) {
  const nowIso = now.toISOString()
  const db = env.DB
  const expired = await db
    .prepare(
      `UPDATE galleries SET status = 'expired', updated_at = ?1
       WHERE status = 'delivered' AND delivery_expires_at IS NOT NULL AND delivery_expires_at <= ?1`
    )
    .bind(nowIso)
    .run()

  const { results: toPurge } = await db.prepare('SELECT id, storage_key FROM galleries WHERE purge_at <= ?').bind(nowIso).all()
  let objects = 0
  for (const g of toPurge) objects += await destroyGallery(env, g)

  const { proofs_after_delivery_days: proofsDays } = await getSettings(db)
  const proofsBefore = plusDays(nowIso, -proofsDays)
  const { results: delivered } = await db
    .prepare(
      `SELECT id, storage_key FROM galleries
       WHERE status IN ('delivered', 'expired') AND delivered_at IS NOT NULL AND delivered_at <= ? AND proofs_purged_at IS NULL`
    )
    .bind(proofsBefore)
    .all()
  for (const g of delivered) {
    objects += await deletePrefix(env, `galleries/${g.storage_key}/proof/`)
    await db.batch([
      db.prepare(
        "DELETE FROM gallery_selections WHERE gallery_id = ? AND photo_id IN (SELECT id FROM gallery_photos WHERE gallery_id = ? AND kind = 'proof')"
      ).bind(g.id, g.id),
      db.prepare("DELETE FROM gallery_photos WHERE gallery_id = ? AND kind = 'proof'").bind(g.id),
      db.prepare('UPDATE galleries SET proofs_purged_at = ?, cover_photo_id = NULL WHERE id = ?').bind(nowIso, g.id),
    ])
  }
  // Envois en morceaux abandonnés depuis plus de 7 jours : fermés proprement.
  const { results: stale } = await db.prepare('SELECT * FROM gallery_uploads WHERE created_at <= ?').bind(plusDays(nowIso, -7)).all()
  const uploadsAborted = await abortUploads(env, stale)
  const summary = {
    uploads_aborted: uploadsAborted,
    expired: expired.meta.changes,
    purged: toPurge.length,
    proofs_cleared: delivered.length,
    objects_deleted: objects,
  }
  // Journal sans donnée personnelle : seulement des compteurs.
  console.log('gallery_cleanup', JSON.stringify(summary))
  return summary
}

export async function cleanupNow(request, env) {
  return json(await runGalleryCleanup(env))
}

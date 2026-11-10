// File de dépôt des photos d'une galerie : 3 traitements simultanés,
// progression globale et par fichier, réessai des échecs, reprise après
// rechargement (une photo déjà complète — même nom et même taille — n'est
// jamais redéposée ; une photo incomplète ne redépose que ses versions
// manquantes, et un gros fichier final reprend à son dernier morceau envoyé).
//
// Formats : détectés par la signature du fichier (formats.js).
// - Aperçus : JPEG, PNG, WebP, AVIF, HEIC, TIFF, CR3, CR2. Seules les versions
//   filigranées partent en ligne, jamais le fichier d'origine (ni le RAW).
// - Finales : toute photo, RAW compris, livrée telle quelle. Métadonnées
//   retirées sans recompression pour JPEG et PNG ; avertissement sinon.
//   Au-delà de 50 Mo, envoi en plusieurs morceaux (multipart R2).

import { PHOTO_VERSIONS } from '../../../shared/galleries.js'
import { METADATA_WARNING, MIME_TYPES, PROOF_FORMATS, STRIPPABLE_FORMATS, sniffFormat } from './formats.js'
import { stripJpegMetadata } from './jpegMeta.js'
import { stripPngMetadata } from './pngStrip.js'

export const MULTIPART_THRESHOLD = 50 * 1024 * 1024
const NOT_A_PHOTO = 'Ce fichier n’est pas une photo reconnue.'
const NOT_A_PROOF = 'Format non pris en charge pour la sélection : JPEG, PNG, WebP, AVIF, HEIC, TIFF, CR3 ou CR2.'
const PART_RETRIES = 3

const key = (name, size) => `${name}::${size}`
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function send(method, url, body, { contentType, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    if (contentType) xhr.setRequestHeader('Content-Type', contentType)
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // réponse non JSON
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data)
      reject(Object.assign(new Error(data.error || 'Envoi impossible.'), { status: xhr.status, data }))
    }
    xhr.onerror = () => reject(Object.assign(new Error('Connexion interrompue.'), { status: 0 }))
    xhr.send(body ?? null)
  })
}

const sendJson = (method, url, body) => send(method, url, body ? JSON.stringify(body) : null, { contentType: 'application/json' })

async function registerPhoto(galleryId, body) {
  const data = await sendJson('POST', `/api/admin/galleries/${galleryId}/photos`, body)
  return data.photo
}

/**
 * Envoi d'un gros fichier final en morceaux : chaque morceau est réessayé
 * (3 fois) ; après une coupure, l'envoi reprend aux morceaux manquants.
 */
async function uploadMultipart(base, blob, contentType, resume, onProgress) {
  let state = resume && resume.total_bytes === blob.size && resume.content_type === contentType ? resume : null
  for (let attempt = 0; attempt < 2; attempt++) {
    state ??= await sendJson('POST', base, { size: blob.size, content_type: contentType })
    const partSize = state.part_size
    const count = Math.ceil(blob.size / partSize)
    const done = new Set(state.parts)
    let sent = [...done].reduce((n, p) => n + Math.min(partSize, blob.size - (p - 1) * partSize), 0)
    onProgress(sent / blob.size)
    let restart = false
    for (let part = 1; part <= count && !restart; part++) {
      if (done.has(part)) continue
      const chunk = blob.slice((part - 1) * partSize, Math.min(blob.size, part * partSize))
      for (let tryNo = 1; ; tryNo++) {
        try {
          await send('PUT', `${base}/${part}`, chunk, {
            contentType: 'application/octet-stream',
            onProgress: (ratio) => onProgress((sent + ratio * chunk.size) / blob.size),
          })
          break
        } catch (err) {
          // Envoi inconnu du serveur (abandonné, expiré) : on recommence.
          if (err.data?.code === 'no-upload') {
            restart = true
            break
          }
          // Refus définitif (taille, format…) : envoi abandonné côté R2, rien ne reste.
          if (err.status >= 400 && err.status < 500) {
            await send('DELETE', base).catch(() => {})
            throw err
          }
          // Coupure répétée : l'envoi reste ouvert pour « Réessayer les échecs ».
          if (tryNo >= PART_RETRIES) throw err
          await wait(1000 * 2 ** (tryNo - 1))
        }
      }
      if (!restart) sent += chunk.size
    }
    if (!restart) return sendJson('POST', `${base}/complete`)
    state = null
  }
  throw new Error('Envoi impossible.')
}

/** Fichier HD à livrer : métadonnées retirées si le format le permet. */
async function deliverable(file, format) {
  const contentType = MIME_TYPES[format] ?? 'application/octet-stream'
  if (format === 'jpeg') return { blob: new Blob([stripJpegMetadata(await file.arrayBuffer())], { type: contentType }), stripped: true, contentType }
  if (format === 'png') return { blob: new Blob([stripPngMetadata(await file.arrayBuffer())], { type: contentType }), stripped: true, contentType }
  return { blob: file, stripped: false, contentType }
}

/**
 * @param {object} options
 * @param {number} options.galleryId
 * @param {'proof'|'final'} options.kind
 * @param {Array} options.existing photos déjà connues ({original_filename, size_bytes, kind, complete})
 * @param {{process: Function}} options.processor
 * @param {(state) => void} options.onChange
 */
export function createUploadQueue({ galleryId, kind, existing = [], processor, onChange, onPhotoDone, concurrency = 3 }) {
  const done = new Set(existing.filter((p) => p.kind === kind && p.complete).map((p) => key(p.original_filename, p.size_bytes)))
  const items = []
  let running = 0
  let stopped = false

  const emit = () => {
    const finished = items.filter((i) => i.status === 'done' || i.status === 'skipped').length
    onChange({
      items: items.slice(),
      total: items.length,
      finished,
      failed: items.filter((i) => i.status === 'error').length,
      warnings: items.filter((i) => i.warning).length,
      active: running > 0 || items.some((i) => i.status === 'waiting'),
    })
  }

  async function handle(item) {
    item.status = 'processing'
    item.progress = 0.05
    emit()
    const format = await sniffFormat(item.file)
    item.format = format
    if (!format) throw Object.assign(new Error(NOT_A_PHOTO), { permanent: true })
    if (kind === 'proof' && !PROOF_FORMATS.includes(format)) throw Object.assign(new Error(NOT_A_PROOF), { permanent: true })

    const { width, height, versions } = await processor.process(item.file, kind, format)
    let hd = null
    if (kind === 'final') {
      hd = await deliverable(item.file, format)
      if (!hd.stripped || !STRIPPABLE_FORMATS.includes(format)) item.warning = METADATA_WARNING
    }
    item.status = 'uploading'
    item.progress = 0.2
    emit()
    const photo = await registerPhoto(galleryId, {
      kind,
      original_filename: item.file.name,
      size_bytes: item.file.size,
      width,
      height,
      format,
      ...(hd ? { mime_type: hd.contentType, metadata_stripped: hd.stripped } : {}),
    })
    const blobs = { ...versions, ...(hd ? { hd: hd.blob } : {}) }
    const missing = PHOTO_VERSIONS[kind].filter((v) => !photo[`has_${v}`])
    const weights = missing.map((v) => blobs[v].size)
    const total = weights.reduce((a, b) => a + b, 0) || 1
    let sent = 0
    const base = `/api/admin/galleries/${galleryId}/photos/${photo.id}`
    for (const [index, version] of missing.entries()) {
      const onProgress = (ratio) => {
        item.progress = 0.2 + (0.8 * (sent + ratio * weights[index])) / total
        emit()
      }
      const blob = blobs[version]
      if (version === 'hd' && blob.size > MULTIPART_THRESHOLD) {
        await uploadMultipart(`${base}/hd/multipart`, blob, hd.contentType, photo.hd_upload, onProgress)
      } else {
        await send('PUT', `${base}/${version}`, blob, {
          contentType: version === 'hd' ? hd.contentType : blob.type || 'image/jpeg',
          onProgress,
        })
      }
      sent += weights[index]
    }
    item.status = 'done'
    item.progress = 1
    done.add(key(item.file.name, item.file.size))
    onPhotoDone?.(photo)
  }

  function pump() {
    while (!stopped && running < concurrency) {
      const next = items.find((i) => i.status === 'waiting')
      if (!next) break
      running++
      handle(next)
        .catch((err) => {
          next.status = 'error'
          next.error = err.message
          next.permanent = Boolean(err.permanent)
          // Session admin expirée : on arrête tout, rien n'est perdu (reprise possible).
          if (err.status === 401) stopped = true
        })
        .finally(() => {
          running--
          emit()
          pump()
        })
    }
    emit()
  }

  return {
    add(files) {
      for (const file of files) {
        if (items.some((i) => i.file.name === file.name && i.file.size === file.size)) continue
        const item = { id: `${file.name}-${file.size}-${items.length}`, file, status: 'waiting', progress: 0, error: null, warning: null }
        if (done.has(key(file.name, file.size))) Object.assign(item, { status: 'skipped', progress: 1 })
        items.push(item)
      }
      pump()
    },
    retryFailed() {
      stopped = false
      for (const item of items) {
        if (item.status === 'error' && !item.permanent) Object.assign(item, { status: 'waiting', error: null, progress: 0 })
      }
      pump()
    },
    clearFinished() {
      for (let i = items.length - 1; i >= 0; i--) if (['done', 'skipped'].includes(items[i].status)) items.splice(i, 1)
      emit()
    },
    stop() {
      stopped = true
    },
  }
}

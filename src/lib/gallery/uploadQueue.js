// File de dépôt des photos d'une galerie : 3 traitements simultanés,
// progression globale et par fichier, réessai des échecs, reprise après
// rechargement (une photo déjà complète — même nom et même taille — n'est
// jamais redéposée ; une photo incomplète ne redépose que ses versions manquantes).

import { PHOTO_VERSIONS } from '../../../shared/galleries.js'

const isJpeg = (file) => /^image\/jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name)
const key = (name, size) => `${name}::${size}`

function putVersion(url, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', blob.type || 'image/jpeg')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let message = 'Envoi impossible.'
      try {
        message = JSON.parse(xhr.responseText).error || message
      } catch {
        // réponse non JSON
      }
      reject(Object.assign(new Error(message), { status: xhr.status }))
    }
    xhr.onerror = () => reject(new Error('Connexion interrompue.'))
    xhr.send(blob)
  })
}

async function registerPhoto(galleryId, body) {
  const response = await fetch(`/api/admin/galleries/${galleryId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(data.error || 'Enregistrement impossible.'), { status: response.status })
  return data.photo
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
      active: running > 0 || items.some((i) => i.status === 'waiting'),
    })
  }

  async function handle(item) {
    item.status = 'processing'
    item.progress = 0.05
    emit()
    const { width, height, versions, hd } = await processor.process(item.file, kind)
    item.status = 'uploading'
    item.progress = 0.2
    emit()
    const photo = await registerPhoto(galleryId, {
      kind,
      original_filename: item.file.name,
      size_bytes: item.file.size,
      width,
      height,
    })
    const blobs = { ...versions, ...(hd ? { hd } : {}) }
    const missing = PHOTO_VERSIONS[kind].filter((v) => !photo[`has_${v}`])
    const weights = missing.map((v) => blobs[v].size)
    const total = weights.reduce((a, b) => a + b, 0) || 1
    let sent = 0
    for (const [index, version] of missing.entries()) {
      await putVersion(`/api/admin/galleries/${galleryId}/photos/${photo.id}/${version}`, blobs[version], (ratio) => {
        item.progress = 0.2 + (0.8 * (sent + ratio * weights[index])) / total
        emit()
      })
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
        const item = { id: `${file.name}-${file.size}-${items.length}`, file, status: 'waiting', progress: 0, error: null }
        if (!isJpeg(file)) Object.assign(item, { status: 'error', error: 'Format non pris en charge (JPEG uniquement).' })
        else if (done.has(key(file.name, file.size))) Object.assign(item, { status: 'skipped', progress: 1 })
        items.push(item)
      }
      pump()
    },
    retryFailed() {
      stopped = false
      for (const item of items) {
        if (item.status === 'error' && isJpeg(item.file)) Object.assign(item, { status: 'waiting', error: null, progress: 0 })
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

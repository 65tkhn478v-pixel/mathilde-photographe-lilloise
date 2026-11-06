// Traitement des photos au dépôt : un Web Worker par traitement simultané
// (OffscreenCanvas), ou repli sur le thread principal.
import { WATERMARK_TEXT } from '../../../shared/galleries.js'
import { renderVersions } from './render.js'

/**
 * Motif de filigrane (pour un grand côté de 1600 px) : texte fin en Playfair
 * Display, capitales espacées, blanc ~35 % avec ombre légère. Le motif est
 * horizontal, en quinconce, et sa largeur suit la longueur du texte : il se
 * raccorde exactement. L'inclinaison (−28°) est appliquée au motif entier au
 * moment du dessin (render.js). Dessiné une fois sur le thread principal, où
 * la police du site est chargée.
 */
export async function makeWatermarkTile(text = WATERMARK_TEXT) {
  try {
    await document.fonts.load('500 28px "Playfair Display"')
  } catch {
    // Police indisponible : repli sur une serif (le filigrane reste présent).
  }
  const font = '500 28px "Playfair Display", Georgia, serif'
  const label = text.toUpperCase()
  const measure = document.createElement('canvas').getContext('2d')
  measure.font = font
  if ('letterSpacing' in measure) measure.letterSpacing = '6px'
  const textWidth = Math.ceil(measure.measureText(label).width)
  const row = 170 // espacement des rangées
  const tile = document.createElement('canvas')
  tile.width = textWidth + 180
  tile.height = row * 2
  const ctx = tile.getContext('2d')
  ctx.font = font
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetY = 1
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Rangée 1 centrée ; rangée 2 décalée d'une demi-largeur (dessinée de part
  // et d'autre du bord pour se raccorder avec la tuile voisine).
  ctx.fillText(label, tile.width / 2, row / 2)
  ctx.fillText(label, 0, row * 1.5)
  ctx.fillText(label, tile.width, row * 1.5)
  return tile
}

const supportsWorker = () =>
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined'

export async function createProcessor({ concurrency = 3 } = {}) {
  const tile = await makeWatermarkTile()
  if (!supportsWorker()) {
    return {
      mode: 'thread principal',
      process: (file, kind) =>
        renderVersions(file, {
          kind,
          watermark: tile,
          makeCanvas: (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }),
        }),
      dispose() {},
    }
  }
  const workers = []
  for (let i = 0; i < concurrency; i++) {
    const worker = new Worker(new URL('./imageWorker.js', import.meta.url), { type: 'module' })
    const bitmap = await createImageBitmap(tile)
    worker.postMessage({ type: 'watermark', tile: bitmap }, [bitmap])
    workers.push({ worker, busy: false, pending: new Map() })
    worker.onmessage = ({ data }) => {
      const entry = workers[i]
      const job = entry.pending.get(data.id)
      entry.pending.delete(data.id)
      entry.busy = false
      if (data.ok) job.resolve(data.result)
      else job.reject(new Error(data.error))
    }
  }
  let seq = 0
  return {
    mode: 'Web Worker',
    process(file, kind) {
      const entry = workers.find((w) => !w.busy) ?? workers[seq % workers.length]
      entry.busy = true
      const id = ++seq
      return new Promise((resolve, reject) => {
        entry.pending.set(id, { resolve, reject })
        entry.worker.postMessage({ id, file, kind })
      })
    },
    dispose() {
      workers.forEach((w) => w.worker.terminate())
    },
  }
}

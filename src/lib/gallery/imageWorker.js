// Web Worker : génère les versions d'une photo hors du thread principal.
import { renderVersions } from './render.js'

let watermark = null

self.onmessage = async ({ data }) => {
  if (data.type === 'watermark') {
    watermark = data.tile
    return
  }
  const { id, file, kind } = data
  try {
    const result = await renderVersions(file, {
      kind,
      watermark,
      makeCanvas: (w, h) => new OffscreenCanvas(w, h),
    })
    self.postMessage({ id, ok: true, result })
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || 'Traitement impossible.' })
  }
}

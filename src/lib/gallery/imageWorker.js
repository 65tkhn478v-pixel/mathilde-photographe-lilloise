// Web Worker : génère les versions d'une photo hors du thread principal
// (RAW compris : seul l'aperçu JPEG intégré est lu).
import { renderVersions } from './render.js'

let watermark = null

self.onmessage = async ({ data }) => {
  if (data.type === 'watermark') {
    watermark = data.tile
    return
  }
  const { id, file, kind, format } = data
  try {
    const result = await renderVersions(file, {
      kind,
      format,
      watermark,
      makeCanvas: (w, h) => new OffscreenCanvas(w, h),
    })
    self.postMessage({ id, ok: true, result })
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || 'Traitement impossible.', code: err?.code ?? null })
  }
}

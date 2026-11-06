// Génération des versions d'une photo, dans le navigateur de Mathilde
// (Web Worker si possible, sinon thread principal). Les originaux ne sont
// jamais envoyés : seulement ces versions réencodées, sans métadonnées
// (le réencodage par canvas ne conserve ni EXIF ni GPS), et, pour la
// livraison uniquement, le JPEG HD débarrassé de ses métadonnées.

import { stripJpegMetadata } from './jpegMeta.js'

// [version, grand côté (px), qualité, filigrane pour la sélection]
const VERSIONS = [
  ['preview', 1600, 0.82, true],
  ['thumb', 600, 0.75, true],
  ['blur', 32, 0.6, false],
]
// Le motif de filigrane est dessiné pour un grand côté de 1600 px.
export const WATERMARK_BASE = 1600

async function encode(canvas, quality) {
  if (canvas.convertToBlob) {
    const webp = await canvas.convertToBlob({ type: 'image/webp', quality })
    if (webp.type === 'image/webp') return webp
    return canvas.convertToBlob({ type: 'image/jpeg', quality })
  }
  const blob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))
  const webp = await blob('image/webp')
  return webp && webp.type === 'image/webp' ? webp : blob('image/jpeg')
}

/** Applique le motif de filigrane, incliné de −28°, sur toute l'image. */
export function drawWatermark(ctx, width, height, tile) {
  const scale = Math.max(width, height) / WATERMARK_BASE
  const pattern = ctx.createPattern(tile, 'repeat')
  pattern.setTransform(new DOMMatrix().scaleSelf(scale, scale).rotateSelf(-28))
  ctx.save()
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

/**
 * @param {Blob} file JPEG d'origine
 * @param {{kind: 'proof'|'final', watermark: CanvasImageSource|null, makeCanvas: (w,h)=>any}} options
 */
export async function renderVersions(file, { kind, watermark, makeCanvas }) {
  // Orientation EXIF appliquée ; conversion vers l'espace du canvas (sRGB).
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = bitmap
  const versions = {}
  let source = bitmap
  for (const [name, size, quality, watermarked] of VERSIONS) {
    const scale = Math.min(1, size / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = makeCanvas(w, h)
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    // Réduction en cascade (1600 → 600 → 32) : plus nette qu'un saut direct.
    ctx.drawImage(source, 0, 0, w, h)
    if (watermarked && kind === 'proof') {
      if (!watermark) throw new Error('Filigrane indisponible.')
      drawWatermark(ctx, w, h, watermark)
    }
    versions[name] = await encode(canvas, quality)
    // La version suivante part de celle-ci (sans filigrane pour la cascade).
    if (!watermarked || kind !== 'proof') source = canvas
    else {
      const clean = makeCanvas(w, h)
      clean.getContext('2d').drawImage(source, 0, 0, w, h)
      source = clean
    }
  }
  bitmap.close?.()
  let hd = null
  if (kind === 'final') hd = new Blob([stripJpegMetadata(await file.arrayBuffer())], { type: 'image/jpeg' })
  return { width, height, versions, hd }
}

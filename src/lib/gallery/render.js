// Génération des versions d'une photo, dans le navigateur de Mathilde
// (Web Worker si possible, sinon thread principal). Les originaux ne sont
// jamais envoyés pour la sélection : seulement ces versions réencodées, sans
// métadonnées (le réencodage par canvas ne conserve ni EXIF ni GPS).
//
// Formats : JPEG, PNG, WebP, AVIF (décodage natif) ; HEIC / TIFF (natif si le
// navigateur sait les lire, Safari notamment) ; RAW (CR3, CR2…) par leur
// aperçu JPEG intégré (rawPreview.js), orienté d'après les métadonnées du RAW.

import { isRawFormat } from './formats.js'
import { extractRawPreview } from './rawPreview.js'

// [version, grand côté (px), qualité, filigrane pour la sélection]
const VERSIONS = [
  ['preview', 1600, 0.82, true],
  ['thumb', 600, 0.75, true],
  ['blur', 32, 0.6, false],
]
// Le motif de filigrane est dessiné pour un grand côté de 1600 px.
export const WATERMARK_BASE = 1600

export const UNREADABLE = 'Format non lisible par ce navigateur. Utilisez Safari ou exportez en JPEG.'
export const DAMAGED = 'Fichier illisible ou endommagé : exportez-le de nouveau en JPEG.'

/** Image que ce navigateur ne sait pas décoder (HEIC / TIFF hors Safari, fichier abîmé…). */
export class DecodeError extends Error {
  constructor(message = UNREADABLE) {
    super(message)
    this.name = 'DecodeError'
    this.code = 'undecodable'
  }
}

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

// Orientation EXIF (1 à 8) → matrice de dessin (w, h : image avant rotation).
const ORIENTATIONS = {
  2: (w) => [-1, 0, 0, 1, w, 0],
  3: (w, h) => [-1, 0, 0, -1, w, h],
  4: (w, h) => [1, 0, 0, -1, 0, h],
  5: () => [0, 1, 1, 0, 0, 0],
  6: (w, h) => [0, 1, -1, 0, h, 0],
  7: (w, h) => [0, -1, -1, 0, h, w],
  8: (w) => [0, -1, 1, 0, 0, w],
}

/** Redresse une image selon son orientation (dimensions échangées pour 5 à 8). */
function orient(image, orientation, makeCanvas) {
  const matrix = ORIENTATIONS[orientation]
  if (!matrix) return image
  const { width: w, height: h } = image
  const canvas = makeCanvas(orientation >= 5 ? h : w, orientation >= 5 ? w : h)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(...matrix(w, h))
  ctx.drawImage(image, 0, 0)
  return canvas
}

/**
 * Décode la photo : { image, width, height } (dimensions d'origine, redressées).
 * Un RAW est décodé directement à 1600 px au plus (mémoire et temps réduits).
 */
export async function decodePhoto(file, format, makeCanvas) {
  if (isRawFormat(format)) {
    const raw = await extractRawPreview(file, format)
    const blob = new Blob([raw.jpeg], { type: 'image/jpeg' })
    const scale = Math.min(1, WATERMARK_BASE / Math.max(raw.width, raw.height))
    let bitmap
    try {
      bitmap =
        scale < 1
          ? await createImageBitmap(blob, {
              resizeWidth: Math.round(raw.width * scale),
              resizeHeight: Math.round(raw.height * scale),
              resizeQuality: 'high',
            })
          : await createImageBitmap(blob)
    } catch {
      try {
        bitmap = await createImageBitmap(blob)
      } catch {
        throw new DecodeError('Aperçu illisible dans ce RAW : exportez-le en JPEG.')
      }
    }
    const turned = raw.orientation >= 5
    return {
      image: orient(bitmap, raw.orientation, makeCanvas),
      width: turned ? raw.height : raw.width,
      height: turned ? raw.width : raw.height,
      release: () => bitmap.close?.(),
    }
  }
  let bitmap
  try {
    // Orientation EXIF appliquée ; conversion vers l'espace du canvas (sRGB).
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new DecodeError(format === 'heic' || format === 'tiff' ? UNREADABLE : DAMAGED)
  }
  return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close?.() }
}

/**
 * Versions (preview 1600, thumb 600, blur 32) à partir d'une image décodée.
 * @param {{image: CanvasImageSource & {width:number,height:number}, width:number, height:number}} decoded
 */
export async function renderDecoded(decoded, { kind, watermark, makeCanvas }) {
  const { image } = decoded
  const versions = {}
  let source = image
  for (const [name, size, quality, watermarked] of VERSIONS) {
    const scale = Math.min(1, size / Math.max(image.width, image.height))
    const w = Math.max(1, Math.round(image.width * scale))
    const h = Math.max(1, Math.round(image.height * scale))
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
  return { width: decoded.width, height: decoded.height, versions }
}

/**
 * @param {Blob} file fichier d'origine (lu localement, jamais envoyé pour la sélection)
 * @param {{kind: 'proof'|'final', format: string, watermark: CanvasImageSource|null, makeCanvas: (w,h)=>any}} options
 */
export async function renderVersions(file, { kind, format, watermark, makeCanvas }) {
  const decoded = await decodePhoto(file, format, makeCanvas)
  try {
    return await renderDecoded(decoded, { kind, watermark, makeCanvas })
  } finally {
    decoded.release?.()
  }
}

/**
 * Vignette neutre d'une photo finale que le navigateur ne sait pas afficher :
 * fond #EADCC8, nom du fichier et format en petites capitales. Dessinée sur le
 * thread principal (police du site disponible).
 */
export async function renderPlaceholder(name, formatLabel, makeCanvas) {
  const canvas = makeCanvas(1600, 1067)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#EADCC8'
  ctx.fillRect(0, 0, 1600, 1067)
  ctx.fillStyle = '#7C644C'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const font = (px) => `500 ${px}px "Playfair Display", Georgia, serif`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px'
  ctx.font = font(64)
  ctx.fillText((formatLabel || 'FICHIER').toUpperCase(), 800, 470)
  let base = name.toUpperCase()
  let label = base
  ctx.font = font(40)
  while (base.length > 8 && ctx.measureText(label).width > 1400) {
    base = base.slice(0, -1)
    label = `${base}…`
  }
  ctx.fillText(label, 800, 590)
  return renderDecoded({ image: canvas, width: 1600, height: 1067 }, { kind: 'final', watermark: null, makeCanvas })
}

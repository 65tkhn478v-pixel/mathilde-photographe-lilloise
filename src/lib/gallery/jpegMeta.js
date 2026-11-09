// Retrait des métadonnées d'un JPEG sans recompression : on recopie le
// fichier segment par segment en omettant ceux qui contiennent des données
// personnelles. Les données d'image (tables, scan compressé) sont recopiées
// octet pour octet : aucune perte de qualité.
//
// Supprimés : APP1 (EXIF — dont GPS, numéro de série, date — et XMP),
//             APP13 (Photoshop / IPTC, peut contenir un lieu), COM (commentaire).
// Conservés : APP0 (JFIF), APP2 (profil couleur ICC), APP14 (Adobe, espace
//             couleur), et tout ce qui décrit l'image.
// L'orientation EXIF est préservée : si elle n'est pas « normale », un APP1
// minimal ne contenant que l'orientation est réécrit (aucune autre donnée).

const DROP = new Set([0xe1, 0xed, 0xfe])

/** Lit l'orientation EXIF (1 à 8) d'un segment APP1, ou null. */
function readOrientation(view, start, length) {
  // "Exif\0\0" puis en-tête TIFF
  if (length < 14 || view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0) return null
  const tiff = start + 6
  const little = view.getUint16(tiff) === 0x4949
  const u16 = (o) => view.getUint16(o, little)
  const u32 = (o) => view.getUint32(o, little)
  const ifd = tiff + u32(tiff + 4)
  if (ifd + 2 > start + length) return null
  const count = u16(ifd)
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12
    if (entry + 12 > start + length) return null
    if (u16(entry) === 0x0112) return u16(entry + 8)
  }
  return null
}

/** APP1 EXIF minimal : uniquement l'orientation (TIFF big-endian, 1 entrée). */
function orientationSegment(orientation) {
  const payload = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // "MM", 42, IFD0 à l'offset 8
    0x00, 0x01, // 1 entrée
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation SHORT
    0x00, 0x00, 0x00, 0x00, // pas d'IFD suivant
  ]
  const length = payload.length + 2
  return Uint8Array.from([0xff, 0xe1, length >> 8, length & 0xff, ...payload])
}

/**
 * Renvoie une copie du JPEG sans EXIF/GPS/XMP/IPTC/commentaire.
 * Lève une erreur si le fichier n'est pas un JPEG valide.
 */
export function stripJpegMetadata(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Ce fichier n’est pas un JPEG.')

  const kept = [bytes.subarray(0, 2)] // SOI
  let orientation = null
  let offset = 2
  let insertAt = 1 // l'APP1 d'orientation est placé après APP0 (JFIF) s'il existe
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('JPEG invalide.')
    let marker = bytes[offset + 1]
    // Octets de remplissage 0xFF
    while (marker === 0xff) {
      offset++
      marker = bytes[offset + 1]
    }
    if (marker === 0xda || marker === 0xd9) {
      // Début des données compressées (SOS) : tout le reste est recopié tel quel.
      kept.push(bytes.subarray(offset))
      break
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(bytes.subarray(offset, offset + 2))
      offset += 2
      continue
    }
    const length = view.getUint16(offset + 2)
    const end = offset + 2 + length
    if (end > bytes.length) throw new Error('JPEG tronqué.')
    if (marker === 0xe1) orientation = orientation ?? readOrientation(view, offset + 4, length - 2)
    if (!DROP.has(marker)) {
      kept.push(bytes.subarray(offset, end))
      if (marker === 0xe0) insertAt = kept.length
    }
    offset = end
  }

  if (orientation && orientation !== 1 && orientation <= 8) kept.splice(insertAt, 0, orientationSegment(orientation))
  const total = kept.reduce((n, part) => n + part.length, 0)
  const out = new Uint8Array(total)
  let position = 0
  for (const part of kept) {
    out.set(part, position)
    position += part.length
  }
  return out
}

/** Liste des segments (marqueur + taille) — utilisé par les tests. */
export function jpegSegments(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const segments = []
  let offset = 2
  while (offset < bytes.length) {
    const marker = bytes[offset + 1]
    if (marker === 0xda) {
      segments.push({ marker, offset, length: bytes.length - offset })
      break
    }
    const length = view.getUint16(offset + 2)
    segments.push({ marker, offset, length: length + 2 })
    offset += 2 + length
  }
  return segments
}

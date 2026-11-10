// Retrait des métadonnées d'un PNG sans recompression : les chunks sont
// recopiés tels quels (chacun porte son propre CRC), sauf ceux qui peuvent
// contenir des données personnelles.
//
// Supprimés : eXIf (EXIF, dont GPS), tEXt / zTXt / iTXt (texte, XMP,
//             auteur, lieu…), tIME (date de modification).
// Conservés : tout le reste, dont l'image (IHDR, PLTE, IDAT, IEND…) et la
//             couleur (iCCP, sRGB, gAMA, cHRM).

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'])

/** Liste des chunks : [{ type, start, end }] (end exclu, CRC compris). */
export function pngChunks(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (bytes.length < 8 || SIGNATURE.some((b, i) => bytes[i] !== b)) throw new Error('Ce fichier n’est pas un PNG valide.')
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks = []
  let o = 8
  while (o + 12 <= bytes.length) {
    const length = dv.getUint32(o)
    const type = String.fromCharCode(bytes[o + 4], bytes[o + 5], bytes[o + 6], bytes[o + 7])
    const end = o + 12 + length
    if (end > bytes.length) throw new Error('PNG tronqué.')
    chunks.push({ type, start: o, end })
    o = end
    if (type === 'IEND') break
  }
  if (chunks.at(-1)?.type !== 'IEND') throw new Error('PNG tronqué.')
  return chunks
}

/** Copie du PNG sans ses chunks de métadonnées (Uint8Array). */
export function stripPngMetadata(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const kept = pngChunks(bytes).filter((c) => !DROP.has(c.type))
  const out = new Uint8Array(8 + kept.reduce((n, c) => n + c.end - c.start, 0))
  out.set(bytes.subarray(0, 8), 0)
  let at = 8
  for (const c of kept) {
    out.set(bytes.subarray(c.start, c.end), at)
    at += c.end - c.start
  }
  return out
}

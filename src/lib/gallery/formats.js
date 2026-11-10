// Formats de fichiers des galeries : détection par la signature du fichier
// (premiers octets, « magic bytes »), jamais par la seule extension.

export const PROOF_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'heic', 'tiff', 'cr3', 'cr2']
const PROOF_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'tif', 'tiff', 'cr3', 'cr2']
const PROOF_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/tiff']
// Extensions des RAW courants (livraison possible telle quelle).
const RAW_EXTENSIONS = [
  'cr3', 'cr2', 'crw', 'dng', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf', 'orf', 'rw2', 'rwl', 'pef', 'srw', 'x3f', '3fr', 'iiq', 'erf', 'mef', 'mos', 'kdc', 'dcr',
]

/** Valeur de l'attribut `accept` des sélecteurs de fichiers. */
export const PROOF_ACCEPT = [...PROOF_EXTENSIONS.map((e) => `.${e}`), ...PROOF_MIMES].join(',')
export const FINAL_ACCEPT = ['image/*', ...PROOF_EXTENSIONS.map((e) => `.${e}`), ...RAW_EXTENSIONS.map((e) => `.${e}`)].join(',')

export const FORMAT_LABELS = {
  jpeg: 'JPEG', png: 'PNG', webp: 'WebP', avif: 'AVIF', heic: 'HEIC', tiff: 'TIFF', cr3: 'CR3', cr2: 'CR2', raw: 'RAW', gif: 'GIF', bmp: 'BMP',
}

/** Type MIME du fichier livré (RAW : flux binaire, téléchargé tel quel). */
export const MIME_TYPES = {
  jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', heic: 'image/heic', tiff: 'image/tiff', gif: 'image/gif', bmp: 'image/bmp',
  cr3: 'application/octet-stream', cr2: 'application/octet-stream', raw: 'application/octet-stream',
}

/** Formats dont le retrait des métadonnées (GPS…) est garanti avant l'envoi. */
export const METADATA_WARNING =
  'Les métadonnées (dont la position GPS éventuelle) n’ont pas pu être retirées de ce format. Pour plus de sécurité, livrez en JPEG.'

export const STRIPPABLE_FORMATS = ['jpeg', 'png']

export const extensionOf = (name) => (/\.([^.]+)$/.exec(name ?? '')?.[1] ?? '').toLowerCase()
export const isRawFormat = (format) => format === 'cr3' || format === 'cr2' || format === 'raw'

const ascii = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length))

const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']

/**
 * Format d'après les premiers octets du fichier. Les TIFF qui portent une
 * extension de RAW (DNG, NEF, ARW…) sont des RAW ; le CR2 a sa propre marque.
 * @returns {Promise<string|null>} jpeg, png, webp, avif, heic, tiff, cr3, cr2, raw, gif, bmp, ou null
 */
export async function sniffFormat(blob) {
  const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer())
  return sniffBytes(bytes, extensionOf(blob.name))
}

export function sniffBytes(b, extension = '') {
  if (b.length < 12) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a) return 'png'
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp'
  if (ascii(b, 0, 4) === 'GIF8') return 'gif'
  if (ascii(b, 4, 4) === 'ftyp') {
    const major = ascii(b, 8, 4)
    if (major === 'crx ') return 'cr3'
    if (major === 'avif' || major === 'avis') return 'avif'
    if (HEIC_BRANDS.includes(major)) return 'heic'
    if (major === 'mif1' || major === 'msf1') {
      // Marque générique HEIF : les marques compatibles disent AVIF ou HEIC.
      const size = Math.min(b.length, (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3])
      const brands = []
      for (let o = 16; o + 4 <= size; o += 4) brands.push(ascii(b, o, 4))
      if (brands.includes('avif')) return 'avif'
      return 'heic'
    }
    return null
  }
  const ii = b[0] === 0x49 && b[1] === 0x49
  const mm = b[0] === 0x4d && b[1] === 0x4d
  if (ii || mm) {
    const magic = ii ? b[2] | (b[3] << 8) : (b[2] << 8) | b[3]
    if (magic === 42) {
      if (ii && b[8] === 0x43 && b[9] === 0x52 && b[10] === 2) return 'cr2' // « CR » v2
      return RAW_EXTENSIONS.includes(extension) ? 'raw' : 'tiff'
    }
    // Olympus ORF (IIRO / IIRS / MMOR), Panasonic RW2 (IIU) : RAW.
    if (magic === 0x4f52 || magic === 0x5352 || magic === 0x55) return 'raw'
    if (ii && b[2] === 0x1a && ascii(b, 6, 8) === 'HEAPCCDR') return 'raw' // Canon CRW
  }
  if (ascii(b, 0, 15) === 'FUJIFILMCCD-RAW') return 'raw'
  if (ascii(b, 0, 4) === 'FOVb') return 'raw' // Sigma X3F
  if (b[0] === 0x42 && b[1] === 0x4d && extension === 'bmp') return 'bmp' // « BM » : trop court, confirmé par l'extension
  return null
}

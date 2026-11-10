// Aperçu JPEG intégré d'un RAW, extrait sans décoder le RAW et sans charger
// le fichier entier : seuls l'en-tête, les tables utiles et le JPEG choisi
// sont lus (Blob.slice). Rien de ce fichier n'est envoyé en ligne.
//
// - CR3 (Canon, conteneur ISO-BMFF « crx ») : le JPEG pleine taille de la
//   première piste (moov/trak[0], tailles stsz + positions co64), sinon
//   l'aperçu PRVW (≈ 1620 × 1080) de la boîte uuid eaf42b5e-…. L'orientation
//   est lue dans CMT1 (IFD0 TIFF de la boîte uuid Canon 85c0b687-…).
// - CR2 (Canon, TIFF) : le JPEG pleine taille référencé dans l'IFD0
//   (StripOffsets / StripByteCounts), sinon le plus grand JPEG trouvé.
// - Autres RAW au format TIFF (DNG, NEF, ARW…) : le plus grand JPEG lisible.
// Les JPEG « sans perte » (SOF3) des données RAW elles-mêmes sont écartés :
// les navigateurs ne savent pas les décoder.

const NO_PREVIEW = 'Aperçu introuvable dans ce RAW : exportez-le en JPEG.'

export class RawPreviewError extends Error {
  constructor(message = NO_PREVIEW) {
    super(message)
    this.name = 'RawPreviewError'
    this.code = 'raw-preview'
  }
}

const CANON_UUID = '85c0b687820f11e08111f4ce462b6a48'
const PRVW_UUID = 'eaf42b5e1c984b88b9fbb7dc406e4d16'
const HEAD_BYTES = 256 * 1024
const MAX_MOOV = 16 * 1024 * 1024
const MAX_JPEG = 80 * 1024 * 1024

const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n))
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
const view = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength)

/** Lecture partielle d'un Blob, avec l'en-tête du fichier en cache. */
function createReader(blob) {
  let head = null
  return {
    size: blob.size,
    async read(offset, length) {
      if (!(offset >= 0) || !(length >= 0) || offset + length > blob.size) throw new RawPreviewError()
      head ??= new Uint8Array(await blob.slice(0, Math.min(HEAD_BYTES, blob.size)).arrayBuffer())
      if (offset + length <= head.length) return head.subarray(offset, offset + length)
      return new Uint8Array(await blob.slice(offset, offset + length).arrayBuffer())
    },
  }
}

// ---- JPEG ---------------------------------------------------------------------

/**
 * Le début d'un JPEG décrit-il une image que le navigateur sait décoder
 * (SOF0 / SOF1 / SOF2) ? Renvoie { width, height } ou null.
 */
export function jpegInfo(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  const dv = view(bytes)
  let o = 2
  while (o + 4 <= bytes.length) {
    if (bytes[o] !== 0xff) return null
    const marker = bytes[o + 1]
    if (marker === 0xff) {
      o++
      continue
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      o += 2
      continue
    }
    const length = dv.getUint16(o + 2)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (![0xc0, 0xc1, 0xc2].includes(marker) || o + 9 > bytes.length) return null
      return { height: dv.getUint16(o + 5), width: dv.getUint16(o + 7) }
    }
    if (marker === 0xda || marker === 0xd9) return null
    o += 2 + length
  }
  return null
}

/** Copie du JPEG sans segment APP1 (EXIF / XMP) : l'orientation du RAW s'applique seule. */
export function withoutApp1(bytes) {
  const dv = view(bytes)
  const parts = [bytes.subarray(0, 2)]
  let o = 2
  while (o + 4 <= bytes.length && bytes[o] === 0xff) {
    const marker = bytes[o + 1]
    if (marker === 0xda) break
    const end = o + 2 + dv.getUint16(o + 2)
    if (marker !== 0xe1) parts.push(bytes.subarray(o, end))
    o = end
  }
  parts.push(bytes.subarray(o))
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** Vérifie qu'un candidat est un JPEG décodable (lecture de son seul début). */
async function checkJpeg(r, candidate) {
  const { offset, length } = candidate
  if (!(length > 1000) || length > MAX_JPEG || offset + length > r.size) return null
  for (const chunk of [64 * 1024, 1024 * 1024]) {
    const bytes = await r.read(offset, Math.min(length, chunk))
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
    const info = jpegInfo(bytes)
    if (info) return { ...candidate, ...info }
    if (length <= chunk) return null
  }
  return null
}

async function pick(r, candidates, orientation) {
  for (const candidate of candidates) {
    const ok = await checkJpeg(r, candidate)
    if (!ok) continue
    const bytes = await r.read(ok.offset, ok.length)
    return {
      jpeg: withoutApp1(bytes),
      orientation: orientation >= 1 && orientation <= 8 ? orientation : 1,
      width: ok.width,
      height: ok.height,
      source: ok.source,
    }
  }
  throw new RawPreviewError()
}

// ---- TIFF (CR2, DNG, NEF, ARW, et CMT1 des CR3) -------------------------------

const TYPE_SIZE = { 1: 1, 3: 2, 4: 4, 7: 1, 9: 4, 13: 4, 16: 8 }

/** Lit un IFD : { entries: Map(tag → { type, count, values|offset }), next }. */
async function readIfd(read, little, offset) {
  const countBytes = await read(offset, 2)
  const count = view(countBytes).getUint16(0, little)
  if (count === 0 || count > 1000) return null
  const bytes = await read(offset + 2, count * 12 + 4)
  const dv = view(bytes)
  const entries = new Map()
  for (let i = 0; i < count; i++) {
    const e = i * 12
    const tag = dv.getUint16(e, little)
    const type = dv.getUint16(e + 2, little)
    const n = dv.getUint32(e + 4, little)
    const size = (TYPE_SIZE[type] ?? 0) * n
    const entry = { type, count: n }
    if (type === 3 || type === 4 || type === 13) {
      if (size <= 4) {
        entry.values = []
        for (let k = 0; k < n; k++) entry.values.push(type === 3 ? dv.getUint16(e + 8 + k * 2, little) : dv.getUint32(e + 8, little))
      } else entry.offset = dv.getUint32(e + 8, little)
    }
    entries.set(tag, entry)
  }
  return { entries, next: dv.getUint32(count * 12, little) }
}

async function ifdValues(read, little, entry) {
  if (!entry) return []
  if (entry.values) return entry.values
  if (entry.count > 4096) return []
  const width = entry.type === 3 ? 2 : 4
  const bytes = await read(entry.offset, entry.count * width)
  const dv = view(bytes)
  return Array.from({ length: entry.count }, (_, k) => (width === 2 ? dv.getUint16(k * 2, little) : dv.getUint32(k * 4, little)))
}

/** Orientation (1 à 8) de l'IFD0 d'un TIFF déjà en mémoire, ou 1. */
export async function tiffOrientationFromBytes(bytes) {
  if (bytes.length < 8) return 1
  const little = bytes[0] === 0x49
  const read = async (o, n) => {
    if (o + n > bytes.length) throw new RawPreviewError()
    return bytes.subarray(o, o + n)
  }
  try {
    const ifd = await readIfd(read, little, view(bytes).getUint32(4, little))
    return (await ifdValues(read, little, ifd?.entries.get(0x0112)))[0] ?? 1
  } catch {
    return 1
  }
}

async function tiffRaw(r, format) {
  const header = await r.read(0, 8)
  const little = header[0] === 0x49
  const read = (o, n) => r.read(o, n)
  const queue = [{ offset: view(header).getUint32(4, little), main: true }]
  const seen = new Set()
  const candidates = []
  let orientation = 1
  let index = 0
  while (queue.length && seen.size < 24) {
    const { offset, main } = queue.shift()
    if (!offset || seen.has(offset) || offset >= r.size) continue
    seen.add(offset)
    let ifd
    try {
      ifd = await readIfd(read, little, offset)
    } catch {
      ifd = null
    }
    if (!ifd) continue
    const { entries } = ifd
    const ifdIndex = index++
    if (ifdIndex === 0) orientation = (await ifdValues(read, little, entries.get(0x0112)))[0] ?? 1
    const strips = await ifdValues(read, little, entries.get(0x0111))
    const counts = await ifdValues(read, little, entries.get(0x0117))
    if (strips.length === 1 && counts.length === 1) {
      candidates.push({ offset: strips[0], length: counts[0], ifd: ifdIndex, source: ifdIndex === 0 ? 'IFD0' : `IFD${ifdIndex}` })
    }
    const jif = await ifdValues(read, little, entries.get(0x0201))
    const jifLength = await ifdValues(read, little, entries.get(0x0202))
    if (jif.length === 1 && jifLength.length === 1) {
      candidates.push({ offset: jif[0], length: jifLength[0], ifd: ifdIndex, source: `IFD${ifdIndex}-jpeg` })
    }
    for (const sub of await ifdValues(read, little, entries.get(0x014a))) queue.push({ offset: sub, main: false })
    if (main && ifd.next) queue.push({ offset: ifd.next, main: true })
  }
  // CR2 : JPEG pleine taille de l'IFD0 en priorité ; sinon le plus grand.
  const bySize = candidates.slice().sort((a, b) => b.length - a.length)
  const ordered = format === 'cr2' ? [...candidates.filter((c) => c.source === 'IFD0'), ...bySize.filter((c) => c.source !== 'IFD0')] : bySize
  return pick(r, ordered, orientation)
}

// ---- CR3 (ISO-BMFF) ------------------------------------------------------------

/** En-tête d'une boîte ISO-BMFF : { type, offset, size, header }. */
function boxAt(dv, o, end) {
  if (o + 8 > end) return null
  let size = dv.getUint32(o)
  const type = String.fromCharCode(dv.getUint8(o + 4), dv.getUint8(o + 5), dv.getUint8(o + 6), dv.getUint8(o + 7))
  let header = 8
  if (size === 1) {
    if (o + 16 > end) return null
    size = Number(dv.getBigUint64(o + 8))
    header = 16
  } else if (size === 0) size = end - o
  if (size < header || o + size > end) return null
  return { type, offset: o, size, header }
}

function* children(dv, start, end) {
  let o = start
  while (o < end) {
    const box = boxAt(dv, o, end)
    if (!box) return
    yield box
    o += box.size
  }
}

const child = (dv, box, type) => {
  for (const b of children(dv, box.offset + box.header, box.offset + box.size)) if (b.type === type) return b
  return null
}

/** Position et taille du premier échantillon de la piste (JPEG pleine taille). */
function trakSample(dv, trak) {
  const stbl = [['mdia'], ['minf'], ['stbl']].reduce((b, [t]) => b && child(dv, b, t), trak)
  if (!stbl) return null
  const stsz = child(dv, stbl, 'stsz')
  const co64 = child(dv, stbl, 'co64')
  const stco = child(dv, stbl, 'stco')
  if (!stsz || !(co64 || stco)) return null
  const s = stsz.offset + stsz.header
  const sampleSize = dv.getUint32(s + 4)
  const length = sampleSize || dv.getUint32(s + 12)
  const c = (co64 ?? stco).offset + (co64 ?? stco).header
  if (dv.getUint32(c + 4) < 1) return null
  const offset = co64 ? Number(dv.getBigUint64(c + 8)) : dv.getUint32(c + 8)
  return { offset, length }
}

async function cr3(r) {
  let moov = null
  let prvw = null
  let o = 0
  while (o + 8 <= r.size) {
    const head = await r.read(o, Math.min(32, r.size - o))
    if (head.length < 8) break
    const dvh = view(head)
    let size = dvh.getUint32(0)
    let header = 8
    if (size === 1) {
      if (head.length < 16) break
      size = Number(dvh.getBigUint64(8))
      header = 16
    } else if (size === 0) size = r.size - o
    const type = ascii(head, 4, 4)
    if (size < header || o + size > r.size) break
    if (type === 'moov') {
      if (size > MAX_MOOV) throw new RawPreviewError()
      moov = { bytes: await r.read(o, size), size, header }
    } else if (type === 'uuid' && hex(head.subarray(header, header + 16)) === PRVW_UUID) {
      // 8 octets, puis la boîte PRVW : …, largeur, hauteur, taille du JPEG, JPEG.
      const payloadStart = o + header + 16
      const payload = await r.read(payloadStart, Math.min(64, o + size - payloadStart))
      const at = ascii(payload, 0, payload.length).indexOf('PRVW')
      if (at >= 4) {
        const prvwStart = payloadStart + at - 4
        const prvwSize = view(payload).getUint32(at - 4)
        for (let k = at + 4; k + 3 <= payload.length; k++) {
          if (payload[k] === 0xff && payload[k + 1] === 0xd8 && payload[k + 2] === 0xff) {
            const jpegStart = payloadStart + k
            const declared = k >= 4 ? view(payload).getUint32(k - 4) : 0
            const available = Math.min(prvwStart + prvwSize, o + size) - jpegStart
            prvw = { offset: jpegStart, length: declared > 0 && declared <= available ? declared : available, source: 'PRVW' }
            break
          }
        }
      }
    }
    o += size
  }
  if (!moov) throw new RawPreviewError()
  const dv = view(moov.bytes)
  let orientation = 1
  let full = null
  for (const box of children(dv, moov.header, moov.size)) {
    if (box.type === 'uuid' && hex(moov.bytes.subarray(box.offset + box.header, box.offset + box.header + 16)) === CANON_UUID) {
      for (const sub of children(dv, box.offset + box.header + 16, box.offset + box.size)) {
        if (sub.type === 'CMT1') orientation = await tiffOrientationFromBytes(moov.bytes.subarray(sub.offset + sub.header, sub.offset + sub.size))
      }
    }
    if (box.type === 'trak' && !full) {
      const sample = trakSample(dv, box)
      full = sample ? { ...sample, source: 'trak1' } : { offset: 0, length: 0 }
    }
  }
  return pick(r, [full, prvw].filter((c) => c && c.length > 0), orientation)
}

/**
 * @param {Blob} blob fichier RAW
 * @param {'cr3'|'cr2'|'raw'} format format détecté (formats.js)
 * @returns {Promise<{jpeg: Uint8Array, orientation: number, width: number, height: number, source: string}>}
 */
export async function extractRawPreview(blob, format) {
  const r = createReader(blob)
  try {
    if (format === 'cr3') return await cr3(r)
    return await tiffRaw(r, format)
  } catch (err) {
    if (err instanceof RawPreviewError) throw err
    throw new RawPreviewError()
  }
}

import { GB } from '../../../../shared/settings.js'

const MB = 2 ** 20
const oneDecimal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** « 6,2 Go » à partir de 1 Go, « 210 Mo » en dessous (1 Go = 2^30 octets, comme Cloudflare). */
export function formatBytes(bytes) {
  if (bytes >= GB) return `${oneDecimal.format(bytes / GB)} Go`
  if (bytes > 0 && bytes < MB) return '< 1 Mo'
  return `${Math.round(bytes / MB)} Mo`
}

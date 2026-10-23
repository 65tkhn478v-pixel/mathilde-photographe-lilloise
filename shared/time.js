// Dates et fuseau horaire. Tout est stocké en UTC ; tout est affiché et saisi
// en heure de Paris. Pas de dépendance : Intl.DateTimeFormat (disponible dans
// les navigateurs et dans les Workers) suffit pour lire le décalage de Paris
// à un instant donné, et le changement d'heure est traité en recalculant ce
// décalage après la première conversion (voir zonedToUtc).

export const TIME_ZONE = 'Europe/Paris'

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Composantes de l'heure de Paris pour un instant donné. */
export function parisParts(date) {
  const parts = {}
  for (const p of partsFormatter.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return parts
}

/** Décalage de Paris par rapport à UTC (en ms) à l'instant donné. */
function offsetAt(ms) {
  const p = parisParts(new Date(ms))
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - (ms - (ms % 1000))
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * Convertit une date ("2026-11-03") et une heure ("14:00") de Paris en Date
 * UTC. Renvoie null si la saisie est invalide ou si l'heure n'existe pas ce
 * jour-là (passage à l'heure d'été : 2h00–2h59 n'existent pas).
 */
export function zonedToUtc(dateKey, time) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey ?? '')
  const t = /^(\d{2}):(\d{2})$/.exec(time ?? '')
  if (!d || !t) return null
  const [y, mo, da, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number)
  if (h > 23 || mi > 59) return null
  const naive = Date.UTC(y, mo - 1, da, h, mi)
  let ms = naive - offsetAt(naive)
  const second = naive - offsetAt(ms)
  if (second !== ms) ms = second
  const check = parisParts(new Date(ms))
  if (check.year !== y || check.month !== mo || check.day !== da || check.hour !== h || check.minute !== mi) {
    return null
  }
  return new Date(ms)
}

/** "2026-11-03" (jour de Paris) pour un instant donné. */
export function dateKey(date) {
  const p = parisParts(date)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** "14:00" (heure de Paris) pour un instant donné. */
export function timeKey(date) {
  const p = parisParts(date)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** Ajoute n jours calendaires à une date "YYYY-MM-DD". */
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Lundi de la semaine contenant la date "YYYY-MM-DD". */
export function weekStart(key) {
  const [y, m, d] = key.split('-').map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = dimanche
  return addDays(key, -((weekday + 6) % 7))
}

/** Midi UTC d'une date "YYYY-MM-DD" : sert à formater un jour sans ambiguïté. */
function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

const fmt = (options) => new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, ...options })
const dayLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const dayFull = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const dayShort = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const dateMedium = fmt({ day: 'numeric', month: 'short', year: 'numeric' })

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const toDate = (v) => (v instanceof Date ? v : new Date(v))

/** "14h00" */
export function formatTime(value) {
  const p = parisParts(toDate(value))
  return `${p.hour}h${pad(p.minute)}`
}

/** "14h00 – 16h00" */
export function formatRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** "Lundi 3 novembre" */
export function formatDayLong(value) {
  return capitalize(dayLong.format(toDate(value)))
}

/** "lundi 3 novembre 2026" */
export function formatDayFull(value) {
  return dayFull.format(toDate(value))
}

/** "lun. 3 nov." */
export function formatDayShort(value) {
  return dayShort.format(toDate(value))
}

/** "3 nov. 2026" */
export function formatDateMedium(value) {
  return dateMedium.format(toDate(value))
}

/** "3 nov. 2026 à 9h05" */
export function formatDateTime(value) {
  return `${formatDateMedium(value)} à ${formatTime(value)}`
}

/** "Lundi 3 novembre" à partir d'une clé "YYYY-MM-DD". */
export function formatKeyLong(key) {
  return formatDayLong(keyToDate(key))
}

/** "lun. 3 nov." à partir d'une clé "YYYY-MM-DD". */
export function formatKeyShort(key) {
  return formatDayShort(keyToDate(key))
}

/** "3 nov. 2026" à partir d'une clé "YYYY-MM-DD". */
export function formatKeyMedium(key) {
  return formatDateMedium(keyToDate(key))
}

const dayMonth = fmt({ day: 'numeric', month: 'long' })
const monthYear = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long', year: 'numeric' })

/** "23 octobre" */
export function formatDayMonth(value) {
  return dayMonth.format(toDate(value))
}

/** "Octobre 2026" à partir de "2026-10". */
export function formatMonthKey(month) {
  const [y, m] = month.split('-').map(Number)
  return capitalize(monthYear.format(new Date(Date.UTC(y, m - 1, 15))))
}

/** Mois "YYYY-MM" décalé de n mois. */
export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

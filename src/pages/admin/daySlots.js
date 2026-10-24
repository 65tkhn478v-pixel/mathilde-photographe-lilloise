// Logique pure du panneau du jour : cases d'heures, chevauchements, résumé.
import { DAY_LAST_END, DAY_START_TIMES, SLOT_DURATIONS, addMinutesToTime } from '../../../shared/booking.js'
import { timeKey } from '../../../shared/time.js'

export const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

/** "15:00" → "15h", "15:30" → "15h30" */
export const shortTime = (t) => (t.endsWith(':00') ? `${Number(t.slice(0, 2))}h` : `${Number(t.slice(0, 2))}h${t.slice(3)}`)
export const shortRange = (a, b) => `${shortTime(a)} – ${shortTime(b)}`
const spokenRange = (a, b) => `${shortTime(a)} à ${shortTime(b)}`

const DURATION_KEY = 'espace-mathilde:duree'

export function readDuration() {
  try {
    // Toute autre valeur (ex. « 90 », ancienne durée 1h30) retombe sur 1h.
    const stored = Number(localStorage.getItem(DURATION_KEY))
    return SLOT_DURATIONS.includes(stored) ? stored : SLOT_DURATIONS[0]
  } catch {
    return 60
  }
}

export function storeDuration(minutes) {
  try {
    localStorage.setItem(DURATION_KEY, String(minutes))
  } catch {
    // Stockage indisponible : 1h par défaut au prochain passage.
  }
}

/** Créneaux existants du jour, avec leurs heures de Paris. */
export function withLocalTimes(slots) {
  return slots.map((s) => ({ ...s, start: timeKey(new Date(s.start_at)), end: timeKey(new Date(s.end_at)) }))
}

const overlaps = (a, b) => toMinutes(a.start) < toMinutes(b.end) && toMinutes(a.end) > toMinutes(b.start)

const endsTooLate = (slot) => slot.end > DAY_LAST_END

/**
 * Garde les nouvelles heures compatibles entre elles, avec l'existant et avec
 * la fin à 21h (ordre chronologique).
 */
export function fitNewStarts(starts, duration, kept) {
  const accepted = []
  for (const start of [...starts].sort()) {
    const slot = { start, end: addMinutesToTime(start, duration) }
    if (!endsTooLate(slot) && !kept.some((k) => overlaps(k, slot)) && !accepted.some((a) => overlaps(a, slot))) {
      accepted.push(slot)
    }
  }
  return accepted
}

/**
 * Cases à afficher, triées par heure : les 25 heures de début (8h → 20h), où
 * un créneau existant remplace la case de son heure de début ; un créneau
 * existant hors grille (ex. 10h15) a sa propre case.
 */
export function buildCells({ existing, removedIds, newStarts, duration, readOnly, nowTime }) {
  const kept = existing.filter((s) => !removedIds.has(s.id))
  const fresh = newStarts.map((start) => ({ start, end: addMinutesToTime(start, duration) }))
  const cells = []

  for (const slot of existing) {
    const removed = removedIds.has(slot.id)
    const locked = Boolean(slot.booking) || slot.state === 'past' || readOnly
    cells.push({
      kind: 'existing',
      key: `e${slot.id}`,
      start: slot.start,
      end: slot.end,
      slot,
      pressed: !removed,
      locked,
      label: shortRange(slot.start, slot.end),
      aria: slot.booking
        ? `${shortTime(slot.start)}, réservé, ${spokenRange(slot.start, slot.end)}`
        : `${shortTime(slot.start)}, ${removed ? 'sera supprimé' : slot.closed ? 'fermé' : 'enregistré'}, ${spokenRange(slot.start, slot.end)}`,
    })
  }

  for (const start of DAY_START_TIMES) {
    if (existing.some((s) => s.start === start)) continue
    const own = fresh.find((f) => f.start === start)
    const candidate = own ?? { start, end: addMinutesToTime(start, duration) }
    let reason = null
    if (readOnly) reason = 'jour passé'
    else if (nowTime && start <= nowTime) reason = 'heure passée'
    else if (!own && endsTooLate(candidate)) reason = 'finirait après 21h'
    else if (!own) {
      const clash = [...kept, ...fresh].find((o) => overlaps(o, candidate))
      if (clash) reason = `chevauche ${spokenRange(clash.start, clash.end)}`
    }
    cells.push({
      kind: 'new',
      key: `n${start}`,
      start,
      end: candidate.end,
      pressed: Boolean(own),
      disabled: Boolean(reason),
      reason,
      label: own ? shortRange(own.start, own.end) : shortTime(start),
      aria: own
        ? `${shortTime(start)}, sélectionné, ${spokenRange(own.start, own.end)}`
        : reason
          ? `${shortTime(start)}, indisponible, ${reason}`
          : `${shortTime(start)}, libre`,
    })
  }

  return cells.sort((a, b) => a.start.localeCompare(b.start) || (a.kind === 'existing' ? -1 : 1))
}

/** Liste finale envoyée au serveur, et résumé lisible. */
export function finalSlots({ existing, removedIds, newStarts, duration }) {
  const kept = existing.filter((s) => !removedIds.has(s.id)).map((s) => ({ start: s.start, end: s.end }))
  const fresh = newStarts.map((start) => ({ start, end: addMinutesToTime(start, duration) }))
  return [...kept, ...fresh].sort((a, b) => a.start.localeCompare(b.start))
}

export function summary(slots) {
  if (!slots.length) return 'Aucun créneau'
  return `${slots.length} créneau${slots.length > 1 ? 'x' : ''} · ${slots.map((s) => shortRange(s.start, s.end)).join(', ')}`
}

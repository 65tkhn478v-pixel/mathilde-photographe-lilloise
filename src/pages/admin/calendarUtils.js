import { formatKeyLong } from '../../../shared/time.js'

// Statuts affichés sur la grille (les demandes refusées n'y apparaissent pas).
export const GRID_STATES = ['confirmed', 'pending', 'open', 'closed']

const COUNT_WORDS = {
  confirmed: ['séance confirmée', 'séances confirmées'],
  pending: ['demande en attente', 'demandes en attente'],
  open: ['créneau libre', 'créneaux libres'],
  closed: ['créneau fermé', 'créneaux fermés'],
}

export function countLabel(state, n) {
  return `${n} ${COUNT_WORDS[state][n > 1 ? 1 : 0]}`
}

/** Créneaux visibles sur la grille pour un jour (pas les créneaux passés sans demande). */
export function gridSlots(slots) {
  return slots.filter((s) => GRID_STATES.includes(s.state))
}

export function describeDay(key, slots) {
  const visible = gridSlots(slots)
  const counts = GRID_STATES.map((st) => [st, visible.filter((s) => s.state === st).length]).filter(([, n]) => n)
  const content = counts.length ? counts.map(([st, n]) => countLabel(st, n)).join(', ') : 'aucun créneau'
  return `${formatKeyLong(key)} : ${content}`
}

import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { motion, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { useApiData } from '../../lib/useApiData'
import { sessionLabel } from '../../../shared/booking.js'
import { addDays, dateKey, formatKeyLong, timeKey } from '../../../shared/time.js'
import { Loading, Notice } from '../../components/ui/Notice'
import { StatusBadge, StatusIcon } from '../../components/ui/StatusBadge'
import { FEEDBACK, adminButton, apiErrorMessage } from './adminUi'
import { BookingActions } from './BookingActions'
import {
  buildCells,
  finalSlots,
  fitNewStarts,
  readDuration,
  shortRange,
  storeDuration,
  summary,
  withLocalTimes,
} from './daySlots'

const todayKey = () => dateKey(new Date())
const dayShort = (key) => formatKeyLong(key).replace(/ \S+$/, '') // « Lundi 26 »
const EMPTY_DRAFT = { removedIds: new Set(), newStarts: [] }

const sheetDialog =
  'fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md border border-line bg-paper p-6 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2'

/**
 * Panneau du jour : saisie rapide des créneaux (1h ou 1h30, heures de début
 * de 8h à 20h) et enchaînement des jours. Feuille plein écran sur mobile,
 * panneau latéral sur desktop (Radix Dialog : focus piégé, retour du focus
 * au jour d'origine). Un jour = une seule requête PUT.
 */
export function DaySlotsPanel({ date, onClose, onChangeDate, onSaved, onExpired, onFeedback, onGoToRequests, returnFocus }) {
  const reduceMotion = useReducedMotion()
  const [duration, setDuration] = useState(readDuration)
  const [direction, setDirection] = useState(1)
  // Brouillon du jour affiché ; un brouillon d'un autre jour est ignoré.
  const [draft, setDraft] = useState({ date: null, ...EMPTY_DRAFT })
  const { removedIds, newStarts } = draft.date === date ? draft : EMPTY_DRAFT
  const setDayDraft = (update) =>
    setDraft((d) => ({ date, ...update(d.date === date ? d : EMPTY_DRAFT) }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [hint, setHint] = useState(null)
  const [pendingLeave, setPendingLeave] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const { data: loaded, error: loadError, reload } = useApiData(date ? `/api/admin/days/${date}/slots` : null, {
    onError: (err) => apiErrorMessage(err, onExpired),
  })
  const data = loaded?.date === date ? loaded : null

  const today = todayKey()
  const readOnly = Boolean(date) && date < today
  const nowTime = date === today ? timeKey(new Date()) : null
  const existing = useMemo(() => withLocalTimes(data?.slots ?? []), [data])
  const cells = data ? buildCells({ existing, removedIds, newStarts, duration, readOnly, nowTime }) : []
  const slots = finalSlots({ existing, removedIds, newStarts, duration })
  const dirty = removedIds.size > 0 || newStarts.length > 0

  const resetDay = () => {
    setDraft({ date: null, ...EMPTY_DRAFT })
    setError(null)
    setHint(null)
  }

  const goTo = (key) => {
    setDirection(key > date ? 1 : -1)
    resetDay()
    onChangeDate(key)
  }
  const close = () => {
    resetDay()
    onClose()
  }
  // Quitter le jour : demande confirmation s'il reste des changements.
  const leave = (action) => (dirty ? setPendingLeave(() => action) : action())

  const save = async (then) => {
    if (!dirty) {
      then()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await api(`/api/admin/days/${date}/slots`, { method: 'PUT', body: { slots } })
      const n = result.slots.length
      onFeedback({
        message: `${dayShort(date)} : ${n === 0 ? 'aucun créneau' : `${n} créneau${n > 1 ? 'x' : ''}`} enregistré${n > 1 ? 's' : ''}`,
        tone: 'confirmed',
      })
      resetDay()
      onSaved()
      reload()
      then()
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = (cell) => {
    setError(null)
    if (cell.kind === 'existing') {
      if (cell.locked) {
        setHint(cell.slot.booking ? `${cell.label} : réservé, à gérer dans Demandes.` : `${cell.label} : non modifiable.`)
        return
      }
      setHint(null)
      setDayDraft((d) => {
        const removed = new Set(d.removedIds)
        if (removed.has(cell.slot.id)) removed.delete(cell.slot.id)
        else removed.add(cell.slot.id)
        return { ...d, removedIds: removed }
      })
      return
    }
    if (cell.disabled) {
      setHint(`${cell.label} indisponible : ${cell.reason}.`)
      return
    }
    setHint(null)
    setDayDraft((d) => ({
      ...d,
      newStarts: d.newStarts.includes(cell.start) ? d.newStarts.filter((s) => s !== cell.start) : [...d.newStarts, cell.start],
    }))
  }

  const changeDuration = (value) => {
    if (!value) return
    const minutes = Number(value)
    setDuration(minutes)
    storeDuration(minutes)
    // Les heures non enregistrées suivent la nouvelle durée ; celles qui
    // chevaucheraient alors un autre créneau sont retirées.
    const kept = existing.filter((s) => !removedIds.has(s.id))
    const accepted = fitNewStarts(newStarts, minutes, kept).map((s) => s.start)
    const dropped = newStarts.length - accepted.length
    setDayDraft((d) => ({ ...d, newStarts: accepted }))
    setHint(dropped ? `${dropped} heure${dropped > 1 ? 's' : ''} retirée${dropped > 1 ? 's' : ''} : chevauchement avec la nouvelle durée.` : null)
  }

  const clearable = existing.filter((s) => !s.booking && s.state !== 'past' && !removedIds.has(s.id))
  const clearAll = () => {
    setDayDraft((d) => ({ removedIds: new Set([...d.removedIds, ...clearable.map((s) => s.id)]), newStarts: [] }))
    setConfirmClear(false)
  }
  const special = existing.filter((s) => s.booking || s.closed)

  const afterBookingChange = (action) => {
    onFeedback(FEEDBACK[action])
    reload()
    onSaved()
  }

  return (
    <Dialog.Root open={Boolean(date)} onOpenChange={(open) => !open && leave(close)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            if (returnFocus?.current) {
              e.preventDefault()
              returnFocus.current.focus()
            }
          }}
          className="day-sheet fixed inset-0 z-50 flex flex-col bg-paper md:inset-y-0 md:right-0 md:left-auto md:w-[30rem] md:border-l md:border-line"
        >
          {/* En-tête fixe */}
          <div className="flex items-center gap-1 border-b border-line px-2 py-2 sm:px-4">
            <button type="button" onClick={() => leave(() => goTo(addDays(date, -1)))} className={adminButton('quiet', 'px-3')}>
              <span aria-hidden="true">←</span>
              <span className="sr-only">Jour précédent</span>
            </button>
            <Dialog.Title className="font-display min-w-0 flex-1 text-center text-xl text-ink" aria-live="polite">
              {date ? formatKeyLong(date) : ''}
            </Dialog.Title>
            <button type="button" onClick={() => leave(() => goTo(addDays(date, 1)))} className={adminButton('quiet', 'px-3')}>
              <span aria-hidden="true">→</span>
              <span className="sr-only">Jour suivant</span>
            </button>
            <button type="button" onClick={() => leave(close)} className={adminButton('quiet', 'px-3')}>
              <span aria-hidden="true">×</span>
              <span className="sr-only">Fermer</span>
            </button>
          </div>

          {/* Contenu défilant ; glissement horizontal au changement de jour */}
          <motion.div
            key={date}
            initial={{ opacity: 0, x: reduceMotion ? 0 : direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6"
          >
            {readOnly ? (
              <p className="text-sm italic">Jour passé : lecture seule.</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p id="duration-label" className="font-label text-xs tracking-[0.15em] uppercase">
                  Durée
                </p>
                <ToggleGroup.Root
                  type="single"
                  value={String(duration)}
                  onValueChange={changeDuration}
                  aria-labelledby="duration-label"
                  className="inline-flex rounded-sm border border-ink"
                >
                  {[
                    ['60', '1h'],
                    ['90', '1h30'],
                  ].map(([value, label]) => (
                    <ToggleGroup.Item
                      key={value}
                      value={value}
                      className="font-label min-h-11 min-w-20 px-4 text-sm tracking-[0.1em] text-ink data-[state=on]:bg-ink data-[state=on]:text-paper"
                    >
                      {label}
                    </ToggleGroup.Item>
                  ))}
                </ToggleGroup.Root>
              </div>
            )}

            {loadError && !data && (
              <Notice
                tone="error"
                className="mt-4"
                action={
                  <button type="button" className={adminButton('outline')} onClick={reload}>
                    Réessayer
                  </button>
                }
              >
                {loadError.message}
              </Notice>
            )}
            {!data && !loadError && <Loading />}

            {data && (
              <>
                <p className="font-label mt-5 text-xs tracking-[0.15em] uppercase" id="hours-label">
                  Heures de début
                </p>
                <div role="group" aria-labelledby="hours-label" className="mt-2 grid grid-cols-4 gap-2">
                  {cells.map((cell) => (
                    <HourCell key={cell.key} cell={cell} onToggle={() => toggle(cell)} />
                  ))}
                </div>

                <p aria-live="polite" className="mt-3 min-h-5 text-sm italic">
                  {hint}
                </p>

                {!readOnly && (clearable.length > 0 || newStarts.length > 0) && (
                  <button
                    type="button"
                    className={adminButton('quiet', 'px-0')}
                    onClick={() => (clearable.length ? setConfirmClear(true) : clearAll())}
                  >
                    Tout effacer
                  </button>
                )}

                {special.length > 0 && (
                  <section aria-labelledby="day-special" className="mt-6 border-t border-line pt-4">
                    <h3 id="day-special" className="font-label text-xs tracking-[0.15em] uppercase">
                      Ce jour-là
                    </h3>
                    <ul className="mt-3 space-y-4">
                      {special.map((slot) => (
                        <li key={slot.id} className="border-b border-line pb-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm">
                              {shortRange(slot.start, slot.end)}
                              {slot.booking && ` · ${slot.booking.first_name} — ${sessionLabel(slot.booking.session_type)}`}
                            </p>
                            <StatusBadge state={slot.booking ? slot.booking.status : slot.state} />
                          </div>
                          {slot.booking ? (
                            <>
                              <p className="mt-1 text-sm italic">
                                Réservé, à gérer dans Demandes.{' '}
                                <button type="button" onClick={onGoToRequests} className="not-italic underline underline-offset-4">
                                  Voir la demande
                                </button>
                              </p>
                              {!readOnly && slot.booking.status === 'pending' && (
                                <div className="mt-3">
                                  <BookingActions booking={slot.booking} compact onExpired={onExpired} onDone={afterBookingChange} />
                                </div>
                              )}
                            </>
                          ) : (
                            !readOnly && (
                              <button
                                type="button"
                                className={adminButton('quiet', 'px-0')}
                                onClick={async () => {
                                  try {
                                    await api(`/api/admin/slots/${slot.id}`, { method: 'PATCH', body: { closed: false } })
                                    reload()
                                    onSaved()
                                  } catch (err) {
                                    const message = apiErrorMessage(err, onExpired)
                                    if (message) setError(message)
                                  }
                                }}
                              >
                                Rouvrir
                              </button>
                            )
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </motion.div>

          {/* Pied fixe */}
          <div className="border-t border-line bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="text-sm" aria-live="polite" data-testid="day-summary">
              {data ? summary(slots) : ' '}
            </p>
            <div aria-live="assertive">
              {error && (
                <Notice tone="error" className="mt-2">
                  {error}
                </Notice>
              )}
            </div>
            {readOnly ? (
              <button type="button" className={adminButton('outline', 'mt-3 w-full')} onClick={close}>
                Fermer
              </button>
            ) : (
              <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
                <button type="button" disabled={busy || !data} className={adminButton('outline')} onClick={() => save(close)}>
                  Valider
                </button>
                <button
                  type="button"
                  disabled={busy || !data}
                  className={adminButton('solid')}
                  onClick={() => save(() => goTo(addDays(date, 1)))}
                >
                  {busy ? 'Enregistrement…' : 'Valider et jour suivant'}
                </button>
              </div>
            )}
          </div>

          {/* Changements non enregistrés */}
          <AlertDialog.Root open={Boolean(pendingLeave)} onOpenChange={(open) => !open && setPendingLeave(null)}>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-ink/40" />
              <AlertDialog.Content className={sheetDialog}>
                <AlertDialog.Title className="font-display text-2xl text-ink">Changements non enregistrés</AlertDialog.Title>
                <AlertDialog.Description className="mt-3 text-sm text-ink">
                  Enregistrer les créneaux de {date ? formatKeyLong(date) : ''} avant de continuer ?
                </AlertDialog.Description>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                  <button
                    type="button"
                    className={adminButton('solid')}
                    onClick={() => {
                      const action = pendingLeave
                      setPendingLeave(null)
                      save(action)
                    }}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className={adminButton('outline')}
                    onClick={() => {
                      const action = pendingLeave
                      setPendingLeave(null)
                      resetDay()
                      action()
                    }}
                  >
                    Abandonner
                  </button>
                  <AlertDialog.Cancel asChild>
                    <button type="button" className={adminButton('quiet')}>
                      Annuler
                    </button>
                  </AlertDialog.Cancel>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>

          <AlertDialog.Root open={confirmClear} onOpenChange={setConfirmClear}>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-ink/40" />
              <AlertDialog.Content className={sheetDialog}>
                <AlertDialog.Title className="font-display text-2xl text-ink">Tout effacer ?</AlertDialog.Title>
                <AlertDialog.Description className="mt-3 text-sm text-ink">
                  Les créneaux libres déjà enregistrés ce jour-là seront supprimés à la validation. Les créneaux
                  réservés ne sont pas concernés.
                </AlertDialog.Description>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <AlertDialog.Cancel asChild>
                    <button type="button" className={adminButton('outline')}>
                      Annuler
                    </button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button type="button" className={adminButton('solid')} onClick={clearAll}>
                      Tout effacer
                    </button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const CELL_STATE = {
  confirmed: 'border-confirmed-line bg-confirmed-bg text-confirmed',
  pending: 'border-pending-line bg-pending-bg text-pending',
  closed: 'border-dashed border-structure bg-closed-bg text-ink',
}
const CELL_ICON = { confirmed: 'check', pending: 'clock', closed: 'lock' }

/** Case d'heure : bouton à état (aria-pressed), annoncé avec son état. */
function HourCell({ cell, onToggle }) {
  const reduceMotion = useReducedMotion()
  const isExisting = cell.kind === 'existing'
  const state = isExisting ? (cell.slot.booking?.status ?? (cell.slot.closed ? 'closed' : null)) : null
  const inactive = cell.disabled || (isExisting && cell.locked)
  const style = (() => {
    if (state && cell.pressed) return CELL_STATE[state]
    if (cell.pressed) return 'border-ink bg-ink text-paper'
    if (isExisting) return 'border-dashed border-structure bg-paper text-ink' // retiré, sera supprimé
    if (inactive) return 'border-line bg-paper text-ink/45'
    return 'border-structure bg-paper text-ink hover:border-ink'
  })()
  return (
    <motion.button
      type="button"
      whileTap={reduceMotion || inactive ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.08 }}
      onClick={onToggle}
      aria-pressed={isExisting && cell.locked ? undefined : cell.pressed}
      aria-disabled={inactive || undefined}
      aria-label={cell.aria}
      title={cell.reason ? `Indisponible : ${cell.reason}` : undefined}
      data-start={cell.start}
      className={clsx(
        'flex min-h-11 items-center justify-center gap-1 rounded-sm border px-1 py-1.5 text-center text-sm leading-tight transition-colors duration-100',
        style
      )}
    >
      {state && cell.pressed && <StatusIcon name={CELL_ICON[state]} className="h-3 w-3" />}
      {!state && cell.pressed && <StatusIcon name="check" className="h-3 w-3" />}
      <span className={clsx(isExisting && !cell.pressed && 'line-through')}>{cell.label}</span>
    </motion.button>
  )
}

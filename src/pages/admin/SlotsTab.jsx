import { useId, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { useApiData } from '../../lib/useApiData'
import {
  addDays,
  dateKey,
  formatKeyLong,
  formatKeyMedium,
  formatKeyShort,
  formatRange,
  weekStart,
  zonedToUtc,
} from '../../../shared/time.js'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FieldError, Loading, Notice } from '../../components/ui/Notice'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { adminButton, apiErrorMessage, inputClasses, labelClasses } from './adminUi'
import { DaySlotsPanel } from './DaySlotsPanel'
import { sessionLabel } from '../../../shared/booking.js'

const todayKey = () => dateKey(new Date())

export function SlotsTab({ onExpired, onPendingCount, onFeedback, onGoToRequests }) {
  const [week, setWeek] = useState(() => weekStart(todayKey()))
  const [notice, setNotice] = useState(null)
  const from = zonedToUtc(week, '00:00').toISOString()
  const to = zonedToUtc(addDays(week, 7), '00:00').toISOString()
  const { data, error: loadError, reload: load } = useApiData(
    `/api/admin/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    {
      onData: (result) => onPendingCount(result.pending_count),
      onError: (err) => apiErrorMessage(err, onExpired),
    }
  )
  const slots = data?.slots ?? null
  const error = loadError?.status === 401 ? null : loadError?.message

  const days = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, i) => addDays(week, i))
    return keys.map((key) => ({ key, slots: (slots ?? []).filter((s) => dateKey(new Date(s.start_at)) === key) }))
  }, [week, slots])

  const goToWeek = (key) => {
    setNotice(null)
    setWeek(key)
  }

  // Toucher un jour ouvre le panneau du jour ; il remplace l'ancien formulaire
  // d'ajout (date + début + fin).
  const [panelDate, setPanelDate] = useState(null)
  const returnFocus = useRef(null)
  const openDay = (key, el) => {
    returnFocus.current = el
    setPanelDate(key)
  }
  const followPanel = (key) => {
    setPanelDate(key)
    if (weekStart(key) !== week) setWeek(weekStart(key))
  }

  const currentWeek = weekStart(todayKey())

  return (
    <div className="space-y-8">
      <DaySlotsPanel
        date={panelDate}
        returnFocus={returnFocus}
        onChangeDate={followPanel}
        onClose={() => setPanelDate(null)}
        onSaved={load}
        onExpired={onExpired}
        onFeedback={onFeedback}
        onGoToRequests={() => {
          setPanelDate(null)
          onGoToRequests()
        }}
      />
      <p className="text-sm italic">Touchez un jour pour ajouter ou retirer ses créneaux.</p>

      <section aria-labelledby="week-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <h2 id="week-title" className="text-2xl text-ink" aria-live="polite">
            Semaine du {formatKeyMedium(week)}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={adminButton('outline')} onClick={() => goToWeek(addDays(week, -7))}>
              <span aria-hidden="true">←</span> Précédente
            </button>
            <button
              type="button"
              className={adminButton('outline')}
              onClick={() => goToWeek(currentWeek)}
              disabled={week === currentWeek}
            >
              Aujourd’hui
            </button>
            <button type="button" className={adminButton('outline')} onClick={() => goToWeek(addDays(week, 7))}>
              Suivante <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <DuplicateWeek
            week={week}
            disabled={!slots?.length}
            onExpired={onExpired}
            onDone={(message) => setNotice(message)}
          />
          {!slots?.length && slots && <p className="text-sm italic">Aucun créneau cette semaine.</p>}
        </div>

        <div aria-live="polite">{notice && <Notice className="mt-4">{notice}</Notice>}</div>

        {error && (
          <Notice
            tone="error"
            className="mt-4"
            action={
              <button type="button" className={adminButton('outline')} onClick={load}>
                Réessayer
              </button>
            }
          >
            {error}
          </Notice>
        )}

        {!slots && !error ? (
          <Loading />
        ) : (
          slots && (
            <ol className="mt-6 grid gap-6 lg:grid-cols-7 lg:gap-3">
              {days.map((day) => (
                <li key={day.key} className={clsx('lg:min-w-0', day.key === todayKey() && 'lg:border-t-2 lg:border-ink')}>
                  <h3>
                    <button
                      type="button"
                      onClick={(e) => openDay(day.key, e.currentTarget)}
                      className="font-label flex min-h-11 w-full items-center justify-between gap-2 border-b border-line text-left text-xs tracking-[0.15em] uppercase hover:border-ink lg:pt-2"
                    >
                      <span>
                        <span className="lg:hidden">{formatKeyLong(day.key)}</span>
                        <span className="hidden lg:inline">{formatKeyShort(day.key)}</span>
                        {day.key === todayKey() && <span className="ml-2 normal-case italic">(aujourd’hui)</span>}
                      </span>
                      <span aria-hidden="true" className="text-base leading-none">
                        +
                      </span>
                      <span className="sr-only"> : gérer les créneaux</span>
                    </button>
                  </h3>
                  {day.slots.length === 0 ? (
                    <p className="mt-2 text-sm italic lg:hidden">—</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {day.slots.map((slot) => (
                        <SlotItem key={slot.id} slot={slot} onChanged={load} onExpired={onExpired} />
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )
        )}
      </section>
    </div>
  )
}

function DuplicateWeek({ week, disabled, onExpired, onDone }) {
  const [open, setOpen] = useState(false)
  const [weeks, setWeeks] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await api('/api/admin/slots/duplicate-week', { method: 'POST', body: { week_start: week, weeks } })
      const created = data.created === 0 ? 'Aucun créneau créé' : data.created === 1 ? '1 créneau créé' : `${data.created} créneaux créés`
      const skipped = data.skipped ? ` (${data.skipped} ignoré${data.skipped > 1 ? 's' : ''} : déjà existant${data.skipped > 1 ? 's' : ''} ou passé${data.skipped > 1 ? 's' : ''})` : ''
      onDone(`${created}${skipped}.`)
      setOpen(false)
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); setError(null) }}>
      <Dialog.Trigger asChild>
        <button type="button" disabled={disabled} className={adminButton('outline')}>
          Dupliquer la semaine
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md border border-line bg-paper p-6 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
          <Dialog.Title className="font-display text-2xl text-ink">Dupliquer la semaine</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm text-ink">
            Les créneaux de la semaine du {formatKeyMedium(week)} seront recopiés aux mêmes jours et heures. Les
            créneaux déjà existants à l’identique et les dates passées sont ignorés.
          </Dialog.Description>
          <label className={clsx(labelClasses, 'mt-5')}>
            Sur les semaines suivantes
            <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className={inputClasses}>
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} semaine{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </label>
          <div aria-live="polite">
            <FieldError>{error}</FieldError>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <button type="button" className={adminButton('outline')}>
                Annuler
              </button>
            </Dialog.Close>
            <button type="button" disabled={busy} className={adminButton('solid')} onClick={submit}>
              {busy ? 'Duplication…' : 'Dupliquer'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SlotItem({ slot, onChanged, onExpired }) {
  const hintId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const active = Boolean(slot.booking)
  const past = slot.state === 'past'
  const range = formatRange(slot.start_at, slot.end_at)

  const run = async (path, method, body) => {
    setBusy(true)
    setError(null)
    try {
      await api(path, { method, body })
      await onChanged()
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-col lg:items-start">
        <p className="text-sm whitespace-nowrap">{range}</p>
        <StatusBadge state={slot.state} />
      </div>
      {slot.booking && (
        <p className="mt-2 text-sm break-words">
          {slot.booking.first_name} {slot.booking.last_name}
          <span className="block text-sm italic">{sessionLabel(slot.booking.session_type)}</span>
        </p>
      )}
      {!past && (
        <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1">
          {!active && (
            <button
              type="button"
              disabled={busy}
              className={adminButton('quiet', 'text-xs')}
              onClick={() => run(`/api/admin/slots/${slot.id}`, 'PATCH', { closed: !slot.closed })}
            >
              {slot.closed ? 'Rouvrir' : 'Fermer'}
            </button>
          )}
          {active ? (
            <>
              <button
                type="button"
                disabled
                aria-describedby={hintId}
                className={adminButton('quiet', 'text-xs')}
              >
                Supprimer
              </button>
              <p id={hintId} className="w-full text-sm italic">
                Demande en cours : refusez-la ou supprimez-la dans « Demandes » avant de supprimer ce créneau.
              </p>
            </>
          ) : (
            <ConfirmDialog
              title="Supprimer ce créneau ?"
              description={`Le créneau ${range} sera retiré. Les éventuelles demandes refusées qui y étaient liées seront aussi effacées.`}
              confirmLabel="Supprimer"
              onConfirm={() => run(`/api/admin/slots/${slot.id}`, 'DELETE')}
              trigger={
                <button type="button" disabled={busy} className={adminButton('quiet', 'text-xs')}>
                  Supprimer
                </button>
              }
            />
          )}
        </div>
      )}
      <div aria-live="polite">{error && <Notice tone="error" className="mt-2">{error}</Notice>}</div>
    </li>
  )
}

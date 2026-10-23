import { useMemo, useRef, useState } from 'react'
import { useApiData } from '../../lib/useApiData'
import { sessionLabel } from '../../../shared/booking.js'
import { addDays, addMonths, dateKey, formatKeyLong, formatMonthKey, formatRange } from '../../../shared/time.js'
import { Loading, Notice } from '../../components/ui/Notice'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FEEDBACK, adminButton, apiErrorMessage } from './adminUi'
import { BookingActions } from './BookingActions'
import { CalendarLegend, MonthCalendar } from './MonthCalendar'
import { countLabel, gridSlots } from './calendarUtils'
import { QuickAdd } from './SlotsTab'

const todayKey = () => dateKey(new Date())

/** Toutes les dates "YYYY-MM-DD" de la grille [start, end). */
function gridDays(start, end) {
  const days = []
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d)
  return days
}

export function CalendarTab({ onExpired, onPendingCount, onFeedback }) {
  const [month, setMonth] = useState(() => todayKey().slice(0, 7))
  const [direction, setDirection] = useState(1)
  const [selected, setSelected] = useState(() => todayKey())
  const [focusKey, setFocusKey] = useState(() => todayKey())
  const [adding, setAdding] = useState(false)
  const focusRequest = useRef(false)
  const requestFocus = () => {
    focusRequest.current = true
  }
  const takeFocusRequest = () => {
    const pending = focusRequest.current
    focusRequest.current = false
    return pending
  }

  const { data, error: loadError, reload } = useApiData(`/api/admin/calendar?month=${month}`, {
    onData: (result) => onPendingCount(result.pending_count),
    onError: (err) => apiErrorMessage(err, onExpired),
  })
  const error = loadError?.status === 401 ? null : loadError?.message

  const slotsByDay = useMemo(() => {
    const map = new Map()
    for (const slot of data?.slots ?? []) {
      const key = dateKey(new Date(slot.start_at))
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(slot)
    }
    return map
  }, [data])

  const days = data ? gridDays(data.grid_start, data.grid_end) : []

  /** 'prev' | 'next' | 'YYYY-MM' ; `focus` : jour à garder sélectionnable. */
  const changeMonth = (target, focus) => {
    const next = target === 'prev' ? addMonths(month, -1) : target === 'next' ? addMonths(month, 1) : target
    if (next === month) return
    setDirection(next > month ? 1 : -1)
    setMonth(next)
    setFocusKey(focus ?? (next === todayKey().slice(0, 7) ? todayKey() : `${next}-01`))
    setAdding(false)
  }

  const goToday = () => {
    changeMonth(todayKey().slice(0, 7), todayKey())
    setSelected(todayKey())
  }

  const select = (key) => {
    setSelected(key)
    setFocusKey(key)
    setAdding(false)
    if (key.slice(0, 7) !== month) changeMonth(key.slice(0, 7), key)
  }

  // Récapitulatif du mois affiché (jours du mois uniquement).
  const monthSlots = gridSlots((data?.slots ?? []).filter((s) => dateKey(new Date(s.start_at)).startsWith(month)))
  const count = (state) => monthSlots.filter((s) => s.state === state).length

  const onDone = (action) => {
    onFeedback(FEEDBACK[action])
    reload()
  }

  const daySlots = slotsByDay.get(selected) ?? []
  const title = formatMonthKey(month)

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <section aria-labelledby="calendar-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="calendar-title" className="text-2xl text-ink" aria-live="polite">
            {title}
          </h2>
          <div className="flex gap-2">
            <button type="button" className={adminButton('outline', 'px-3')} onClick={() => changeMonth('prev')}>
              <span aria-hidden="true">←</span>
              <span className="sr-only">Mois précédent</span>
            </button>
            <button
              type="button"
              className={adminButton('outline')}
              onClick={goToday}
              disabled={month === todayKey().slice(0, 7) && selected === todayKey()}
            >
              Aujourd’hui
            </button>
            <button type="button" className={adminButton('outline', 'px-3')} onClick={() => changeMonth('next')}>
              <span aria-hidden="true">→</span>
              <span className="sr-only">Mois suivant</span>
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm" aria-live="polite">
          {data ? (
            <>
              Ce mois-ci : {countLabel('confirmed', count('confirmed'))} · {countLabel('pending', count('pending'))} ·{' '}
              {countLabel('open', count('open'))}
            </>
          ) : (
            ' '
          )}
        </p>

        {error && (
          <Notice
            tone="error"
            className="mt-4"
            action={
              <button type="button" className={adminButton('outline')} onClick={reload}>
                Réessayer
              </button>
            }
          >
            {error}
          </Notice>
        )}

        <div className="mt-4 border-t border-line">
          {data ? (
            <MonthCalendar
              month={month}
              title={title}
              days={days}
              slotsByDay={slotsByDay}
              selected={selected}
              focusKey={days.includes(focusKey) ? focusKey : days[0]}
              onFocusKey={setFocusKey}
              onSelect={select}
              onMonthChange={changeMonth}
              direction={direction}
              requestFocus={requestFocus}
              takeFocusRequest={takeFocusRequest}
            />
          ) : (
            !error && <Loading />
          )}
        </div>

        <div className="mt-4">
          <CalendarLegend />
        </div>
      </section>

      <section aria-labelledby="day-title" className="mt-8 border-t border-line pt-6 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
        <h3 id="day-title" className="font-display text-2xl text-ink" aria-live="polite">
          {formatKeyLong(selected)}
        </h3>

        {daySlots.length === 0 ? (
          <p className="mt-3 text-sm italic">Aucun créneau ce jour-là.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {daySlots.map((slot) => (
              <li key={slot.id} className="border-b border-line pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">{formatRange(slot.start_at, slot.end_at)}</p>
                  <StatusBadge state={slot.state} />
                </div>
                {slot.booking && (
                  <div className="mt-2">
                    <p className="text-sm">
                      {sessionLabel(slot.booking.session_type)} — {slot.booking.first_name} {slot.booking.last_name}
                    </p>
                    <div className="mt-3">
                      <BookingActions booking={slot.booking} onDone={onDone} onExpired={onExpired} compact />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          {adding ? (
            <QuickAdd
              key={selected}
              defaultDate={selected}
              initialOpen
              compact
              onExpired={onExpired}
              onCreated={reload}
              onClose={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              className={adminButton('outline', 'w-full')}
              onClick={() => setAdding(true)}
              disabled={selected < todayKey()}
            >
              + Ajouter un créneau ce jour-là
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

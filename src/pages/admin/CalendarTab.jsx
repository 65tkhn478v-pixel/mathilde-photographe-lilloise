import { useMemo, useRef, useState } from 'react'
import { useApiData } from '../../lib/useApiData'
import { addDays, addMonths, dateKey, formatMonthKey } from '../../../shared/time.js'
import { Loading, Notice } from '../../components/ui/Notice'
import { adminButton, apiErrorMessage } from './adminUi'
import { DaySlotsPanel } from './DaySlotsPanel'
import { CalendarLegend, MonthCalendar } from './MonthCalendar'
import { countLabel, gridSlots } from './calendarUtils'

const todayKey = () => dateKey(new Date())

/** Toutes les dates "YYYY-MM-DD" de la grille [start, end). */
function gridDays(start, end) {
  const days = []
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d)
  return days
}

export function CalendarTab({ onExpired, onPendingCount, onFeedback, onGoToRequests }) {
  const [month, setMonth] = useState(() => todayKey().slice(0, 7))
  const [direction, setDirection] = useState(1)
  const [selected, setSelected] = useState(() => todayKey())
  const [focusKey, setFocusKey] = useState(() => todayKey())
  const [panelDate, setPanelDate] = useState(null)
  const returnFocus = useRef(null)
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
  }

  const goToday = () => {
    changeMonth(todayKey().slice(0, 7), todayKey())
    setSelected(todayKey())
  }

  // Toucher un jour ouvre le panneau du jour (saisie rapide des créneaux).
  const select = (key) => {
    setSelected(key)
    setFocusKey(key)
    returnFocus.current = document.activeElement
    setPanelDate(key)
  }

  // Le panneau enchaîne les jours : la grille suit (mois compris).
  const followPanel = (key) => {
    setPanelDate(key)
    setSelected(key)
    setFocusKey(key)
    if (key.slice(0, 7) !== month) changeMonth(key.slice(0, 7), key)
  }

  // Récapitulatif du mois affiché (jours du mois uniquement).
  const monthSlots = gridSlots((data?.slots ?? []).filter((s) => dateKey(new Date(s.start_at)).startsWith(month)))
  const count = (state) => monthSlots.filter((s) => s.state === state).length

  const title = formatMonthKey(month)

  return (
    <div>
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <CalendarLegend />
          <p className="text-sm italic">Touchez un jour pour gérer ses créneaux.</p>
        </div>
      </section>

      <DaySlotsPanel
        date={panelDate}
        returnFocus={returnFocus}
        onChangeDate={followPanel}
        onClose={() => setPanelDate(null)}
        onSaved={reload}
        onExpired={onExpired}
        onFeedback={onFeedback}
        onGoToRequests={() => {
          setPanelDate(null)
          onGoToRequests()
        }}
      />
    </div>
  )
}

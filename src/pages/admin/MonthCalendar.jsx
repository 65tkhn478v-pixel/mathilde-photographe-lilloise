import { useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import { addDays, dateKey, formatTime } from '../../../shared/time.js'
import { describeDay, gridSlots } from './calendarUtils'

const WEEKDAYS = [
  ['L', 'lundi'],
  ['M', 'mardi'],
  ['M', 'mercredi'],
  ['J', 'jeudi'],
  ['V', 'vendredi'],
  ['S', 'samedi'],
  ['D', 'dimanche'],
]



/**
 * Pastille de statut : la forme change avec le statut (rond plein, losange,
 * cercle, cercle pointillé), en plus de la couleur. Teintes foncées ≥ 5:1.
 */
export function StatusDot({ state, className = 'h-2 w-2' }) {
  return (
    <span aria-hidden="true" className={clsx('inline-flex shrink-0 items-center justify-center', className)}>
      <span
        className={clsx(
          'block',
          state === 'confirmed' && 'h-full w-full rounded-full bg-confirmed',
          state === 'pending' && 'h-[78%] w-[78%] rotate-45 bg-pending',
          state === 'open' && 'h-full w-full rounded-full border border-ink',
          state === 'closed' && 'h-full w-full rounded-full border border-dashed border-ink'
        )}
      />
    </span>
  )
}

const CHIP = {
  confirmed: 'border-confirmed-line bg-confirmed-bg text-confirmed',
  pending: 'border-pending-line bg-pending-bg text-pending',
  open: 'border-structure bg-paper text-ink',
  closed: 'border-dashed border-structure bg-closed-bg text-ink',
}


/**
 * Grille mensuelle sur mesure (lundi → dimanche), navigable au clavier
 * (flèches, Début/Fin, PageUp/PageDown) et par glissement horizontal sur
 * écran tactile (pointer events, sans bibliothèque).
 */
export function MonthCalendar({ month, title, days, slotsByDay, selected, focusKey, onFocusKey, onSelect, onMonthChange, direction, requestFocus, takeFocusRequest }) {
  const reduceMotion = useReducedMotion()
  const today = dateKey(new Date())
  const pointer = useRef(null)

  // Après un déplacement au clavier, le focus suit le jour visé, y compris
  // quand il est dans un autre mois (le bouton n'existe qu'une fois ce mois
  // chargé et affiché : on le focalise à son montage). La demande de focus
  // est détenue par le parent pour survivre au remontage de la grille.
  const buttonRef = (key) => (el) => {
    if (el && key === focusKey && takeFocusRequest()) el.focus()
  }

  const move = (key) => {
    requestFocus()
    onFocusKey(key)
    if (key.slice(0, 7) !== month) onMonthChange(key.slice(0, 7), key)
  }

  const onKeyDown = (e) => {
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (deltas[e.key] !== undefined) {
      e.preventDefault()
      move(addDays(focusKey, deltas[e.key]))
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      move(addDays(focusKey, e.key === 'PageUp' ? -28 : 28))
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const weekday = days.findIndex((d) => d === focusKey) % 7
      move(addDays(focusKey, e.key === 'Home' ? -weekday : 6 - weekday))
    }
  }

  // Glissement horizontal : ≥ 50 px, plus horizontal que vertical.
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse') return
    pointer.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e) => {
    const start = pointer.current
    pointer.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onMonthChange(dx < 0 ? 'next' : 'prev')
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  const offset = reduceMotion ? 0 : 32

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (pointer.current = null)}
      className="touch-pan-y overflow-hidden select-none"
      data-testid="calendar-swipe"
    >
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={month}
          custom={direction}
          initial={{ opacity: 0, x: direction * offset }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * offset }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div role="grid" aria-label={title} onKeyDown={onKeyDown} className="w-full">
            <div role="row" className="grid grid-cols-7 border-b border-line">
              {WEEKDAYS.map(([short, full], i) => (
                <span key={i} role="columnheader" className="font-label py-2 text-center text-xs tracking-[0.15em] uppercase">
                  <abbr title={full} className="no-underline">
                    {short}
                  </abbr>
                </span>
              ))}
            </div>
            {weeks.map((week) => (
              <div role="row" key={week[0]} className="grid grid-cols-7">
                {week.map((key) => {
                  const inMonth = key.slice(0, 7) === month
                  const slots = gridSlots(slotsByDay.get(key) ?? [])
                  const isSelected = key === selected
                  return (
                    <div role="gridcell" key={key} aria-selected={isSelected} className="border-b border-line">
                      <button
                        type="button"
                        ref={buttonRef(key)}
                        tabIndex={key === focusKey ? 0 : -1}
                        aria-label={describeDay(key, slotsByDay.get(key) ?? [])}
                        aria-current={key === today ? 'date' : undefined}
                        onClick={() => onSelect(key)}
                        onFocus={() => onFocusKey(key)}
                        className={clsx(
                          'flex h-full min-h-14 w-full flex-col items-center gap-1 px-0.5 pt-1.5 pb-2 text-ink transition-colors md:min-h-24 md:items-stretch md:px-1.5',
                          isSelected ? 'shadow-[inset_0_-2px_0_var(--color-ink)]' : 'hover:bg-mist/40',
                          '-outline-offset-2 focus-visible:outline-2'
                        )}
                      >
                        <span
                          className={clsx(
                            'flex h-7 w-7 items-center justify-center rounded-full text-sm md:self-start',
                            !inMonth && !isSelected && 'opacity-45',
                            key === today && 'border border-ink',
                            isSelected && 'bg-ink text-paper'
                          )}
                        >
                          {Number(key.slice(8))}
                        </span>
                        {/* Mobile : jusqu'à 3 pastilles, puis « +n ». */}
                        {slots.length > 0 && (
                          <span className="flex items-center gap-[3px] md:hidden" aria-hidden="true">
                            {slots.slice(0, 3).map((s) => (
                              <StatusDot key={s.id} state={s.state} />
                            ))}
                            {slots.length > 3 && <span className="text-[0.65rem] leading-none">+{slots.length - 3}</span>}
                          </span>
                        )}
                        {/* Desktop : mini-étiquettes avec l'heure, dans la couleur du statut. */}
                        {slots.length > 0 && (
                          <span className="hidden flex-col gap-1 md:flex" aria-hidden="true">
                            {slots.slice(0, 4).map((s) => (
                              <span
                                key={s.id}
                                className={clsx(
                                  'flex items-center gap-1 rounded-sm border px-1 text-[0.7rem] leading-5 whitespace-nowrap',
                                  CHIP[s.state],
                                  !inMonth && 'opacity-60'
                                )}
                              >
                                <StatusDot state={s.state} className="h-1.5 w-1.5" />
                                {formatTime(s.start_at).replace('h00', 'h')}
                              </span>
                            ))}
                            {slots.length > 4 && <span className="text-[0.7rem]">+{slots.length - 4}</span>}
                          </span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function CalendarLegend() {
  const items = [
    ['confirmed', 'Confirmée'],
    ['pending', 'En attente'],
    ['open', 'Libre'],
    ['closed', 'Fermé'],
  ]
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-label="Légende du calendrier">
      {items.map(([state, label]) => (
        <li key={state} className="flex items-center gap-2">
          <StatusDot state={state} className="h-2.5 w-2.5" />
          {label}
        </li>
      ))}
    </ul>
  )
}

import { useEffect, useMemo, useState } from 'react'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useApiData } from '../../lib/useApiData'
import { dateKey, formatKeyLong, formatKeyMedium, formatRange, weekStart } from '../../../shared/time.js'
import { Button } from '../Button'
import { FieldError, Loading, Notice } from '../ui/Notice'
import { StatusIcon } from '../ui/StatusBadge'
import { SessionReminder } from './SessionReminder'
import { StepHeading, choiceClasses, linkClasses } from './shared'

// Au-delà de deux semaines de créneaux publiés, on affiche une semaine à la fois.
const MAX_WEEKS_WITHOUT_PAGING = 2

export function StepSlot({ sessionType, onEditSession, value, onChange, onNext, onBack, notice, error, focusOnMount }) {
  const [pickedWeek, setPickedWeek] = useState(null)

  // Rechargés à chaque arrivée sur l'étape (le composant est remonté).
  const { data, error: fetchError, reload: load } = useApiData('/api/slots')
  const slots = data?.slots ?? null
  const loadError = data ? null : fetchError?.message

  // Créneau choisi précédemment mais plus disponible : on le désélectionne.
  useEffect(() => {
    if (slots && value && !slots.some((s) => s.id === value.id)) onChange(null)
  }, [slots, value, onChange])

  const weeks = useMemo(() => {
    const map = new Map()
    for (const slot of slots ?? []) {
      const day = dateKey(new Date(slot.start_at))
      const week = weekStart(day)
      if (!map.has(week)) map.set(week, new Map())
      const days = map.get(week)
      if (!days.has(day)) days.set(day, [])
      days.get(day).push(slot)
    }
    return [...map.entries()].map(([week, days]) => ({ week, days: [...days.entries()] }))
  }, [slots])

  const paged = weeks.length > MAX_WEEKS_WITHOUT_PAGING

  // Par défaut, la semaine du créneau déjà choisi, sinon la première.
  const selectedWeek = value ? weeks.findIndex((w) => w.week === weekStart(dateKey(new Date(value.start_at)))) : -1
  const weekIndex = Math.min(pickedWeek ?? Math.max(selectedWeek, 0), Math.max(weeks.length - 1, 0))
  const setWeekIndex = (update) => setPickedWeek(update(weekIndex))

  const visible = paged ? [weeks[weekIndex]] : weeks
  const days = visible.flatMap((w) => w.days)

  const select = (id) => onChange(slots.find((s) => String(s.id) === id) ?? null)

  return (
    <div>
      <StepHeading focusOnMount={focusOnMount}>
        <span id="slot-legend">Votre créneau</span>
      </StepHeading>

      {sessionType && (
        <div className="mt-6 border-y border-line py-3">
          <SessionReminder type={sessionType} onEdit={onEditSession} />
        </div>
      )}

      {notice && <Notice tone="error" className="mt-6">{notice}</Notice>}

      {loadError && (
        <Notice
          tone="error"
          className="mt-8"
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={load}
            >
              Réessayer
            </Button>
          }
        >
          {loadError}
        </Notice>
      )}

      {!slots && !loadError && <Loading>Chargement des créneaux…</Loading>}

      {slots && slots.length === 0 && (
        <div className="mt-8 border-l-2 border-structure py-1 pl-5">
          <p className="text-ink">Aucun créneau n’est ouvert pour le moment.</p>
          <p className="mt-2 text-ink">
            <Link to="/contact" className={linkClasses}>
              Écrivez-moi
            </Link>
            , je vous proposerai une date.
          </p>
        </div>
      )}

      {slots && slots.length > 0 && (
        <>
          {paged && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setWeekIndex((i) => Math.max(i - 1, 0))}
                disabled={weekIndex === 0}
                className="font-label min-h-11 px-1 text-sm tracking-wide uppercase disabled:opacity-40"
              >
                <span aria-hidden="true">←</span> <span className="sr-only sm:not-sr-only">Semaine précédente</span>
              </button>
              <p className="font-label text-center text-sm tracking-wide uppercase" aria-live="polite">
                Semaine du {formatKeyMedium(visible[0].week).replace(/ \d{4}$/, '')}
              </p>
              <button
                type="button"
                onClick={() => setWeekIndex((i) => Math.min(i + 1, weeks.length - 1))}
                disabled={weekIndex >= weeks.length - 1}
                className="font-label min-h-11 px-1 text-sm tracking-wide uppercase disabled:opacity-40"
              >
                <span className="sr-only sm:not-sr-only">Semaine suivante</span> <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          <RadioGroup.Root
            value={value ? String(value.id) : ''}
            onValueChange={select}
            aria-labelledby="slot-legend"
            aria-describedby={error ? 'slot-error' : undefined}
            className="mt-8 divide-y divide-line border-y border-line"
          >
            {days.map(([day, daySlots]) => (
              <div
                key={day}
                role="group"
                aria-labelledby={`day-${day}`}
                className="py-5 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-6"
              >
                <p id={`day-${day}`} className="font-display text-xl text-ink sm:pt-2">
                  {formatKeyLong(day)}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:mt-0 md:grid-cols-3">
                  {daySlots.map((slot) => (
                    <RadioGroup.Item
                      key={slot.id}
                      value={String(slot.id)}
                      className={clsx(
                        choiceClasses,
                        'inline-flex min-h-12 items-center justify-center gap-2 rounded-sm px-3 text-base whitespace-nowrap'
                      )}
                    >
                      <RadioGroup.Indicator>
                        <StatusIcon name="check" className="h-4 w-4" />
                      </RadioGroup.Indicator>
                      {formatRange(slot.start_at, slot.end_at)}
                    </RadioGroup.Item>
                  ))}
                </div>
              </div>
            ))}
          </RadioGroup.Root>
        </>
      )}

      <div aria-live="polite">
        <FieldError id="slot-error">{error}</FieldError>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Retour
        </Button>
        {slots && slots.length > 0 && (
          <Button type="button" onClick={onNext}>
            Continuer
          </Button>
        )}
      </div>
    </div>
  )
}

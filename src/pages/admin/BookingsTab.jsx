import { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import { useApiData } from '../../lib/useApiData'
import { telHref, instagramHref } from '../../lib/contact'
import { sessionLabel } from '../../../shared/booking.js'
import { formatDayLong, formatDayMonth, formatRange, formatTime } from '../../../shared/time.js'
import { Loading, Notice } from '../../components/ui/Notice'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FEEDBACK, adminButton, apiErrorMessage } from './adminUi'
import { BookingActions } from './BookingActions'

// Filet gauche épais dans la teinte moyenne du statut : nettement distincte
// du marron café au premier coup d'œil. Repère visuel en complément du
// badge (icône + libellé), qui porte l'information.
const ACCENT = {
  pending: 'border-l-pending-line',
  confirmed: 'border-l-confirmed-line',
  declined: 'border-l-declined-line',
}

// Délai entre le changement de couleur de la carte et son déplacement vers
// sa nouvelle section, pour que le changement d'état soit perçu.
const MOVE_DELAY_MS = 450

export function BookingsTab({ onExpired, onPendingCount, onFeedback }) {
  const { data, error: loadError, reload } = useApiData('/api/admin/bookings', {
    onData: (result) => onPendingCount(result.pending_count),
    onError: (err) => apiErrorMessage(err, onExpired),
  })
  // Statut affiché tout de suite après une action, avant le rechargement.
  const [overrides, setOverrides] = useState({})
  const error = loadError?.status === 401 ? null : loadError?.message

  const onDone = (action, booking) => {
    const feedback = FEEDBACK[action]
    onFeedback(feedback)
    if (feedback.status) setOverrides((o) => ({ ...o, [booking.id]: feedback.status }))
    setTimeout(
      () => {
        setOverrides({})
        reload()
      },
      feedback.status ? MOVE_DELAY_MS : 0
    )
  }

  if (error && !data) {
    return (
      <Notice
        tone="error"
        action={
          <button type="button" className={adminButton('outline')} onClick={reload}>
            Réessayer
          </button>
        }
      >
        {error}
      </Notice>
    )
  }
  if (!data) return <Loading />

  const empty = !data.pending.length && !data.confirmed.length && !data.declined.length
  const shared = { overrides, onDone, onExpired }

  return (
    <div className="space-y-10">
      {empty && (
        <Notice>
          Aucune demande pour le moment. Les demandes des clients apparaîtront ici dès qu’ils auront choisi un de
          vos créneaux.
        </Notice>
      )}
      <LayoutGroup>
        <Section id="pending" title="En attente" items={data.pending} {...shared} />
        <Section id="confirmed" title="Confirmées à venir" items={data.confirmed} {...shared} />
        <Section id="declined" title="Refusées récentes" items={data.declined} {...shared} />
      </LayoutGroup>
    </div>
  )
}

function Section({ id, title, items, overrides, onDone, onExpired }) {
  return (
    <section aria-labelledby={`section-${id}`} className={clsx(!items.length && 'hidden')}>
      <h2 id={`section-${id}`} className="text-2xl text-ink">
        {title} <span className="text-base">({items.length})</span>
      </h2>
      <ul className="mt-4 grid gap-4 lg:grid-cols-2">
        <AnimatePresence initial={false}>
          {items.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={{ ...booking, status: overrides[booking.id] ?? booking.status }}
              onDone={onDone}
              onExpired={onExpired}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}

function BookingCard({ booking, onDone, onExpired }) {
  const reduceMotion = useReducedMotion()
  const name = `${booking.first_name} ${booking.last_name}`

  return (
    <motion.li
      layout={!reduceMotion}
      layoutId={`booking-${booking.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={clsx(
        'border border-l-4 border-line bg-paper p-4 transition-colors duration-200 sm:p-5',
        ACCENT[booking.status]
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-label text-xs tracking-[0.15em] uppercase">{sessionLabel(booking.session_type)}</p>
          <p className="font-display mt-1 text-xl">
            {formatDayLong(booking.slot.start_at)}, {formatRange(booking.slot.start_at, booking.slot.end_at)}
          </p>
        </div>
        <StatusBadge state={booking.status} />
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="italic">Nom</dt>
        <dd className="min-w-0">{name}</dd>
        <dt className="italic">Email</dt>
        <dd className="min-w-0 break-all">
          <a href={`mailto:${booking.email}`} className="underline underline-offset-4">
            {booking.email}
          </a>
        </dd>
        <dt className="italic">Téléphone</dt>
        <dd className="min-w-0">
          {booking.phone ? (
            <a href={telHref(booking.phone)} className="underline underline-offset-4">
              {booking.phone}
            </a>
          ) : (
            'non renseigné'
          )}
        </dd>
        {booking.instagram && (
          <>
            <dt className="italic">Instagram</dt>
            <dd className="min-w-0 break-all">
              <a href={instagramHref(booking.instagram)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                @{booking.instagram}
              </a>
            </dd>
          </>
        )}
      </dl>

      {booking.message && (
        <p className="mt-3 border-l-2 border-line pl-3 text-sm break-words whitespace-pre-line">{booking.message}</p>
      )}

      <p className="mt-3 text-sm">
        Demande reçue le {formatDayMonth(booking.created_at)} à {formatTime(booking.created_at)}
      </p>

      <div className="mt-4">
        <BookingActions booking={booking} onDone={onDone} onExpired={onExpired} />
      </div>
    </motion.li>
  )
}

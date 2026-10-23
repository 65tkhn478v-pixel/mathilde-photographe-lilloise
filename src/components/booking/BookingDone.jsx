import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { sessionLabel } from '../../../shared/booking.js'
import { formatDayFull, formatRange, formatTime } from '../../../shared/time.js'
import { StatusIcon } from '../ui/StatusBadge'
import { StepHeading, linkClasses } from './shared'

/**
 * Écran final : la demande est enregistrée, le client n'a plus rien à faire.
 * Mathilde le recontacte ensuite.
 */
export function BookingDone({ booking, focusOnMount }) {
  const reduceMotion = useReducedMotion()
  const type = sessionLabel(booking.session_type)
  const { start_at: start, end_at: end } = booking.slot

  return (
    <div className="text-center">
      <motion.span
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-confirmed-line bg-confirmed-bg text-confirmed"
      >
        <StatusIcon name="check" className="h-8 w-8" />
      </motion.span>

      <StepHeading focusOnMount={focusOnMount} className="mt-6">
        C’est noté, merci !
      </StepHeading>
      <p className="mx-auto mt-5 max-w-xl text-ink">
        Votre demande pour une séance {type.toLowerCase()} le {formatDayFull(start).replace(/ \d{4}$/, '')} de{' '}
        {formatTime(start)} à {formatTime(end)} est bien enregistrée. Je vous recontacte dans les prochaines heures
        pour la confirmer.
      </p>

      <dl className="mx-auto mt-10 grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-line py-4 text-left text-ink">
        <dt className="italic">Séance</dt>
        <dd>{type}</dd>
        <dt className="italic">Date</dt>
        <dd className="first-letter:uppercase">{formatDayFull(start)}</dd>
        <dt className="italic">Horaire</dt>
        <dd>{formatRange(start, end)}</dd>
      </dl>

      <p className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3">
        <Link to="/" className={linkClasses}>
          Retour à l’accueil
        </Link>
        <Link to="/portfolio" className={linkClasses}>
          Voir le portfolio
        </Link>
      </p>
    </div>
  )
}

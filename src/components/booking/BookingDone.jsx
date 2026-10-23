import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from '../../data/site'
import { sessionLabel } from '../../../shared/booking.js'
import { formatDayFull, formatRange } from '../../../shared/time.js'
import { copyText } from '../../lib/clipboard'
import { bookingMailto, bookingRecapText } from '../../lib/mailto'
import { Button } from '../Button'
import { StepHeading, linkClasses } from './shared'

export function BookingDone({ booking, focusOnMount }) {
  const [copied, setCopied] = useState(null)
  // Le mail n'est ouvert que par un clic ici, après l'enregistrement réussi :
  // jamais automatiquement (bloqué par certains navigateurs mobiles).
  const mail = bookingMailto(booking)

  const copy = async () => {
    const ok = await copyText(bookingRecapText(booking))
    setCopied(ok ? 'Récapitulatif copié.' : 'La copie n’a pas fonctionné : sélectionnez le récapitulatif ci-dessous.')
  }

  return (
    <div>
      <StepHeading focusOnMount={focusOnMount}>Votre demande est bien enregistrée.</StepHeading>
      <p className="mt-5 text-ink">
        Dernière étape : prévenez-moi par mail. Je reviens vers vous très vite pour confirmer la séance.
      </p>

      <div className="mt-8">
        <Button href={mail.url} className="w-full sm:w-auto">
          Prévenir Mathilde par mail
        </Button>
        {mail.truncated && (
          <p className="mt-3 text-xs text-ink italic">
            Votre message étant long, il est raccourci dans le mail ; Mathilde le reçoit en entier avec votre demande.
          </p>
        )}
      </div>

      <div className="mt-8 border-l-2 border-structure py-1 pl-5 text-sm text-ink">
        <p>
          Le mail ne s’ouvre pas ? Écrivez-moi à{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={`${linkClasses} break-all`}>
            {CONTACT_EMAIL}
          </a>{' '}
          en indiquant votre référence :{' '}
          <strong className="font-sans text-base font-semibold tracking-widest">{booking.reference}</strong>
        </p>
        <button
          type="button"
          onClick={copy}
          className="font-label mt-4 inline-flex min-h-11 items-center rounded-sm border border-ink/40 px-4 text-xs tracking-[0.12em] uppercase hover:border-ink"
        >
          Copier le récapitulatif
        </button>
        <p aria-live="polite" className="mt-2 text-xs italic">
          {copied}
        </p>
      </div>

      <section aria-labelledby="recap-title" className="mt-10">
        <h3 id="recap-title" className="font-label text-xs tracking-[0.15em] uppercase">
          Votre demande
        </h3>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-line py-4 text-ink">
          <dt className="italic">Séance</dt>
          <dd>{sessionLabel(booking.session_type)}</dd>
          <dt className="italic">Date</dt>
          <dd className="first-letter:uppercase">{formatDayFull(booking.slot.start_at)}</dd>
          <dt className="italic">Horaire</dt>
          <dd>{formatRange(booking.slot.start_at, booking.slot.end_at)}</dd>
          <dt className="italic">Référence</dt>
          <dd className="font-sans tracking-widest">{booking.reference}</dd>
          <dt className="italic">Nom</dt>
          <dd className="min-w-0 break-words">
            {booking.first_name} {booking.last_name}
          </dd>
          <dt className="italic">Email</dt>
          <dd className="min-w-0 break-all">{booking.email}</dd>
          <dt className="italic">Téléphone</dt>
          <dd>{booking.phone || 'non renseigné'}</dd>
          {booking.message && (
            <>
              <dt className="italic">Message</dt>
              <dd className="min-w-0 break-words whitespace-pre-line">{booking.message}</dd>
            </>
          )}
        </dl>
      </section>

      <p className="mt-10">
        <Link to="/" className={linkClasses}>
          Retour à l’accueil
        </Link>
      </p>
    </div>
  )
}

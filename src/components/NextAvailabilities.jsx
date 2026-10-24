import { Link } from 'react-router-dom'
import { useApiData } from '../lib/useApiData'
import { formatDayLong, formatShortRange } from '../../shared/time.js'
import { Reveal } from './Reveal'

const linkClasses = 'underline underline-offset-4 hover:text-accent'

/**
 * « Prochaines disponibilités » (accueil) : les 3 prochains créneaux libres
 * réels, chargés après l'affichage de la page (un seul appel). Liens texte
 * (pas de bouton plein) vers /reserver?creneau=<id>.
 */
export function NextAvailabilities() {
  const { data, error } = useApiData('/api/slots?limit=3')
  const slots = data?.slots ?? null

  return (
    <section aria-labelledby="dispos-titre" className="border-t border-line py-16 md:py-24">
      <Reveal className="mx-auto max-w-xl px-6 text-center md:px-10">
        <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">Réservation</p>
        <h2 id="dispos-titre" className="mt-4 text-3xl text-ink md:text-4xl">
          Prochaines disponibilités
        </h2>

        {error && !slots ? (
          // Erreur réseau : simple lien, sans message technique.
          <p className="mt-8">
            <Link to="/reserver" className={linkClasses}>
              Voir les disponibilités
            </Link>
          </p>
        ) : !slots ? (
          <ul className="mt-8 space-y-3" aria-hidden="true" data-testid="dispos-chargement">
            {[0, 1, 2].map((i) => (
              <li key={i} className="mx-auto h-6 w-64 max-w-full animate-pulse rounded-sm bg-mist/70" />
            ))}
          </ul>
        ) : slots.length === 0 ? (
          <p className="mt-8 text-ink">
            Pas de créneau ouvert pour le moment.{' '}
            <Link to="/contact" className={linkClasses}>
              Écrivez-moi
            </Link>
            , je vous proposerai une date.
          </p>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <Link
                    to={`/reserver?creneau=${slot.id}`}
                    className="flex min-h-12 flex-wrap items-center justify-center py-3 text-ink hover:text-accent"
                  >
                    <span className="font-display text-lg">{formatDayLong(slot.start_at)}</span>
                    <span className="whitespace-pre"> · </span>
                    <span>{formatShortRange(slot.start_at, slot.end_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <Link to="/reserver" className={`text-sm ${linkClasses}`}>
                Voir toutes les disponibilités
              </Link>
            </p>
          </>
        )}
      </Reveal>
    </section>
  )
}

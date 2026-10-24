import { Link } from 'react-router-dom'
import { Reveal } from './Reveal'
import { BookingCTA } from './BookingCTA'
import { Button } from './Button'

/**
 * Bloc de fin de page (avant le footer) : la réservation en premier, le
 * contact en second. `mariage` : le mariage ne se réserve pas en ligne, le
 * bouton principal mène au contact. La barre de réservation mobile se masque
 * dès que ce bloc arrive à l'écran (data-booking-end).
 */
export function BookingEndBlock({ seance, mariage = false }) {
  return (
    <section data-booking-end aria-labelledby="fin-titre" className="bg-ink py-20 text-paper md:py-28">
      <Reveal className="mx-auto max-w-2xl px-6 text-center md:px-10">
        <h2 id="fin-titre" className="text-3xl text-paper md:text-4xl">
          Envie d’une séance ?
        </h2>
        <div className="mt-8 flex flex-col items-center gap-5">
          {mariage ? (
            <>
              <Button to="/contact" variant="inverse">
                Me contacter pour votre mariage
              </Button>
              <Link to="/reserver" className="text-sm text-paper underline underline-offset-4 hover:no-underline">
                Portrait, famille, grossesse ou naissance : réserver une séance
              </Link>
            </>
          ) : (
            <>
              <BookingCTA seance={seance} variant="inverse" />
              <Link to="/contact" className="text-sm text-paper underline underline-offset-4 hover:no-underline">
                Une question, un mariage ? Écrivez-moi
              </Link>
            </>
          )}
        </div>
      </Reveal>
    </section>
  )
}

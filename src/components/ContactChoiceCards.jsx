import { BookingCTA } from './BookingCTA'

/**
 * Orientation en haut de la page Contact : la réservation d'abord, le
 * message (mariage, questions, projets particuliers) ensuite.
 */
export function ContactChoiceCards() {
  const goToForm = (e) => {
    e.preventDefault()
    const form = document.getElementById('formulaire')
    if (!form) return
    form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    form.querySelector('input, select, textarea')?.focus({ preventScroll: true })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section aria-labelledby="choix-reserver" className="flex flex-col border border-line p-6 md:p-8">
        <h2 id="choix-reserver" className="text-2xl text-ink">
          Réserver une séance
        </h2>
        <p className="mt-3 flex-1 text-ink">Portrait, famille, grossesse ou naissance : choisissez directement votre créneau.</p>
        <div className="mt-6">
          <BookingCTA />
        </div>
      </section>
      <section aria-labelledby="choix-ecrire" className="flex flex-col border border-line p-6 md:p-8">
        <h2 id="choix-ecrire" className="text-2xl text-ink">
          Une question, un mariage, un projet particulier ?
        </h2>
        <p className="mt-3 flex-1 text-ink">Écrivez-moi, on en parle ensemble.</p>
        <div className="mt-6">
          <a
            href="#formulaire"
            onClick={goToForm}
            className="font-label inline-flex min-h-11 items-center justify-center rounded-sm border border-ink/40 px-7 py-3.5 text-xs tracking-[0.18em] text-ink uppercase transition duration-200 hover:border-ink hover:bg-ink hover:text-paper md:text-sm"
          >
            Écrire un message
          </a>
        </div>
      </section>
    </div>
  )
}

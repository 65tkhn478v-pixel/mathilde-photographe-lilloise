import { usePageMeta } from '../hooks/usePageMeta'
import { Reveal } from '../components/Reveal'
import { Link } from 'react-router-dom'
import { BookingCTA } from '../components/BookingCTA'
import { BookingEndBlock } from '../components/BookingEndBlock'

const SERVICES = [
  {
    title: 'Grossesse',
    seance: 'grossesse',
    text: "Un moment suspendu pour garder la trace de l'attente, en douceur, seule ou accompagnée.",
  },
  {
    title: 'Naissance',
    seance: 'naissance',
    text: 'Les tout premiers jours de votre enfant, à la maison ou à la maternité, dans la lumière du quotidien.',
  },
  {
    title: 'Mariage',
    // Pas de réservation en ligne pour un mariage : on en parle d'abord.
    action: { label: 'Me contacter', to: '/contact' },
    text: "Votre journée racontée telle qu'elle se vit vraiment : rires, émotion, complicité — sans mise en scène.",
  },
  {
    title: 'Famille',
    seance: 'famille',
    text: 'Des instants du quotidien ou une séance dédiée, pour fixer ce qui vous lie.',
  },
  {
    title: 'Couple',
    text: 'Une séance à deux, complice et sans artifice, où que vous soyez le plus vous-mêmes.',
  },
  {
    title: 'Portrait individuel',
    seance: 'portrait',
    text: 'Un portrait sincère, qui vous ressemble, loin des poses figées.',
  },
]

export default function Services() {
  usePageMeta({
    title: 'Services',
    description:
      'Séances photo grossesse, naissance, mariage, famille, couple et portrait individuel à Lille. Contactez-moi pour en discuter.',
    path: '/services',
  })

  return (
    <div className="pt-28 md:pt-32">
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-8 md:px-10 md:pt-24">
        <Reveal className="flex flex-col items-center text-center">
          <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">Explorez</p>
          <h1 className="mt-4 max-w-xl text-4xl text-ink md:text-5xl">Mes offres et services</h1>
          <p className="mt-6 max-w-lg text-ink-soft">
            Chaque séance est une rencontre, un moment de vie capturé avec sensibilité — pensé
            pour s'adapter à vos besoins.
          </p>
        </Reveal>
      </section>

      <Reveal className="mx-auto max-w-6xl px-6 md:px-10">
        <img
          src="/images/portfolio/naissance/naissance-05.webp"
          alt="Photo en noir et blanc d'un nouveau-né endormi, emmailloté dans un vêtement blanc, la tête posée au creux de la main d'un adulte."
          className="aspect-[16/7] w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </Reveal>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {SERVICES.map((service, index) => (
            <Reveal key={service.title} delay={(index % 2) * 0.1}>
              <p className="font-display text-2xl text-ink">{service.title}</p>
              <p className="mt-3 text-ink-soft">{service.text}</p>
              {service.seance && (
                <BookingCTA
                  seance={service.seance}
                  variant="outline"
                  className="mt-4"
                  aria-label={`Réserver une séance ${service.title.toLowerCase()}`}
                >
                  Réserver cette séance
                </BookingCTA>
              )}
              {service.action && (
                <Link
                  to={service.action.to}
                  className="font-label mt-3 inline-flex min-h-11 items-center gap-2 text-xs tracking-[0.2em] text-ink uppercase hover:text-accent"
                >
                  <span className="underline underline-offset-[0.4em]">{service.action.label}</span>
                  <span className="sr-only"> : {service.title.toLowerCase()}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </Reveal>
          ))}
        </div>

      </section>
      <BookingEndBlock />
    </div>
  )
}

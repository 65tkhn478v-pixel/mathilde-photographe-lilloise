import { Reveal } from './Reveal'
import { Button } from './Button'
import { SOCIALS } from '../data/site'

export function ContactCTA() {
  return (
    <section className="bg-ink py-24 text-paper md:py-32">
      <Reveal className="mx-auto max-w-2xl px-6 text-center md:px-10">
        <h2 className="text-3xl text-paper md:text-4xl">Et si on travaillait ensemble ?</h2>
        <p className="mt-5 text-paper/75">
          Racontez-moi votre projet — grossesse, naissance, mariage ou famille — j'ai hâte d'en
          savoir plus et d'échanger avec vous.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Button to="/contact" className="bg-accent hover:bg-paper hover:text-ink">
            Me contacter
          </Button>
          <Button href={SOCIALS[0].href} variant="ghost">
            Suivre sur Instagram
          </Button>
        </div>
      </Reveal>
    </section>
  )
}

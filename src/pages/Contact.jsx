import { usePageMeta } from '../hooks/usePageMeta'
import { Reveal } from '../components/Reveal'
import { ContactForm } from '../components/ContactForm'
import { ContactChoiceCards } from '../components/ContactChoiceCards'
import { SOCIALS } from '../data/site'

export default function Contact() {
  usePageMeta({
    title: 'Contact',
    description:
      "Envie d'un shooting grossesse, naissance, mariage ou famille à Lille ? Contactez-moi, je vous réponds avec plaisir.",
    path: '/contact',
  })

  return (
    <div className="pt-28 md:pt-32">
      <div className="mx-auto max-w-4xl px-6 pt-16 md:px-10 md:pt-24">
        <Reveal className="text-center">
          <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">Contact</p>
          <h1 className="mt-4 text-4xl text-ink md:text-5xl">Contactez-moi</h1>
          <p className="mt-6 text-ink-soft">
            Racontez-moi votre projet — j'ai hâte d'en savoir plus et d'échanger avec vous !
          </p>
        </Reveal>

        {/* Orientation : la réservation d'abord, le message ensuite. */}
        <div className="mt-12">
          <ContactChoiceCards />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-16 md:px-10 md:pb-24">
        <Reveal delay={0.15} className="mt-14">
          <div id="formulaire" className="scroll-mt-32">
            <ContactForm />
          </div>
        </Reveal>

        <Reveal delay={0.25} className="mt-16 border-t border-line pt-10 text-center">
          <p className="text-sm text-ink-faint">Vous pouvez aussi me suivre ici</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-ink-soft hover:text-accent"
              >
                {social.label}
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  )
}

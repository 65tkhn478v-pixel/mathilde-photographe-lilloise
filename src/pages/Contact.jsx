import { usePageMeta } from '../hooks/usePageMeta'
import { Reveal } from '../components/Reveal'
import { ContactForm } from '../components/ContactForm'
import { SOCIALS } from '../data/site'

export default function Contact() {
  usePageMeta({
    title: 'Contact',
    description:
      "Demandez votre devis pour une séance grossesse, naissance, mariage ou famille à Lille. Réponse personnalisée à chaque projet.",
    path: '/contact',
  })

  return (
    <div className="pt-28 md:pt-32">
      <div className="mx-auto max-w-2xl px-6 py-16 md:px-10 md:py-24">
        <Reveal className="text-center">
          <p className="text-xs tracking-[0.3em] text-terracotta uppercase">Contact</p>
          <h1 className="mt-4 text-4xl text-ink md:text-5xl">Contactez-moi</h1>
          <p className="mt-6 text-ink-soft">
            Vous aimez ma façon de travailler et souhaitez en savoir plus sur mes tarifs et
            disponibilités ? Racontez-moi votre projet, j'ai hâte d'en savoir plus et
            d'échanger avec vous !
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <ContactForm />
        </Reveal>

        <Reveal delay={0.25} className="mt-16 border-t border-border pt-10 text-center">
          <p className="text-sm text-ink-faint">Vous pouvez aussi me suivre ici</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-ink-soft hover:text-terracotta"
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

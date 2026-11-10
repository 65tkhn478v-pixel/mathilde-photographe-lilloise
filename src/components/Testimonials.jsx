import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { TEMOIGNAGES } from '../data/temoignages'
import { excerpt, formatMonth, homeSelection, prepareTestimonials } from '../lib/testimonials'

const ALL = prepareTestimonials(TEMOIGNAGES, import.meta.env.DEV ? (m) => console.warn(m) : undefined)

const linkClasses = 'underline underline-offset-4 hover:text-accent'
// Espace fine insécable à l'intérieur des guillemets français.
const NNBSP = '\u202f'
// À l'affichage seulement : l'espace avant ! ? ; : devient insécable, pour que
// la ponctuation ne passe jamais seule à la ligne (le fichier reste tel quel).
const frenchSpacing = (s) => s.replace(/ ([!?;:])/g, `${NNBSP}$1`)

/**
 * « Ils m'ont fait confiance » : petits mots de clientes, recopiés à la main
 * dans src/data/temoignages.js. Rien n'est rendu tant que le fichier est vide.
 * variant="home" : 3 au plus (choisis par `accueil: true`, sinon les premiers
 * du tri), messages longs coupés ; "full" : tous.
 */
export function Testimonials({ variant = 'home' }) {
  const items = ALL
  if (!items.length) return null
  const home = variant === 'home'
  const shown = home ? homeSelection(items) : items

  return (
    <section
      id={home ? undefined : 'temoignages'}
      aria-labelledby={`temoignages-titre-${variant}`}
      className={clsx('scroll-mt-28 py-20 md:py-28', !home && 'border-t border-line')}
    >
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        <h2 id={`temoignages-titre-${variant}`} className="text-center text-3xl text-ink md:text-4xl">
          Ils m’ont fait confiance
        </h2>

        <div className="mt-12 md:mt-16">
          {shown.map((t, i) => {
            const { text, cut } = home ? excerpt(t.message) : { text: t.message, cut: false }
            return (
              <motion.figure
                key={t.id}
                id={home ? undefined : t.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className={clsx(
                  'max-w-xl scroll-mt-28',
                  // Alternance légère d'alignement sur grand écran.
                  i % 2 ? 'md:ml-auto' : 'md:mr-auto',
                  i > 0 && 'mt-12 border-t border-line pt-12 md:mt-14 md:pt-14'
                )}
                data-testid="temoignage"
              >
                <blockquote className="font-display text-lg leading-loose text-ink italic md:text-xl md:leading-loose">
                  <p>
                    «{NNBSP}
                    {frenchSpacing(text)}
                    {NNBSP}»
                  </p>
                </blockquote>
                {cut && (
                  <p className="mt-3 text-sm">
                    <Link to={`/a-propos#${t.id}`} className={linkClasses}>
                      Lire la suite
                      <span className="sr-only"> du témoignage de {t.nom}</span>
                    </Link>
                  </p>
                )}
                <figcaption className="font-label mt-5 text-xs tracking-[0.2em] text-ink uppercase">
                  {t.nom}
                  {t.date && (
                    <>
                      {' · '}
                      <time dateTime={t.date}>{formatMonth(t.date)}</time>
                    </>
                  )}
                  {t.seance && <> · Séance {t.seance}</>}
                </figcaption>
              </motion.figure>
            )
          })}
        </div>

        {home && items.length > shown.length && (
          <p className="mt-14 text-center text-sm">
            <Link to="/a-propos#temoignages" className={linkClasses}>
              Lire tous les témoignages
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}

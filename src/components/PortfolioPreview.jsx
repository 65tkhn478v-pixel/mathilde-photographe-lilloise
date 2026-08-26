import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Reveal } from './Reveal'
import { CATEGORIES } from '../data/portfolio'

// Rythme éditorial volontairement irrégulier (DESIGN_VARIANCE 5/10) : la
// vignette Mariage prend plus de place, les autres respirent différemment
// plutôt que trois/quatre cartes identiques en grille.
const spans = {
  mariage: 'md:col-span-3 md:row-span-2',
  grossesse: 'md:col-span-3 md:row-span-1 md:col-start-4',
  naissance: 'md:col-span-3 md:row-span-1 md:col-start-4',
  famille: 'md:col-span-6',
}

export function PortfolioPreview() {
  return (
    <section className="bg-ivory-deep py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <Reveal>
          <p className="text-xs tracking-[0.3em] text-terracotta uppercase">Portfolio</p>
          <h2 className="mt-4 max-w-lg text-3xl text-ink md:text-4xl">
            Des instants réels, saisis au fil des séances
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:auto-rows-[180px] md:grid-cols-6">
          {CATEGORIES.map((category, index) => (
            <Reveal key={category.slug} delay={index * 0.08} className={spans[category.slug]}>
              {category.comingSoon ? (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center border border-dashed border-ink/25 bg-ivory px-8 text-center">
                  <p className="font-display text-2xl text-ink">{category.label}</p>
                  <p className="mt-2 text-sm text-ink-faint">Galerie à venir</p>
                </div>
              ) : (
                <Link
                  to={`/portfolio/${category.slug}`}
                  className="group relative block h-full min-h-[220px] overflow-hidden"
                >
                  <img
                    src={category.cover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    className={clsx(
                      'absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/0 to-ink/0',
                      'transition-opacity duration-300'
                    )}
                    aria-hidden="true"
                  />
                  <span className="absolute bottom-5 left-6 font-display text-xl text-ivory md:text-2xl">
                    {category.label}
                  </span>
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

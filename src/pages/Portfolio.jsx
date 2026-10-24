import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { Reveal } from '../components/Reveal'
import { CATEGORIES } from '../data/portfolio'
import { BookingEndBlock } from '../components/BookingEndBlock'

export default function Portfolio() {
  usePageMeta({
    title: 'Portfolio',
    description:
      'Portfolio de Mathilde Lecomte, photographe à Lille : séances mariage, grossesse, naissance et famille, dans un style naturel et sincère.',
    path: '/portfolio',
  })

  return (
    <div className="pt-28 md:pt-32">
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-8 md:px-10 md:pt-24">
        <Reveal className="flex flex-col items-center text-center">
          <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">Portfolio</p>
          <h1 className="mt-4 max-w-2xl text-4xl text-ink md:text-5xl">
            Des séances vécues, pas mises en scène
          </h1>
        </Reveal>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="grid gap-6 sm:grid-cols-2">
          {CATEGORIES.map((category, index) => (
            <Reveal key={category.slug} delay={index * 0.08}>
              {category.comingSoon ? (
                <div className="flex aspect-[4/3] flex-col items-center justify-center border border-dashed border-ink/25 bg-mist px-8 text-center">
                  <p className="font-display text-2xl text-ink">{category.label}</p>
                  <p className="mt-2 text-sm text-ink-faint">Galerie à venir</p>
                </div>
              ) : (
                <Link
                  to={`/portfolio/${category.slug}`}
                  className="group relative block aspect-[4/3] overflow-hidden"
                >
                  <img
                    src={category.cover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="font-display text-2xl text-paper">{category.label}</p>
                    <p className="mt-1 max-w-xs text-sm text-paper/75">{category.intro}</p>
                  </div>
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      </div>
      <BookingEndBlock />
    </div>
  )
}

import { Link, Navigate, useParams } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { Reveal } from '../components/Reveal'
import { PortfolioGrid } from '../components/PortfolioGrid'
import { Button } from '../components/Button'
import { CATEGORIES, PHOTOS } from '../data/portfolio'

export default function PortfolioCategory() {
  const { slug } = useParams()
  const category = CATEGORIES.find((c) => c.slug === slug)

  usePageMeta({
    title: category ? `Portfolio — ${category.label}` : 'Portfolio',
    description: category?.intro,
    path: `/portfolio/${slug}`,
    image: category?.cover,
  })

  if (!category) return <Navigate to="/portfolio" replace />

  return (
    <div className="pt-28 md:pt-32">
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-24">
        <Reveal>
          <Link to="/portfolio" className="text-xs tracking-[0.2em] text-ink-faint uppercase hover:text-terracotta">
            ← Tout le portfolio
          </Link>
          <h1 className="mt-4 text-4xl text-ink md:text-5xl">{category.label}</h1>
          <p className="mt-4 max-w-xl text-ink-soft">{category.intro}</p>
        </Reveal>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-24 md:px-10 md:pb-32">
        {category.comingSoon ? (
          <div className="flex flex-col items-center border border-dashed border-ink/25 bg-ivory-deep px-8 py-20 text-center">
            <p className="font-display text-2xl text-ink">Galerie à venir</p>
            <p className="mt-3 max-w-sm text-sm text-ink-soft">
              Cette catégorie n'a pas encore de galerie dédiée. Elle sera mise en ligne dès que
              de nouvelles séances famille seront réalisées.
            </p>
            <Button to="/contact" className="mt-8">
              Réserver une séance famille
            </Button>
          </div>
        ) : (
          <PortfolioGrid photos={PHOTOS[category.slug]} />
        )}
      </div>
    </div>
  )
}

import { usePageMeta } from '../hooks/usePageMeta'
import { Hero } from '../components/Hero'
import { AboutTeaser } from '../components/AboutTeaser'
import { PortfolioPreview } from '../components/PortfolioPreview'
import { Philosophy } from '../components/Philosophy'
import { ContactCTA } from '../components/ContactCTA'

export default function Home() {
  usePageMeta({
    title: 'Photographe grossesse, naissance, mariage & famille à Lille',
    description:
      "Des instants vrais, pour des souvenirs tendres. Mathilde Lecomte, photographe à Lille, capture avec sensibilité vos grossesses, naissances, mariages et moments en famille.",
    path: '/',
    image: '/images/hero/hero-famille-chien.webp',
  })

  return (
    <>
      <Hero />
      <AboutTeaser />
      <PortfolioPreview />
      <Philosophy />
      <ContactCTA />
    </>
  )
}

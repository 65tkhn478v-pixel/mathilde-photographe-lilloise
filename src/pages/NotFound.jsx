import { usePageMeta } from '../hooks/usePageMeta'
import { Reveal } from '../components/Reveal'
import { Button } from '../components/Button'

export default function NotFound() {
  usePageMeta({
    title: 'Page introuvable',
    description: 'Cette page n\'existe pas.',
    path: '/404',
  })

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <Reveal>
        <p className="text-xs tracking-[0.3em] text-terracotta uppercase">Erreur 404</p>
        <h1 className="mt-4 text-4xl text-ink md:text-5xl">Page introuvable</h1>
        <p className="mt-4 text-ink-soft">
          Cette page n'existe pas ou plus. Retournez à l'accueil pour poursuivre la visite.
        </p>
        <Button to="/" className="mt-8">
          Retour à l'accueil
        </Button>
      </Reveal>
    </div>
  )
}

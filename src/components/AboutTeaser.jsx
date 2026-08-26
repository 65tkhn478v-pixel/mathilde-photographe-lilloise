import { Reveal } from './Reveal'
import { Button } from './Button'

export function AboutTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
        <Reveal className="order-2 md:order-1">
          <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">Mon approche</p>
          <h2 className="mt-4 text-3xl text-ink md:text-4xl">
            Le naturel plutôt que la pose, l'émotion plutôt que la perfection
          </h2>
          <p className="mt-6 max-w-md text-ink-soft">
            J'aime créer des images naturelles, spontanées et pleines de vie, qui racontent une
            histoire : la vôtre. Pas de poses figées ni de sourires forcés — je privilégie la
            lumière du quotidien, les éclats de rire, les regards complices.
          </p>
          <Button to="/a-propos" variant="secondary" className="mt-8">
            En savoir plus sur moi
          </Button>
        </Reveal>

        <Reveal delay={0.15} className="order-1 md:order-2">
          <img
            src="/images/about/mathilde-portrait.webp"
            alt="Mathilde Lecomte, photographe, appareil photo à la main, souriante."
            className="aspect-[4/5] w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </Reveal>
      </div>
    </section>
  )
}

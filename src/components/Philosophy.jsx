import { Reveal } from './Reveal'

export function Philosophy() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
        <Reveal>
          <img
            src="/images/philosophy/main-nouveau-ne.webp"
            alt="Gros plan sur la main d'un nouveau-né refermée sur le doigt d'un parent."
            className="aspect-[5/4] w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </Reveal>

        <Reveal delay={0.15} className="flex flex-col items-center text-center">
          <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">Philosophie</p>
          <h2 className="mt-4 text-3xl text-ink md:text-4xl">
            L'authenticité plutôt que la mise en scène
          </h2>
          <p className="mt-6 max-w-md text-ink-soft">
            Chaque séance est une rencontre. Mon rôle : mettre sur pause vos instants fugaces,
            pour les revivre avec émotion.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

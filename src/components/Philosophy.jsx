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

        <Reveal delay={0.15}>
          <p className="text-xs tracking-[0.3em] text-terracotta uppercase">Philosophie</p>
          <h2 className="mt-4 text-3xl text-ink md:text-4xl">
            L'authenticité plutôt que la mise en scène
          </h2>
          <p className="mt-6 max-w-md text-ink-soft">
            Chaque séance est une rencontre, une histoire à raconter à travers mes images. Mon
            rôle, c'est de mettre sur pause ces instants fugaces — un regard complice, un éclat
            de rire, une étreinte discrète — pour que vous puissiez les revivre encore et
            encore, avec émotion et tendresse.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

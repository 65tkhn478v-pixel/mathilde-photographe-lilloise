import { usePageMeta } from '../hooks/usePageMeta'
import { Reveal } from '../components/Reveal'
import { BookingEndBlock } from '../components/BookingEndBlock'

export default function About() {
  usePageMeta({
    title: 'À propos',
    description:
      "Mathilde Lecomte, photographe indépendante à Lille : une approche naturelle, sincère et sans mise en scène pour vos séances grossesse, naissance, mariage et famille.",
    path: '/a-propos',
  })

  return (
    <div className="pt-28 md:pt-32">
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 md:gap-20">
          <Reveal>
            <img
              src="/images/about/mathilde-portrait.webp"
              alt="Mathilde Lecomte, photographe, appareil photo à la main, souriante."
              className="aspect-[4/5] w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </Reveal>

          <Reveal delay={0.15}>
            <div className="text-center">
              <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">À propos de moi</p>
              <h1 className="mt-4 text-4xl text-ink md:text-5xl">Mathilde Lecomte</h1>
              <p className="font-label mt-2 text-sm tracking-wide text-ink-faint uppercase">
                Photographe lilloise
              </p>
            </div>

            {/* Paragraphes longs : alignés à gauche, un centrage nuirait à
                la lisibilité (voir consigne alignement). */}
            <div className="mt-8 space-y-5 text-ink-soft">
              <p>
                Mon objectif : capturer les moments précieux de votre vie avec sensibilité et
                authenticité.
              </p>
              <p>
                Que ce soit une grossesse, une naissance, un mariage, une séance en couple, en
                famille ou en portrait individuel, je vous accompagne avec douceur et
                bienveillance, pour créer des souvenirs sincères, fidèles à qui vous êtes.
              </p>
              <p>
                Pas de poses figées ni de sourires forcés : je privilégie le naturel, la
                lumière du quotidien, les éclats de rire, les regards complices, les petits
                gestes qui en disent long. Chaque séance est une rencontre, une histoire à
                raconter à travers mes images.
              </p>
              <p>
                La vie file à toute vitesse. Mon rôle, c'est de mettre sur pause ces instants
                fugaces, pour que vous puissiez les revivre encore et encore, avec émotion et
                tendresse.
              </p>
              <p className="font-display text-lg text-ink italic">Bienvenue dans mon univers !</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/*
        Fond papier (#FAF4E8) plutôt que mist (#EADCC8) ici : cette section
        contient de longs paragraphes de lecture, et #7C644C sur #EADCC8
        tombe à 4.11:1 — sous le seuil AA texte courant (4.5:1). Séparée du
        bloc précédent par une bordure plutôt qu'un aplat de couleur (voir
        note de contraste dans index.css).
      */}
      <section className="border-y border-line bg-paper py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:gap-20 md:px-10">
          <Reveal>
            <div className="text-center">
              <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">Mon approche</p>
              <h2 className="mt-4 text-3xl text-ink md:text-4xl">
                Des images qui vous ressemblent
              </h2>
            </div>
            {/* Paragraphes longs : alignés à gauche (voir consigne alignement). */}
            <div className="mt-6 space-y-5 text-ink-soft">
              <p>
                J'aime créer des images naturelles, spontanées et pleines de vie, qui racontent
                une histoire : la vôtre. Mon approche est simple, humaine et sincère. Je
                privilégie l'authenticité à la mise en scène, l'émotion à la perfection.
              </p>
              <p>
                Que ce soit en famille, en couple, ou en solo, je cherche à révéler ce qui vous
                rend uniques à travers des moments vrais : un regard complice, un éclat de
                rire, une étreinte discrète. Chaque séance devient un moment à vivre pleinement,
                bien plus qu'une simple prise de vue.
              </p>
              <p>
                Mon objectif : créer des images intemporelles qui vous ressemblent, et dans
                lesquelles vous vous reconnaîtrez avec émotion, même des années plus tard.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <img
              src="/images/about/rue-vieux-lille.webp"
              alt="Une jeune femme de dos promène son chien dans une ruelle pavée du Vieux-Lille, lumière d'été."
              className="aspect-[4/5] w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </Reveal>
        </div>
      </section>
      <BookingEndBlock />
    </div>
  )
}

import { Button } from '../Button'

/**
 * Petit mot de Mathilde sous la grille d'une galerie livrée : invitation à
 * laisser un avis Google, sans étoiles ni logo, bouton contour (le bouton
 * plein de la page reste « Tout télécharger »). Lien sortant simple : aucun
 * suivi, aucun paramètre ajouté.
 */
export function ReviewInvite({ reviewUrl }) {
  return (
    <section aria-labelledby="avis-titre" className="mx-auto max-w-xl px-6 pt-14 pb-6 text-center" data-testid="invitation-avis">
      <h2 id="avis-titre" className="text-2xl text-ink md:text-3xl">
        Vous avez aimé votre séance ?
      </h2>
      <p className="mt-3">Votre avis compte beaucoup pour moi, et il aide d’autres familles à me trouver.</p>
      <Button href={reviewUrl} variant="secondary" target="_blank" rel="noopener noreferrer" className="mt-6">
        Laisser un avis sur Google<span className="sr-only"> (nouvel onglet)</span>
      </Button>
    </section>
  )
}

/** Ligne discrète après un téléchargement (une fois par visite), dans la barre du bas. */
export function ReviewNudge({ reviewUrl }) {
  return (
    <p className="review-nudge w-full text-xs italic" data-testid="rappel-avis">
      Et si vous avez deux minutes, un petit avis me ferait très plaisir.{' '}
      <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="not-italic underline underline-offset-4">
        Laisser un avis sur Google<span className="sr-only"> (nouvel onglet)</span>
      </a>
    </p>
  )
}

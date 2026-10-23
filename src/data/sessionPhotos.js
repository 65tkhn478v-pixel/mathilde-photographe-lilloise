// Photos de l'étape 1 de la réservation : uniquement des photos réelles déjà
// présentes sur le site, recadrées en 4:5 (public/images/reserver/, ~400 et
// ~800 px de large). Une photo différente par type.
//
// Portrait : aucune photo réelle d'une personne seule hors grossesse (les
// portraits de la page À propos montrent Mathilde elle-même). En attente d'une
// photo fournie par la cliente : fond de remplacement (null).

export const SESSION_PHOTOS = {
  portrait: null,
  famille: {
    // Recadrage de public/images/hero/hero-famille-chien.webp
    base: '/images/reserver/famille',
    alt: 'Une maman tient son nouveau-né sur ses genoux, le papa penché vers eux et leur chien brun tout près.',
  },
  grossesse: {
    // Recadrage de public/images/portfolio/grossesse/grossesse-03.webp
    base: '/images/reserver/grossesse',
    alt: 'Un couple front contre front, mains jointes, la future maman en débardeur clair dans la lumière d’une fenêtre.',
  },
  naissance: {
    // Recadrage de public/images/portfolio/naissance/naissance-08.webp
    base: '/images/reserver/naissance',
    alt: 'Un papa embrasse le front de son nouveau-né aux yeux grands ouverts, blotti dans ses bras.',
  },
}

// Dissuasion de l'enregistrement des aperçus pendant la sélection (grille,
// visionneuse, couverture, récapitulatif). Aucun navigateur ne bloque les
// captures d'écran : la vraie protection reste le filigrane et la basse
// définition. Ceci retire seulement les gestes « Enregistrer l'image » :
// - CSS (.galerie-protegee, index.css) : pas de menu d'appui long sur iOS,
//   pas de sélection, pas de glisser natif ;
// - menu contextuel (clic droit, appui long Android) et glisser empêchés
//   uniquement quand ils visent une image marquée data-protege. Le toucher
//   simple, le glissement entre photos, le clavier et les boutons ne sont
//   pas touchés. Jamais appliqué après la livraison.

export const PROTECTED_CLASS = 'galerie-protegee'

const onProtectedMedia = (e) => {
  if (e.target instanceof Element && e.target.closest('[data-protege]')) e.preventDefault()
}

/** Gestionnaires à poser sur le conteneur des images protégées (délégation). */
export function protectionHandlers(enabled) {
  return enabled ? { onContextMenu: onProtectedMedia, onDragStart: onProtectedMedia } : {}
}

/** Attributs d'une image protégée (ou de son calque). */
export function protectedMedia(enabled) {
  return enabled ? { 'data-protege': '', draggable: false } : {}
}

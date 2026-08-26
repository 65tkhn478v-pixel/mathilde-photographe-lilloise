/**
 * Icônes de réseaux sociaux (SVG, trait monochrome) — sobres, cohérentes
 * avec la palette blanc/gris du site. Un seul jeu de glyphes minimal,
 * pas d'icône de marque en couleur.
 */

export function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TikTokIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="9.5" cy="16.5" r="3" />
      <path d="M12.5 16.5V4" strokeLinecap="round" />
      <path d="M12.5 6c.8 2 2.5 3.4 4.5 3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PinterestIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path
        d="M9.5 18c.6-2.6 1.4-6.2 1.4-6.2m0 0a2.6 2.6 0 1 1 4.9-1.2c0 1.9-1 4-2.9 4-.8 0-1.4-.4-1.6-.9m-.4-1.9c-.3-1.5.8-2.7 2-2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

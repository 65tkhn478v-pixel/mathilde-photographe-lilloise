import { Link } from 'react-router-dom'
import clsx from 'clsx'

const base =
  'font-label inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-7 py-3.5 text-xs tracking-[0.18em] uppercase transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 md:text-sm'

// La palette café ne fournit qu'une seule teinte de texte/accent (#7C644C) :
// pas de second brun plus sombre pour un hover "couleur sur couleur". Le
// hover du bouton plein se fait donc en opacité plutôt qu'en changement de
// teinte. "inverse" (pour les CTA posés sur une section/photo sombre) est
// un variant à part entière plutôt qu'une className de substitution : deux
// jeux de classes bg-*/text-* concurrents dans un même élément dépendent de
// l'ordre de génération Tailwind, pas de l'ordre dans le JSX — les définir
// dans un seul variant évite tout conflit silencieux.
const variants = {
  primary: 'border border-ink bg-ink text-paper hover:opacity-90',
  secondary: 'border border-ink/40 text-ink hover:border-ink hover:bg-ink hover:text-paper',
  ghost: 'text-paper border border-paper/70 hover:border-paper hover:bg-paper/10',
  inverse: 'border border-paper bg-paper text-ink hover:bg-mist',
}

/**
 * Bouton/lien unique pour tout le site — pas de composant shadcn brut non
 * adapté : radius discret, pas d'ombre, pas de dégradé (voir DESIGN SYSTEM).
 */
export function Button({ to, href, variant = 'primary', className, children, ...props }) {
  const classes = clsx(base, variants[variant], className)

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}

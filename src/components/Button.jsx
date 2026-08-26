import { Link } from 'react-router-dom'
import clsx from 'clsx'

const base =
  'font-label inline-flex items-center justify-center gap-2 rounded-sm px-7 py-3.5 text-sm tracking-wide uppercase transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4'

const variants = {
  primary: 'bg-ink text-paper hover:bg-accent',
  secondary: 'border border-ink/40 text-ink hover:border-ink hover:bg-ink hover:text-paper',
  ghost: 'text-paper border border-paper/70 hover:border-paper hover:bg-paper/10',
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

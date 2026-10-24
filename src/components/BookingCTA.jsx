import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { sessionLabel } from '../../shared/booking.js'

// Mêmes styles que Button (src/components/Button.jsx), pour que le CTA de
// réservation ait partout le même libellé et le même aspect.
const base =
  'font-label inline-flex min-h-11 items-center justify-center gap-2 rounded-sm text-xs tracking-[0.18em] uppercase transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 md:text-sm'

const variants = {
  // Bouton plein : un seul visible par écran (règle de hiérarchie du site).
  solid: 'border border-ink bg-ink px-7 py-3.5 text-paper hover:opacity-90',
  // Plein clair, sur photo ou fond sombre (hero, bandeau de fin).
  inverse: 'border border-paper bg-paper px-7 py-3.5 text-ink hover:bg-mist',
  // Contour : quand plusieurs liens de réservation sont visibles ensemble.
  outline: 'border border-ink/40 px-5 py-3 text-ink hover:border-ink hover:bg-ink hover:text-paper',
  // Barre mobile : plein, plus compact, toute la largeur.
  compact: 'w-full border border-ink bg-ink px-4 py-3 text-paper hover:opacity-90',
}
const SOLID = ['solid', 'inverse', 'compact']

function bookingHref(seance) {
  return seance ? `/reserver?seance=${seance}` : '/reserver'
}

/**
 * Lien de réservation unique du site. Libellé « Réserver une séance » ; avec
 * un type de séance connu, le lien présélectionne ce type et le libellé le
 * précise (« Réserver une séance grossesse »), sauf `label` explicite.
 */
export function BookingCTA({ seance, label, variant = 'solid', className, children, ...props }) {
  const text = label ?? (seance ? `Réserver une séance ${sessionLabel(seance).toLowerCase()}` : 'Réserver une séance')
  return (
    <Link
      to={bookingHref(seance)}
      data-cta="booking"
      data-variant={SOLID.includes(variant) ? 'solid' : 'outline'}
      className={clsx(base, variants[variant], className)}
      {...props}
    >
      {children ?? text}
    </Link>
  )
}

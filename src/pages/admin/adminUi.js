import clsx from 'clsx'

// Boutons de l'admin : même famille que Button (Playfair, capitales,
// radius discret), plus compacts, cibles tactiles ≥ 44px.
const base =
  'font-label inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-4 text-xs tracking-[0.12em] uppercase transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  solid: 'border-ink bg-ink text-paper hover:opacity-90',
  outline: 'border-ink/40 text-ink hover:border-ink',
  quiet: 'border-transparent px-2 text-ink underline underline-offset-4 hover:no-underline',
  // Actions de statut : seules exceptions où la palette de statut sert à un bouton.
  confirm: 'border-confirmed bg-confirmed text-paper hover:opacity-90',
  decline: 'border-declined text-declined hover:bg-declined-bg',
}

export const adminButton = (variant = 'outline', className) => clsx(base, variants[variant], className)

// Champs : mêmes styles que le formulaire de contact (filet bas, fond transparent).
export const inputClasses =
  'mt-2 w-full border-0 border-b border-ink/25 bg-transparent px-0 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'

export const labelClasses = 'block text-sm text-ink'

/**
 * Gestion commune des erreurs d'API dans les onglets : une session expirée
 * renvoie à la connexion (null), sinon le message à afficher.
 */
export function apiErrorMessage(err, onExpired) {
  if (err?.status === 401) {
    onExpired()
    return null
  }
  return err?.message ?? 'Une erreur est survenue.'
}

// Messages de retour après une action sur une demande.
export const FEEDBACK = {
  confirm: { message: 'Séance confirmée', tone: 'confirmed', status: 'confirmed' },
  decline: { message: 'Demande refusée, le créneau est de nouveau libre', tone: 'declined', status: 'declined' },
  delete: { message: 'Demande supprimée', tone: 'neutral', status: null },
}

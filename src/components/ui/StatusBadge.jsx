import clsx from 'clsx'

// Icônes de statut : SVG inline, trait fin (1.5) comme les icônes du footer.
// Une icône par statut, toujours la même.
const paths = {
  check: <path d="M4.5 10.5l3.5 3.5 7.5-8" />,
  clock: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4.25l2.75 1.75" />
    </>
  ),
  cross: <path d="M6 6l8 8M14 6l-8 8" />,
  lock: (
    <>
      <rect x="5" y="9" width="10" height="7.5" rx="1" />
      <path d="M7.5 9V7a2.5 2.5 0 015 0v2" />
    </>
  ),
  download: (
    <>
      <path d="M10 4v8.5M6.5 9.5L10 13l3.5-3.5" />
      <path d="M4.5 15.5h11" />
    </>
  ),
  draft: <path d="M5 15h3l7-7-3-3-7 7v3z" />,
  heart: <path d="M10 16s-5.5-3.4-5.5-7.3A2.9 2.9 0 0110 7a2.9 2.9 0 015.5 1.7C15.5 12.6 10 16 10 16z" />,
}

export function StatusIcon({ name, className }) {
  if (!paths[name]) return null
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx('h-3.5 w-3.5 shrink-0', className)}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

// Statut = couleur dédiée + icône + libellé (jamais la couleur seule).
const STATUSES = {
  confirmed: {
    label: 'Confirmée',
    icon: 'check',
    badge: 'border-confirmed-line bg-confirmed-bg text-confirmed',
  },
  pending: {
    label: 'En attente',
    icon: 'clock',
    badge: 'border-pending-line bg-pending-bg text-pending',
  },
  declined: {
    label: 'Refusée',
    icon: 'cross',
    badge: 'border-declined-line bg-declined-bg text-declined',
  },
  open: { label: 'Libre', icon: null, badge: 'border-structure bg-transparent text-ink' },
  closed: { label: 'Fermé', icon: 'lock', badge: 'border-dashed border-structure bg-closed-bg text-ink' },
  past: { label: 'Passé', icon: null, badge: 'border-transparent bg-transparent text-ink italic' },
  // Galeries clients
  gallery_draft: { label: 'Brouillon', icon: 'draft', badge: 'border-structure bg-paper text-ink' },
  gallery_selection_open: { label: 'Sélection ouverte', icon: 'clock', badge: 'border-pending-line bg-pending-bg text-pending' },
  gallery_selection_validated: {
    label: 'Sélection validée',
    icon: 'check',
    badge: 'border-confirmed-line bg-confirmed-bg text-confirmed',
  },
  gallery_delivered: { label: 'Livrée', icon: 'download', badge: 'border-confirmed-line bg-confirmed-bg text-confirmed' },
  gallery_expired: { label: 'Expirée', icon: 'lock', badge: 'border-dashed border-structure bg-closed-bg text-ink' },
}

/**
 * Badge de statut unique (client et admin). `children` remplace le libellé
 * quand il faut un compteur (ex. « 2 en attente »).
 */
export function StatusBadge({ state, className, children }) {
  const config = STATUSES[state] ?? STATUSES.open
  return (
    <span
      className={clsx(
        'font-label inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs tracking-[0.1em] whitespace-nowrap uppercase transition-colors duration-200',
        config.badge,
        className
      )}
    >
      <StatusIcon name={config.icon} />
      {children ?? config.label}
    </span>
  )
}

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

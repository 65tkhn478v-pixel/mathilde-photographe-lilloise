import clsx from 'clsx'

function AlertIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 5.5v5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" />
    </svg>
  )
}

/**
 * Message d'erreur ou d'information, sans rouge hors palette : texte
 * explicite #7C644C sur fond clair, icône sobre et filet caramel.
 */
export function Notice({ tone = 'info', className, children, action }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx('flex gap-3 border-l-2 border-structure bg-paper py-3 pr-3 pl-4 text-sm text-ink', className)}
    >
      {tone === 'error' && <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        {children}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

/** Erreur de champ de formulaire, liée au champ via aria-describedby. */
export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-sm text-ink">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function Loading({ children = 'Chargement…', className }) {
  return (
    <p role="status" className={clsx('py-10 text-center text-sm text-ink italic', className)}>
      {children}
    </p>
  )
}

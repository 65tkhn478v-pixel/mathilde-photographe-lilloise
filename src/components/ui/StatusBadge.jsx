import clsx from 'clsx'

// États lisibles par leur texte (pas seulement la couleur). Aucune nouvelle
// couleur : #7C644C (texte) sur #FAF4E8, ou l'inverse pour « En attente ».
const STATES = {
  open: { label: 'Ouvert', className: 'border border-structure text-ink bg-paper' },
  pending: { label: 'En attente', className: 'border border-ink bg-ink text-paper' },
  confirmed: { label: 'Confirmé', className: 'border border-ink text-ink bg-paper', mark: '✓ ' },
  declined: { label: 'Refusé', className: 'border border-dashed border-structure text-ink bg-paper' },
  closed: { label: 'Fermé', className: 'border border-dashed border-structure text-ink bg-paper' },
  past: { label: 'Passé', className: 'border border-transparent text-ink italic bg-paper' },
}

// Une demande est féminine : « Confirmée », « Refusée ».
const FEMININE = { confirmed: 'Confirmée', declined: 'Refusée' }

export function StatusBadge({ state, feminine = false, className }) {
  const config = STATES[state] ?? STATES.open
  const label = (feminine && FEMININE[state]) || config.label
  return (
    <span
      className={clsx(
        'font-label inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-[0.7rem] tracking-[0.12em] whitespace-nowrap uppercase',
        config.className,
        className
      )}
    >
      {config.mark && <span aria-hidden="true">{config.mark}</span>}
      {label}
    </span>
  )
}

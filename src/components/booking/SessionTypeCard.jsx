import * as RadioGroup from '@radix-ui/react-radio-group'
import clsx from 'clsx'
import { StatusIcon } from '../ui/StatusBadge'
import { SessionPhoto } from './SessionPhoto'

/**
 * Carte photo sélectionnable (étape 1), item d'un Radix RadioGroup.
 * Choisie : filet moka épais + pastille coche ; les autres sont atténuées
 * (photo seulement, le libellé garde son contraste).
 */
export function SessionTypeCard({ type, label, selected, dimmed }) {
  return (
    <RadioGroup.Item
      value={type}
      aria-labelledby={`session-${type}`}
      className="group block w-full text-left focus-visible:outline-offset-4"
    >
      <span
        className={clsx(
          'relative block overflow-hidden rounded-sm border-2 transition-[border-color,opacity] duration-150',
          selected ? 'border-ink' : 'border-transparent group-hover:border-structure'
        )}
      >
        <SessionPhoto
          type={type}
          className={clsx('block w-full transition-opacity duration-150', dimmed && 'opacity-55')}
        />
        {selected && (
          <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper">
            <StatusIcon name="check" className="h-4 w-4" />
          </span>
        )}
      </span>
      <span
        id={`session-${type}`}
        className={clsx(
          'font-display mt-2 block text-xl md:text-2xl',
          selected ? 'underline decoration-1 underline-offset-[0.3em]' : ''
        )}
      >
        {label}
      </span>
    </RadioGroup.Item>
  )
}

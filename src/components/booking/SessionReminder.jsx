import { sessionLabel } from '../../../shared/booking.js'
import { SessionPhoto } from './SessionPhoto'

/** Rappel du type choisi : petite vignette + libellé (+ lien « Modifier »). */
export function SessionReminder({ type, onEdit, children }) {
  return (
    <div className="flex items-center gap-4">
      <SessionPhoto type={type} decorative sizes="56px" className="w-14 shrink-0 rounded-sm text-sm [&>span]:text-sm" />
      <div className="min-w-0 flex-1">
        <p className="font-label text-xs tracking-[0.15em] uppercase">Séance</p>
        <p className="font-display text-xl text-ink">{sessionLabel(type)}</p>
        {children}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 shrink-0 px-1 text-sm underline underline-offset-4 hover:text-accent"
        >
          Modifier<span className="sr-only"> la séance</span>
        </button>
      )}
    </div>
  )
}

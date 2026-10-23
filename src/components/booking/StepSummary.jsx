import { sessionLabel } from '../../../shared/booking.js'
import { formatDayFull, formatRange } from '../../../shared/time.js'
import { Button } from '../Button'
import { Notice } from '../ui/Notice'
import { StepHeading } from './shared'

function Row({ label, children, onEdit, editLabel }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 py-4 sm:grid-cols-[10rem_1fr_auto]">
      <dt className="font-label col-span-2 text-xs tracking-[0.15em] uppercase sm:col-span-1 sm:pt-1">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-ink sm:mt-0">{children}</dd>
      {onEdit ? (
        <dd className="row-start-2 self-start sm:row-start-auto">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 px-1 text-sm underline underline-offset-4 hover:text-accent sm:min-h-0"
          >
            Modifier<span className="sr-only"> : {editLabel}</span>
          </button>
        </dd>
      ) : (
        <dd className="row-start-2 sm:row-start-auto" />
      )}
    </div>
  )
}

export function StepSummary({ sessionType, slot, details, onEdit, onSubmit, submitting, error, focusOnMount }) {
  return (
    <div>
      <StepHeading focusOnMount={focusOnMount}>Récapitulatif</StepHeading>

      <dl className="mt-8 divide-y divide-line border-y border-line">
        <Row label="Séance" onEdit={() => onEdit(1)} editLabel="la séance">
          {sessionLabel(sessionType)}
        </Row>
        <Row label="Date et horaire" onEdit={() => onEdit(2)} editLabel="le créneau">
          <span className="block first-letter:uppercase">{formatDayFull(slot.start_at)}</span>
          {formatRange(slot.start_at, slot.end_at)}
        </Row>
        <Row label="Vos coordonnées" onEdit={() => onEdit(3)} editLabel="vos coordonnées">
          {details.first_name} {details.last_name}
          <br />
          <span className="break-all">{details.email}</span>
          <br />
          {details.phone || <span className="italic">Téléphone non renseigné</span>}
        </Row>
        <Row label="Message" onEdit={() => onEdit(3)} editLabel="votre message">
          {details.message ? (
            <span className="whitespace-pre-line">{details.message}</span>
          ) : (
            <span className="italic">Aucun message</span>
          )}
        </Row>
      </dl>

      <div aria-live="polite">{error && <Notice tone="error" className="mt-6">{error}</Notice>}</div>

      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="secondary" onClick={() => onEdit(3)}>
          Retour
        </Button>
        <Button type="button" onClick={onSubmit} disabled={submitting} aria-busy={submitting}>
          {submitting ? 'Envoi en cours…' : 'Envoyer ma demande'}
        </Button>
      </div>
    </div>
  )
}

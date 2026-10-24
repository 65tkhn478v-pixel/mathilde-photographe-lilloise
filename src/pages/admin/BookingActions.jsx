import { useState } from 'react'
import { api } from '../../lib/api'
import { copyText } from '../../lib/clipboard'
import { contactText, instagramHref, replyMailto, telHref } from '../../lib/contact'
import { sessionLabel } from '../../../shared/booking.js'
import { formatDayLong, formatRange } from '../../../shared/time.js'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Notice } from '../../components/ui/Notice'
import { StatusIcon } from '../../components/ui/StatusBadge'
import { adminButton, apiErrorMessage } from './adminUi'


/**
 * Actions sur une demande (onglet Demandes et détail d'un jour du calendrier).
 * `onDone(action, booking)` est appelé après succès côté serveur.
 */
export function BookingActions({ booking, onDone, onExpired, compact = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const name = `${booking.first_name} ${booking.last_name}`
  const when = `${formatDayLong(booking.slot.start_at)}, ${formatRange(booking.slot.start_at, booking.slot.end_at)}`

  const run = async (action) => {
    setBusy(true)
    setError(null)
    try {
      if (action === 'delete') await api(`/api/admin/bookings/${booking.id}`, { method: 'DELETE' })
      else await api(`/api/admin/bookings/${booking.id}/${action}`, { method: 'POST' })
      onDone(action, booking)
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    setCopied((await copyText(contactText(booking))) ? 'Coordonnées copiées.' : 'Copie impossible sur cet appareil.')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <a href={replyMailto(booking)} className={adminButton('outline')}>
          Écrire
        </a>
        {booking.phone && (
          <a href={telHref(booking.phone)} className={adminButton('outline')}>
            Appeler
          </a>
        )}
        {booking.instagram && (
          <a href={instagramHref(booking.instagram)} target="_blank" rel="noreferrer" className={adminButton('outline')}>
            Instagram<span className="sr-only"> (nouvel onglet)</span>
          </a>
        )}
        {!compact && (
          <button type="button" className={adminButton('outline')} onClick={copy}>
            Copier les coordonnées
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {booking.status === 'pending' && (
          <ConfirmDialog
            title="Confirmer cette séance ?"
            description={`${name} — ${sessionLabel(booking.session_type)}, ${when}. Aucun mail n’est envoyé automatiquement : pensez à prévenir ${booking.first_name}.`}
            confirmLabel="Confirmer"
            onConfirm={() => run('confirm')}
            trigger={
              <button type="button" disabled={busy} className={adminButton('confirm')}>
                <StatusIcon name="check" className="h-4 w-4" />
                Confirmer
              </button>
            }
          />
        )}
        {booking.status !== 'declined' && (
          <ConfirmDialog
            title="Refuser cette demande ?"
            description={`Le créneau du ${when} redeviendra libre pour les autres clients. Aucun mail n’est envoyé automatiquement.`}
            confirmLabel="Refuser"
            onConfirm={() => run('decline')}
            trigger={
              <button type="button" disabled={busy} className={adminButton('decline')}>
                <StatusIcon name="cross" className="h-4 w-4" />
                Refuser
              </button>
            }
          />
        )}
        {!compact && (
          <ConfirmDialog
            title="Supprimer définitivement ?"
            description={`Toutes les informations de ${name} pour cette demande seront effacées, sans retour possible.${
              booking.status !== 'declined' ? ' Le créneau redeviendra libre.' : ''
            }`}
            confirmLabel="Supprimer"
            onConfirm={() => run('delete')}
            trigger={
              <button type="button" disabled={busy} className={adminButton('quiet')}>
                Supprimer
              </button>
            }
          />
        )}
      </div>

      <div aria-live="polite">
        {copied && <p className="mt-2 text-sm italic">{copied}</p>}
        {error && (
          <Notice tone="error" className="mt-3">
            {error}
          </Notice>
        )}
      </div>
    </div>
  )
}

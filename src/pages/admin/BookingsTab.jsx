import { useState } from 'react'
import { api } from '../../lib/api'
import { useApiData } from '../../lib/useApiData'
import { copyText } from '../../lib/clipboard'
import { replyMailto, telHref } from '../../lib/mailto'
import { sessionLabel } from '../../../shared/booking.js'
import { formatDateTime, formatDayLong, formatRange } from '../../../shared/time.js'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Loading, Notice } from '../../components/ui/Notice'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { adminButton, apiErrorMessage } from './adminUi'

export function BookingsTab({ onExpired, onPendingCount }) {
  const { data, error: loadError, reload: load } = useApiData('/api/admin/bookings', {
    onData: (result) => onPendingCount(result.pending_count),
    onError: (err) => apiErrorMessage(err, onExpired),
  })
  const error = loadError?.status === 401 ? null : loadError?.message

  if (error && !data) {
    return (
      <Notice
        tone="error"
        action={
          <button type="button" className={adminButton('outline')} onClick={load}>
            Réessayer
          </button>
        }
      >
        {error}
      </Notice>
    )
  }
  if (!data) return <Loading />

  const empty = !data.pending.length && !data.confirmed.length && !data.declined.length

  return (
    <div className="space-y-10">
      {error && <Notice tone="error">{error}</Notice>}
      {empty && (
        <Notice>
          Aucune demande pour le moment. Les demandes des clients apparaîtront ici dès qu’ils auront choisi un de
          vos créneaux.
        </Notice>
      )}
      <Section title="En attente" items={data.pending} onChanged={load} onExpired={onExpired} />
      <Section title="Confirmées à venir" items={data.confirmed} onChanged={load} onExpired={onExpired} />
      <Section title="Refusées récemment" items={data.declined} onChanged={load} onExpired={onExpired} />
    </div>
  )
}

function Section({ title, items, onChanged, onExpired }) {
  if (!items.length) return null
  return (
    <section aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="text-2xl text-ink">
        {title} <span className="text-base">({items.length})</span>
      </h2>
      <ul className="mt-4 grid gap-4 lg:grid-cols-2">
        {items.map((booking) => (
          <BookingCard key={booking.id} booking={booking} onChanged={onChanged} onExpired={onExpired} />
        ))}
      </ul>
    </section>
  )
}

function BookingCard({ booking, onChanged, onExpired }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const name = `${booking.first_name} ${booking.last_name}`
  const when = `${formatDayLong(booking.slot.start_at)}, ${formatRange(booking.slot.start_at, booking.slot.end_at)}`

  const run = async (path, method = 'POST') => {
    setBusy(true)
    setError(null)
    try {
      await api(path, { method })
      await onChanged()
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) setError(message)
      setBusy(false)
    }
  }

  const copy = async () => {
    const lines = [name, booking.email, booking.phone].filter(Boolean)
    setCopied((await copyText(lines.join('\n'))) ? 'Coordonnées copiées.' : 'Copie impossible sur cet appareil.')
  }

  return (
    <li className="border border-line bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-label text-xs tracking-[0.15em] uppercase">{sessionLabel(booking.session_type)}</p>
          <p className="font-display mt-1 text-xl">{when}</p>
        </div>
        <StatusBadge state={booking.status} feminine />
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="italic">Nom</dt>
        <dd className="min-w-0">{name}</dd>
        <dt className="italic">Email</dt>
        <dd className="min-w-0 break-all">
          <a href={`mailto:${booking.email}`} className="underline underline-offset-4">
            {booking.email}
          </a>
        </dd>
        <dt className="italic">Téléphone</dt>
        <dd className="min-w-0">
          {booking.phone ? (
            <a href={telHref(booking.phone)} className="underline underline-offset-4">
              {booking.phone}
            </a>
          ) : (
            'non renseigné'
          )}
        </dd>
      </dl>

      {booking.message && (
        <p className="mt-3 border-l-2 border-line pl-3 text-sm break-words whitespace-pre-line">{booking.message}</p>
      )}

      <p className="mt-3 text-xs">
        Demande du {formatDateTime(booking.created_at)} · Réf. <span className="font-sans tracking-wider">{booking.reference}</span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={replyMailto(booking)} className={adminButton('outline')}>
          Écrire
        </a>
        {booking.phone && (
          <a href={telHref(booking.phone)} className={adminButton('outline')}>
            Appeler
          </a>
        )}
        <button type="button" className={adminButton('outline')} onClick={copy}>
          Copier les coordonnées
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {booking.status === 'pending' && (
          <ConfirmDialog
            title="Confirmer cette demande ?"
            description={`${name} — ${sessionLabel(booking.session_type)}, ${when}. Aucun mail n’est envoyé automatiquement : pensez à prévenir ${booking.first_name}.`}
            confirmLabel="Confirmer"
            onConfirm={() => run(`/api/admin/bookings/${booking.id}/confirm`)}
            trigger={
              <button type="button" disabled={busy} className={adminButton('solid')}>
                Confirmer
              </button>
            }
          />
        )}
        {booking.status !== 'declined' && (
          <ConfirmDialog
            title="Refuser cette demande ?"
            description={`Le créneau du ${when} redeviendra disponible pour les autres clients. Aucun mail n’est envoyé automatiquement.`}
            confirmLabel="Refuser"
            onConfirm={() => run(`/api/admin/bookings/${booking.id}/decline`)}
            trigger={
              <button type="button" disabled={busy} className={adminButton('outline')}>
                Refuser
              </button>
            }
          />
        )}
        <ConfirmDialog
          title="Supprimer définitivement ?"
          description={`Toutes les informations de ${name} pour cette demande seront effacées, sans retour possible.${
            booking.status !== 'declined' ? ' Le créneau redeviendra disponible.' : ''
          }`}
          confirmLabel="Supprimer"
          onConfirm={() => run(`/api/admin/bookings/${booking.id}`, 'DELETE')}
          trigger={
            <button type="button" disabled={busy} className={adminButton('quiet')}>
              Supprimer
            </button>
          }
        />
      </div>

      <div aria-live="polite">
        {copied && <p className="mt-2 text-xs italic">{copied}</p>}
        {error && <Notice tone="error" className="mt-3">{error}</Notice>}
      </div>
    </li>
  )
}

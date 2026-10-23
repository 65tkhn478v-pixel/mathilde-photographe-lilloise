import { useState } from 'react'
import { api } from '../../lib/api'
import { useApiData } from '../../lib/useApiData'
import { RETENTION_MONTHS, sessionLabel } from '../../../shared/booking.js'
import { formatDayFull, formatRange } from '../../../shared/time.js'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Loading, Notice } from '../../components/ui/Notice'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { adminButton, apiErrorMessage } from './adminUi'

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

export function HistoryTab({ onExpired }) {
  const { data, error: loadError, reload: load } = useApiData('/api/admin/history', {
    onError: (err) => apiErrorMessage(err, onExpired),
  })
  const [purgeError, setError] = useState(null)
  const [purgeResult, setPurgeResult] = useState(null)
  const error = purgeError ?? (loadError?.status === 401 ? null : loadError?.message)

  const purge = async () => {
    setPurgeResult(null)
    try {
      const result = await api('/api/admin/purge', { method: 'POST' })
      setPurgeResult(
        result.deleted_bookings === 0
          ? 'Aucune demande à supprimer.'
          : `${plural(result.deleted_bookings, 'demande')} supprimée${result.deleted_bookings > 1 ? 's' : ''}.`
      )
      load()
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) setError(message)
    }
  }

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

  return (
    <div className="space-y-8">
      <section className="border border-line p-4 sm:p-5" aria-labelledby="purge-title">
        <h2 id="purge-title" className="text-xl text-ink">
          Données anciennes
        </h2>
        <p className="mt-2 text-sm">
          Les demandes sont conservées {RETENTION_MONTHS} mois après la date de la séance, comme indiqué dans les
          mentions légales. {data.purgeable > 0
            ? `${plural(data.purgeable, 'demande')} dépasse${data.purgeable > 1 ? 'nt' : ''} cette durée.`
            : 'Aucune demande ne dépasse cette durée.'}
        </p>
        <div className="mt-4">
          <ConfirmDialog
            title={`Supprimer les demandes de plus de ${RETENTION_MONTHS} mois ?`}
            description={`Les demandes dont la séance date de plus de ${RETENTION_MONTHS} mois seront effacées définitivement.`}
            confirmLabel="Supprimer"
            onConfirm={purge}
            trigger={
              <button type="button" className={adminButton('outline')}>
                Supprimer les demandes de plus de {RETENTION_MONTHS} mois
              </button>
            }
          />
        </div>
        <div aria-live="polite">
          {purgeResult && <p className="mt-3 text-sm italic">{purgeResult}</p>}
          {error && <Notice tone="error" className="mt-3">{error}</Notice>}
        </div>
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="text-2xl text-ink">
          Créneaux passés
        </h2>
        {data.slots.length === 0 ? (
          <p className="mt-4 text-sm italic">Aucun créneau passé pour le moment.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {data.slots.map((slot) => (
              <li key={slot.id} className="py-3 sm:grid sm:grid-cols-[16rem_1fr] sm:gap-4">
                <p className="text-sm">
                  {capitalize(formatDayFull(slot.start_at))}
                  <br />
                  {formatRange(slot.start_at, slot.end_at)}
                </p>
                {slot.bookings.length === 0 ? (
                  <p className="mt-1 text-sm italic sm:mt-0">{slot.closed ? 'Fermé, sans demande' : 'Sans demande'}</p>
                ) : (
                  <ul className="mt-2 space-y-2 sm:mt-0">
                    {slot.bookings.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <StatusBadge state={b.status} />
                        <span>
                          {b.first_name} {b.last_name} — {sessionLabel(b.session_type)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

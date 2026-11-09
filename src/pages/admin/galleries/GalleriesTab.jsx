import { useState } from 'react'
import clsx from 'clsx'
import { useApiData } from '../../../lib/useApiData'
import { Loading, Notice } from '../../../components/ui/Notice'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { adminButton, apiErrorMessage } from '../adminUi'
import { GalleryCreate } from './GalleryCreate'
import { GalleryDetail } from './GalleryDetail'
import { lastDayLabel, nextStep, shootLabel, statusBadge, typeLabel } from './galleryText'

const FILTERS = [
  { value: 'current', label: 'En cours', match: (g) => ['draft', 'selection_open', 'selection_validated'].includes(g.status) },
  { value: 'delivered', label: 'Livrées', match: (g) => g.status === 'delivered' },
  { value: 'expired', label: 'Expirées', match: (g) => g.status === 'expired' },
]

/** Onglet « Galeries » : liste, création, détail. */
export function GalleriesTab({ onExpired, onFeedback, onGalleryCount }) {
  // view : { name: 'list' } | { name: 'create' } | { name: 'detail', id, code? }
  const [view, setView] = useState({ name: 'list' })
  const [filter, setFilter] = useState('current')
  const { data, error, reload } = useApiData(view.name === 'list' ? '/api/admin/galleries' : null, {
    onData: (result) => onGalleryCount(result.to_retouch),
    onError: (err) => apiErrorMessage(err, onExpired),
  })

  if (view.name === 'create') {
    return (
      <GalleryCreate
        onExpired={onExpired}
        onCancel={() => setView({ name: 'list' })}
        onCreated={(gallery, code) => setView({ name: 'detail', id: gallery.id, code })}
      />
    )
  }
  if (view.name === 'detail') {
    return (
      <GalleryDetail
        id={view.id}
        initialCode={view.code}
        onBack={() => setView({ name: 'list' })}
        onExpired={onExpired}
        onFeedback={onFeedback}
      />
    )
  }

  const galleries = data?.galleries ?? []
  const current = FILTERS.find((f) => f.value === filter)
  const shown = galleries.filter(current.match)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrer les galeries" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                'font-label min-h-11 rounded-sm border px-3 text-xs tracking-[0.12em] uppercase',
                filter === f.value ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink hover:border-structure'
              )}
            >
              {f.label} <span className="ml-1">({galleries.filter(f.match).length})</span>
            </button>
          ))}
        </div>
        <button type="button" className={adminButton('solid')} onClick={() => setView({ name: 'create' })}>
          + Nouvelle galerie
        </button>
      </div>

      {error && !data && (
        <Notice
          tone="error"
          action={
            <button type="button" className={adminButton('outline')} onClick={reload}>
              Réessayer
            </button>
          }
        >
          {error.message}
        </Notice>
      )}
      {!data && !error && <Loading />}
      {data && shown.length === 0 && (
        <p className="py-8 text-sm italic">
          {filter === 'current' ? 'Aucune galerie en cours. Créez-en une après votre prochaine séance.' : 'Aucune galerie ici.'}
        </p>
      )}

      <ul className="divide-y divide-line border-y border-line">
        {shown.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => setView({ name: 'detail', id: g.id })}
              className="flex w-full items-center gap-4 py-4 text-left hover:bg-mist/30"
            >
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-mist">
                {g.cover_id && (
                  <img
                    src={`/api/admin/galleries/${g.id}/photos/${g.cover_id}/thumb`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-display text-xl text-ink">{g.client_name}</span>
                  <StatusBadge state={statusBadge(g.status)} />
                </span>
                <span className="mt-1 block text-sm">
                  {typeLabel(g.session_type)} · {shootLabel(g.shoot_date)} ·{' '}
                  {g.counts.selected} / {g.included_count} sélectionnées
                </span>
                <span className="mt-0.5 block text-sm italic">{nextStep(g)}</span>
                <span className="mt-0.5 block text-xs">
                  {g.status === 'delivered' || g.status === 'expired'
                    ? `Suppression le ${lastDayLabel(g.purge_at)}`
                    : `Date limite ${lastDayLabel(g.selection_deadline)} · suppression le ${lastDayLabel(g.purge_at)}`}
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

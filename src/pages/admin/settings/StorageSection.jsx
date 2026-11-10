import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import clsx from 'clsx'
import { api } from '../../../lib/api'
import { useApiData } from '../../../lib/useApiData'
import { addDays, dateKey, formatKeyLong } from '../../../../shared/time.js'
import { GB } from '../../../../shared/settings.js'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { FieldError, Loading, Notice } from '../../../components/ui/Notice'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { adminButton, apiErrorMessage, inputClasses, labelClasses } from '../adminUi'
import { DeleteGalleryDialog } from '../galleries/GalleryDetail'
import { lastDayKey, lastDayLabel, statusBadge, typeLabel } from '../galleries/galleryText'
import { formatBytes } from './bytes'

const FILTERS = [
  { value: 'all', label: 'Toutes', match: () => true },
  { value: 'delivered', label: 'Livrées', match: (g) => g.status === 'delivered' },
  { value: 'expired', label: 'Expirées', match: (g) => g.status === 'expired' },
]
const SOON_DAYS = 7

/** Jauge : place utilisée sur les 10 Go inclus, couleurs de la palette de statuts. */
export function StorageGauge({ summary }) {
  const { total, included_bytes: included, unknown_files: unknown } = summary
  const ratio = total.all / included
  const tone = ratio > 1 ? 'over' : ratio >= 0.8 ? 'near' : 'ok'
  return (
    <div data-testid="jauge" data-tone={tone}>
      <p className="text-lg text-ink">
        <strong className="font-normal">{formatBytes(total.all)}</strong> utilisés sur {included / GB} Go inclus
      </p>
      <div
        role="progressbar"
        aria-label="Stockage utilisé"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuetext={`${formatBytes(total.all)} sur ${included / GB} Go`}
        className="mt-3 h-1.5 w-full bg-mist"
      >
        <div
          className={clsx('h-full', tone === 'ok' && 'bg-ink', tone === 'near' && 'bg-pending', tone === 'over' && 'bg-declined')}
          style={{ width: `${Math.min(100, Math.max(ratio * 100, total.all > 0 ? 0.5 : 0))}%` }}
        />
      </div>
      {tone === 'near' && <p className="mt-2 text-sm text-pending">Bientôt plein : pensez à faire un peu de tri</p>}
      {tone === 'over' && (
        <p className="mt-2 text-sm text-declined">Au-delà de 10 Go, le stockage devient payant (environ 0,015 $ par Go et par mois)</p>
      )}
      <p className="mt-3 text-sm">
        Aperçus de sélection : {formatBytes(total.proofs)} · Photos finales : {formatBytes(total.finals)}
      </p>
      {unknown > 0 && (
        <p className="mt-1 text-xs italic">
          Taille non enregistrée pour {unknown} fichier{unknown > 1 ? 's' : ''} déposé{unknown > 1 ? 's' : ''} avant cette page :
          « Vérifier sur le serveur » la complète.
        </p>
      )}
      <p className="mt-1 text-xs italic">Les 10 Go inclus concernent tout le compte Cloudflare.</p>
    </div>
  )
}

/** Avancer la suppression automatique : date antérieure à l'actuelle, jamais dans le passé. */
function AdvanceDialog({ gallery, onDone, onExpired }) {
  const today = dateKey(new Date())
  const latest = addDays(lastDayKey(gallery.purge_at), -1)
  const [date, setDate] = useState(today)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/galleries/${gallery.id}/advance-purge`, { method: 'POST', body: { date } })
      setOpen(false)
      onDone(`Suppression avancée au ${formatKeyLong(date).replace(/^./, (c) => c.toLowerCase())}`)
    } catch (err) {
      const message = err.data?.errors?.date ?? apiErrorMessage(err, onExpired)
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        setError(null)
        setDate(today)
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className={adminButton('outline')} disabled={latest < today}>
          Avancer la suppression
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md border border-line bg-paper p-6 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
          <Dialog.Title className="font-display text-2xl text-ink">Avancer la suppression</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm text-ink">
            {gallery.client_name} : suppression prévue le {lastDayLabel(gallery.purge_at)}. Libère {formatBytes(gallery.total_bytes)} à la
            nouvelle date (photos, sélection et accès du client effacés ce jour-là).
          </Dialog.Description>
          <form onSubmit={submit} noValidate>
            <label className={clsx(labelClasses, 'mt-4')}>
              Nouvelle date de suppression
              <input
                type="date"
                required
                min={today}
                max={latest}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? `avance-erreur-${gallery.id}` : undefined}
                className={inputClasses}
              />
            </label>
            <div aria-live="polite">
              <FieldError id={`avance-erreur-${gallery.id}`}>{error}</FieldError>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" className={adminButton('outline')}>
                  Annuler
                </button>
              </Dialog.Close>
              <button type="submit" disabled={busy || !date} className={adminButton('solid')}>
                Avancer
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function GalleryRow({ g, onChanged, onExpired, onFeedback }) {
  const canClear = g.status === 'delivered' && g.proof_files > 0
  const clear = async () => {
    try {
      const result = await api(`/api/admin/galleries/${g.id}/clear-proofs`, { method: 'POST' })
      onFeedback({ message: `${formatBytes(result.freed_bytes)} libérés`, tone: 'confirmed' })
      onChanged()
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) onFeedback({ message, tone: 'declined' })
    }
  }
  return (
    <li className="grid gap-3 border-t border-line py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" data-testid="stockage-galerie">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-xl break-words text-ink">{g.client_name}</p>
          <StatusBadge state={statusBadge(g.status)} />
        </div>
        <p className="mt-1 text-sm">
          {typeLabel(g.session_type)} · Aperçus {formatBytes(g.proofs_bytes)} · Finales {formatBytes(g.finals_bytes)} ·{' '}
          <strong className="font-normal">Total {formatBytes(g.total_bytes)}</strong>
        </p>
        <p className="mt-1 text-xs italic">Suppression automatique le {lastDayLabel(g.purge_at)}</p>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {canClear && (
          <ConfirmDialog
            title="Supprimer les aperçus ?"
            description={`Libère ${formatBytes(g.proofs_bytes)}. Les aperçus filigranés de la sélection de ${g.client_name} sont effacés ; les photos finales et l’accès du client restent intacts, et les noms des photos choisies restent lisibles.`}
            confirmLabel="Supprimer les aperçus"
            onConfirm={clear}
            trigger={
              <button type="button" className={adminButton('outline')}>
                Supprimer les aperçus
              </button>
            }
          />
        )}
        <AdvanceDialog
          gallery={g}
          onExpired={onExpired}
          onDone={(message) => {
            onFeedback({ message, tone: 'confirmed' })
            onChanged()
          }}
        />
        <DeleteGalleryDialog
          gallery={g}
          onExpired={onExpired}
          triggerLabel="Supprimer la galerie"
          onDeleted={() => {
            onFeedback({ message: `${formatBytes(g.total_bytes)} libérés`, tone: 'confirmed' })
            onChanged()
          }}
        />
      </div>
    </li>
  )
}

/** « Vérifier sur le serveur » : recompte R2 page par page, puis orphelins. */
function ServerCheck({ summary, onChanged, onExpired, onFeedback }) {
  const [check, setCheck] = useState(null)
  const run = async (path) => {
    const total = { objects: 0, bytes: 0, referenced: 0, recent: 0, other: 0, backfilled: 0, orphans: { count: 0, bytes: 0 }, deleted: 0, deletedBytes: 0 }
    let cursor = null
    do {
      const r = await api(path, { method: 'POST', body: { cursor } })
      if (r.deleted !== undefined) {
        total.deleted += r.deleted
        total.deletedBytes += r.bytes
      } else {
        for (const k of ['objects', 'bytes', 'referenced', 'recent', 'other', 'backfilled']) total[k] += r[k]
        total.orphans.count += r.orphans.count
        total.orphans.bytes += r.orphans.bytes
        setCheck({ ...total, running: true })
      }
      cursor = r.cursor
    } while (cursor)
    return total
  }
  const verify = async () => {
    setCheck({ running: true, objects: 0 })
    try {
      const total = await run('/api/admin/storage/verify')
      setCheck({ ...total, running: false })
      onChanged()
    } catch (err) {
      setCheck(null)
      const message = apiErrorMessage(err, onExpired)
      if (message) onFeedback({ message, tone: 'declined' })
    }
  }
  const removeOrphans = async () => {
    try {
      const result = await run('/api/admin/storage/orphans/delete')
      onFeedback({ message: `${formatBytes(result.deletedBytes)} libérés`, tone: 'confirmed' })
      await verify()
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) onFeedback({ message, tone: 'declined' })
    }
  }
  const gap = check && !check.running ? check.bytes - summary.total.all : 0
  return (
    <div className="mt-5">
      <button type="button" className={adminButton('outline')} onClick={verify} disabled={check?.running}>
        {check?.running ? `Vérification… ${check.objects} fichiers` : 'Vérifier sur le serveur'}
      </button>
      <div aria-live="polite">
        {check && !check.running && (
          <div className="mt-3" data-testid="verification">
            <Notice>
              Sur le serveur : {formatBytes(check.bytes)} en {check.objects} fichier{check.objects > 1 ? 's' : ''}. Enregistré dans le
              site : {formatBytes(summary.total.all)}.{' '}
              {Math.abs(gap) < 2 ** 20 ? 'Aucun écart.' : `Écart : ${formatBytes(Math.abs(gap))}.`}
              {check.backfilled > 0 && ` Tailles complétées pour ${check.backfilled} fichier${check.backfilled > 1 ? 's' : ''}.`}
              {check.recent > 0 && ` ${check.recent} fichier${check.recent > 1 ? 's' : ''} déposé${check.recent > 1 ? 's' : ''} à l’instant (dépôt en cours ?).`}
              {check.orphans.count > 0
                ? ` ${check.orphans.count} fichier${check.orphans.count > 1 ? 's' : ''} orphelin${check.orphans.count > 1 ? 's' : ''} (${formatBytes(check.orphans.bytes)}) : présent${check.orphans.count > 1 ? 's' : ''} sur le serveur mais rattaché${check.orphans.count > 1 ? 's' : ''} à aucune photo.`
                : ' Aucun fichier orphelin.'}
            </Notice>
            {check.orphans.count > 0 && (
              <ConfirmDialog
                title="Supprimer les fichiers orphelins ?"
                description={`Libère ${formatBytes(check.orphans.bytes)}. Ces ${check.orphans.count} fichiers ne correspondent à aucune photo d’aucune galerie.`}
                confirmLabel="Supprimer"
                onConfirm={removeOrphans}
                trigger={
                  <button type="button" className={adminButton('decline', 'mt-3')}>
                    Supprimer les fichiers orphelins
                  </button>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function StorageSection({ onExpired, onFeedback }) {
  const { data, error, reload } = useApiData('/api/admin/storage', { onError: (err) => apiErrorMessage(err, onExpired) })
  const [filter, setFilter] = useState('all')
  // Horizon « Bientôt supprimées » fixé à l'ouverture de la page.
  const [soonLimit] = useState(() => new Date(Date.now() + SOON_DAYS * 86_400_000).toISOString())
  if (error && !data) {
    return (
      <Notice tone="error" action={<button type="button" className={adminButton('outline')} onClick={reload}>Réessayer</button>}>
        {error.message}
      </Notice>
    )
  }
  if (!data) return <Loading />
  const match = FILTERS.find((f) => f.value === filter).match
  const shown = data.galleries.filter(match)
  const soon = shown.filter((g) => g.purge_at <= soonLimit)
  const others = shown.filter((g) => g.purge_at > soonLimit)
  const rowProps = { onChanged: reload, onExpired, onFeedback }
  return (
    <>
      <StorageGauge summary={data} />
      <ServerCheck summary={data} {...rowProps} />

      <div className="mt-10">
        <h4 className="font-display text-xl text-ink">Galeries, de la plus lourde à la plus légère</h4>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer les galeries">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                'font-label min-h-11 rounded-full border px-4 text-xs tracking-wide uppercase',
                filter === f.value ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink hover:border-structure'
              )}
            >
              {f.label} <span className="ml-1">({data.galleries.filter(f.match).length})</span>
            </button>
          ))}
        </div>
        {soon.length > 0 && (
          <section aria-labelledby="bientot" className="mt-6">
            <h5 id="bientot" className="font-label text-xs tracking-[0.2em] text-ink uppercase">
              Bientôt supprimées
            </h5>
            <ul data-testid="bientot-supprimees">
              {soon.map((g) => (
                <GalleryRow key={g.id} g={g} {...rowProps} />
              ))}
            </ul>
          </section>
        )}
        {others.length > 0 && (
          <ul className={soon.length ? 'mt-6' : 'mt-2'} data-testid="liste-stockage">
            {others.map((g) => (
              <GalleryRow key={g.id} g={g} {...rowProps} />
            ))}
          </ul>
        )}
        {shown.length === 0 && <p className="mt-6 text-sm italic">Aucune galerie ici.</p>}
      </div>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import clsx from 'clsx'
import { api } from '../../../lib/api'
import { copyText } from '../../../lib/clipboard'
import { useApiData } from '../../../lib/useApiData'
import { formatDateTime } from '../../../../shared/time.js'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Loading, Notice } from '../../../components/ui/Notice'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { adminButton, apiErrorMessage, inputClasses, labelClasses } from '../adminUi'
import { UploadPanel, WatermarkPreview } from './UploadPanel'
import { useAdminSettings } from '../useAdminSettings'
import {
  deliveryMessage,
  galleryLink,
  lastDayKey,
  lastDayLabel,
  lightroomList,
  nextStep,
  reviewMessage,
  shareMessage,
  shootLabel,
  statusBadge,
  typeLabel,
} from './galleryText'

function Section({ title, children, id }) {
  return (
    <section aria-labelledby={id} className="border-t border-line pt-6">
      <h3 id={id} className="font-display text-2xl text-ink">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Grille de miniatures admin ; un clic sélectionne une photo pour agir dessus. */
function AdminGrid({ galleryId, photos, active, onPick, coverId }) {
  return (
    <ul className="grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-10">
      {photos.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onPick?.(p.id === active ? null : p.id)}
            aria-pressed={onPick ? p.id === active : undefined}
            title={p.original_filename}
            className={clsx('relative block aspect-square w-full overflow-hidden bg-mist', p.id === active && 'outline-2 outline-ink')}
          >
            {p.complete ? (
              <img src={`/api/admin/galleries/${galleryId}/photos/${p.id}/thumb`} alt={p.original_filename} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-xs italic">incomplète</span>
            )}
            {p.id === coverId && (
              <span className="font-label absolute bottom-0 left-0 bg-paper/90 px-1 text-xs tracking-wider text-ink uppercase">Couverture</span>
            )}
            {p.kind === 'final' && p.metadata_stripped === 0 && (
              <span
                className="font-label absolute top-0 right-0 bg-paper/90 px-1 text-xs tracking-wider text-ink uppercase"
                title="Les métadonnées (dont la position GPS éventuelle) n’ont pas pu être retirées de ce format."
                data-testid="finale-metadonnees"
              >
                Métadonnées<span className="sr-only"> conservées : position GPS éventuelle non retirée</span>
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function DeleteGalleryDialog({ gallery, onDeleted, onExpired, triggerLabel = 'Supprimer la galerie définitivement', triggerClassName }) {
  const [typed, setTyped] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    setBusy(true)
    try {
      await api(`/api/admin/galleries/${gallery.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) setError(message)
      setBusy(false)
    }
  }
  return (
    <AlertDialog.Root onOpenChange={() => setTyped('')}>
      <AlertDialog.Trigger asChild>
        <button type="button" className={adminButton('decline', triggerClassName)}>
          {triggerLabel}
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <AlertDialog.Content className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md border border-line bg-paper p-6 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
          <AlertDialog.Title className="font-display text-2xl text-ink">Supprimer définitivement ?</AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm text-ink">
            Toutes les photos (aperçus et finales), la sélection et les informations du client seront effacées
            immédiatement, sans retour possible. Pour confirmer, tapez le nom du client : <strong>{gallery.client_name}</strong>
          </AlertDialog.Description>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Nom du client"
            className={inputClasses}
            autoComplete="off"
          />
          {error && <Notice tone="error" className="mt-3">{error}</Notice>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <button type="button" className={adminButton('outline')}>
                Annuler
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={busy || typed.trim() !== gallery.client_name}
              className={adminButton('decline')}
              onClick={remove}
            >
              Supprimer
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export function GalleryDetail({ id, initialCode, onBack, onExpired, onFeedback }) {
  const { data, error, reload } = useApiData(`/api/admin/galleries/${id}`, {
    onError: (err) => apiErrorMessage(err, onExpired),
  })
  const [code, setCode] = useState(initialCode ?? null)
  const [activeProof, setActiveProof] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [dates, setDates] = useState(null)
  const settings = useAdminSettings()
  // Pendant un dépôt, la grille se met à jour toutes les 2 s au plus.
  const reloadTimer = useRef(null)
  const softReload = () => {
    if (reloadTimer.current) return
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null
      reload()
    }, 2000)
  }
  useEffect(() => () => clearTimeout(reloadTimer.current), [])

  if (error && !data) {
    return (
      <Notice tone="error" action={<button type="button" className={adminButton('outline')} onClick={reload}>Réessayer</button>}>
        {error.message}
      </Notice>
    )
  }
  if (!data) return <Loading />

  const g = data.gallery
  const proofs = data.photos.filter((p) => p.kind === 'proof')
  const finals = data.photos.filter((p) => p.kind === 'final')
  const selected = proofs.filter((p) => p.selected)

  const run = async (path, method, body, message) => {
    setActionError(null)
    try {
      const result = await api(path, { method, body })
      if (message) onFeedback({ message, tone: 'confirmed' })
      reload()
      return result
    } catch (err) {
      const msg = apiErrorMessage(err, onExpired)
      if (msg) setActionError(msg)
      return null
    }
  }
  const copy = async (text, message) => onFeedback({ message: (await copyText(text)) ? message : 'Copie impossible sur cet appareil.', tone: 'neutral' })

  const currentDates = dates ?? {
    selection_deadline: lastDayKey(g.selection_deadline),
    delivery_expires_at: lastDayKey(g.delivery_expires_at) ?? '',
    purge_at: lastDayKey(g.purge_at),
  }

  return (
    <div className="space-y-8">
      <button type="button" className={adminButton('quiet', 'px-0')} onClick={onBack}>
        ← Toutes les galeries
      </button>

      {/* 1. En-tête */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl text-ink">{g.client_name}</h2>
            <StatusBadge state={statusBadge(g.status)} />
          </div>
          <p className="mt-1 text-sm">
            {typeLabel(g.session_type)} · {shootLabel(g.shoot_date)} · {g.included_count} photos incluses
          </p>
          <p className="mt-1 text-sm italic" data-testid="etape">{nextStep(g)}</p>
        </div>
        <a href={`/galerie/${g.slug}?apercu=1`} target="_blank" rel="noreferrer" className={adminButton('outline')}>
          Voir comme le client<span className="sr-only"> (nouvel onglet)</span>
        </a>
      </header>
      <div aria-live="polite">{actionError && <Notice tone="error">{actionError}</Notice>}</div>

      {/* 2. Partage */}
      <Section id="g-partage" title="Partage">
        <p className="text-sm break-all">
          Lien : <a href={galleryLink(g.slug)} className="underline underline-offset-4">{galleryLink(g.slug)}</a>
        </p>
        {code ? (
          <>
            <p className="mt-2 text-sm">
              Code d’accès : <strong className="font-sans text-lg tracking-[0.2em]" data-testid="code">{code}</strong>{' '}
              <span className="italic">(affiché une seule fois : copiez le message maintenant)</span>
            </p>
            <button type="button" className={adminButton('solid', 'mt-3')} onClick={() => copy(shareMessage(g, code), 'Message copié')}>
              Copier le message pour le client
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm italic">
            Le code d’accès n’est affiché qu’à sa création. Pour renvoyer le message au client, générez un nouveau code.
          </p>
        )}
        <div className="mt-3">
          <ConfirmDialog
            title="Générer un nouveau code ?"
            description="L’ancien code cessera de fonctionner et le client devra saisir le nouveau, sur tous ses appareils."
            confirmLabel="Générer"
            onConfirm={async () => {
              const result = await run(`/api/admin/galleries/${g.id}/code`, 'POST', undefined, 'Nouveau code généré')
              if (result) setCode(result.code)
            }}
            trigger={
              <button type="button" className={adminButton('outline')}>
                Générer un nouveau code
              </button>
            }
          />
        </div>
      </Section>

      {/* 3. Aperçus */}
      <Section id="g-apercus" title={`Aperçus (sélection) — ${g.counts.proofs}`}>
        {g.proofs_purged_at ? (
          <p className="text-sm italic">
            Aperçus de sélection supprimés le {formatDateTime(g.proofs_purged_at)} : seules les photos finales restent.
          </p>
        ) : (
          <>
            {proofs.length === 0 && <WatermarkPreview />}
            <div className="mt-4">
              <UploadPanel
                galleryId={g.id}
                kind="proof"
                photos={data.photos}
                onPhotoDone={softReload}
                disabled={!['draft', 'selection_open'].includes(g.status)}
                disabledReason="La sélection est terminée : les aperçus ne peuvent plus être modifiés."
              />
            </div>
            {proofs.length > 0 && (
              <div className="mt-4">
                <AdminGrid galleryId={g.id} photos={proofs} active={activeProof} onPick={setActiveProof} coverId={g.cover_id} />
                {activeProof && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="italic">{proofs.find((p) => p.id === activeProof)?.original_filename}</span>
                    <button
                      type="button"
                      className={adminButton('outline')}
                      onClick={() => run(`/api/admin/galleries/${g.id}`, 'PATCH', { cover_photo_id: activeProof }, 'Couverture choisie')}
                    >
                      Définir comme couverture
                    </button>
                    <ConfirmDialog
                      title="Supprimer cette photo ?"
                      description="Elle sera retirée de la galerie (et de la sélection du client si elle y figurait)."
                      confirmLabel="Supprimer"
                      onConfirm={() => {
                        setActiveProof(null)
                        run(`/api/admin/galleries/${g.id}/photos/${activeProof}`, 'DELETE', undefined, 'Photo supprimée')
                      }}
                      trigger={
                        <button type="button" className={adminButton('quiet')}>
                          Supprimer la photo
                        </button>
                      }
                    />
                  </div>
                )}
              </div>
            )}
            {g.status === 'draft' && (
              <button
                type="button"
                disabled={!g.counts.proofs}
                className={adminButton('solid', 'mt-4')}
                onClick={() => run(`/api/admin/galleries/${g.id}/open`, 'POST', undefined, 'Sélection ouverte au client')}
              >
                Ouvrir la sélection au client
              </button>
            )}
          </>
        )}
      </Section>

      {/* 4. Sélection du client */}
      <Section id="g-selection" title={`Sélection du client — ${g.counts.selected} / ${g.included_count}`}>
        {g.selection_validated_at ? (
          <p className="text-sm">Validée le {formatDateTime(g.selection_validated_at)}.</p>
        ) : (
          <p className="text-sm italic">
            {g.status === 'draft' ? 'La sélection n’est pas encore ouverte.' : `Pas encore validée — date limite le ${lastDayLabel(g.selection_deadline)}.`}
          </p>
        )}
        {g.client_comment && (
          <blockquote className="mt-3 border-l-2 border-structure pl-3 text-sm whitespace-pre-line">{g.client_comment}</blockquote>
        )}
        {selected.length > 0 && (
          <>
            {g.proofs_purged_at ? (
              // Aperçus supprimés (Paramètres → Stockage) : les noms restent.
              <ul className="mt-4 columns-2 gap-6 text-sm sm:columns-4" data-testid="selection-noms">
                {selected.map((p) => (
                  <li key={p.id}>{p.original_filename}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <AdminGrid galleryId={g.id} photos={selected} />
              </div>
            )}
            <button
              type="button"
              className={adminButton('outline', 'mt-4')}
              onClick={() => copy(lightroomList(selected), 'Noms de fichiers copiés')}
            >
              Copier les noms de fichiers
            </button>
            <p className="mt-1 text-xs italic">
              Dans Lightroom : Filtre de bibliothèque → Texte → Nom de fichier → Contient, puis collez la liste.
            </p>
          </>
        )}
        {g.status === 'selection_validated' && (
          <div className="mt-4">
            <ConfirmDialog
              title="Rouvrir la sélection ?"
              description="Le client pourra de nouveau modifier son choix puis le valider."
              confirmLabel="Rouvrir"
              onConfirm={() => run(`/api/admin/galleries/${g.id}/reopen`, 'POST', undefined, 'Sélection rouverte')}
              trigger={
                <button type="button" className={adminButton('outline')}>
                  Rouvrir la sélection au client
                </button>
              }
            />
          </div>
        )}
      </Section>

      {/* 5. Livraison */}
      <Section id="g-livraison" title={`Photos finales (livraison) — ${g.counts.finals}`}>
        <UploadPanel
          galleryId={g.id}
          kind="final"
          photos={data.photos}
          onPhotoDone={softReload}
          disabled={g.status === 'expired' || g.status === 'draft'}
          disabledReason={g.status === 'draft' ? 'Ouvrez d’abord la sélection au client.' : 'Cette galerie a expiré.'}
        />
        {finals.length > 0 && (
          <div className="mt-4">
            <AdminGrid galleryId={g.id} photos={finals} />
          </div>
        )}
        {finals.length > 0 && selected.length > 0 && finals.length !== selected.length && (
          <Notice className="mt-4">
            {finals.length} photos finales pour {selected.length} photos sélectionnées : vérifiez qu’il n’en manque pas.
          </Notice>
        )}
        {['selection_open', 'selection_validated'].includes(g.status) && (
          <ConfirmDialog
            title="Livrer au client ?"
                        description={`Le client verra ses photos finales et pourra les télécharger pendant ${settings.delivery_days} jours (modifiable dans Conservation).`}
            confirmLabel="Livrer"
            onConfirm={() => run(`/api/admin/galleries/${g.id}/deliver`, 'POST', undefined, 'Galerie livrée')}
            trigger={
              <button type="button" disabled={!g.counts.finals} className={adminButton('confirm', 'mt-4')}>
                Livrer au client
              </button>
            }
          />
        )}
        {g.status === 'delivered' && (
          <div className="mt-4">
            <p className="text-sm">
              Livrée le {formatDateTime(g.delivered_at)} — téléchargement jusqu’au {lastDayLabel(g.delivery_expires_at)}.
            </p>
            <button type="button" className={adminButton('outline', 'mt-3')} onClick={() => copy(deliveryMessage(g), 'Message de livraison copié')}>
              Copier le message de livraison
            </button>
            <p className="mt-1 text-xs italic">À envoyer vous-même au client ({g.client_email}) : le site n’écrit pas aux clients.</p>
            <button
              type="button"
              className={adminButton('outline', 'mt-4')}
              onClick={() => copy(reviewMessage(g, settings.review_url), 'Message de demande d’avis copié')}
            >
              Copier le message de demande d’avis
            </button>
            <p className="mt-1 text-xs italic">Une fois les photos téléchargées : le message est modifiable avant envoi.</p>
          </div>
        )}
      </Section>

      {/* 6. Conservation */}
      <Section id="g-conservation" title="Conservation">
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            const body = { selection_deadline: currentDates.selection_deadline, purge_at: currentDates.purge_at }
            if (currentDates.delivery_expires_at) body.delivery_expires_at = currentDates.delivery_expires_at
            run(`/api/admin/galleries/${g.id}`, 'PATCH', body, 'Dates enregistrées').then(() => setDates(null))
          }}
        >
          <label className={labelClasses}>
            Date limite de sélection
            <input type="date" value={currentDates.selection_deadline} onChange={(e) => setDates({ ...currentDates, selection_deadline: e.target.value })} className={inputClasses} />
          </label>
          <label className={labelClasses}>
            Téléchargement jusqu’au
            <input type="date" disabled={!g.delivered_at} value={currentDates.delivery_expires_at} onChange={(e) => setDates({ ...currentDates, delivery_expires_at: e.target.value })} className={inputClasses} />
          </label>
          <label className={labelClasses}>
            Suppression définitive le
            <input type="date" value={currentDates.purge_at} onChange={(e) => setDates({ ...currentDates, purge_at: e.target.value })} className={inputClasses} />
          </label>
          <div className="sm:col-span-3">
            <button type="submit" disabled={!dates} className={adminButton('outline')}>
              Enregistrer les dates
            </button>
            <p className="mt-1 text-xs italic">
              Durées par défaut (Paramètres) : sélection {settings.selection_days} jours, téléchargement {settings.delivery_days} jours,
              suppression ensuite.
            </p>
          </div>
        </form>
        <div className="mt-6">
          <DeleteGalleryDialog
            gallery={g}
            onExpired={onExpired}
            onDeleted={() => {
              onFeedback({ message: 'Galerie supprimée', tone: 'neutral' })
              onBack()
            }}
          />
        </div>
      </Section>
    </div>
  )
}

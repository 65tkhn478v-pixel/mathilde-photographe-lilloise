import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useApiData } from '../lib/useApiData'
import { dateKey, formatKeyLong } from '../../shared/time.js'
import { FieldError } from '../components/ui/Notice'
import { StatusIcon } from '../components/ui/StatusBadge'
import { GalleryGrid } from '../components/gallery/GalleryGrid'
import { GalleryLightbox } from '../components/gallery/GalleryLightbox'
import { PROTECTED_CLASS, protectedMedia, protectionHandlers } from '../components/gallery/protection'
import { SelectionBar } from '../components/gallery/SelectionBar'
import { ValidateDialog } from '../components/gallery/ValidateDialog'
import { downloadAsZip, downloadMethod, downloadOneByOne } from '../lib/gallery/downloadAll'

const UNAVAILABLE = 'Cette galerie n’est plus disponible. Écrivez-moi si besoin.'
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)
/** Échéance stockée en fin de journée exclusive : jour affiché = la veille. */
const lastDay = (iso) => lower(formatKeyLong(dateKey(new Date(Date.parse(iso) - 1000))))
const monthDay = (iso) => lastDay(iso).replace(/^\S+ /, '') // « 4 février »

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow, noarchive'
    document.head.appendChild(meta)
    const previous = document.title
    document.title = 'Galerie — Mathilde Lecomte'
    return () => {
      meta.remove()
      document.title = previous
    }
  }, [])
}

function Unavailable() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="font-label text-xs tracking-[0.3em] uppercase">Mathilde Lecomte · Photographe</p>
      <h1 className="mt-6 max-w-md text-3xl text-ink">{UNAVAILABLE}</h1>
      <Link to="/contact" className="mt-8 text-sm underline underline-offset-4 hover:text-accent">
        Me contacter
      </Link>
    </div>
  )
}

function AccessScreen({ slug, title, onSuccess }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [cover, setCover] = useState(true)
  const submit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return setError('Entrez le code reçu par mail.')
    setBusy(true)
    setError(null)
    try {
      await api(`/api/galerie/${slug}/acces`, { method: 'POST', body: { code } })
      onSuccess()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-mist px-6">
      {cover && (
        <img
          src={`/api/galerie/${slug}/couverture`}
          alt=""
          aria-hidden="true"
          onError={() => setCover(false)}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl select-none"
        />
      )}
      <div className="absolute inset-0 bg-paper/55" aria-hidden="true" />
      <form onSubmit={submit} noValidate className="relative w-full max-w-sm bg-paper/90 px-6 py-10 text-center shadow-sm backdrop-blur-sm">
        <p className="font-label text-xs tracking-[0.3em] uppercase">Mathilde Lecomte · Photographe</p>
        <h1 className="mt-5 text-3xl text-ink">{title}</h1>
        <label htmlFor="code-galerie" className="mt-8 block text-sm">
          Code d’accès
        </label>
        <input
          id="code-galerie"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'code-erreur' : undefined}
          className="mt-2 w-full border-0 border-b border-ink/40 bg-transparent py-2 text-center font-sans text-lg tracking-[0.3em] text-ink uppercase focus:border-ink focus:outline-none"
        />
        <div aria-live="polite">
          <FieldError id="code-erreur">{error}</FieldError>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="font-label mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-ink bg-ink px-6 text-xs tracking-[0.18em] text-paper uppercase disabled:opacity-60 md:text-sm"
        >
          {busy ? 'Vérification…' : 'Accéder à ma galerie'}
        </button>
      </form>
    </div>
  )
}

function Cover({ slug, content, protect }) {
  return (
    <header
      className={`relative flex h-[62svh] min-h-[360px] items-end overflow-hidden bg-mist ${protect ? PROTECTED_CLASS : ''}`}
      {...protectionHandlers(protect)}
    >
      {content.cover_id && (
        <img
          src={`/api/galerie/${slug}/photos/${content.cover_id}/preview`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          {...protectedMedia(protect)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" aria-hidden="true" />
      <div className="relative w-full px-6 pb-10 text-center text-paper">
        <h1 className="text-4xl text-paper md:text-5xl">{content.title}</h1>
        <p className="font-label mt-3 text-xs tracking-[0.25em] uppercase">{formatKeyLong(content.shoot_date)}</p>
      </div>
    </header>
  )
}

export default function Galerie() {
  useNoIndex()
  const { slug } = useParams()
  const [loggedIn, setLoggedIn] = useState(false)
  const pub = useApiData(`/api/galerie/${slug}`)
  const authenticated = loggedIn || pub.data?.authenticated
  const content = useApiData(authenticated ? `/api/galerie/${slug}/contenu` : null)
  const data = content.data

  const [selection, setSelection] = useState(null) // Set des photos choisies (après modification locale)
  const [saveState, setSaveState] = useState(null) // 'saving' | 'saved' | message
  const [filter, setFilter] = useState('all')
  const [viewer, setViewer] = useState(null)
  const [validating, setValidating] = useState(false)
  const [validateError, setValidateError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [download, setDownload] = useState(null)

  const selected = useMemo(() => selection ?? new Set(data?.selected ?? []), [selection, data])
  const srcOf = useCallback((photo, version) => `/api/galerie/${slug}/photos/${photo.id}/${version}`, [slug])

  if (pub.error?.status === 404 || content.error?.status === 404) return <Unavailable />
  if (!pub.data && !pub.error) return <div className="min-h-svh bg-paper" aria-busy="true" />
  if (pub.error) return <Unavailable />
  if (!authenticated || content.error?.status === 401) {
    return (
      <AccessScreen
        slug={slug}
        title={pub.data.title}
        onSuccess={() => {
          setLoggedIn(true)
          content.reload()
        }}
      />
    )
  }
  if (!data) return <div className="min-h-svh bg-paper" aria-busy="true" />

  const delivered = data.status === 'delivered'
  const canSelect = !delivered && !data.selection_locked
  // Aperçus filigranés (sélection ouverte ou validée) : enregistrement dissuadé.
  const protect = !delivered
  const photos = data.photos
  const shown = filter === 'selected' && !delivered ? photos.filter((p) => selected.has(p.id)) : photos
  const indexOf = (id) => photos.findIndex((p) => p.id === id)

  const toggle = async (pid) => {
    if (!canSelect) return
    const isSelected = selected.has(pid)
    if (!isSelected && selected.size >= data.included_count) {
      setSaveState(`Vous avez déjà choisi vos ${data.included_count} photos. Retirez-en une pour en ajouter une autre.`)
      return
    }
    const next = new Set(selected)
    if (isSelected) next.delete(pid)
    else next.add(pid)
    setSelection(next)
    setSaveState('saving')
    try {
      await api(`/api/galerie/${slug}/selection/${pid}`, { method: isSelected ? 'DELETE' : 'PUT' })
      setSaveState('saved')
    } catch (err) {
      setSelection(new Set(selected))
      setSaveState(err.message)
      if (err instanceof ApiError && err.data?.code === 'locked') content.reload()
    }
  }

  const validate = async (comment) => {
    setBusy(true)
    setValidateError(null)
    try {
      await api(`/api/galerie/${slug}/valider`, { method: 'POST', body: { comment } })
      setValidating(false)
      setSelection(null)
      content.reload()
      window.scrollTo({ top: 0 })
    } catch (err) {
      setValidateError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const method = downloadMethod()
  const downloadAll = async () => {
    setDownload({ done: 0, total: photos.length })
    const progress = (done, total) => setDownload({ done, total })
    try {
      if (method === 'zip') await downloadAsZip(photos, srcOf, `${data.title.replace(/[^\p{L}\d]+/gu, '-')}.zip`, progress)
      else await downloadOneByOne(photos, srcOf, progress)
      setDownload({ done: photos.length, total: photos.length, finished: true })
    } catch (err) {
      // Annulation de la fenêtre d'enregistrement : rien à signaler.
      setDownload(err?.name === 'AbortError' ? null : { error: 'Le téléchargement s’est interrompu. Réessayez, ou téléchargez les photos une par une.' })
    }
  }

  const viewerPhotos = shown
  return (
    <div className={`min-h-svh bg-paper ${delivered || canSelect || !data.preview ? 'pb-28' : ''}`}>
      {data.preview && (
        <p className="font-label sticky top-0 z-30 bg-ink px-4 py-2 text-center text-xs tracking-[0.15em] text-paper uppercase">
          Aperçu : vue client, la sélection n’est pas modifiable
        </p>
      )}
      <Cover slug={slug} content={data} protect={protect} />

      <section className="mx-auto max-w-2xl px-6 py-10 text-center">
        {delivered ? (
          <>
            <h2 className="text-3xl text-ink">Vos photos sont prêtes</h2>
            <p className="mt-3">Disponibles jusqu’au {monthDay(data.delivery_expires_at)}.</p>
            {method === 'ios' && (
              <p className="mt-3 text-sm italic">
                Sur iPhone : ouvrez une photo, touchez l’icône de téléchargement, puis « Enregistrer dans Photos » ou
                « Enregistrer dans Fichiers ».
              </p>
            )}
          </>
        ) : data.status === 'selection_validated' ? (
          <>
            <h2 className="text-3xl text-ink">Merci ! Votre sélection est bien envoyée.</h2>
            <p className="mt-3">Je vous préviens dès que vos photos retouchées sont prêtes.</p>
          </>
        ) : data.deadline_passed ? (
          <p>
            La date limite est passée : votre sélection n’est plus modifiable.{' '}
            <Link to="/contact" className="underline underline-offset-4">
              Écrivez-moi
            </Link>{' '}
            si besoin.
          </p>
        ) : (
          <>
            <p className="text-lg">
              Choisissez vos {data.included_count} photos préférées. Je les retoucherai ensuite avec soin.
            </p>
            <p className="mt-2 text-sm italic">
              À choisir avant le {lastDay(data.selection_deadline)}. Votre sélection est enregistrée au fur et à mesure.
            </p>
          </>
        )}
      </section>

      <main className="px-1 sm:px-3">
        {shown.length === 0 && filter === 'selected' ? (
          <p className="py-16 text-center text-sm italic">Aucune photo sélectionnée pour l’instant. Touchez le cœur d’une photo pour la choisir.</p>
        ) : (
          <GalleryGrid
            photos={shown}
            total={photos.length}
            indexOf={indexOf}
            srcOf={srcOf}
            onOpen={(index) => setViewer(viewerPhotos.indexOf(photos[index]))}
            selection={delivered ? null : selected}
            onToggle={delivered ? null : toggle}
            canSelect={canSelect}
            onDownload={delivered}
            protect={protect}
          />
        )}
        {protect && (
          <p className="mx-auto max-w-md px-6 pt-8 pb-4 text-center text-xs italic" data-testid="mention-protection">
            Ces aperçus sont protégés. Vos photos en haute définition, sans filigrane, vous seront livrées après la
            retouche.
          </p>
        )}
      </main>

      <GalleryLightbox
        photos={viewerPhotos}
        index={viewer}
        onIndex={setViewer}
        onClose={() => setViewer(null)}
        srcOf={srcOf}
        selection={delivered ? null : selected}
        onToggle={delivered ? null : toggle}
        canSelect={canSelect}
        onDownload={delivered}
        protect={protect}
      />

      {/* Message discret : « Enregistré », limite atteinte, erreur. */}
      <p
        aria-live="polite"
        className="fixed inset-x-0 bottom-20 z-40 mx-auto w-fit max-w-[90vw] px-3 text-center text-xs italic"
        data-testid="enregistrement"
      >
        {saveState === 'saving' ? 'Enregistrement…' : saveState === 'saved' ? 'Enregistré' : saveState}
      </p>

      {!delivered && data.status !== 'expired' && (
        <SelectionBar
          count={selected.size}
          max={data.included_count}
          filter={filter}
          onFilter={setFilter}
          onValidate={() => setValidating(true)}
          locked={!canSelect}
        />
      )}

      {delivered && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
            <p className="text-xs" aria-live="polite">
              {download?.error ??
                (download?.finished
                  ? 'Téléchargement terminé.'
                  : download
                    ? `Téléchargement : ${download.done} / ${download.total}`
                    : `${photos.length} photos en haute définition`)}
            </p>
            {method !== 'ios' && (
              <button
                type="button"
                disabled={Boolean(download && !download.finished && !download.error)}
                onClick={downloadAll}
                className="font-label min-h-11 rounded-sm border border-ink bg-ink px-4 text-xs tracking-[0.15em] text-paper uppercase disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  <StatusIcon name="download" className="h-4 w-4" />
                  Tout télécharger
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      <ValidateDialog
        open={validating}
        onOpenChange={setValidating}
        photos={photos.filter((p) => selected.has(p.id))}
        max={data.included_count}
        srcOf={srcOf}
        onConfirm={validate}
        busy={busy}
        error={validateError}
      />
    </div>
  )
}

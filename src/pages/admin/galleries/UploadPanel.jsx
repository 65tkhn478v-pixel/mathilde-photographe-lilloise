import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { adminButton } from '../adminUi'
import { api } from '../../../lib/api'
import { Notice } from '../../../components/ui/Notice'
import { FINAL_ACCEPT, FORMAT_LABELS, METADATA_WARNING, PROOF_ACCEPT } from '../../../lib/gallery/formats.js'
import { WATERMARK_TEXT } from '../../../../shared/galleries.js'

const STATUS = {
  waiting: 'En attente',
  processing: 'Préparation…',
  uploading: 'Envoi…',
  done: 'Déposée',
  skipped: 'Déjà déposée',
  error: 'Échec',
}

/**
 * Dépôt de photos (aperçus de sélection ou finales HD) : glisser-déposer ou
 * sélection de fichiers, traitement dans le navigateur, 3 en parallèle.
 */
export function UploadPanel({ galleryId, kind, photos, onPhotoDone, disabled, disabledReason }) {
  const [state, setState] = useState(null)
  const [dragging, setDragging] = useState(false)
  const queue = useRef(null)
  const processor = useRef(null)
  const inputRef = useRef(null)
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => processor.current?.dispose(), [])

  const addFiles = async (fileList) => {
    const files = [...fileList]
    if (!files.length || disabled) return
    if (!queue.current) {
      // Chargé à la demande : le traitement d'image n'alourdit pas l'admin.
      const [{ createProcessor }, { createUploadQueue }, watermarkText] = await Promise.all([
        import('../../../lib/gallery/processor.js'),
        import('../../../lib/gallery/uploadQueue.js'),
        // Texte du filigrane en vigueur (Paramètres) : s'applique aux aperçus déposés à partir de maintenant.
        api('/api/admin/settings').then(
          (d) => d.settings.watermark_text,
          () => WATERMARK_TEXT
        ),
      ])
      processor.current = await createProcessor({ watermarkText })
      queue.current = createUploadQueue({
        galleryId,
        kind,
        existing: photosRef.current,
        processor: processor.current,
        onChange: setState,
        onPhotoDone,
      })
    }
    queue.current.add(files)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  // Fichiers en cours, en échec ou livrés avec un avertissement (métadonnées).
  const visible = state?.items.filter((i) => (i.status !== 'done' && i.status !== 'skipped') || i.warning).slice(0, 12) ?? []

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-testid={`depot-${kind}`}
        className={clsx(
          'flex flex-col items-center justify-center gap-3 border border-dashed px-4 py-8 text-center',
          dragging ? 'border-ink bg-mist/40' : 'border-structure',
          disabled && 'opacity-60'
        )}
      >
        <p className="text-sm">
          {disabled
            ? disabledReason
            : kind === 'proof'
              ? 'Glissez ici vos aperçus (JPEG, PNG, WebP, AVIF, HEIC, TIFF ou RAW Canon CR3 / CR2), ou'
              : 'Glissez ici vos photos finales (tous formats, RAW compris), ou'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={kind === 'proof' ? PROOF_ACCEPT : FINAL_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button type="button" disabled={disabled} className={adminButton('outline')} onClick={() => inputRef.current.click()}>
          Choisir des photos
        </button>
        <p className="text-xs italic">
          {kind === 'proof'
            ? 'Les aperçus sont préparés dans votre navigateur (filigrane, 1600 px) : vos originaux et vos RAW ne quittent pas votre ordinateur.'
            : 'JPEG et PNG : données EXIF et GPS retirées dans votre navigateur avant l’envoi, sans recompression. Autres formats : envoyés tels quels.'}
        </p>
      </div>

      {state && state.total > 0 && (
        <div className="mt-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p data-testid={`progression-${kind}`}>
              {state.finished} / {state.total} {state.active ? '…' : ''}
              {state.failed > 0 && ` · ${state.failed} échec${state.failed > 1 ? 's' : ''}`}
            </p>
            {state.failed > 0 && !state.active && (
              <button type="button" className={adminButton('outline')} onClick={() => queue.current.retryFailed()}>
                Réessayer les échecs
              </button>
            )}
          </div>
          <div className="mt-2 h-1 w-full bg-mist" aria-hidden="true">
            <div className="h-full bg-ink transition-[width] duration-200" style={{ width: `${(state.finished / state.total) * 100}%` }} />
          </div>
          {state.warnings > 0 && (
            <div className="mt-3" data-testid={`avertissement-${kind}`}>
              <Notice>
                {state.warnings} fichier{state.warnings > 1 ? 's envoyés' : ' envoyé'} tel{state.warnings > 1 ? 's quels' : ' quel'}.{' '}
                {METADATA_WARNING}
              </Notice>
            </div>
          )}
          {visible.length > 0 && (
            <ul className="mt-3 space-y-2 text-xs" data-testid={`fichiers-${kind}`}>
              {visible.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate">
                      {item.file.name}
                      {item.format && <span className="ml-2 font-label tracking-wider uppercase">{FORMAT_LABELS[item.format] ?? item.format}</span>}
                    </span>
                    <span className={clsx('shrink-0 text-right', item.status === 'error' && 'font-semibold')}>
                      {item.status === 'error' ? `${STATUS.error} : ${item.error}` : STATUS[item.status]}
                    </span>
                    <span className="h-1 w-16 shrink-0 bg-mist" aria-hidden="true">
                      <span className="block h-full bg-ink" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </span>
                  </div>
                  {item.warning && <p className="mt-0.5 italic">{item.warning}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** Aperçu du filigrane sur un dégradé clair → sombre, visible avant le premier dépôt. */
export function WatermarkPreview({ text = WATERMARK_TEXT, caption = 'Aperçu du filigrane, sur fond clair et sombre.' }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([import('../../../lib/gallery/processor.js'), import('../../../lib/gallery/render.js')]).then(async ([{ makeWatermarkTile }, { drawWatermark }]) => {
      const tile = await makeWatermarkTile(text)
      const canvas = canvasRef.current
      if (cancelled || !canvas) return
      const ctx = canvas.getContext('2d')
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
      gradient.addColorStop(0, '#f4ede2')
      gradient.addColorStop(0.5, '#9c8670')
      gradient.addColorStop(1, '#2e2620')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Même dessin que les aperçus réels, à l'échelle de 1600 px.
      drawWatermark(ctx, canvas.width * 2, canvas.height * 2, tile)
    })
    return () => {
      cancelled = true
    }
  }, [text])
  return (
    <figure className="mt-4">
      <canvas ref={canvasRef} width={800} height={450} className="w-full max-w-md border border-line" data-testid="apercu-filigrane" />
      <figcaption className="mt-1 text-xs italic">{caption}</figcaption>
    </figure>
  )
}

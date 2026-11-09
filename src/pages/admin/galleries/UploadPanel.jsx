import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { adminButton } from '../adminUi'

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
      const [{ createProcessor }, { createUploadQueue }] = await Promise.all([
        import('../../../lib/gallery/processor.js'),
        import('../../../lib/gallery/uploadQueue.js'),
      ])
      processor.current = await createProcessor()
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

  const label = kind === 'proof' ? 'aperçus' : 'photos finales'
  const visible = state?.items.filter((i) => i.status !== 'done' && i.status !== 'skipped').slice(0, 8) ?? []

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
          {disabled ? disabledReason : `Glissez ici vos ${label} (JPEG), ou`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,.jpg,.jpeg"
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
            ? 'Les aperçus sont préparés dans votre navigateur (filigrane, 1600 px) : vos originaux ne quittent pas votre ordinateur.'
            : 'Les données EXIF et GPS sont retirées dans votre navigateur avant l’envoi, sans recompression.'}
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
          {visible.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {visible.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                  <span className={clsx('shrink-0', item.status === 'error' && 'font-semibold')}>
                    {item.status === 'error' ? `${STATUS.error} : ${item.error}` : STATUS[item.status]}
                  </span>
                  <span className="h-1 w-16 shrink-0 bg-mist" aria-hidden="true">
                    <span className="block h-full bg-ink" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                  </span>
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
export function WatermarkPreview() {
  const canvasRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([import('../../../lib/gallery/processor.js'), import('../../../lib/gallery/render.js')]).then(async ([{ makeWatermarkTile }, { drawWatermark }]) => {
      const tile = await makeWatermarkTile()
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
  }, [])
  return (
    <figure className="mt-4">
      <canvas ref={canvasRef} width={800} height={450} className="w-full max-w-md border border-line" data-testid="apercu-filigrane" />
      <figcaption className="mt-1 text-xs italic">Aperçu du filigrane, sur fond clair et sombre.</figcaption>
    </figure>
  )
}

import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, useReducedMotion } from 'framer-motion'
import { StatusIcon } from '../ui/StatusBadge'
import { HeartButton } from './GalleryGrid'
import { PROTECTED_CLASS, protectedMedia, protectionHandlers } from './protection'

/**
 * Visionneuse plein écran : glissement gauche / droite (suit le doigt),
 * glissement vers le bas ou Échap pour fermer, flèches du clavier, photos
 * voisines préchargées. Radix Dialog : focus piégé, retour du focus à la
 * miniature d'origine. Sur mesure (pointer events), sans bibliothèque.
 */
export function GalleryLightbox({ photos, index, onIndex, onClose, srcOf, selection, onToggle, canSelect, onDownload, protect = false }) {
  const reduceMotion = useReducedMotion()
  const open = index != null
  const photo = open ? photos[index] : null
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const start = useRef(null)
  // Dernière photo affichée : sa miniature reçoit le focus à la fermeture.
  const lastPhotoId = useRef(null)
  useEffect(() => {
    if (photo) lastPhotoId.current = photo.id
  }, [photo])

  // Précharge les photos voisines (aperçus 1600 px).
  useEffect(() => {
    if (!open) return
    for (const i of [index - 1, index + 1]) {
      if (photos[i]) new Image().src = srcOf(photos[i], 'preview')
    }
  }, [open, index, photos, srcOf])

  const go = (delta) => {
    const next = index + delta
    if (next >= 0 && next < photos.length) onIndex(next)
  }

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pointeur déjà relâché : le geste fonctionne sans capture.
    }
  }
  const onPointerMove = (e) => {
    if (!start.current) return
    setDrag({ x: e.clientX - start.current.x, y: Math.max(0, e.clientY - start.current.y) })
  }
  const onPointerUp = (e) => {
    if (!start.current) return
    // Position du relâchement (et non le dernier rendu, qui peut retarder d'un événement).
    const x = e.clientX - start.current.x
    const y = Math.max(0, e.clientY - start.current.y)
    start.current = null
    setDrag({ x: 0, y: 0 })
    if (y > 110 && y > Math.abs(x)) return onClose()
    if (Math.abs(x) > 60 && Math.abs(x) > y) go(x < 0 ? 1 : -1)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-paper" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col text-ink focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
          onCloseAutoFocus={(e) => {
            const thumb = lastPhotoId.current && document.querySelector(`[data-photo-id="${lastPhotoId.current}"]`)
            if (thumb) {
              e.preventDefault()
              thumb.focus()
            }
          }}
        >
          {photo && (
            <>
              <div className="flex items-center justify-between px-2 py-1 sm:px-4">
                <Dialog.Title className="font-label px-2 text-xs tracking-[0.2em] uppercase" aria-live="polite">
                  {index + 1} / {photos.length}
                </Dialog.Title>
                <div className="flex items-center gap-1">
                  {onDownload && (
                    <a
                      href={srcOf(photo, 'hd')}
                      download={photo.name}
                      className="flex h-11 w-11 items-center justify-center"
                      aria-label={`Télécharger la photo ${index + 1} en haute définition`}
                    >
                      <StatusIcon name="download" className="h-5 w-5" />
                    </a>
                  )}
                  <Dialog.Close className="flex h-11 w-11 items-center justify-center text-2xl leading-none" aria-label="Fermer">
                    ×
                  </Dialog.Close>
                </div>
              </div>

              <div
                className={`relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden select-none ${protect ? PROTECTED_CLASS : ''}`}
                {...protectionHandlers(protect)}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => {
                  start.current = null
                  setDrag({ x: 0, y: 0 })
                }}
                data-testid="visionneuse"
              >
                <motion.img
                  key={photo.id}
                  src={srcOf(photo, 'preview')}
                  alt={`Photo ${index + 1} sur ${photos.length}`}
                  draggable={false}
                  {...protectedMedia(protect)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 - Math.min(drag.y / 400, 0.5) }}
                  transition={{ duration: reduceMotion ? 0 : 0.15 }}
                  style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
                  className="max-h-full max-w-full object-contain"
                />
                {/* Calque transparent : le clic droit ou l'appui long vise le
                    calque, pas l'image. Ni focusable ni lu ; les gestes
                    remontent au conteneur. */}
                {protect && <div className="absolute inset-0" aria-hidden="true" data-protege="" data-testid="calque-protection" />}
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={index === 0}
                  aria-label="Photo précédente"
                  className="absolute top-1/2 left-1 hidden h-12 w-12 -translate-y-1/2 items-center justify-center text-3xl disabled:opacity-20 sm:flex"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  disabled={index === photos.length - 1}
                  aria-label="Photo suivante"
                  className="absolute top-1/2 right-1 hidden h-12 w-12 -translate-y-1/2 items-center justify-center text-3xl disabled:opacity-20 sm:flex"
                >
                  ›
                </button>
              </div>

              <div className="flex min-h-16 items-center justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                {onToggle && (canSelect || selection?.has(photo.id)) && (
                  <HeartButton
                    large
                    selected={selection.has(photo.id)}
                    label={`${selection.has(photo.id) ? 'Retirer' : 'Sélectionner'} la photo ${index + 1}`}
                    onToggle={() => onToggle(photo.id)}
                  />
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

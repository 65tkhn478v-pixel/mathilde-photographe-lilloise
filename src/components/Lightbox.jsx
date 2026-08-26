import { useCallback, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * Lightbox plein écran maison (Radix Dialog + Framer Motion) : pas de
 * librairie de galerie tierce, pour rester au plus près du design system
 * et garder les dépendances au strict nécessaire (voir STACK TECHNIQUE).
 */
export function Lightbox({ photos, index, onClose, onNavigate }) {
  const open = index !== null
  const photo = open ? photos[index] : null

  const goTo = useCallback(
    (delta) => {
      if (index === null) return
      const next = (index + delta + photos.length) % photos.length
      onNavigate(next)
    },
    [index, photos.length, onNavigate]
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') goTo(1)
      if (e.key === 'ArrowLeft') goTo(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, goTo])

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[60] bg-ink/95"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[60] flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <VisuallyHidden asChild>
                  <Dialog.Title>{photo?.alt ?? 'Photo'}</Dialog.Title>
                </VisuallyHidden>

                <div className="flex items-center justify-between px-6 py-4 text-ivory">
                  <span className="text-xs tracking-[0.2em] uppercase">
                    {index + 1} / {photos.length}
                  </span>
                  <Dialog.Close asChild>
                    <button type="button" aria-label="Fermer" className="p-2">
                      <span className="block text-2xl leading-none">×</span>
                    </button>
                  </Dialog.Close>
                </div>

                <div className="relative flex flex-1 items-center justify-center px-4 pb-6 md:px-16">
                  <button
                    type="button"
                    onClick={() => goTo(-1)}
                    aria-label="Photo précédente"
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-ivory/70 hover:text-ivory md:left-6"
                  >
                    <span aria-hidden="true">‹</span>
                  </button>

                  <img
                    key={photo?.src}
                    src={photo?.src}
                    alt={photo?.alt}
                    className="max-h-[80vh] max-w-full object-contain animate-fade-in"
                  />

                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    aria-label="Photo suivante"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-ivory/70 hover:text-ivory md:right-6"
                  >
                    <span aria-hidden="true">›</span>
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import { StatusIcon } from '../ui/StatusBadge'
import { justifyRows, targetRowHeight } from './justify'

/** Image chargée seulement à l'approche de l'écran (IntersectionObserver). */
function LazyImage({ src, alt, className }) {
  const ref = useRef(null)
  // Sans IntersectionObserver (très anciens navigateurs) : chargement direct.
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window))
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '600px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])
  return (
    <img
      ref={ref}
      src={visible ? src : undefined}
      alt={alt}
      decoding="async"
      draggable={false}
      className={clsx('h-full w-full bg-mist object-cover transition-opacity duration-200', visible ? 'opacity-100' : 'opacity-0', className)}
    />
  )
}

export function HeartButton({ selected, onToggle, label, className, large = false }) {
  const reduceMotion = useReducedMotion()
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={clsx('flex items-center justify-center', large ? 'h-12 w-12' : 'h-11 w-11', className)}
    >
      <motion.span
        key={selected ? 'on' : 'off'}
        initial={reduceMotion || !selected ? false : { scale: 0.8 }}
        animate={{ scale: [1, selected && !reduceMotion ? 1.18 : 1, 1] }}
        transition={{ duration: 0.15 }}
        className={clsx(
          'flex items-center justify-center rounded-full shadow-sm',
          large ? 'h-10 w-10' : 'h-8 w-8',
          'bg-paper/90 text-ink'
        )}
      >
        <svg viewBox="0 0 20 20" className={large ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true">
          <path
            d="M10 16s-5.5-3.4-5.5-7.3A2.9 2.9 0 0110 7a2.9 2.9 0 015.5 1.7C15.5 12.6 10 16 10 16z"
            fill={selected ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </motion.span>
    </button>
  )
}

/**
 * Grille justifiée des photos. Les photos occupent tout l'espace ; un seul
 * bouton par photo (cœur pendant la sélection, téléchargement après livraison).
 */
export function GalleryGrid({ photos, total, indexOf, srcOf, onOpen, selection, onToggle, onDownload, canSelect }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const update = () => setWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const gap = width < 640 ? 3 : 6
  const rows = width ? justifyRows(photos, width, targetRowHeight(width), gap) : []

  return (
    <div ref={containerRef} className="w-full" data-testid="grille">
      {rows.map((row, r) => (
        <div key={r} className="flex" style={{ gap, marginBottom: gap, height: row.height }}>
          {row.items.map(({ photo, width: w, height: h }) => {
            const index = indexOf(photo.id)
            const selected = selection?.has(photo.id)
            return (
              <div key={photo.id} className="group relative shrink-0" style={{ width: w, height: h }}>
                <button
                  type="button"
                  onClick={() => onOpen(index)}
                  className="block h-full w-full focus-visible:outline-offset-[-3px]"
                  aria-label={`Ouvrir la photo ${index + 1} sur ${total}`}
                  data-photo-id={photo.id}
                >
                  <LazyImage src={srcOf(photo, 'thumb')} alt={`Photo ${index + 1} sur ${total}`} />
                </button>
                {selected && <span className="pointer-events-none absolute inset-0 ring-2 ring-paper ring-inset" aria-hidden="true" />}
                {onToggle && (canSelect || selected) && (
                  <HeartButton
                    selected={selected}
                    label={`${selected ? 'Retirer' : 'Sélectionner'} la photo ${index + 1}`}
                    onToggle={() => onToggle(photo.id)}
                    className={clsx(
                      'absolute right-0 bottom-0',
                      // Toujours visible sur écran tactile ; au survol sur ordinateur, sauf si sélectionnée.
                      !selected && '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100'
                    )}
                  />
                )}
                {onDownload && (
                  <a
                    href={srcOf(photo, 'hd')}
                    download={photo.name}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Télécharger la photo ${index + 1} en haute définition`}
                    className="absolute right-0 bottom-0 flex h-11 w-11 items-center justify-center [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm">
                      <StatusIcon name="download" className="h-4 w-4" />
                    </span>
                  </a>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

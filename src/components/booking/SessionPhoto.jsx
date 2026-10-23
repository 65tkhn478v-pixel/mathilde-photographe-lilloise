import clsx from 'clsx'
import { SESSION_PHOTOS } from '../../data/sessionPhotos'
import { sessionLabel } from '../../../shared/booking.js'

/** Photo 4:5 d'un type de séance, ou fond de remplacement avec le libellé. */
export function SessionPhoto({ type, sizes = '(min-width: 1024px) 200px, 45vw', className, decorative = false }) {
  const photo = SESSION_PHOTOS[type]
  if (!photo) {
    return (
      <span
        className={clsx('flex aspect-[4/5] items-center justify-center bg-mist', className)}
        aria-hidden={decorative || undefined}
      >
        <span className="font-display px-2 text-center text-xl text-ink">{sessionLabel(type)}</span>
      </span>
    )
  }
  return (
    <img
      src={`${photo.base}-400.webp`}
      srcSet={`${photo.base}-400.webp 400w, ${photo.base}-800.webp 800w`}
      sizes={sizes}
      alt={decorative ? '' : photo.alt}
      loading="lazy"
      decoding="async"
      width="400"
      height="500"
      className={clsx('aspect-[4/5] object-cover', className)}
    />
  )
}

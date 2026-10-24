import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BookingCTA } from './BookingCTA'

const EXCLUDED = ['/reserver', '/contact', '/espace-mathilde']

/**
 * Barre de réservation fixe en bas d'écran (< 1024 px). Visible seulement
 * après le premier écran, quand aucun autre bouton plein « Réserver » n'est à
 * l'écran (hero…), et avant le bloc de fin de page / le footer : jamais deux
 * boutons « Réserver » visibles ensemble, jamais au-dessus du contenu final.
 * Contrôle par position au défilement (rAF), sans bibliothèque.
 */
export function MobileBookingBar() {
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  const excluded = EXCLUDED.some((p) => pathname.startsWith(p))
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (excluded) return undefined
    let frame = 0
    const check = () => {
      frame = 0
      const vh = window.innerHeight
      const inView = (el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.bottom > 0 && r.top < vh
      }
      const pastFirstScreen = window.scrollY > vh * 0.6
      const end = document.querySelector('[data-booking-end]') ?? document.querySelector('footer')
      const endReached = end ? end.getBoundingClientRect().top < vh : false
      const otherCta = [...document.querySelectorAll('[data-cta="booking"][data-variant="solid"]:not([data-bar])')].some(inView)
      const dialogOpen = Boolean(document.querySelector('[role="dialog"]'))
      setVisible(pastFirstScreen && !endReached && !otherCta && !dialogOpen)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Ouverture / fermeture du menu mobile (portail ajouté au body).
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [excluded, pathname])

  return (
    <AnimatePresence>
      {!excluded && visible && (
        <motion.aside
          key="barre-reservation"
          aria-label="Réservation"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
          data-testid="barre-reservation"
        >
          <BookingCTA variant="compact" data-bar="" />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

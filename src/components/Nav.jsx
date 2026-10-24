import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { BOOKING_LINK, NAV_LINKS, SITE_NAME } from '../data/site'

export function Nav() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [scrolled, setScrolled] = useState(() => !isHome || window.scrollY > 40)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isHome) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const transparent = isHome && !scrolled

  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-500',
        transparent ? 'bg-transparent' : 'bg-paper/95 backdrop-blur-sm border-b border-line'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <Link
          to="/"
          className={clsx(
            'font-label text-lg tracking-[0.15em]',
            transparent ? 'text-paper' : 'text-ink'
          )}
          aria-label={`${SITE_NAME} — accueil`}
        >
          ML
        </Link>

        <nav className="hidden md:block" aria-label="Navigation principale">
          <ul className="font-label flex items-center gap-8 text-sm tracking-[0.15em] uppercase">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'pb-1 border-b transition-colors duration-200',
                      transparent ? 'text-paper' : 'text-ink',
                      isActive
                        ? 'border-current'
                        : 'border-transparent hover:border-current/60'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink
                to={BOOKING_LINK.to}
                className={({ isActive }) =>
                  clsx(
                    'rounded-sm border px-4 py-2 transition-colors duration-200',
                    transparent
                      ? 'border-paper/70 text-paper hover:border-paper'
                      : 'border-ink/40 text-ink hover:border-ink',
                    isActive && (transparent ? 'border-paper' : 'border-ink')
                  )
                }
              >
                {BOOKING_LINK.label}
              </NavLink>
            </li>
          </ul>
        </nav>

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className={clsx(
                'md:hidden flex flex-col gap-1.5 p-2 -mr-2',
                transparent ? 'text-paper' : 'text-ink'
              )}
              aria-label="Ouvrir le menu"
            >
              <span className="h-px w-6 bg-current" />
              <span className="h-px w-6 bg-current" />
            </button>
          </Dialog.Trigger>

          <AnimatePresence>
            {open && (
              <Dialog.Portal forceMount>
                <Dialog.Overlay asChild forceMount>
                  <motion.div
                    className="fixed inset-0 z-50 bg-paper"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  />
                </Dialog.Overlay>
                <Dialog.Content asChild forceMount>
                  <motion.div
                    className="fixed inset-0 z-50 flex flex-col"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <VisuallyHidden asChild>
                      <Dialog.Title>Menu de navigation</Dialog.Title>
                    </VisuallyHidden>
                    <div className="flex items-center justify-between px-6 py-5">
                      <span className="font-label text-lg tracking-[0.15em] text-ink">ML</span>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="p-2 -mr-2 text-ink"
                          aria-label="Fermer le menu"
                        >
                          <span className="block text-2xl leading-none">×</span>
                        </button>
                      </Dialog.Close>
                    </div>
                    <nav
                      className="flex flex-1 flex-col items-center justify-center gap-8"
                      aria-label="Navigation principale"
                    >
                      {NAV_LINKS.map((link) => (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          end={link.to === '/'}
                          className={({ isActive }) =>
                            clsx(
                              'font-label text-3xl',
                              isActive ? 'text-accent' : 'text-ink'
                            )
                          }
                        >
                          {link.label}
                        </NavLink>
                      ))}
                      <NavLink
                        to={BOOKING_LINK.to}
                        className="font-label rounded-sm border border-ink/40 px-6 py-2 text-3xl text-ink"
                      >
                        {BOOKING_LINK.label}
                      </NavLink>
                    </nav>
                  </motion.div>
                </Dialog.Content>
              </Dialog.Portal>
            )}
          </AnimatePresence>
        </Dialog.Root>
      </div>
    </header>
  )
}

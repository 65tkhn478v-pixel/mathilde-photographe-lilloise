import { useEffect, useRef } from 'react'
import clsx from 'clsx'

/** Titre d'étape (H2) : reçoit le focus quand on arrive sur l'étape. */
export function StepHeading({ focusOnMount, children, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (focusOnMount) ref.current?.focus()
  }, [focusOnMount])
  return (
    <h2 ref={ref} tabIndex={-1} className={clsx('scroll-mt-32 text-3xl text-ink focus:outline-none md:text-4xl', className)}>
      {children}
    </h2>
  )
}

/** Choix sélectionnable (type de séance, créneau) : bordure caramel, plein moka une fois choisi. */
export const choiceClasses =
  'border border-structure bg-paper text-ink transition-colors duration-150 hover:border-ink data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-paper'

export const linkClasses = 'underline underline-offset-4 hover:text-accent'

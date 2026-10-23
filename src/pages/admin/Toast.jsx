import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StatusIcon } from '../../components/ui/StatusBadge'

const TONES = {
  confirmed: 'border-confirmed-line bg-confirmed-bg text-confirmed',
  declined: 'border-declined-line bg-declined-bg text-declined',
  neutral: 'border-line bg-paper text-ink',
}
const ICONS = { confirmed: 'check', declined: 'cross' }

/** Message de retour bref après une action (annoncé aux lecteurs d'écran). */
export function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(onDone, 4000)
    return () => clearTimeout(timer)
  }, [toast, onDone])

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center">
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-2 rounded-sm border px-4 py-3 text-sm shadow-sm ${TONES[toast.tone] ?? TONES.neutral}`}
          >
            <StatusIcon name={ICONS[toast.tone]} className="h-4 w-4" />
            {toast.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

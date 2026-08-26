import { motion } from 'framer-motion'

/**
 * Fade-up discret au scroll (MOTION_INTENSITY 4/10 — voir brief). Respecte
 * prefers-reduced-motion via <MotionConfig reducedMotion="user"> posé au
 * niveau de l'App.
 */
export function Reveal({ as = 'div', delay = 0, className, children, ...props }) {
  const Component = motion[as] ?? motion.div

  return (
    <Component
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  )
}

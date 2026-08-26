import { motion } from 'framer-motion'
import { Button } from './Button'
import { HOOK, TAGLINE } from '../data/site'

export function Hero() {
  return (
    <section className="relative flex h-[100svh] min-h-[560px] items-end overflow-hidden">
      <img
        src="/images/hero/hero-famille-chien.webp"
        alt="Un nouveau-né aux bras de sa mère, entouré de son père et de leur chien curieux, dans un moment de tendresse spontané."
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-ink/10"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-20 md:px-10 md:pb-28">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-xs tracking-[0.3em] text-ivory/80 uppercase"
        >
          Photographe lilloise
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-4 max-w-2xl text-4xl text-ivory italic md:text-6xl"
        >
          {TAGLINE}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-5 max-w-lg text-sm tracking-wide text-ivory/85 md:text-base"
        >
          {HOOK}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-9 flex flex-wrap gap-4"
        >
          <Button to="/contact" variant="primary" className="bg-terracotta hover:bg-ivory hover:text-ink">
            Me contacter
          </Button>
          <Button to="/portfolio" variant="ghost">
            Voir le portfolio
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

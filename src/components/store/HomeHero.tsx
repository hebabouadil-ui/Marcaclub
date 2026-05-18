'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface Props {
  title: string
  subtitle: string
}

export default function HomeHero({ title, subtitle }: Props) {
  return (
    <section
      className="relative bg-brand-black flex items-center justify-center overflow-hidden"
      style={{ minHeight: '70svh' }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-black via-brand-green/20 to-brand-black" />

      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto py-12">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-brand-gold text-[10px] md:text-xs tracking-[0.4em] uppercase mb-6 md:mb-8"
        >
          Collection Exclusive — Primark España
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-4xl md:text-6xl lg:text-7xl text-brand-white leading-none mb-4 md:mb-6"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-brand-white/50 text-sm md:text-base tracking-widest max-w-xl mx-auto mb-10 md:mb-14"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/products"
            className="group inline-flex items-center justify-center gap-2 bg-brand-gold text-brand-black px-8 py-4 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-brand-white transition-colors duration-300"
          >
            Voir la Collection
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/#live"
            className="inline-flex items-center justify-center gap-2 border border-brand-white/20 text-brand-white/80 px-8 py-4 text-xs tracking-[0.2em] uppercase hover:border-brand-gold hover:text-brand-gold transition-colors duration-300"
          >
            Live Sessions
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-14 flex flex-col items-center gap-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.svg
              key={i}
              width="20"
              height="12"
              viewBox="0 0 20 12"
              fill="none"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            >
              <path d="M1 1L10 10L19 1" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          ))}
        </motion.div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-24 left-8 text-brand-gold/10 font-display text-8xl font-bold pointer-events-none select-none">
        M
      </div>
      <div className="absolute bottom-12 right-8 text-brand-gold/10 font-display text-8xl font-bold pointer-events-none select-none">
        C
      </div>
    </section>
  )
}

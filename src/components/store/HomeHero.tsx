'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Globe, Shield, Zap } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface Props { title: string; subtitle: string; titleEn?: string; subtitleEn?: string }

export default function HomeHero({ title, subtitle, titleEn, subtitleEn }: Props) {
  const { tr, lang } = useLanguage()
  const displayTitle = lang === 'en' && titleEn ? titleEn : title
  const displaySubtitle = lang === 'en' && subtitleEn ? subtitleEn : subtitle

  return (
    <section className="relative bg-brand-black overflow-hidden h-[calc(100svh-4rem)] md:h-[calc(100svh-5rem)] min-h-[580px] flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full bg-brand-gold/5 blur-3xl pointer-events-none" />

      {/* Main content — perfectly centered */}
      <div className="relative z-10 text-center px-5 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 border border-brand-gold/20 bg-brand-gold/5 text-brand-gold text-[10px] md:text-[11px] tracking-[0.2em] uppercase px-3 md:px-4 py-1.5 md:py-2 rounded-full mb-5 md:mb-7 max-w-[300px] sm:max-w-none leading-relaxed">
          <Globe size={9} className="flex-shrink-0" /> {tr.hero.badge}
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-4 md:mb-5">
          {displayTitle}
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
          className="text-white/50 text-base max-w-xl mx-auto mb-7 md:mb-9 leading-relaxed px-2">
          {displaySubtitle}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-8 md:mb-10">
          <Link href="/products"
            className="group inline-flex items-center justify-center gap-2 bg-brand-gold text-brand-black px-7 py-3.5 md:py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-yellow-400 transition-colors duration-300">
            {tr.hero.shopNow} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/account/register"
            className="inline-flex items-center justify-center gap-2 border border-white/15 text-white/70 px-7 py-3.5 md:py-4 text-xs tracking-[0.2em] uppercase hover:border-brand-gold hover:text-brand-gold transition-colors duration-300">
            {tr.hero.createAccount}
          </Link>
        </motion.div>

        {/* Trust bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="flex flex-row items-center justify-center gap-4 sm:gap-10 flex-wrap">
          {[
            { icon: Globe, text: tr.hero.shipsWorldwide },
            { icon: Shield, text: tr.hero.securePayment },
            { icon: Zap, text: tr.hero.fastDelivery },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-white/30 text-[10px] sm:text-xs tracking-wider">
              <Icon size={11} className="text-brand-gold/60 flex-shrink-0" /> {text}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator — pinned to bottom, never in flow */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-[2px] h-12 bg-white/15 relative overflow-hidden rounded-full">
          <motion.div
            className="absolute top-0 left-0 w-full rounded-full"
            animate={{ y: ['-100%', '180%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ height: '45%', backgroundColor: '#C9A84C' }}
          />
        </div>
      </motion.div>
    </section>
  )
}

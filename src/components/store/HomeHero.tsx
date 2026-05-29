'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Globe, Shield, Zap } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { useDeliveryMessage } from '@/lib/hooks/useDeliveryMessage'

interface Props { title: string; subtitle: string; titleEn?: string; subtitleEn?: string }

export default function HomeHero({ title, subtitle, titleEn, subtitleEn }: Props) {
  const { tr, lang } = useLanguage()
  const { message: deliveryMsg } = useDeliveryMessage()
  const displayTitle = lang === 'en' && titleEn ? titleEn : title
  const displaySubtitle = lang === 'en' && subtitleEn ? subtitleEn : subtitle

  return (
    <section className="relative bg-brand-black flex items-center justify-center overflow-hidden min-h-[100svh] md:min-h-[75svh]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-gold/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-16 pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 border border-brand-gold/20 bg-brand-gold/5 text-brand-gold text-[10px] tracking-[0.3em] uppercase px-4 py-2 rounded-full mb-8">
          <Globe size={10} /> {tr.hero.badge}
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-4xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
          {displayTitle}
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
          className="text-white/50 text-sm md:text-base max-w-2xl mx-auto mb-10 leading-relaxed">
          {displaySubtitle}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
          <Link href="/products"
            className="group inline-flex items-center justify-center gap-2 bg-brand-gold text-brand-black px-8 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-yellow-400 transition-colors duration-300">
            {tr.hero.shopNow} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/products?featured=true"
            className="inline-flex items-center justify-center gap-2 border border-white/15 text-white/70 px-8 py-4 text-xs tracking-[0.2em] uppercase hover:border-brand-gold hover:text-brand-gold transition-colors duration-300">
            {tr.hero.newArrivals}
          </Link>
        </motion.div>

        {/* Trust bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          {[
            { icon: Globe, text: tr.hero.shipsWorldwide },
            { icon: Shield, text: tr.hero.securePayment },
            { icon: Zap, text: deliveryMsg || tr.hero.fastDelivery },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-white/30 text-xs tracking-wider">
              <Icon size={13} className="text-brand-gold/60" /> {text}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator — single animated line */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-white/20 text-[9px] tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-px h-10 bg-white/10 relative" style={{ overflow: 'hidden', isolation: 'isolate' }}>
          <motion.div
            className="absolute top-0 left-0 w-full bg-brand-gold"
            animate={{ y: ['0%', '160%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ height: '40%' }}
          />
        </div>
      </motion.div>
    </section>
  )
}

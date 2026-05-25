'use client'
import { motion } from 'framer-motion'
import InstagramIcon from '@/components/ui/InstagramIcon'
import { useLanguage } from '@/lib/i18n'
import { Sparkles, Globe, Star } from 'lucide-react'

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.53V6.75a4.85 4.85 0 0 1-1.02-.06z" />
    </svg>
  )
}

interface Props {
  liveStatus: boolean
  instagramUrl: string
  tiktokUrl: string
}

const stats = [
  { icon: Star, value: '4.9★', label: { fr: 'Note moyenne', en: 'Average rating' } },
  { icon: Globe, value: '30+', label: { fr: 'Pays livrés', en: 'Countries shipped' } },
  { icon: Sparkles, value: '100%', label: { fr: 'Satisfait ou remboursé', en: 'Satisfaction guaranteed' } },
]

export default function HomeLiveSection({ instagramUrl, tiktokUrl }: Props) {
  const { tr, lang } = useLanguage()
  return (
    <section id="community" className="py-20 md:py-28 bg-brand-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-3 gap-4 mb-20 max-w-2xl mx-auto"
        >
          {stats.map(({ icon: Icon, value, label }, i) => (
            <motion.div
              key={value}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <Icon size={16} className="text-brand-gold/50 mx-auto mb-2" />
              <p className="font-display text-2xl md:text-3xl text-brand-white">{value}</p>
              <p className="text-white/30 text-[10px] tracking-widest uppercase mt-1">{label[lang]}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Main content */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-4">{tr.live.title}</p>
            <h2 className="font-display text-3xl md:text-5xl text-brand-white leading-tight mb-6">
              {tr.live.subtitle}
            </h2>
            <p className="text-brand-white/40 text-sm md:text-base leading-relaxed mb-10 max-w-md">
              {tr.live.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-7 py-3.5 text-xs tracking-[0.2em] uppercase font-semibold hover:opacity-90 transition-opacity"
              >
                <InstagramIcon size={16} />
                {tr.live.followInstagram}
              </a>
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 border border-white/20 text-brand-white/80 px-7 py-3.5 text-xs tracking-[0.2em] uppercase font-semibold hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                <TikTokIcon />
                {tr.live.followTikTok}
              </a>
            </div>
          </motion.div>

          {/* Right: decorative brand card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative hidden md:block"
          >
            <div className="border border-white/8 p-8 relative overflow-hidden">
              {/* subtle grid */}
              <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              <div className="relative z-10">
                <p className="text-brand-gold font-display text-2xl mb-1">MARCACLUB</p>
                <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-8">Global Store</p>
                <div className="space-y-4">
                  {[
                    { fr: 'Accessoires auto sélectionnés', en: 'Curated car accessories' },
                    { fr: 'Qualité testée & approuvée', en: 'Tested & approved quality' },
                    { fr: 'Livraison mondiale rapide', en: 'Fast worldwide shipping' },
                    { fr: 'Support client dédié', en: 'Dedicated customer support' },
                  ].map((item) => (
                    <div key={item.en} className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-brand-gold/60 flex-shrink-0" />
                      <p className="text-white/50 text-sm tracking-wide">{item[lang]}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-white/8">
                  <p className="text-white/20 text-[10px] tracking-widest uppercase">
                    {lang === 'fr' ? 'Mode exclusive · Depuis 2024' : 'Exclusive fashion · Since 2024'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

'use client'
import { motion } from 'framer-motion'
import InstagramIcon from '@/components/ui/InstagramIcon'
import { useLanguage } from '@/lib/i18n'

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

export default function HomeLiveSection({ liveStatus, instagramUrl, tiktokUrl }: Props) {
  const { tr } = useLanguage()
  return (
    <section id="live" className="py-16 md:py-24 bg-brand-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-4">{tr.live.title}</p>
            <h2 className="font-display text-3xl md:text-5xl text-brand-white mb-6">{tr.live.subtitle}</h2>
            <p className="text-brand-white/50 text-sm md:text-base leading-relaxed mb-10 max-w-xl mx-auto">
              {tr.live.description}
            </p>
          </motion.div>

          {liveStatus ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-3 bg-red-600 px-6 py-3 rounded-full">
                <div className="w-2.5 h-2.5 bg-white rounded-full live-dot" />
                <span className="text-white font-semibold tracking-widest uppercase text-sm">{tr.live.liveNow}</span>
              </div>
              <div className="flex gap-4">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-6 py-3 text-sm font-semibold tracking-wider"
                >
                  <InstagramIcon size={16} />
                  {tr.live.joinInstagram}
                </a>
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#010101] border border-white/20 text-white px-6 py-3 text-sm font-semibold tracking-wider"
                >
                  <TikTokIcon />
                  {tr.live.joinTikTok}
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-white/20 text-brand-white/80 px-8 py-4 text-xs tracking-[0.2em] uppercase hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                <InstagramIcon size={16} />
                {tr.live.followInstagram}
              </a>
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-white/20 text-brand-white/80 px-8 py-4 text-xs tracking-[0.2em] uppercase hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                <TikTokIcon />
                {tr.live.followTikTok}
              </a>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}

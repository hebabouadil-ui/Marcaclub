'use client'
import { motion } from 'framer-motion'
import InstagramIcon from '@/components/ui/InstagramIcon'
import { useLanguage } from '@/lib/i18n'

interface Props {
  liveStatus: boolean
  liveUrl?: string
  instagramUrl: string
  tiktokUrl: string
}

export default function LiveBanner({ liveStatus, liveUrl, instagramUrl }: Props) {
  const { tr } = useLanguage()
  if (!liveStatus) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white"
    >
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full live-dot" />
          <span className="text-sm font-semibold tracking-widest uppercase">
            {tr.liveBanner.text}
          </span>
          <div className="w-2 h-2 bg-white rounded-full live-dot" />
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <a
            href={liveUrl || instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            <InstagramIcon size={12} />
            {tr.liveBanner.join}
          </a>
        </div>
      </div>
    </motion.div>
  )
}

'use client'
import { motion } from 'framer-motion'

interface Props {
  text: string
  active: boolean
}

export default function AnnouncementBar({ text, active }: Props) {
  if (!active) return null
  return (
    <div className="bg-brand-black text-brand-beige text-[11px] tracking-[0.15em] uppercase overflow-hidden h-9 flex items-center">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="flex whitespace-nowrap"
      >
        {[text, text, text, text].map((t, i) => (
          <span key={i} className="mx-8">{t} •</span>
        ))}
      </motion.div>
    </div>
  )
}

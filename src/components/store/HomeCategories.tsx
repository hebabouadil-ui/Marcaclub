'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/i18n'
import { Sparkles, Droplets, Wind, Star } from 'lucide-react'

const items = [
  { icon: Sparkles, slug: 'soins-visage',  fr: 'Soins Visage',   en: 'Face Care',   sub: { fr: 'Sérums, crèmes & masques', en: 'Serums, creams & masks' } },
  { icon: Droplets, slug: 'soins-corps',   fr: 'Soins Corps',    en: 'Body Care',   sub: { fr: 'Hydratation & nutrition', en: 'Hydration & nourishment' } },
  { icon: Wind,     slug: 'soins-cheveux', fr: 'Soins Cheveux',  en: 'Hair Care',   sub: { fr: 'Shampoings & soins', en: 'Shampoos & treatments' } },
  { icon: Star,     slug: 'maquillage',    fr: 'Maquillage',     en: 'Makeup',      sub: { fr: 'Teint, yeux & lèvres', en: 'Foundation, eyes & lips' } },
]

export default function HomeCategories() {
  const { tr, lang } = useLanguage()

  return (
    <section className="pt-16 md:pt-24 pb-8 md:pb-12 bg-brand-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-3">{tr.categories.explore}</p>
          <h2 className="font-display text-3xl md:text-4xl text-brand-black">{tr.categories.title}</h2>
          <p className="text-brand-gray text-sm mt-3 max-w-sm mx-auto">
            {lang === 'fr' ? 'Beauté & skincare — sélection premium livrée partout' : 'Beauty & skincare — premium selection delivered worldwide'}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {items.map(({ icon: Icon, slug, fr, en, sub }, i) => (
            <motion.div
              key={en}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={`/products?category=${slug}`}
                className="group block bg-brand-light-gray hover:bg-brand-black transition-colors duration-300 p-6 md:p-8 text-center"
              >
                <Icon size={20} className="mx-auto mb-3 text-brand-gray group-hover:text-brand-gold transition-colors" strokeWidth={1.5} />
                <p className="font-display text-lg md:text-xl text-brand-black group-hover:text-brand-gold transition-colors mb-1">
                  {lang === 'fr' ? fr : en}
                </p>
                <p className="text-xs text-brand-gray group-hover:text-brand-white/50 transition-colors tracking-wide">
                  {lang === 'fr' ? sub.fr : sub.en}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

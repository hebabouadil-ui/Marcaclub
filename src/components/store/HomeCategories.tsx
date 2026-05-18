'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

const categories = [
  { label: 'Femme', value: 'femme', description: 'Robes, tops, pantalons' },
  { label: 'Homme', value: 'homme', description: 'T-shirts, jeans, vestes' },
  { label: 'Accessoires', value: 'accessoires', description: 'Sacs, bijoux, ceintures' },
  { label: 'Nouveautés', value: 'featured=true', description: 'Derniers arrivages' },
]

export default function HomeCategories() {
  return (
    <section className="py-16 md:py-24 bg-brand-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-2">Explorer</p>
          <h2 className="font-display text-3xl md:text-4xl text-brand-black">Nos Catégories</h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={`/products${cat.value ? `?${cat.value.includes('=') ? cat.value : `category=${cat.value}`}` : ''}`}
                className="group block bg-brand-light-gray hover:bg-brand-black transition-colors duration-300 p-8 md:p-10 text-center"
              >
                <p className="font-display text-xl md:text-2xl text-brand-black group-hover:text-brand-gold transition-colors mb-1">
                  {cat.label}
                </p>
                <p className="text-xs text-brand-gray group-hover:text-brand-white/50 transition-colors tracking-wide">
                  {cat.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'
import { ArrowRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface Props {
  products: Array<{
    _id: string
    name: string
    slug: string
    price: number
    originalPrice?: number
    images: string[]
    stock: number
    sizes: Array<{ size: string; stock: number }>
    category: string
    cjPid?: string
    shippingBakedUSD?: number
  }>
}

export default function FeaturedProducts({ products }: Props) {
  const { tr } = useLanguage()
  return (
    <section id="featured" className="pt-12 md:pt-16 pb-16 md:pb-24 bg-brand-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10 md:mb-14"
        >
          <div>
            <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-3">{tr.featured.label}</p>
            <h2 className="font-display text-3xl md:text-4xl text-brand-black">{tr.featured.title}</h2>
          </div>
          <Link
            href="/products"
            className="hidden md:flex items-center gap-2 text-xs tracking-widest uppercase text-brand-gray hover:text-brand-gold transition-colors"
          >
            {tr.featured.viewAll} <ArrowRight size={14} />
          </Link>
        </motion.div>

        {products.length === 0 ? (
          <div className="text-center py-20 text-brand-gray">
            <p className="font-display text-2xl mb-2">{tr.featured.comingSoon}</p>
            <p className="text-sm tracking-widest">{tr.featured.comingSoonSub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 border border-brand-black text-brand-black px-8 py-3 text-xs tracking-[0.2em] uppercase hover:bg-brand-black hover:text-brand-white transition-colors duration-300"
          >
            {tr.featured.viewCollection} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}

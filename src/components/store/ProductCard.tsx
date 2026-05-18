'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye } from 'lucide-react'

interface Props {
  product: {
    _id: string
    name: string
    slug: string
    price: number
    originalPrice?: number
    images: string[]
    stock: number
    sizes: string[]
    category: string
  }
}

export default function ProductCard({ product }: Props) {
  const [hovered, setHovered] = useState(false)
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null

  const hasSecond = product.images.length > 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-brand-light-gray">
        {/* Primary image */}
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-brand-light-gray flex items-center justify-center">
            <span className="text-brand-gray text-xs tracking-widest uppercase">Marcaclub</span>
          </div>
        )}

        {/* Second image crossfade on hover */}
        <AnimatePresence>
          {hovered && hasSecond && (
            <motion.div
              key="hover-img"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              <Image
                src={product.images[1]}
                alt={product.name}
                fill
                className="object-cover scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {product.stock <= 3 && product.stock > 0 && (
            <span className="bg-brand-black text-brand-beige text-[9px] tracking-widest px-2 py-0.5 uppercase">
              Dernières pièces
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-brand-gray text-white text-[9px] tracking-widest px-2 py-0.5 uppercase">
              Épuisé
            </span>
          )}
          {discount && (
            <span className="bg-brand-gold text-brand-black text-[9px] font-bold tracking-widest px-2 py-0.5 uppercase">
              -{discount}%
            </span>
          )}
        </div>

        {/* Hover actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 right-0 p-3 flex gap-2 z-10"
        >
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-black/90 text-brand-white text-xs tracking-widest uppercase py-2.5 hover:bg-brand-gold hover:text-brand-black transition-colors duration-200"
          >
            <Eye size={14} />
            Voir
          </Link>
        </motion.div>
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <p className="text-[10px] text-brand-gray tracking-widest uppercase mb-1">
          {product.category}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="block text-brand-black font-medium text-sm leading-tight hover:text-brand-gold transition-colors truncate"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-brand-black font-semibold text-sm">
            {product.price.toFixed(2)} MAD
          </span>
          {product.originalPrice && (
            <span className="text-brand-gray text-xs line-through">
              {product.originalPrice.toFixed(2)} MAD
            </span>
          )}
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {product.sizes.slice(0, 4).map((s) => (
            <span
              key={s}
              className="text-[9px] tracking-wider border border-brand-light-gray text-brand-gray px-1.5 py-0.5 uppercase"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

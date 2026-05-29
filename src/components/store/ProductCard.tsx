'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useLanguage } from '@/lib/i18n'

// Beauty placeholder shown when product image fails to load
const PLACEHOLDER = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop&auto=format'

interface Props {
  product: {
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
    onSale?: boolean
  }
}

export default function ProductCard({ product }: Props) {
  const [hovered, setHovered] = useState(false)
  const [img0Src, setImg0Src] = useState(product.images?.[0] || PLACEHOLDER)
  const [img1Src, setImg1Src] = useState(product.images?.[1] || null)
  const { format } = useCurrency()
  const { tr, lang } = useLanguage()

  const displayPrice = product.price
  const originalDisplay = product.originalPrice

  const discount = originalDisplay && originalDisplay > displayPrice
    ? Math.round(((originalDisplay - displayPrice) / originalDisplay) * 100)
    : null

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="relative w-full overflow-hidden bg-[#f8f8f8]" style={{ paddingBottom: '100%' }}>
          {/* Primary image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img0Src}
            alt={product.name}
            loading="lazy"
            width={400}
            height={400}
            onError={() => setImg0Src(PLACEHOLDER)}
            className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 ${hovered && img1Src ? 'opacity-0' : 'opacity-100'}`}
          />
          {/* Hover image */}
          {img1Src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img1Src}
              alt={product.name}
              loading="lazy"
              width={400}
              height={400}
              onError={() => setImg1Src(null)}
              className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 ${hovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
            />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
            {product.onSale && (
              <span className="bg-red-500 text-white text-[9px] font-bold tracking-widest px-2 py-0.5 uppercase">
                {lang === 'en' ? 'Sale' : 'Soldes'}
              </span>
            )}
            {product.stock <= 3 && product.stock > 0 && (
              <span className="bg-brand-black text-brand-beige text-[9px] tracking-widest px-2 py-0.5 uppercase">
                {tr.productCard.lastItems}
              </span>
            )}
            {product.stock === 0 && (
              <span className="bg-brand-gray text-white text-[9px] tracking-widest px-2 py-0.5 uppercase">
                {tr.productCard.outOfStock}
              </span>
            )}
            {discount && (
              <span className="bg-brand-gold text-brand-black text-[9px] font-bold tracking-widest px-2 py-0.5 uppercase">
                -{discount}%
              </span>
            )}
          </div>

          {/* Hover CTA */}
          <div className={`absolute bottom-0 left-0 right-0 p-3 z-10 transition-all duration-200 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="flex items-center justify-center gap-2 bg-brand-black/90 text-brand-white text-xs tracking-widest uppercase py-2.5 hover:bg-brand-gold hover:text-brand-black transition-colors duration-200">
              <Eye size={14} />
              {tr.productCard.view}
            </div>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="mt-3 px-1">
        <p className="text-[10px] text-brand-gray tracking-widest uppercase mb-1">{product.category}</p>
        <Link
          href={`/products/${product.slug}`}
          className="block text-brand-black font-medium text-sm leading-tight hover:text-brand-gold transition-colors truncate"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-brand-black font-semibold text-sm">{format(displayPrice)}</span>
          {originalDisplay && originalDisplay > displayPrice && (
            <span className="text-brand-gray text-xs line-through">{format(originalDisplay)}</span>
          )}
          {product.cjPid && (
            <span className="text-brand-gray text-[10px]">+ {lang === 'en' ? 'Shipping' : 'Livraison'}</span>
          )}
        </div>
      </div>
    </div>
  )
}

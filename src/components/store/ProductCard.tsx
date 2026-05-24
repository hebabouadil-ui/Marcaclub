'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye } from 'lucide-react'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useLanguage } from '@/lib/i18n'

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
  }
}

export default function ProductCard({ product }: Props) {
  const [hovered, setHovered] = useState(false)
  const { format } = useCurrency()
  const { tr } = useLanguage()
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null

  const img0 = product.images?.[0] || null
  const img1 = product.images?.[1] || null
  const isExternal = (url: string) => !url.includes('cloudinary.com')
  const unopt0 = img0 ? isExternal(img0) : false
  const unopt1 = img1 ? isExternal(img1) : false

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="relative w-full overflow-hidden bg-white" style={{ paddingBottom: '100%' }}>
          {img0 ? (
            <>
              <Image
                src={img0}
                alt={product.name}
                fill
                unoptimized={unopt0}
                className={`object-contain transition-all duration-500 ${hovered && img1 ? 'opacity-0' : 'opacity-100'}`}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {img1 && (
                <Image
                  src={img1}
                  alt={product.name}
                  fill
                  unoptimized={unopt1}
                  className={`object-contain transition-all duration-500 ${hovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-brand-gray text-xs tracking-widest uppercase">Marcaclub</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
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
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-brand-black font-semibold text-sm">{format(product.price)}</span>
          {product.originalPrice && (
            <span className="text-brand-gray text-xs line-through">{format(product.originalPrice)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

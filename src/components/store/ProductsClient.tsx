'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'
import SkeletonCard from '@/components/ui/SkeletonCard'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
  filters: { category?: string; q?: string }
  hideHeader?: boolean
}

export default function ProductsClient({ products, filters, hideHeader }: Props) {
  const router = useRouter()
  const { tr, lang } = useLanguage()
  const [search, setSearch] = useState(filters.q || '')
  const [loading] = useState(false)
  const CATEGORIES = [tr.products.all, 'soins-visage', 'soins-corps', 'soins-cheveux', 'maquillage', 'autres']
  const CATEGORY_LABELS: Record<string, string> = {
    'soins-visage': lang === 'fr' ? 'Visage' : 'Face Care',
    'soins-corps': lang === 'fr' ? 'Corps' : 'Body Care',
    'soins-cheveux': lang === 'fr' ? 'Cheveux' : 'Hair Care',
    'maquillage': lang === 'fr' ? 'Maquillage' : 'Makeup',
    'autres': lang === 'fr' ? 'Autres' : 'Other',
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (filters.category) params.set('category', filters.category)
    router.push(`/products?${params.toString()}`)
  }

  const handleCategory = (cat: string) => {
    const params = new URLSearchParams()
    if (cat !== tr.products.all) params.set('category', cat)
    if (search) params.set('q', search)
    router.push(`/products?${params.toString()}`)
  }

  return (
    <div>
      {/* Page Header */}
      {!hideHeader && (
        <div className="bg-brand-black text-brand-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-3">{tr.nav.shop}</p>
            <h1 className="font-display text-4xl md:text-6xl">
              {filters.category ? (CATEGORY_LABELS[filters.category] ?? filters.category) : tr.products.title}
            </h1>
            <p className="text-brand-white/40 text-sm mt-3 tracking-widest">
              {tr.products.available(products.length)}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr.products.search}
              className="w-full pl-10 pr-4 py-3 border border-brand-light-gray bg-transparent text-sm focus:outline-none focus:border-brand-black transition-colors"
            />
          </form>
          <div className="flex gap-2 items-center overflow-x-auto pb-1 sm:pb-0">
            <SlidersHorizontal size={14} className="text-brand-gray flex-shrink-0" />
            {CATEGORIES.map((cat) => {
              const active = cat === tr.products.all ? !filters.category : filters.category === cat
              return (
                <button
                  key={cat}
                  onClick={() => handleCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 text-xs tracking-widest uppercase transition-colors ${
                    active
                      ? 'bg-brand-black text-brand-white'
                      : 'border border-brand-light-gray text-brand-gray hover:border-brand-black hover:text-brand-black'
                  }`}
                >
                  {cat === tr.products.all ? cat : (CATEGORY_LABELS[cat] ?? cat)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 text-brand-gray"
          >
            <p className="font-display text-2xl mb-2">{tr.products.noResults}</p>
            <p className="text-sm tracking-widest">{tr.products.noResultsSub}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

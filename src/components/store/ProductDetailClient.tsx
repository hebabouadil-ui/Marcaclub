'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ChevronLeft, ChevronRight, ArrowRight, ShoppingCart, Truck, MapPin } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useLanguage } from '@/lib/i18n'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SizeEntry {
  size: string
  stock: number
  cjVid?: string
  variantPrice?: number
}

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  stock: number
  sizes: SizeEntry[]
  category: string
  cjPid?: string
  cjLogisticName?: string
  productWeight?: number
}

interface ShippingOption {
  logisticName: string
  logisticNameEn: string
  logisticPrice: number
  agingMin: number
  agingMax: number
}

const swipeVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const swipeTransition = { duration: 0.4, ease: 'easeInOut' as const }

export default function ProductDetailClient({ product, detectedCountry }: { product: Product; detectedCountry?: string }) {
  const [[imgIdx, dir], setPage] = useState([0, 0])
  const [selectedSize, setSelectedSize] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const router = useRouter()
  const { format } = useCurrency()
  const { tr } = useLanguage()

  const [shipping, setShipping] = useState<ShippingOption | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [userCountry, setUserCountry] = useState(detectedCountry || '')

  useEffect(() => {
    setAdded(false)
    setSelectedSize('')
    setQty(1)
  }, [product._id])

  // Detect country and fetch shipping if this is a CJ product
  useEffect(() => {
    if (!product.cjPid) return

    const loadShipping = async (country: string) => {
      if (!country) return
      setShippingLoading(true)
      try {
        const firstSize = product.sizes?.find((s) => s.cjVid)
        const vid = firstSize?.cjVid ?? ''
        const weight = product.productWeight ?? 200
        const params = new URLSearchParams({ country, weight: String(weight) })
        if (vid) params.set('vid', vid)
        const res = await fetch(`/api/shipping?${params}`)
        const data = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options: ShippingOption[] = (data.options ?? []).map((opt: any) => {
          let agingMin = opt.agingMin ?? opt.ageMin ?? 0
          let agingMax = opt.agingMax ?? opt.ageMax ?? 0
          if (!agingMin || !agingMax) {
            const s = opt.logisticAging ?? opt.logisticAge ?? opt.aging ?? opt.deliveryTime ?? ''
            if (s) { const p = String(s).split('-'); agingMin = parseInt(p[0]) || 0; agingMax = parseInt(p[1] ?? p[0]) || 0 }
          }
          return { ...opt, agingMin, agingMax }
        })
        if (options.length === 0) return

        // Prefer the stored logistic name, else fastest affordable option
        const preferred = product.cjLogisticName
          ? options.find((o) => o.logisticName === product.cjLogisticName)
          : null
        setShipping(preferred ?? options.sort((a, b) => a.agingMin - b.agingMin)[0])
      } catch {
        // ignore shipping errors — not critical
      } finally {
        setShippingLoading(false)
      }
    }

    if (detectedCountry) {
      setUserCountry(detectedCountry)
      loadShipping(detectedCountry)
    } else {
      // Fallback: ask Vercel geo
      fetch('/api/geo')
        .then((r) => r.json())
        .then((d) => {
          const c = d.countryCode || 'US'
          setUserCountry(c)
          loadShipping(c)
        })
        .catch(() => loadShipping('US'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id, product.cjPid])

  const sizes = product.sizes ?? []
  const images = product.images ?? []
  const isExternal = (url: string) => !url.includes('cloudinary.com')

  const selectedSizeEntry = sizes.find((s) => s.size === selectedSize)
  const selectedStock = selectedSizeEntry?.stock ?? 0
  const totalStock = sizes.reduce((s, i) => s + i.stock, 0)

  // Price: use variant-specific price if available, else product price
  const displayPrice = selectedSizeEntry?.variantPrice
    ? selectedSizeEntry.variantPrice
    : product.price

  const originalPrice = product.originalPrice
  const discount = originalPrice && displayPrice < originalPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : null

  const goTo = (idx: number) => {
    if (idx === imgIdx) return
    setPage([idx, idx > imgIdx ? 1 : -1])
  }
  const prev = () => setPage(([i]) => [(i - 1 + images.length) % images.length, -1])
  const next = () => setPage(([i]) => [(i + 1) % images.length, 1])

  const handleAddToCart = () => {
    if (!selectedSize) { toast.error(tr.product?.chooseSize ?? 'Veuillez choisir une taille'); return }
    if (selectedStock === 0) { toast.error('Taille épuisée'); return }
    addItem({
      productId: product._id,
      name: product.name,
      price: displayPrice,
      quantity: qty,
      size: selectedSize,
      image: images[0] || '',
      stock: selectedStock,
    })
    setAdded(true)
  }

  const handleGoToCheckout = () => {
    if (!selectedSize) { toast.error(tr.product?.chooseSize ?? 'Veuillez choisir une taille'); return }
    if (selectedStock === 0) { toast.error('Taille épuisée'); return }
    if (!added) {
      addItem({
        productId: product._id,
        name: product.name,
        price: displayPrice,
        quantity: qty,
        size: selectedSize,
        image: images[0] || '',
        stock: selectedStock,
      })
    }
    router.push('/checkout')
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs tracking-widest uppercase text-brand-gray mb-4 md:mb-8">
          <Link href="/" className="hover:text-brand-black transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-black transition-colors">Collection</Link>
          <span>/</span>
          <span className="text-brand-black truncate max-w-[160px]">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-[1fr_420px] gap-5 md:gap-8 lg:gap-12 items-start">
          {/* Images */}
          <div className="space-y-3">
            <div style={{ position: 'relative', width: '100%', height: '300px', overflow: 'hidden', background: 'white' }}>
              <AnimatePresence initial={false} custom={dir}>
                <motion.div
                  key={imgIdx}
                  custom={dir}
                  variants={swipeVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={swipeTransition}
                  style={{ position: 'absolute', inset: 0, background: 'white', overflow: 'hidden' }}
                >
                  {images[imgIdx] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={images[imgIdx]}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="text-brand-gray text-xs tracking-widest uppercase">Marcaclub</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-2.5 shadow-md transition-all hover:scale-110 active:scale-95">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-2.5 shadow-md transition-all hover:scale-110 active:scale-95">
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => goTo(i)}
                        className={`rounded-full transition-all duration-300 ${i === imgIdx ? 'w-6 h-2 bg-white shadow' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => goTo(i)}
                    className={`relative flex-shrink-0 w-14 overflow-hidden border-2 transition-all duration-200 ${i === imgIdx ? 'border-brand-black opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
                    style={{ height: '72px' }}>
                    <Image src={img} alt="" fill unoptimized={isExternal(img)} className="object-contain bg-white" sizes="56px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="flex flex-col">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-2">{product.category}</p>
              <h1 className="font-display text-2xl md:text-3xl text-brand-black leading-tight mb-4">{product.name}</h1>

              {/* Price */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-brand-black">{format(displayPrice)}</span>
                {originalPrice && originalPrice > displayPrice && (
                  <>
                    <span className="text-brand-gray line-through text-base">{format(originalPrice)}</span>
                    {discount && <span className="bg-brand-gold text-brand-black text-xs font-bold px-2 py-0.5">-{discount}%</span>}
                  </>
                )}
              </div>
              {selectedSizeEntry?.variantPrice && selectedSizeEntry.variantPrice !== product.price && (
                <p className="text-xs text-brand-gray mb-4">Price for selected variant</p>
              )}

              {/* Stock status */}
              <div className="mb-6">
                {totalStock === 0 ? (
                  <span className="text-sm text-brand-gray tracking-widest uppercase">Épuisé</span>
                ) : selectedSize ? (
                  selectedStock === 0 ? (
                    <span className="text-sm text-red-500 tracking-widest uppercase">Taille épuisée</span>
                  ) : selectedStock <= 5 ? (
                    <span className="text-sm text-amber-600 tracking-widest uppercase">Plus que {selectedStock} en stock</span>
                  ) : (
                    <span className="text-sm text-green-600 tracking-widest uppercase">{selectedStock} en stock</span>
                  )
                ) : (
                  <span className="text-sm text-green-600 tracking-widest uppercase">En stock</span>
                )}
              </div>

              {/* Sizes */}
              {sizes.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs tracking-[0.2em] uppercase text-brand-gray mb-3">
                    Taille — <span className="text-brand-black">{selectedSize || 'Choisir'}</span>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {sizes.map(({ size: s, stock: sStock, variantPrice: vp }) => {
                      // If name is long (full product title), extract just the short part after the last comma
                      const label = s.length > 30
                        ? (s.split(',').pop()?.trim() ?? s).replace(/^\s*\d+\s*/,'').trim() || s.split(' ').slice(-2).join(' ')
                        : s
                      return (
                        <button
                          key={s}
                          onClick={() => { setSelectedSize(s); setQty(1); setAdded(false) }}
                          disabled={sStock === 0}
                          className={`px-3 py-2 text-xs border-2 transition-all duration-200 text-center leading-tight ${
                            sStock === 0
                              ? 'border-brand-light-gray text-brand-gray/40 cursor-not-allowed line-through'
                              : selectedSize === s
                              ? 'border-brand-black bg-brand-black text-brand-white'
                              : 'border-brand-light-gray text-brand-black hover:border-brand-black'
                          }`}
                        >
                          <span>{label}</span>
                          {vp && vp !== product.price && (
                            <span className="block text-[9px] leading-none opacity-60 mt-0.5">{format(vp)}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-7">
                <p className="text-xs tracking-[0.2em] uppercase text-brand-gray mb-3">Quantité</p>
                <div className="flex items-center border border-brand-light-gray w-fit">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors">−</button>
                  <span className="w-10 h-10 flex items-center justify-center text-sm font-medium">{qty}</span>
                  <button onClick={() => setQty((q) => selectedSize ? Math.min(selectedStock, q + 1) : q + 1)} className="w-10 h-10 flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors">+</button>
                </div>
              </div>

              {/* CTA buttons */}
              {totalStock === 0 ? (
                <button disabled className="w-full flex items-center justify-center gap-3 py-4 text-sm tracking-[0.2em] uppercase font-semibold bg-brand-light-gray text-brand-gray cursor-not-allowed">
                  <ShoppingBag size={18} /> Épuisé
                </button>
              ) : !added ? (
                <button
                  onClick={handleAddToCart}
                  disabled={!!selectedSize && selectedStock === 0}
                  className="w-full flex items-center justify-center gap-3 py-4 text-sm tracking-[0.2em] uppercase font-semibold transition-all duration-300 bg-brand-black text-brand-white hover:bg-brand-gold hover:text-brand-black disabled:bg-brand-light-gray disabled:text-brand-gray disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={18} />
                  Ajouter au panier
                </button>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key="added-state" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                    <button onClick={handleGoToCheckout}
                      className="w-full flex items-center justify-center gap-3 py-4 text-sm tracking-[0.2em] uppercase font-semibold bg-brand-gold text-brand-black hover:bg-brand-black hover:text-brand-white transition-all duration-300">
                      <ShoppingCart size={18} /> Commander maintenant
                    </button>
                    <button onClick={() => setAdded(false)}
                      className="w-full flex items-center justify-center gap-3 py-3 text-xs tracking-[0.2em] uppercase border border-brand-light-gray text-brand-gray hover:border-brand-black hover:text-brand-black transition-all duration-300">
                      <ArrowRight size={14} /> Continuer mes achats
                    </button>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Shipping estimate — shipping cost is baked into the product price, shown as free */}
              <div className="mt-5 border border-brand-light-gray p-4">
                {shippingLoading ? (
                  <div className="flex items-center gap-2 text-xs text-brand-gray">
                    <Truck size={14} className="animate-pulse" />
                    <span>Calcul de la livraison...</span>
                  </div>
                ) : shipping ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-brand-black font-medium">
                        <Truck size={14} />
                        <span>Livraison gratuite</span>
                      </div>
                      <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 font-semibold tracking-wide">GRATUIT</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-brand-gray">
                      <MapPin size={12} />
                      <span>
                        Livraison vers <strong>{userCountry}</strong> en {shipping.agingMin > 0 ? `${shipping.agingMin}–${shipping.agingMax}` : '7–20'} jours
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-brand-black font-medium flex items-center gap-2"><Truck size={14} /> Livraison gratuite</p>
                    <p className="text-xs text-brand-gray flex items-center gap-2">Délai estimé : 7–15 jours ouvrés</p>
                    <p className="text-xs text-brand-gray">✓ Paiement sécurisé</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="mt-6 pt-6 border-t border-brand-light-gray">
                  <p className="text-xs tracking-[0.2em] uppercase text-brand-gray mb-2">Description</p>
                  <p className="text-sm text-brand-gray leading-relaxed">{product.description}</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

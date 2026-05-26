'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ChevronLeft, ChevronRight, ArrowRight, ShoppingCart, Truck, Play } from 'lucide-react'
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
  baseVariantPrice?: number
}

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  descriptionEn?: string
  price: number
  originalPrice?: number
  images: string[]
  stock: number
  sizes: SizeEntry[]
  category: string
  cjPid?: string
  cjLogisticName?: string
  productWeight?: number
  shippingBakedUSD?: number
  videoUrl?: string
}

interface ShippingOption {
  logisticName: string
  logisticNameEn: string
  logisticPrice: number
  agingMin: number
  agingMax: number
}

const SHIP_COUNTRIES: { code: string; name: string }[] = [
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'United States' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BE', name: 'Belgium' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PT', name: 'Portugal' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'MA', name: 'Morocco' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
]

const swipeVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const swipeTransition = { duration: 0.4, ease: 'easeInOut' as const }

function getVideoEmbed(url: string): { type: 'youtube' | 'tiktok' | 'video' | 'link'; embedUrl: string } | null {
  if (!url) return null
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` }
  // TikTok
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  if (ttMatch) return { type: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}` }
  // Direct video
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { type: 'video', embedUrl: url }
  // Fallback: generic link
  return { type: 'link', embedUrl: url }
}

export default function ProductDetailClient({ product, detectedCountry }: { product: Product; detectedCountry?: string }) {
  const [[imgIdx, dir], setPage] = useState([0, 0])
  const [selectedSize, setSelectedSize] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const router = useRouter()
  const { format, shippingCostUSD, usdToCAD } = useCurrency()
  const { tr, lang } = useLanguage()

  const [shipping, setShipping] = useState<ShippingOption | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shipCountry, setShipCountry] = useState(detectedCountry || 'CA')

  useEffect(() => {
    setAdded(false)
    setSelectedSize('')
    setQty(1)
  }, [product._id])

  const loadShipping = useCallback(async (country: string) => {
    if (!product.cjPid || !country) return
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
      if (options.length === 0) { setShipping(null); return }
      const preferred = product.cjLogisticName
        ? options.find((o) => o.logisticName === product.cjLogisticName)
        : null
      if (preferred) { setShipping(preferred); return }
      const maxPrice = Math.max(...options.map((o) => o.logisticPrice), 1)
      const maxDays = Math.max(...options.map((o) => o.agingMax || o.agingMin || 30), 1)
      const scored = options.map((o) => ({
        ...o,
        score: (o.logisticPrice / maxPrice) * 0.7 + ((o.agingMax || o.agingMin || 30) / maxDays) * 0.3,
      }))
      setShipping(scored.sort((a, b) => a.score - b.score)[0])
    } catch {
      setShipping(null)
    } finally {
      setShippingLoading(false)
    }
  }, [product._id, product.cjPid, product.cjLogisticName, product.productWeight, product.sizes])

  // Initial load
  useEffect(() => {
    if (!product.cjPid) return
    const init = async () => {
      let country = detectedCountry || ''
      if (!country) {
        try {
          const r = await fetch('/api/geo')
          const d = await r.json()
          country = d.countryCode || 'CA'
        } catch { country = 'CA' }
      }
      setShipCountry(country)
      loadShipping(country)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id, product.cjPid])

  const handleCountryChange = (country: string) => {
    setShipCountry(country)
    loadShipping(country)
  }

  const sizes = product.sizes ?? []
  const images = product.images ?? []
  const isExternal = (url: string) => !url.includes('cloudinary.com')

  const selectedSizeEntry = sizes.find((s) => s.size === selectedSize)
  const selectedStock = selectedSizeEntry?.stock ?? 0
  const totalStock = sizes.reduce((s, i) => s + i.stock, 0)

  const basePrice = selectedSizeEntry?.variantPrice ?? product.price
  const effectiveShipUSD = shipping ? shipping.logisticPrice : shippingCostUSD
  const displayPrice = product.cjPid && effectiveShipUSD > 0
    ? basePrice + effectiveShipUSD * usdToCAD
    : basePrice

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

  const videoEmbed = product.videoUrl ? getVideoEmbed(product.videoUrl) : null

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

        <div className="grid md:grid-cols-[1fr_420px] gap-5 md:gap-8 lg:gap-12 items-start" style={{ overflow: 'hidden' }}>
          {/* Images panel */}
          <div style={{ minWidth: 0 }}>
            <div className="flex gap-2 md:gap-3">
              {/* Vertical thumbnail strip — desktop only */}
              {images.length > 1 && (
                <div className="hidden md:flex flex-col gap-2 flex-shrink-0" style={{ width: '72px' }}>
                  {images.map((img, i) => (
                    <button key={i} onClick={() => goTo(i)}
                      className={`relative w-full flex-shrink-0 overflow-hidden border-2 transition-all duration-200 ${i === imgIdx ? 'border-brand-black opacity-100' : 'border-transparent opacity-60 hover:opacity-90'}`}
                      style={{ aspectRatio: '1/1' }}>
                      <Image src={img} alt="" fill unoptimized={isExternal(img)} className="object-cover bg-white" sizes="72px" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div style={{ position: 'relative', flex: 1, aspectRatio: '1/1', maxHeight: '480px', overflow: 'hidden', background: '#f8f8f8' }}>
                <AnimatePresence initial={false} custom={dir}>
                  <motion.div
                    key={imgIdx}
                    custom={dir}
                    variants={swipeVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={swipeTransition}
                    style={{ position: 'absolute', inset: 0, background: '#f8f8f8', overflow: 'hidden' }}
                  >
                    {images[imgIdx] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={images[imgIdx]}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
                    <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-2 shadow-md transition-all hover:scale-110 active:scale-95">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-2 shadow-md transition-all hover:scale-110 active:scale-95">
                      <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 md:hidden">
                      {images.map((_, i) => (
                        <button key={i} onClick={() => goTo(i)}
                          className={`rounded-full transition-all duration-300 ${i === imgIdx ? 'w-5 h-1.5 bg-white shadow' : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Horizontal thumbnail strip — mobile only */}
            {images.length > 1 && (
              <div className="flex md:hidden gap-2 mt-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => goTo(i)}
                    className={`relative flex-shrink-0 overflow-hidden border-2 transition-all duration-200 ${i === imgIdx ? 'border-brand-black opacity-100' : 'border-transparent opacity-60 hover:opacity-90'}`}
                    style={{ width: '60px', height: '60px' }}>
                    <Image src={img} alt="" fill unoptimized={isExternal(img)} className="object-cover bg-white" sizes="60px" />
                  </button>
                ))}
              </div>
            )}

            {/* Video — compact strip below thumbnails */}
            {videoEmbed && (
              <div className="mt-3">
                {!showVideo ? (
                  <button onClick={() => setShowVideo(true)}
                    className="flex items-center gap-2 text-xs tracking-widest uppercase text-brand-gold hover:text-brand-black transition-colors font-medium">
                    <Play size={13} fill="currentColor" /> Voir la vidéo produit
                  </button>
                ) : (
                  <div className="flex gap-3 items-start">
                    {/* TikTok: clip the iframe to hide the account header/footer */}
                    {videoEmbed.type === 'tiktok' ? (
                      <div style={{ width: '180px', flexShrink: 0, position: 'relative', overflow: 'hidden', height: '300px' }}>
                        <iframe
                          src={`${videoEmbed.embedUrl}?rel=0`}
                          style={{
                            position: 'absolute',
                            top: '-60px',   /* clip TikTok header */
                            left: '0',
                            width: '100%',
                            height: 'calc(100% + 130px)', /* compensate top+bottom clip */
                            border: 'none',
                            pointerEvents: 'auto',
                          }}
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                        />
                      </div>
                    ) : videoEmbed.type === 'youtube' ? (
                      <div style={{ width: '260px', flexShrink: 0 }}>
                        <iframe
                          src={videoEmbed.embedUrl}
                          style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block' }}
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                        />
                      </div>
                    ) : videoEmbed.type === 'video' ? (
                      <div style={{ width: '260px', flexShrink: 0 }}>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video src={videoEmbed.embedUrl} controls style={{ width: '100%', maxHeight: '220px', display: 'block' }} />
                      </div>
                    ) : (
                      <a href={videoEmbed.embedUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-brand-gold underline">
                        <Play size={14} /> Voir la vidéo
                      </a>
                    )}
                    <button onClick={() => setShowVideo(false)}
                      className="text-[10px] text-brand-gray hover:text-brand-black underline mt-1">
                      ✕ Fermer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="flex flex-col" style={{ minWidth: 0, overflow: 'hidden' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-2">{product.category}</p>
              <h1 className="font-display text-2xl md:text-3xl text-brand-black leading-tight mb-4" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{product.name}</h1>

              {/* Price breakdown */}
              {product.cjPid ? (
                <div className="mb-6 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-brand-gray tracking-widest uppercase">Produit</span>
                    <span className="text-base font-semibold text-brand-black">{format(basePrice)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Truck size={12} className="text-brand-gray flex-shrink-0" />
                      <span className="text-xs text-brand-gray tracking-widest uppercase">Livraison</span>
                      <select
                        value={shipCountry}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="text-[10px] border border-brand-light-gray px-1.5 py-0.5 bg-white text-brand-black focus:outline-none focus:border-brand-black ml-1"
                      >
                        {SHIP_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-base font-semibold text-brand-black">
                      {shippingLoading
                        ? <span className="text-xs text-brand-gray animate-pulse">...</span>
                        : effectiveShipUSD > 0
                          ? format(effectiveShipUSD * usdToCAD)
                          : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-brand-light-gray">
                    <span className="text-xs text-brand-black font-semibold tracking-widest uppercase">Total</span>
                    <div className="flex items-center gap-2">
                      {originalPrice && originalPrice > displayPrice && (
                        <>
                          <span className="text-brand-gray line-through text-sm">{format(originalPrice)}</span>
                          {discount && <span className="bg-brand-gold text-brand-black text-[10px] font-bold px-1.5 py-0.5">-{discount}%</span>}
                        </>
                      )}
                      <span className="text-2xl font-bold text-brand-black">{format(displayPrice)}</span>
                    </div>
                  </div>
                  {shipping && (
                    <p className="text-[10px] text-brand-gray">
                      Livraison en {shipping.agingMin > 0 ? `${shipping.agingMin}–${shipping.agingMax}` : '7–20'} jours · ✓ Paiement sécurisé
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl font-bold text-brand-black">{format(displayPrice)}</span>
                  {originalPrice && originalPrice > displayPrice && (
                    <>
                      <span className="text-brand-gray line-through text-base">{format(originalPrice)}</span>
                      {discount && <span className="bg-brand-gold text-brand-black text-xs font-bold px-2 py-0.5">-{discount}%</span>}
                    </>
                  )}
                </div>
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
                            <span className="block text-[9px] leading-none opacity-60 mt-0.5">
                              {format(product.cjPid && effectiveShipUSD > 0 ? vp + effectiveShipUSD * usdToCAD : vp)}
                            </span>
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

              {/* Secure payment note for non-CJ products */}
              {!product.cjPid && (
                <div className="mt-4 border border-brand-light-gray px-4 py-3">
                  <p className="text-xs text-brand-gray">✓ Paiement sécurisé · Livraison 7–15 jours ouvrés</p>
                </div>
              )}

              {/* Description */}
              {(product.description || product.descriptionEn) && (
                <div className="mt-6 pt-6 border-t border-brand-light-gray">
                  <p className="text-xs tracking-[0.2em] uppercase text-brand-gray mb-2">Description</p>
                  <p className="text-sm text-brand-gray leading-relaxed">
                    {lang === 'en' && product.descriptionEn ? product.descriptionEn : product.description}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ChevronLeft, ChevronRight, ArrowRight, ShoppingCart, Truck, Play, Star } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useLanguage } from '@/lib/i18n'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { generateFakeReviews, type FakeReview } from '@/lib/utils/fakeReviews'
import { useCustomer } from '@/lib/context/CustomerContext'
import CustomerAuthModal from '@/components/store/CustomerAuthModal'

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
  descriptionHtml?: string
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
  onSale?: boolean
}

interface Review {
  _id: string
  author: string
  location?: string
  rating: number
  title?: string
  body: string
  photo?: string
  productPhoto?: string
  verified: boolean
  date: string
  fake?: boolean
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
  const videoEmbed = product.videoUrl ? getVideoEmbed(product.videoUrl) : null
  const hasDescription = !!(product.description || product.descriptionHtml)
  const [activeTab, setActiveTab] = useState<'description' | 'video'>(hasDescription ? 'description' : 'video')
  const addItem = useCartStore((s) => s.addItem)
  const router = useRouter()
  const { format, shippingCostUSD, usdToCAD } = useCurrency()
  const { tr, lang } = useLanguage()

  const [shipping, setShipping] = useState<ShippingOption | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shipCountry, setShipCountry] = useState(detectedCountry || 'CA')
  const [reviews, setReviews] = useState<Review[]>([])
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null)
  const [translatedDescriptionHtml, setTranslatedDescriptionHtml] = useState<string | null>(null)
  const { customer } = useCustomer()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  useEffect(() => {
    const fake = generateFakeReviews(product._id, 7)
    fetch(`/api/reviews/${product._id}`)
      .then(r => r.json())
      .then((real: Review[]) => {
        const realArr = Array.isArray(real) ? real : []
        // Real reviews go first (pinned at top), then fake ones fill the rest
        const combined: (Review | FakeReview)[] = [...realArr, ...fake]
        setReviews(combined as Review[])
      })
      .catch(() => setReviews(fake as Review[]))
  }, [product._id])

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

  // Auto-translate description when language changes
  useEffect(() => {
    setTranslatedDescription(null)
    setTranslatedDescriptionHtml(null)

    const sourceText = lang === 'en'
      ? (product.descriptionEn || product.description)
      : product.description

    // Plain text description
    if (!product.descriptionHtml && product.description) {
      if (lang === 'en' && !product.descriptionEn) {
        fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: product.description, targetLang: 'en' }),
        }).then(r => r.json()).then(d => { if (d.translated) setTranslatedDescription(d.translated) }).catch(() => {})
      } else if (lang === 'fr' && product.descriptionEn) {
        fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: product.descriptionEn, targetLang: 'fr' }),
        }).then(r => r.json()).then(d => { if (d.translated) setTranslatedDescription(d.translated) }).catch(() => {})
      }
    }

    // HTML description (from CJ importer)
    if (product.descriptionHtml) {
      const textToTranslate = lang === 'en' ? product.descriptionHtml : (sourceText ?? product.descriptionHtml)
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: product.descriptionHtml, targetLang: lang }),
      }).then(r => r.json()).then(d => { if (d.translated) setTranslatedDescriptionHtml(d.translated) }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, product._id])

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

  // Build slides: images first, then video as the last slide if present
  type Slide = { type: 'image'; url: string } | { type: 'video'; embed: ReturnType<typeof getVideoEmbed> }
  const slides: Slide[] = [
    ...images.map((url) => ({ type: 'image' as const, url })),
    ...(videoEmbed ? [{ type: 'video' as const, embed: videoEmbed }] : []),
  ]
  const totalSlides = slides.length

  const selectedSizeEntry = sizes.find((s) => s.size === selectedSize)
  const selectedStock = selectedSizeEntry?.stock ?? 0
  const totalStock = sizes.reduce((s, i) => s + i.stock, 0)

  const basePrice = selectedSizeEntry?.variantPrice ?? product.price
  // displayPrice = admin-set price only (no CJ shipping baked in)
  // Shipping is charged separately at checkout via shippingFeeCAD in Settings
  const displayPrice = basePrice
  const effectiveShipUSD = shipping ? shipping.logisticPrice : shippingCostUSD

  const originalPrice = product.originalPrice
  const discount = originalPrice && displayPrice < originalPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : null

  const goTo = (idx: number) => {
    if (idx === imgIdx) return
    setPage([idx, idx > imgIdx ? 1 : -1])
  }
  const prev = () => setPage(([i]) => [(i - 1 + totalSlides) % totalSlides, -1])
  const next = () => setPage(([i]) => [(i + 1) % totalSlides, 1])

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

        <div className="grid md:grid-cols-[1fr_420px] gap-5 md:gap-8 lg:gap-12 items-start" style={{ overflow: 'hidden' }}>
          {/* Slides panel: images + video mixed */}
          <div style={{ minWidth: 0 }}>
            <div className="flex gap-2 md:gap-3">

              {/* Vertical thumbnail strip — desktop only */}
              {totalSlides > 1 && (
                <div className="hidden md:flex flex-col gap-2 flex-shrink-0" style={{ width: '72px' }}>
                  {slides.map((slide, i) => (
                    <button key={i} onClick={() => goTo(i)}
                      className={`relative w-full flex-shrink-0 overflow-hidden border-2 transition-all duration-200 ${i === imgIdx ? 'border-brand-black opacity-100' : 'border-transparent opacity-60 hover:opacity-90'}`}
                      style={{ aspectRatio: '1/1' }}>
                      {slide.type === 'image' ? (
                        <Image src={slide.url} alt="" fill unoptimized={isExternal(slide.url)} className="object-cover bg-white" sizes="72px" />
                      ) : (
                        <div className="absolute inset-0 bg-black flex items-center justify-center">
                          <Play size={20} className="text-white" fill="white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Main slide */}
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
                    style={{ position: 'absolute', inset: 0, background: '#111', overflow: 'hidden' }}
                  >
                    {slides[imgIdx]?.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(slides[imgIdx] as { type: 'image'; url: string }).url}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#f8f8f8' }}
                      />
                    ) : slides[imgIdx]?.type === 'video' ? (
                      (() => {
                        const embed = (slides[imgIdx] as { type: 'video'; embed: ReturnType<typeof getVideoEmbed> }).embed
                        if (!embed) return null
                        if (embed.type === 'tiktok') return (
                          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                            <iframe
                              src={embed.embedUrl}
                              style={{ position: 'absolute', top: '-60px', left: 0, width: '100%', height: 'calc(100% + 130px)', border: 'none' }}
                              allow="autoplay; encrypted-media" allowFullScreen
                            />
                          </div>
                        )
                        if (embed.type === 'youtube') return (
                          <iframe src={embed.embedUrl}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                            allow="autoplay; encrypted-media" allowFullScreen />
                        )
                        return (
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          <video src={embed.embedUrl} controls autoPlay
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                        )
                      })()
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="text-brand-gray text-xs tracking-widest uppercase">Marcaclub</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {totalSlides > 1 && (
                  <>
                    <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-2 shadow-md transition-all hover:scale-110 active:scale-95">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-2 shadow-md transition-all hover:scale-110 active:scale-95">
                      <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 md:hidden">
                      {slides.map((slide, i) => (
                        <button key={i} onClick={() => goTo(i)}
                          className={`rounded-full transition-all duration-300 ${i === imgIdx ? 'w-5 h-1.5 bg-white shadow' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'}`}>
                          {slide.type === 'video' && i !== imgIdx && <Play size={6} className="text-white m-auto" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Horizontal thumbnail strip — mobile */}
            {totalSlides > 1 && (
              <div className="flex md:hidden gap-2 mt-2 overflow-x-auto pb-1">
                {slides.map((slide, i) => (
                  <button key={i} onClick={() => goTo(i)}
                    className={`relative flex-shrink-0 overflow-hidden border-2 transition-all duration-200 ${i === imgIdx ? 'border-brand-black opacity-100' : 'border-transparent opacity-60 hover:opacity-90'}`}
                    style={{ width: '60px', height: '60px' }}>
                    {slide.type === 'image' ? (
                      <Image src={slide.url} alt="" fill unoptimized={isExternal(slide.url)} className="object-cover bg-white" sizes="60px" />
                    ) : (
                      <div className="absolute inset-0 bg-black flex items-center justify-center">
                        <Play size={16} className="text-white" fill="white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="flex flex-col" style={{ minWidth: 0, overflow: 'hidden' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase">{product.category}</p>
                {product.onSale && (
                  <span className="bg-red-500 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5">
                    {lang === 'en' ? 'Sale' : 'Soldes'}
                  </span>
                )}
              </div>
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
                          <span className="text-brand-gray line-through text-sm">{format(originalPrice + effectiveShipUSD * usdToCAD)}</span>
                          {discount && <span className="bg-brand-gold text-brand-black text-[10px] font-bold px-1.5 py-0.5">-{discount}%</span>}
                        </>
                      )}
                      <span className="text-2xl font-bold text-brand-black">
                        {shippingLoading
                          ? <span className="text-base text-brand-gray animate-pulse">...</span>
                          : format(displayPrice + (effectiveShipUSD > 0 ? effectiveShipUSD * usdToCAD : 0))}
                      </span>
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
                    Produit — <span className="text-brand-black">{selectedSize || 'Choisir'}</span>
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
                    <button onClick={() => router.push('/')}
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
            </motion.div>
          </div>
        </div>

        {/* ── Tabbed section: Description + Video ── */}
        {(product.description || product.descriptionHtml || videoEmbed) && (
          <div className="mt-12 border-t border-brand-light-gray">
            {/* Tab bar */}
            <div className="flex border-b border-brand-light-gray">
              {(product.description || product.descriptionHtml) && (
                <button
                  onClick={() => setActiveTab('description')}
                  className={`px-6 py-4 text-xs tracking-[0.25em] uppercase font-semibold transition-colors border-b-2 -mb-px ${
                    activeTab === 'description'
                      ? 'border-brand-black text-brand-black'
                      : 'border-transparent text-brand-gray hover:text-brand-black'
                  }`}
                >
                  Description
                </button>
              )}
              {videoEmbed && (
                <button
                  onClick={() => setActiveTab('video')}
                  className={`px-6 py-4 text-xs tracking-[0.25em] uppercase font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                    activeTab === 'video'
                      ? 'border-brand-black text-brand-black'
                      : 'border-transparent text-brand-gray hover:text-brand-black'
                  }`}
                >
                  <Play size={11} fill="currentColor" /> Vidéo
                </button>
              )}
            </div>

            {/* Description tab */}
            {activeTab === 'description' && (product.description || product.descriptionHtml) && (
              <div className="py-8">
                {product.descriptionHtml ? (
                  <div
                    className="cj-description mx-auto"
                    style={{ maxWidth: '860px' }}
                    dangerouslySetInnerHTML={{ __html: translatedDescriptionHtml ?? product.descriptionHtml }}
                  />
                ) : (
                  <p className="text-sm text-brand-gray leading-relaxed max-w-2xl mx-auto">
                    {translatedDescription
                      ?? (lang === 'en' && product.descriptionEn ? product.descriptionEn : product.description)}
                  </p>
                )}
              </div>
            )}

            {/* Video tab */}
            {activeTab === 'video' && videoEmbed && (
              <div className="py-8 flex justify-center">
                {videoEmbed.type === 'tiktok' ? (
                  /* TikTok: clip header (~60px) and footer (~70px) to show only the video */
                  <div style={{ width: '340px', position: 'relative', overflow: 'hidden', height: '580px', borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
                    <iframe
                      src={videoEmbed.embedUrl}
                      style={{
                        position: 'absolute',
                        top: '-60px',
                        left: 0,
                        width: '100%',
                        height: 'calc(100% + 130px)',
                        border: 'none',
                      }}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                ) : videoEmbed.type === 'youtube' ? (
                  <div style={{ width: '100%', maxWidth: '720px' }}>
                    <iframe
                      src={videoEmbed.embedUrl}
                      style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: '8px', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', display: 'block' }}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                ) : videoEmbed.type === 'video' ? (
                  <div style={{ width: '100%', maxWidth: '720px' }}>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={videoEmbed.embedUrl} controls style={{ width: '100%', borderRadius: '8px', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', display: 'block' }} />
                  </div>
                ) : (
                  <a href={videoEmbed.embedUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-gold underline">
                    <Play size={14} /> Voir la vidéo
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Reviews section ── */}
        {reviews.length > 0 && (() => {
          const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
          const dist = [5,4,3,2,1].map(n => ({ n, count: reviews.filter(r => r.rating === n).length }))
          const AVATAR_COLORS = ['#c084fc','#f472b6','#fb923c','#34d399','#60a5fa','#a78bfa','#fbbf24','#f87171']
          const avatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length]
          return (
            <div className="mt-16 border-t border-brand-light-gray pt-12">
              {/* Header with overall rating */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
                <h2 className="text-xl font-semibold tracking-wide">Avis clients</h2>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={18} fill={i <= Math.round(avg) ? '#f59e0b' : 'none'} stroke={i <= Math.round(avg) ? '#f59e0b' : '#d1d5db'} />
                    ))}
                  </div>
                  <span className="text-brand-black font-bold text-lg">{avg.toFixed(1)}</span>
                  <span className="text-brand-gray text-sm">({reviews.length} avis)</span>
                </div>
              </div>

              {/* Summary bar */}
              <div className="bg-brand-off-white p-5 mb-10 max-w-md">
                <p className="text-xs text-brand-gray uppercase tracking-widest font-semibold mb-3">Répartition des notes</p>
                <div className="space-y-2">
                  {dist.map(({ n, count }) => (
                    <div key={n} className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1 w-16 flex-shrink-0">
                        <span className="text-xs text-brand-gray w-3">{n}</span>
                        <Star size={11} fill="#f59e0b" stroke="#f59e0b" />
                      </div>
                      <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }} />
                      </div>
                      <span className="text-brand-gray text-xs w-5 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual reviews */}
              <div className="space-y-8">
                {reviews.map((r) => (
                  <div key={r._id} className="border-b border-brand-light-gray pb-8 last:border-0">
                    <div className="flex items-start gap-4">
                      {r.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.photo} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0 shadow-sm" />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-base shadow-sm"
                          style={{ background: avatarColor(r._id) }}
                        >
                          {r.author[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-2">
                          <span className="font-semibold text-brand-black text-sm">{r.author}</span>
                          {r.location && <span className="text-brand-gray text-xs">{r.location}</span>}
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} size={13} fill={i <= r.rating ? '#f59e0b' : 'none'} stroke={i <= r.rating ? '#f59e0b' : '#d1d5db'} />
                            ))}
                          </div>
                          {r.verified && (
                            <span className="text-green-700 text-[10px] font-semibold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ Achat vérifié</span>
                          )}
                          <span className="text-brand-gray text-[11px] ml-auto">{new Date(r.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        {r.title && <p className="font-semibold text-brand-black text-sm mb-1.5">{r.title}</p>}
                        <p className="text-brand-gray text-sm leading-relaxed">{r.body}</p>
                        {r.productPhoto && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.productPhoto} alt="produit" className="mt-3 w-24 h-24 object-cover rounded-lg border border-brand-light-gray" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )
        })()}

        {/* ── Write a review section (always visible) ── */}
        <div className="mt-12 border-t border-brand-light-gray pt-10">
          <h3 className="text-sm font-semibold tracking-widest uppercase text-brand-black mb-4">Laisser un avis</h3>
          {!customer ? (
            <p className="text-sm text-brand-gray">
              Acheteurs vérifiés uniquement ·{' '}
              <button onClick={() => setShowAuthModal(true)} className="text-brand-black underline hover:text-brand-gold transition-colors">
                Se connecter
              </button>
            </p>
          ) : reviewSubmitted ? (
            <p className="text-sm text-green-600">Merci pour votre avis !</p>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault()
              setReviewError('')
              setReviewSubmitting(true)
              try {
                const res = await fetch(`/api/reviews/${product._id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ author: customer.name, rating: reviewRating, title: reviewTitle, body: reviewBody }),
                })
                const data = await res.json()
                if (res.ok) {
                  setReviews(prev => [{ ...data, fake: false }, ...prev])
                  setReviewSubmitted(true)
                } else if (data.error === 'not_a_buyer') {
                  setReviewError('Vous devez avoir acheté et reçu ce produit pour laisser un avis.')
                } else if (data.error === 'already_reviewed') {
                  setReviewError('Vous avez déjà laissé un avis pour ce produit.')
                } else {
                  setReviewError(data.error || 'Erreur')
                }
              } catch {
                setReviewError('Erreur réseau')
              } finally {
                setReviewSubmitting(false)
              }
            }} className="space-y-4 max-w-lg">
              <div>
                <p className="text-xs tracking-widest uppercase text-brand-gray mb-2">Note</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} type="button" onClick={() => setReviewRating(i)}>
                      <Star size={22} fill={i <= reviewRating ? '#f59e0b' : 'none'} stroke={i <= reviewRating ? '#f59e0b' : '#d1d5db'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-brand-gray mb-1">Titre (optionnel)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Super produit !"
                  className="w-full border border-brand-light-gray px-3 py-2.5 text-sm focus:outline-none focus:border-brand-black transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-brand-gray mb-1">Avis *</label>
                <textarea
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  required
                  rows={3}
                  placeholder="Partagez votre expérience avec ce produit..."
                  className="w-full border border-brand-light-gray px-3 py-2.5 text-sm focus:outline-none focus:border-brand-black transition-colors resize-none"
                />
              </div>
              {reviewError && <p className="text-red-500 text-xs">{reviewError}</p>}
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="bg-brand-black text-white text-xs tracking-widest uppercase font-bold px-6 py-3 hover:bg-brand-gold hover:text-brand-black disabled:opacity-50 transition-colors"
              >
                {reviewSubmitting ? 'Envoi...' : 'Publier mon avis'}
              </button>
            </form>
          )}
        </div>

        {showAuthModal && (
          <CustomerAuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </div>
    </div>
  )
}

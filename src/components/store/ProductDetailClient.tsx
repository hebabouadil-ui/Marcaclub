'use client'
import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  stock: number
  sizes: string[]
  category: string
}

const swipeVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

const swipeTransition = { duration: 0.4, ease: 'easeInOut' as const }

export default function ProductDetailClient({ product }: { product: Product }) {
  const [[imgIdx, dir], setPage] = useState([0, 0])
  const [selectedSize, setSelectedSize] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null

  const goTo = (idx: number) => {
    if (idx === imgIdx) return
    setPage([idx, idx > imgIdx ? 1 : -1])
  }
  const prev = () => setPage(([i]) => [(i - 1 + product.images.length) % product.images.length, -1])
  const next = () => setPage(([i]) => [(i + 1) % product.images.length, 1])

  const handleAddToCart = () => {
    if (!selectedSize) { toast.error('Veuillez choisir une taille'); return }
    if (product.stock === 0) { toast.error('Produit épuisé'); return }
    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: qty,
      size: selectedSize,
      image: product.images[0] || '',
      stock: product.stock,
    })
    setAdded(true)
    toast.success('Ajouté au panier')
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs tracking-widest uppercase text-brand-gray mb-8">
          <Link href="/" className="hover:text-brand-black transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-black transition-colors">Collection</Link>
          <span>/</span>
          <span className="text-brand-black truncate max-w-[160px]">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-6 lg:gap-10 items-start">
          {/* Images */}
          <div className="space-y-3">
            <div className="relative overflow-hidden bg-brand-light-gray w-full max-w-[280px] mx-auto md:max-w-none" style={{ paddingBottom: '110%' }}>
              <AnimatePresence initial={false} custom={dir}>
                <motion.div
                  key={imgIdx}
                  custom={dir}
                  variants={swipeVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={swipeTransition}
                  className="absolute inset-0 will-change-transform"
                >
                  {product.images[imgIdx] ? (
                    <Image
                      src={product.images[imgIdx]}
                      alt={product.name}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={90}
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-brand-gray text-xs tracking-widest uppercase">Marcaclub</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-2.5 shadow-md transition-all hover:scale-110 active:scale-95"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-2.5 shadow-md transition-all hover:scale-110 active:scale-95"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {product.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goTo(i)}
                        className={`rounded-full transition-all duration-300 ${
                          i === imgIdx ? 'w-6 h-2 bg-white shadow' : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`relative flex-shrink-0 w-14 overflow-hidden border-2 transition-all duration-200 ${
                      i === imgIdx ? 'border-brand-black opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                    style={{ height: '72px' }}
                  >
                    <Image src={img} alt="" fill className="object-cover object-top" sizes="56px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-2">{product.category}</p>
              <h1 className="font-display text-2xl md:text-3xl text-brand-black leading-tight mb-4">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 mb-6">
                <span className="text-xl font-semibold text-brand-black">{product.price.toFixed(2)} MAD</span>
                {product.originalPrice && (
                  <>
                    <span className="text-brand-gray line-through">{product.originalPrice.toFixed(2)} MAD</span>
                    <span className="bg-brand-gold text-brand-black text-xs font-bold px-2 py-0.5">-{discount}%</span>
                  </>
                )}
              </div>

              <div className="mb-6">
                {product.stock === 0 ? (
                  <span className="text-sm text-brand-gray tracking-widest uppercase">Épuisé</span>
                ) : product.stock <= 5 ? (
                  <span className="text-sm text-amber-600 tracking-widest uppercase">Plus que {product.stock} en stock</span>
                ) : (
                  <span className="text-sm text-green-600 tracking-widest uppercase">En stock</span>
                )}
              </div>

              {product.sizes.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs tracking-[0.2em] uppercase text-brand-gray mb-3">
                    Taille — <span className="text-brand-black">{selectedSize || 'Choisir'}</span>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`w-11 h-11 text-sm border-2 transition-all duration-200 ${
                          selectedSize === s
                            ? 'border-brand-black bg-brand-black text-brand-white'
                            : 'border-brand-light-gray text-brand-black hover:border-brand-black'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-7">
                <p className="text-xs tracking-[0.2em] uppercase text-brand-gray mb-3">Quantité</p>
                <div className="flex items-center border border-brand-light-gray w-fit">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors">−</button>
                  <span className="w-10 h-10 flex items-center justify-center text-sm font-medium">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="w-10 h-10 flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors">+</button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`w-full flex items-center justify-center gap-3 py-4 text-sm tracking-[0.2em] uppercase font-semibold transition-all duration-300 ${
                  product.stock === 0
                    ? 'bg-brand-light-gray text-brand-gray cursor-not-allowed'
                    : added
                    ? 'bg-green-600 text-white'
                    : 'bg-brand-black text-brand-white hover:bg-brand-gold hover:text-brand-black'
                }`}
              >
                {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                {product.stock === 0 ? 'Épuisé' : added ? 'Ajouté !' : 'Ajouter au panier'}
              </button>

              <Link href="/cart" className="block text-center mt-3 text-xs tracking-widest uppercase text-brand-gray hover:text-brand-black transition-colors underline underline-offset-4">
                Voir mon panier
              </Link>

              {product.description && (
                <div className="mt-8 pt-6 border-t border-brand-light-gray">
                  <p className="text-xs tracking-[0.2em] uppercase text-brand-gray mb-2">Description</p>
                  <p className="text-sm text-brand-gray leading-relaxed">{product.description}</p>
                </div>
              )}

              <div className="mt-5 bg-brand-light-gray p-4 space-y-1.5">
                <p className="text-xs text-brand-gray">✓ Paiement à la livraison</p>
                <p className="text-xs text-brand-gray">✓ Livraison 24-48h selon votre ville</p>
                <p className="text-xs text-brand-gray">✓ Importé directement d&apos;Espagne</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

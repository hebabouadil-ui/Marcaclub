'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useCartStore, cartTotal } from '@/lib/store/cartStore'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useLanguage } from '@/lib/i18n'
import { Trash2, ShoppingBag, ArrowRight, Truck, ShieldCheck, RotateCcw, Loader2 } from 'lucide-react'

function shortSize(s: string) {
  if (s.length <= 25) return s
  const last = s.split(',').pop()?.trim() ?? s
  return last.replace(/^\s*\d+\s*/, '').trim() || s.slice(-20)
}

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const { format } = useCurrency()
  const { tr } = useLanguage()
  const [continueHref, setContinueHref] = useState('/products')
  const [country, setCountry] = useState<string>('')
  const [shippingFee, setShippingFee] = useState<number | null>(null)
  const [shippingDays, setShippingDays] = useState<{ min: number; max: number } | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)

  // Derive "continue shopping" href from cart items or localStorage
  useEffect(() => {
    const cartCat = items[0]?.category
    if (cartCat) {
      setContinueHref(`/products?category=${encodeURIComponent(cartCat)}`)
    } else {
      const stored = localStorage.getItem('mc-last-category')
      if (stored) setContinueHref(`/products?category=${encodeURIComponent(stored)}`)
    }
  }, [items])

  // Detect country via geo API
  useEffect(() => {
    fetch('/api/geo')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.country) setCountry(d.country) })
      .catch(() => {})
  }, [])

  // Fetch real shipping estimate whenever items or country changes
  const fetchShipping = useCallback(async () => {
    if (items.length === 0) { setShippingFee(null); return }
    setShippingLoading(true)
    try {
      const res = await fetch('/api/shipping-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
          country: country || 'CA',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setShippingFee(typeof data.shippingFeeCAD === 'number' ? data.shippingFeeCAD : null)
        if (data.agingMin && data.agingMax) setShippingDays({ min: data.agingMin, max: data.agingMax })
        else setShippingDays(null)
      }
    } catch {
      // leave shippingFee null — will show "Calculé au checkout"
    } finally {
      setShippingLoading(false)
    }
  }, [items, country])

  useEffect(() => {
    fetchShipping()
  }, [fetchShipping])

  const subtotal = cartTotal(items)
  const total = subtotal + (shippingFee ?? 0)

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <ShoppingBag size={48} className="text-brand-light-gray mb-6" strokeWidth={1} />
        <h1 className="font-display text-3xl text-brand-black mb-3">{tr.cart.empty}</h1>
        <p className="text-brand-gray text-sm mb-8">{tr.cart.emptySub}</p>
        <Link href="/products"
          className="inline-flex items-center gap-2 bg-brand-black text-brand-white px-8 py-4 text-xs tracking-[0.2em] uppercase hover:bg-brand-gold hover:text-brand-black transition-colors">
          {tr.cart.shopNow} <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <div className="bg-brand-black text-brand-white py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-1">{tr.nav.shop}</p>
            <h1 className="font-display text-2xl md:text-3xl">{tr.cart.title}</h1>
          </div>
          <p className="text-white/40 text-xs tracking-widest pb-0.5">{items.length} article{items.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

          {/* LEFT — Items */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] tracking-[0.25em] text-brand-gray uppercase">Vos articles</span>
              <Link href={continueHref} className="flex items-center gap-1 text-[10px] tracking-widest uppercase text-brand-gray hover:text-brand-black transition-colors">
                <ArrowRight size={11} /> Continuer mes achats
              </Link>
            </div>

            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={`${item.productId}-${item.size}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  className="flex gap-4 bg-white border border-brand-light-gray p-4 mb-3"
                >
                  {/* Image */}
                  <Link href={`/products/${item.productId}`} className="w-24 h-24 flex-shrink-0 bg-[#f5f0ea] border border-brand-light-gray overflow-hidden relative block">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill
                        style={{ objectFit: 'contain' }}
                        unoptimized={!item.image.includes('cloudinary.com')}
                        sizes="96px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[8px] text-brand-gray uppercase tracking-widest">MC</span>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{item.name}</p>
                      <p className="text-[11px] text-brand-gray mt-1 uppercase tracking-wider">{tr.cart.size}: {shortSize(item.size)}</p>
                      {item.category && (
                        <p className="text-[10px] text-brand-gold uppercase tracking-widest mt-0.5">{item.category}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Qty stepper */}
                      <div className="flex items-center border border-brand-light-gray">
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors text-base"
                          aria-label="Diminuer la quantité">
                          −
                        </button>
                        <span className="w-8 h-8 flex items-center justify-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, Math.min(item.quantity + 1, item.stock))}
                          className="w-8 h-8 flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors text-base"
                          aria-label="Augmenter la quantité">
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold">{format(item.price * item.quantity)}</span>
                        <button
                          onClick={() => removeItem(item.productId, item.size)}
                          className="text-brand-light-gray hover:text-red-400 transition-colors p-1"
                          aria-label="Supprimer l'article">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Truck, label: 'Livraison internationale' },
                { icon: ShieldCheck, label: 'Paiement sécurisé' },
                { icon: RotateCcw, label: 'Retours faciles' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 border border-brand-light-gray py-3 bg-white">
                  <Icon size={16} className="text-brand-gold" strokeWidth={1.5} />
                  <span className="text-[9px] tracking-widest uppercase text-brand-gray text-center">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Order summary */}
          <div className="w-full lg:w-[380px] flex-shrink-0 lg:sticky lg:top-24">
            <div className="bg-white border border-brand-light-gray">
              {/* Header */}
              <div className="bg-brand-black text-brand-white px-5 py-4">
                <p className="text-[10px] tracking-[0.25em] uppercase text-white/50 mb-1">Récapitulatif</p>
                <p className="text-lg font-display">Votre commande</p>
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Line items */}
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.size}`} className="flex justify-between gap-3 text-sm">
                      <span className="text-brand-gray truncate flex-1 leading-snug">
                        {item.name}
                        <span className="text-brand-light-gray"> ×{item.quantity}</span>
                      </span>
                      <span className="font-semibold flex-shrink-0">{format(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-brand-light-gray pt-4 space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-gray">Sous-total</span>
                    <span className="font-semibold">{format(subtotal)}</span>
                  </div>

                  {/* Shipping */}
                  <div className="flex justify-between text-sm items-start gap-2">
                    <div>
                      <span className="text-brand-gray flex items-center gap-1.5">
                        <Truck size={13} className="text-brand-gold flex-shrink-0" />
                        Livraison
                        {country && <span className="text-[10px] text-brand-light-gray uppercase">({country})</span>}
                      </span>
                      {shippingDays && (
                        <p className="text-[10px] text-brand-gray mt-0.5 ml-[18px]">
                          {shippingDays.min}–{shippingDays.max} jours ouvrés
                        </p>
                      )}
                    </div>
                    <span className="font-semibold flex-shrink-0">
                      {shippingLoading ? (
                        <Loader2 size={14} className="animate-spin text-brand-gray" />
                      ) : shippingFee !== null ? (
                        format(shippingFee)
                      ) : (
                        <span className="text-brand-gray text-xs">Calculé au checkout</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t-2 border-brand-black pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] tracking-[0.2em] uppercase font-semibold">Total estimé</span>
                    <span className="text-2xl font-display font-bold">
                      {shippingFee !== null ? format(total) : format(subtotal)}
                    </span>
                  </div>
                  {shippingFee === null && (
                    <p className="text-[10px] text-brand-gray mt-1">+ frais de livraison</p>
                  )}
                </div>

                {/* CTA */}
                <Link href="/checkout"
                  className="block w-full text-center bg-brand-black text-white py-4 text-[11px] tracking-[0.25em] uppercase font-bold hover:bg-brand-gold hover:text-brand-black transition-all duration-300">
                  {tr.cart.checkout} →
                </Link>

                <p className="text-center text-[10px] text-brand-gray tracking-wide">
                  🔒 Paiement 100% sécurisé
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

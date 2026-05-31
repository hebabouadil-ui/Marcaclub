'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useCartStore, cartTotal } from '@/lib/store/cartStore'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useLanguage } from '@/lib/i18n'
import { useDeliveryMessage } from '@/lib/hooks/useDeliveryMessage'
import {
  Trash2, ShoppingBag, ArrowRight, Truck, ShieldCheck,
  RotateCcw, Loader2, Minus, Plus, Package, Lock,
} from 'lucide-react'

function shortSize(s: string) {
  if (s.length <= 25) return s
  const last = s.split(',').pop()?.trim() ?? s
  return last.replace(/^\s*\d+\s*/, '').trim() || s.slice(-20)
}

function AnimatedPrice({ value, format }: { value: number; format: (n: number) => string }) {
  const [prev, setPrev] = useState(value)
  const [dir, setDir] = useState(0)

  useEffect(() => {
    if (value === prev) return
    setDir(value > prev ? 1 : -1)
    setPrev(value)
  }, [value, prev])

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ y: dir * 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: dir * -12, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="inline-block tabular-nums"
      >
        {format(value)}
      </motion.span>
    </AnimatePresence>
  )
}

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const { format, geo } = useCurrency()
  const { tr } = useLanguage()
  const { message: deliveryMsg } = useDeliveryMessage()
  const [continueHref, setContinueHref] = useState('/products')
  const [shippingFee, setShippingFee] = useState<number | null>(null)
  const [shippingDays, setShippingDays] = useState<{ min: number; max: number } | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [weightExceeded, setWeightExceeded] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const country = geo?.countryCode || ''

  useEffect(() => {
    const cartCat = items[0]?.category
    if (cartCat) {
      setContinueHref(`/products?category=${encodeURIComponent(cartCat)}`)
    } else {
      const stored = localStorage.getItem('mc-last-category')
      if (stored) setContinueHref(`/products?category=${encodeURIComponent(stored)}`)
    }
  }, [items])

  useEffect(() => {
    if (items.length === 0) { setShippingFee(null); setShippingDays(null); setWeightExceeded(false); return }
    if (!country) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setShippingLoading(true)
    fetch('/api/shipping-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        country,
      }),
      signal: ctrl.signal,
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          if (data?.error === 'weight_exceeded') { setWeightExceeded(true); setShippingFee(null) }
          return
        }
        setWeightExceeded(false)
        const cad = typeof data.shippingFeeCAD === 'number' ? data.shippingFeeCAD : null
        setShippingFee(cad)
        setShippingDays(data.agingMin && data.agingMax ? { min: data.agingMin, max: data.agingMax } : null)
      })
      .catch(e => { if (e.name !== 'AbortError') setShippingFee(null) })
      .finally(() => setShippingLoading(false))

    return () => ctrl.abort()
  }, [items, country])

  const handleRemove = useCallback((productId: string, size: string) => {
    setRemovingId(`${productId}-${size}`)
    setTimeout(() => { removeItem(productId, size); setRemovingId(null) }, 300)
  }, [removeItem])

  const subtotal = cartTotal(items)
  const total = subtotal + (shippingFee ?? 0)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  // ─── Empty state ─────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-[#faf8f5]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
          <div className="w-24 h-24 rounded-full bg-brand-light-gray flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={36} className="text-brand-gray" strokeWidth={1} />
          </div>
        </motion.div>
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <h1 className="font-display text-3xl text-brand-black mb-2">{tr.cart.empty}</h1>
          <p className="text-brand-gray text-sm mb-8 max-w-xs mx-auto">{tr.cart.emptySub}</p>
          <Link href="/products"
            className="inline-flex items-center gap-2 bg-brand-black text-brand-white px-8 py-4 text-[11px] tracking-[0.2em] uppercase font-bold hover:bg-brand-gold hover:text-brand-black transition-all duration-300">
            {tr.cart.shopNow} <ArrowRight size={13} />
          </Link>
        </motion.div>
      </div>
    )
  }

  // ─── Cart ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf8f5]">

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="bg-brand-black text-brand-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} strokeWidth={1.5} />
            <h1 className="font-display text-lg tracking-wide">{tr.cart.title}</h1>
            <span className="bg-brand-gold text-brand-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <Link href={continueHref} className="flex items-center gap-1.5 text-white/50 hover:text-brand-gold transition-colors text-[11px] tracking-widest uppercase">
            <ArrowRight size={11} /> {tr.cart.continueShopping}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">

          {/* ── LEFT — Items ────────────────────────────── */}
          <div className="flex-1 min-w-0 w-full">

            {/* Column headers — desktop only */}
            <div className="hidden md:grid grid-cols-[1fr_auto_auto] gap-4 mb-3 px-1">
              <span className="text-[9px] tracking-[0.3em] uppercase text-brand-gray">{tr.cart.colItem}</span>
              <span className="text-[9px] tracking-[0.3em] uppercase text-brand-gray w-28 text-center">{tr.cart.colQty}</span>
              <span className="text-[9px] tracking-[0.3em] uppercase text-brand-gray w-20 text-right">{tr.cart.colPrice}</span>
            </div>

            <AnimatePresence initial={false}>
              {items.map((item, idx) => {
                const key = `${item.productId}-${item.size}`
                const isRemoving = removingId === key
                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: isRemoving ? 0 : 1, x: isRemoving ? -40 : 0, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    className="group relative bg-white border border-brand-light-gray mb-3 overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-gold scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

                    <div className="flex">
                      {/* Image */}
                      <Link href={`/products/${item.productId}`}
                        className="w-28 h-28 md:w-36 md:h-36 flex-shrink-0 bg-[#f5f0ea] overflow-hidden relative block">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill
                            className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                            unoptimized={!item.image.includes('cloudinary.com')}
                            sizes="144px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[8px] text-brand-gray uppercase tracking-widest">MC</span>
                          </div>
                        )}
                      </Link>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between p-4 md:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/products/${item.productId}`}>
                              <p className="text-sm font-semibold leading-snug line-clamp-2 hover:text-brand-gold transition-colors">{item.name}</p>
                            </Link>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] bg-brand-light-gray text-brand-gray px-2 py-0.5 tracking-wider uppercase">
                                <Package size={9} /> {shortSize(item.size)}
                              </span>
                              {item.category && (
                                <span className="text-[10px] text-brand-gold uppercase tracking-widest">{item.category}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-brand-gray mt-1.5">
                              {format(item.price)} {tr.cart.unit}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemove(item.productId, item.size)}
                            className="flex-shrink-0 text-brand-light-gray hover:text-red-400 transition-colors p-1 -mt-0.5 -mr-0.5 md:hidden"
                            aria-label="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center border border-brand-light-gray h-9">
                            <motion.button whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                              className="w-9 h-full flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors"
                              aria-label="Decrease">
                              <Minus size={12} />
                            </motion.button>
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={item.quantity}
                                initial={{ y: -8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 8, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="w-10 h-full flex items-center justify-center text-sm font-semibold tabular-nums"
                              >
                                {item.quantity}
                              </motion.span>
                            </AnimatePresence>
                            <motion.button whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.productId, item.size, Math.min(item.quantity + 1, item.stock))}
                              className="w-9 h-full flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors"
                              aria-label="Increase">
                              <Plus size={12} />
                            </motion.button>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-base font-bold">
                                <AnimatedPrice value={item.price * item.quantity} format={format} />
                              </div>
                              {item.quantity > 1 && (
                                <p className="text-[10px] text-brand-gray">{format(item.price)} × {item.quantity}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemove(item.productId, item.size)}
                              className="hidden md:flex text-brand-light-gray hover:text-red-400 transition-colors p-1.5 hover:bg-red-50 rounded"
                              aria-label="Remove">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Trust badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Truck,       label: deliveryMsg || tr.cart.internationalShipping, sub: tr.cart.trackingIncluded },
                { icon: ShieldCheck, label: tr.cart.securePayment,                        sub: `${tr.cart.stripe} · ${tr.cart.sslLabel}` },
                { icon: RotateCcw,   label: tr.cart.easyReturns,                          sub: tr.cart.returns30 },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-2 border border-brand-light-gray py-4 bg-white text-center hover:border-brand-gold transition-colors">
                  <Icon size={18} className="text-brand-gold" strokeWidth={1.5} />
                  <div>
                    <p className="text-[9px] tracking-widest uppercase text-brand-black font-semibold leading-snug">{label}</p>
                    <p className="text-[9px] text-brand-gray mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT — Order summary ──────────────────── */}
          <div className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 lg:sticky lg:top-24">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white border border-brand-light-gray overflow-hidden">

              <div className="bg-brand-black text-white px-5 pt-5 pb-4">
                <p className="text-[9px] tracking-[0.3em] uppercase text-white/40 mb-1">{tr.cart.summary}</p>
                <p className="font-display text-xl tracking-wide">{tr.cart.yourOrder}</p>
              </div>

              {/* Thumbnail strip */}
              <div className="bg-brand-black/5 border-b border-brand-light-gray px-5 py-3 flex gap-2 flex-wrap">
                {items.map(item => (
                  <div key={`${item.productId}-${item.size}`}
                    className="relative w-10 h-10 border border-brand-light-gray bg-[#f5f0ea] overflow-hidden flex-shrink-0">
                    {item.image
                      ? <Image src={item.image} alt={item.name} fill className="object-contain p-0.5"
                          unoptimized={!item.image.includes('cloudinary.com')} sizes="40px" />
                      : <div className="w-full h-full flex items-center justify-center text-[6px] text-brand-gray">MC</div>
                    }
                    {item.quantity > 1 && (
                      <span className="absolute -top-1 -right-1 bg-brand-gold text-brand-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Line items */}
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={`${item.productId}-${item.size}`} className="flex justify-between gap-2">
                      <span className="text-brand-gray truncate flex-1 min-w-0 text-[13px]">
                        {item.name}
                        {item.quantity > 1 && <span className="text-brand-light-gray text-[11px]"> ×{item.quantity}</span>}
                      </span>
                      <span className="font-semibold flex-shrink-0 text-[13px] tabular-nums">
                        <AnimatedPrice value={item.price * item.quantity} format={format} />
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-brand-light-gray pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-gray">{tr.cart.subtotal}</span>
                    <span className="font-semibold tabular-nums">
                      <AnimatedPrice value={subtotal} format={format} />
                    </span>
                  </div>

                  <div className="flex justify-between text-sm items-start gap-2">
                    <div className="min-w-0">
                      <span className="text-brand-gray flex items-center gap-1.5">
                        <Truck size={12} className="text-brand-gold flex-shrink-0" />
                        {tr.cart.shippingLabel}
                        {country && <span className="text-[10px] text-brand-light-gray uppercase">({country})</span>}
                      </span>
                      {shippingDays && (
                        <p className="text-[10px] text-brand-gray mt-0.5 ml-4">
                          {tr.cart.estimatedDays} {shippingDays.min}–{shippingDays.max} {tr.cart.days}
                        </p>
                      )}
                      {deliveryMsg && !shippingDays && (
                        <p className="text-[10px] text-brand-gray mt-0.5 ml-4">{deliveryMsg}</p>
                      )}
                    </div>
                    <span className="font-semibold flex-shrink-0 text-sm tabular-nums">
                      {shippingLoading ? (
                        <Loader2 size={13} className="animate-spin text-brand-gray" />
                      ) : shippingFee !== null ? (
                        <AnimatedPrice value={shippingFee} format={format} />
                      ) : (
                        <span className="text-brand-gray text-xs">{tr.cart.calculated}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t-2 border-brand-black pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-brand-gray">{tr.cart.estimatedTotal}</span>
                    <div className="text-2xl font-display font-bold overflow-hidden">
                      <AnimatedPrice value={shippingFee !== null ? total : subtotal} format={format} />
                    </div>
                  </div>
                  {shippingFee === null && !shippingLoading && (
                    <p className="text-[10px] text-brand-gray mt-1 text-right">{tr.cart.plusShipping}</p>
                  )}
                </div>

                {weightExceeded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 leading-snug">
                    ⚠️ {tr.cart.weightExceeded}
                  </motion.div>
                )}

                {weightExceeded ? (
                  <div className="w-full text-center bg-brand-light-gray text-brand-gray py-4 text-[11px] tracking-[0.25em] uppercase font-bold cursor-not-allowed select-none">
                    {tr.cart.cartTooHeavy}
                  </div>
                ) : (
                  <Link href="/checkout">
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      className="w-full text-center bg-brand-black text-white py-4 text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-brand-gold hover:text-brand-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer">
                      {tr.cart.checkout} <ArrowRight size={13} />
                    </motion.div>
                  </Link>
                )}

                <div className="flex items-center justify-center gap-4 pt-1">
                  <span className="flex items-center gap-1 text-[10px] text-brand-gray">
                    <Lock size={9} className="text-brand-gold" /> {tr.cart.sslSecured}
                  </span>
                  <span className="w-px h-3 bg-brand-light-gray" />
                  <span className="flex items-center gap-1 text-[10px] text-brand-gray">
                    <ShieldCheck size={9} className="text-brand-gold" /> {tr.cart.stripe}
                  </span>
                  <span className="w-px h-3 bg-brand-light-gray" />
                  <span className="flex items-center gap-1 text-[10px] text-brand-gray">
                    <RotateCcw size={9} className="text-brand-gold" /> {tr.cart.returns30}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* ── Mobile sticky bottom bar ──────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-light-gray shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-brand-gray uppercase tracking-widest">{tr.cart.estimatedTotal}</p>
            <p className="font-bold text-lg leading-tight tabular-nums">
              <AnimatedPrice value={shippingFee !== null ? total : subtotal} format={format} />
            </p>
          </div>
          {weightExceeded ? (
            <div className="flex-shrink-0 bg-brand-light-gray text-brand-gray px-6 py-3 text-[11px] tracking-widest uppercase font-bold cursor-not-allowed">
              {tr.cart.cartTooHeavy}
            </div>
          ) : (
            <Link href="/checkout" className="flex-shrink-0">
              <motion.div whileTap={{ scale: 0.96 }}
                className="bg-brand-black text-white px-6 py-3 text-[11px] tracking-[0.2em] uppercase font-bold flex items-center gap-2 hover:bg-brand-gold hover:text-brand-black transition-all duration-300">
                {tr.cart.checkout} <ArrowRight size={12} />
              </motion.div>
            </Link>
          )}
        </div>
      </div>

      <div className="lg:hidden h-20" />
    </div>
  )
}

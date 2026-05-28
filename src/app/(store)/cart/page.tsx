'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore, cartTotal } from '@/lib/store/cartStore'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useLanguage } from '@/lib/i18n'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'

function shortSize(s: string) {
  if (s.length <= 25) return s
  const last = s.split(',').pop()?.trim() ?? s
  return last.replace(/^\s*\d+\s*/, '').trim() || s.slice(-20)
}

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const { format } = useCurrency()
  const { tr } = useLanguage()
  const router = useRouter()

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
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        <h1 className="font-display text-2xl text-brand-black mb-6">{tr.cart.title}</h1>

        {/* Cart items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={`${item.productId}-${item.size}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  border: '1px solid #e8e2d9', background: '#fff', padding: '12px',
                  width: '100%', boxSizing: 'border-box'
                }}
              >
                {/* Image */}
                <div style={{ width: '72px', height: '72px', flexShrink: 0, background: '#fff', border: '1px solid #e8e2d9', overflow: 'hidden', position: 'relative' }}>
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill
                      style={{ objectFit: 'contain' }}
                      unoptimized={!item.image.includes('cloudinary.com')}
                      sizes="72px" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '8px', color: '#999', textTransform: 'uppercase' }}>MC</span>
                    </div>
                  )}
                </div>

                {/* Info — takes remaining width, never overflows */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: '11px', color: '#888', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tr.cart.size}: {shortSize(item.size)}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px' }}>{format(item.price)}</p>

                  {/* Qty + delete */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e8e2d9' }}>
                      <button onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer', background: 'none', border: 'none' }}>
                        −
                      </button>
                      <span style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                        {item.quantity}
                      </span>
                      <button onClick={() => updateQuantity(item.productId, item.size, Math.min(item.quantity + 1, item.stock))}
                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer', background: 'none', border: 'none' }}>
                        +
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.productId, item.size)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div style={{ background: '#f5f0ea', padding: '20px', width: '100%', boxSizing: 'border-box' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>
            {tr.cart.summary}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {items.map((item) => (
              <div key={`${item.productId}-${item.size}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
                <span style={{ color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {item.name} ×{item.quantity}
                </span>
                <span style={{ fontWeight: 600, flexShrink: 0 }}>{format(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #ddd6cc', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888' }}>{tr.cart.total}</span>
              <span style={{ fontSize: '18px', fontWeight: 700 }}>{format(cartTotal(items))}</span>
            </div>
            <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{tr.cart.shipping}</p>
          </div>

          <Link href="/checkout"
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box',
              textAlign: 'center', background: '#0a0a0a', color: '#fff',
              padding: '16px', fontSize: '11px', letterSpacing: '0.2em',
              textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none'
            }}>
            {tr.cart.checkout}
          </Link>

          <button onClick={() => router.back()}
            style={{
              display: 'block', width: '100%', textAlign: 'center', marginTop: '12px',
              fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#888', background: 'none', border: 'none', cursor: 'pointer'
            }}>
            {tr.cart.continueShopping}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/lib/store/cartStore'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <ShoppingBag size={48} className="text-brand-light-gray mb-6" strokeWidth={1} />
        <h1 className="font-display text-3xl text-brand-black mb-3">Votre panier est vide</h1>
        <p className="text-brand-gray text-sm mb-8">Découvrez notre collection et ajoutez vos pièces favorites.</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-brand-black text-brand-white px-8 py-4 text-xs tracking-[0.2em] uppercase hover:bg-brand-gold hover:text-brand-black transition-colors"
        >
          Voir la Collection <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <h1 className="font-display text-3xl md:text-4xl text-brand-black mb-10">Mon Panier</h1>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={`${item.productId}-${item.size}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex gap-4 bg-brand-white border border-brand-light-gray p-4"
                >
                  {/* Image */}
                  <div className="relative w-20 h-28 flex-shrink-0 bg-brand-light-gray overflow-hidden">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[8px] text-brand-gray uppercase">MC</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-brand-black truncate">{item.name}</h3>
                    <p className="text-xs text-brand-gray mt-0.5 tracking-widest uppercase">
                      Taille: {item.size}
                    </p>
                    <p className="text-sm font-semibold text-brand-black mt-2">
                      {item.price.toFixed(2)} MAD
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-brand-light-gray">
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors text-sm"
                        >
                          −
                        </button>
                        <span className="w-8 h-8 flex items-center justify-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, Math.min(item.quantity + 1, item.stock))}
                          className="w-8 h-8 flex items-center justify-center text-brand-gray hover:text-brand-black hover:bg-brand-light-gray transition-colors text-sm"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.size)}
                        className="text-brand-gray hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-brand-light-gray p-6 sticky top-24">
              <h2 className="text-xs tracking-[0.2em] uppercase text-brand-gray mb-6">Récapitulatif</h2>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex justify-between text-sm">
                    <span className="text-brand-gray truncate mr-2">
                      {item.name} ×{item.quantity}
                    </span>
                    <span className="text-brand-black font-medium flex-shrink-0">
                      {(item.price * item.quantity).toFixed(2)} MAD
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-brand-beige pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm tracking-widest uppercase text-brand-gray">Total</span>
                  <span className="text-lg font-semibold text-brand-black">{total().toFixed(2)} MAD</span>
                </div>
                <p className="text-xs text-brand-gray mt-1">+ Frais de livraison selon ville</p>
              </div>

              <div className="bg-brand-black/5 p-3 mb-6 text-xs text-brand-gray">
                Paiement à la livraison (Cash on Delivery)
              </div>

              <Link
                href="/checkout"
                className="block w-full text-center bg-brand-black text-brand-white py-4 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-brand-gold hover:text-brand-black transition-colors"
              >
                Commander maintenant
              </Link>

              <Link
                href="/products"
                className="block text-center mt-3 text-xs tracking-widest uppercase text-brand-gray hover:text-brand-black transition-colors"
              >
                Continuer les achats
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

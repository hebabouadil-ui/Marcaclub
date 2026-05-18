'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore, cartTotal } from '@/lib/store/cartStore'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'

const WILAYAS = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda',
  'Kenitra', 'Tétouan', 'Safi', 'El Jadida', 'Béni Mellal', 'Nador', 'Mohammedia',
  'Khouribga', 'Errachidia', 'Taza', 'Settat', 'Larache', 'Khémisset', 'Guelmim',
  'Berrechid', 'Khénifra', 'Taourirt', 'Tiznit', 'Essaouira', 'Ifrane', 'Ouarzazate',
  'Laâyoune', 'Dakhla', 'Al Hoceima', 'Azrou', 'Chefchaouen', 'Midelt', 'Taroudant',
  'Sidi Kacem', 'Sidi Slimane', 'Berkane', 'Youssoufia', 'Benslimane', 'Fnideq',
  'Martil', 'M\'diq', 'Aïn Harrouda', 'Bouskoura', 'Temara', 'Salé',
]

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart, removeItem, updateQuantity } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '',
  })

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <ShoppingBag size={48} className="text-brand-light-gray mx-auto mb-6" strokeWidth={1} />
          <h1 className="font-display text-3xl mb-4">Panier vide</h1>
          <Link href="/products" className="inline-flex items-center gap-2 text-brand-gold hover:gap-3 transition-all text-sm tracking-widest uppercase">
            Voir la collection <span>→</span>
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.address || !form.city) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      toast.error('Numéro de téléphone invalide')
      return
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Adresse email invalide')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: form,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            size: i.size,
            image: i.image,
          })),
          total: cartTotal(items),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erreur')
      clearCart()
      router.push(`/order-confirmation?order=${data.orderNumber}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la commande')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-brand-gray hover:text-brand-black transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          Continuer mes achats
        </Link>

        <h1 className="font-display text-3xl md:text-4xl text-brand-black mb-10">Finaliser la commande</h1>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
            <p className="text-[10px] tracking-[0.3em] uppercase text-brand-gold mb-4">
              Informations de livraison
            </p>

            {[
              { id: 'name', label: 'Nom complet *', type: 'text', required: true },
              { id: 'phone', label: 'Numéro de téléphone *', type: 'tel', required: true },
              { id: 'email', label: 'Email (optionnel — pour confirmation)', type: 'email', required: false },
              { id: 'address', label: 'Adresse complète *', type: 'text', required: true },
            ].map((f) => (
              <div key={f.id}>
                <label className="block text-xs tracking-widest uppercase text-brand-gray mb-2">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  required={f.required}
                  value={form[f.id as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                  className="w-full border border-brand-light-gray px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors bg-transparent"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs tracking-widest uppercase text-brand-gray mb-2">Ville *</label>
              <select
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full border border-brand-light-gray px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors bg-transparent"
              >
                <option value="">Choisir une ville</option>
                {WILAYAS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div className="bg-brand-light-gray p-4">
              <p className="text-xs text-brand-gray font-semibold mb-1 tracking-widest uppercase">
                Mode de paiement
              </p>
              <p className="text-sm text-brand-black">💵 Paiement à la livraison (Cash on Delivery)</p>
              <p className="text-xs text-brand-gray mt-1">
                Vous payez uniquement à la réception de votre commande.
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center gap-3 bg-brand-black text-brand-white py-4 text-sm tracking-[0.2em] uppercase font-semibold hover:bg-brand-gold hover:text-brand-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Traitement...' : 'Confirmer la commande'}
            </motion.button>
          </form>

          {/* Order summary with editable items */}
          <div className="lg:col-span-2">
            <div className="bg-brand-light-gray p-6 sticky top-24">
              <p className="text-[10px] tracking-[0.3em] uppercase text-brand-gray mb-5">
                Mon panier ({items.length} article{items.length > 1 ? 's' : ''})
              </p>

              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={`${item.productId}-${item.size}`}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-3 mb-4 pb-4 border-b border-brand-beige last:border-0"
                  >
                    {/* Image */}
                    <div className="relative w-14 flex-shrink-0 bg-white overflow-hidden" style={{ height: '72px' }}>
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover object-top" sizes="56px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-brand-beige">
                          <span className="text-[8px] text-brand-gray">MC</span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-black truncate">{item.name}</p>
                      <p className="text-xs text-brand-gray mt-0.5">Taille: {item.size}</p>
                      <p className="text-sm font-semibold text-brand-black mt-1">{(item.price * item.quantity).toFixed(2)} MAD</p>

                      {/* Qty controls + remove */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-brand-beige bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-brand-gray hover:text-brand-black transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-7 h-7 flex items-center justify-center text-xs font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.size, Math.min(item.quantity + 1, item.stock))}
                            className="w-7 h-7 flex items-center justify-center text-brand-gray hover:text-brand-black transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.size)}
                          className="text-brand-gray hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="border-t border-brand-beige pt-4 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm tracking-widest uppercase text-brand-gray">Total</span>
                  <span className="text-xl font-semibold text-brand-black">{cartTotal(items).toFixed(2)} MAD</span>
                </div>
                <p className="text-xs text-brand-gray mt-1">+ Frais de livraison selon ville</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

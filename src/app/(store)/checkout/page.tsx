'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, cartTotal } from '@/lib/store/cartStore'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Trash2, Plus, Minus, ShoppingBag, Lock } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'MA', name: 'Morocco' },
  { code: 'OTHER', name: 'Other' },
]

interface CustomerForm {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
}

const emptyForm: CustomerForm = {
  name: '', email: '', phone: '', address: '',
  city: '', state: '', postalCode: '', country: 'US',
}

function PaymentForm({ clientSecret, customer, items, total, onSuccess }: {
  clientSecret: string
  customer: CustomerForm
  items: { productId: string; size: string; quantity: number }[]
  total: number
  onSuccess: (orderNumber: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)

    // Submit the payment element first
    const { error: submitError } = await elements.submit()
    if (submitError) {
      toast.error(submitError.message ?? 'Payment error')
      setPaying(false)
      return
    }

    // Create the order in DB before confirming payment
    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, items, stripeClientSecret: clientSecret }),
    })
    const orderData = await orderRes.json()
    if (!orderRes.ok) {
      toast.error(orderData.message ?? 'Failed to create order')
      setPaying(false)
      return
    }

    // Confirm payment with Stripe
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation?order=${orderData.orderNumber}`,
        payment_method_data: {
          billing_details: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: {
              line1: customer.address,
              city: customer.city,
              state: customer.state,
              postal_code: customer.postalCode,
              country: customer.country === 'OTHER' ? 'US' : customer.country,
            },
          },
        },
      },
    })

    if (error) {
      toast.error(error.message ?? 'Payment failed')
      setPaying(false)
    } else {
      onSuccess(orderData.orderNumber)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full bg-brand-gold text-brand-black font-bold py-4 rounded-none text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50"
      >
        {paying ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
        {paying ? 'Processing...' : `Pay $${total.toFixed(2)}`}
      </button>
      <p className="text-white/30 text-xs text-center flex items-center justify-center gap-1">
        <Lock size={10} /> Secured by Stripe · SSL encrypted
      </p>
    </form>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, clearCart } = useCartStore()
  const total = cartTotal(items)

  const [customer, setCustomer] = useState<CustomerForm>(emptyForm)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [step, setStep] = useState<'info' | 'payment'>('info')
  const [loadingIntent, setLoadingIntent] = useState(false)

  const set = useCallback((key: keyof CustomerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCustomer((prev) => ({ ...prev, [key]: e.target.value }))
  }, [])

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer.name || !customer.email || !customer.phone || !customer.address || !customer.city || !customer.postalCode) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoadingIntent(true)
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
          currency: 'usd',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClientSecret(data.clientSecret)
      setStep('payment')
    } catch {
      toast.error('Failed to initialize payment. Please try again.')
    } finally {
      setLoadingIntent(false)
    }
  }

  const handleSuccess = (orderNumber: string) => {
    clearCart()
    router.push(`/order-confirmation?order=${orderNumber}`)
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center gap-4">
        <ShoppingBag size={40} className="text-white/20" />
        <p className="text-white/40 text-sm tracking-widest">YOUR CART IS EMPTY</p>
        <Link href="/products" className="text-brand-gold text-sm tracking-widest hover:underline">
          CONTINUE SHOPPING
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/products" className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors mb-6">
            <ArrowLeft size={14} /> Continue Shopping
          </Link>
          <h1 className="font-display font-bold text-2xl tracking-widest uppercase text-white">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left — form */}
          <div className="lg:col-span-3 space-y-6">

            {/* Step indicator */}
            <div className="flex items-center gap-3 text-xs tracking-widest mb-2">
              <span className={step === 'info' ? 'text-brand-gold' : 'text-white/40'}>01 · INFORMATION</span>
              <span className="text-white/20">—</span>
              <span className={step === 'payment' ? 'text-brand-gold' : 'text-white/40'}>02 · PAYMENT</span>
            </div>

            {step === 'info' && (
              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">FULL NAME *</label>
                    <input value={customer.name} onChange={set('name')} required
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-brand-gold/50 transition-colors placeholder:text-white/20"
                      placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">EMAIL *</label>
                    <input value={customer.email} onChange={set('email')} type="email" required
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-brand-gold/50 transition-colors placeholder:text-white/20"
                      placeholder="john@example.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">PHONE *</label>
                  <input value={customer.phone} onChange={set('phone')} type="tel" required
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-brand-gold/50 transition-colors placeholder:text-white/20"
                    placeholder="+1 (555) 000-0000" />
                </div>

                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">STREET ADDRESS *</label>
                  <input value={customer.address} onChange={set('address')} required
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-brand-gold/50 transition-colors placeholder:text-white/20"
                    placeholder="123 Main St, Apt 4B" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">CITY *</label>
                    <input value={customer.city} onChange={set('city')} required
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-brand-gold/50 transition-colors placeholder:text-white/20"
                      placeholder="New York" />
                  </div>
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">STATE / PROVINCE</label>
                    <input value={customer.state} onChange={set('state')}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-brand-gold/50 transition-colors placeholder:text-white/20"
                      placeholder="NY" />
                  </div>
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">POSTAL CODE *</label>
                    <input value={customer.postalCode} onChange={set('postalCode')} required
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-brand-gold/50 transition-colors placeholder:text-white/20"
                      placeholder="10001" />
                  </div>
                </div>

                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">COUNTRY *</label>
                  <select value={customer.country} onChange={set('country')}
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-brand-gold/50 transition-colors">
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-brand-black">{c.name}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" disabled={loadingIntent}
                  className="w-full bg-brand-gold text-brand-black font-bold py-4 text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50 mt-2">
                  {loadingIntent ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loadingIntent ? 'Preparing...' : 'Continue to Payment'}
                </button>
              </form>
            )}

            {step === 'payment' && clientSecret && (
              <div className="space-y-6">
                <button onClick={() => setStep('info')} className="flex items-center gap-2 text-white/40 hover:text-white text-xs tracking-widest transition-colors">
                  <ArrowLeft size={12} /> EDIT INFORMATION
                </button>
                {/* Summary of entered info */}
                <div className="bg-white/3 border border-white/8 p-4 text-xs space-y-1">
                  <p className="text-white/60">{customer.name} · {customer.email}</p>
                  <p className="text-white/40">{customer.address}, {customer.city}{customer.state ? `, ${customer.state}` : ''} {customer.postalCode}</p>
                  <p className="text-white/40">{COUNTRIES.find(c => c.code === customer.country)?.name}</p>
                </div>
                <Elements stripe={stripePromise} options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: { colorPrimary: '#C9A84C', colorBackground: '#141414', fontFamily: 'inherit' },
                  },
                }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    customer={customer}
                    items={items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity }))}
                    total={total}
                    onSuccess={handleSuccess}
                  />
                </Elements>
              </div>
            )}
          </div>

          {/* Right — order summary */}
          <div className="lg:col-span-2">
            <div className="border border-white/8 p-6 space-y-4 sticky top-6">
              <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-4">Order Summary</h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3">
                    {item.image && (
                      <div className="w-14 h-14 relative flex-shrink-0 bg-white/5">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{item.name}</p>
                      <p className="text-white/40 text-[10px]">Size: {item.size}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                          className="text-white/40 hover:text-white"><Minus size={10} /></button>
                        <span className="text-white/60 text-xs">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                          className="text-white/40 hover:text-white"><Plus size={10} /></button>
                        <button onClick={() => removeItem(item.productId, item.size)}
                          className="text-white/20 hover:text-red-400 ml-1"><Trash2 size={10} /></button>
                      </div>
                    </div>
                    <p className="text-white text-xs font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/8 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-white/40">
                  <span>Subtotal</span><span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-white/40">
                  <span>Shipping</span><span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/8">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-white/20 text-[10px] text-center tracking-wider">
                DELIVERED IN 7–12 BUSINESS DAYS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

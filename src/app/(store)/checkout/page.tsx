'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, cartTotal } from '@/lib/store/cartStore'
import { useCurrency } from '@/lib/context/CurrencyContext'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Trash2, Plus, Minus, ShoppingBag, Lock, ChevronRight, Shield, RotateCcw, Truck } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'AU', name: 'Australia' },
  { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' }, { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' }, { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' }, { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'MA', name: 'Morocco' }, { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' }, { code: 'IN', name: 'India' },
  { code: 'OTHER', name: 'Other Country' },
]

interface CustomerForm {
  name: string; email: string; phone: string; address: string
  city: string; state: string; postalCode: string; country: string
}
const emptyForm: CustomerForm = {
  name: '', email: '', phone: '', address: '', city: '', state: '', postalCode: '', country: 'US',
}

function PaymentStep({ clientSecret, customer, items, total, onSuccess }: {
  clientSecret: string
  customer: CustomerForm
  items: { productId: string; size: string; quantity: number }[]
  total: number
  onSuccess: (orderNumber: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const { format } = useCurrency()

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)

    const { error: submitError } = await elements.submit()
    if (submitError) { toast.error(submitError.message ?? 'Payment error'); setPaying(false); return }

    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, items, stripeClientSecret: clientSecret }),
    })
    const orderData = await orderRes.json()
    if (!orderRes.ok) { toast.error(orderData.message ?? 'Failed to create order'); setPaying(false); return }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation?order=${orderData.orderNumber}`,
        payment_method_data: {
          billing_details: {
            name: customer.name, email: customer.email, phone: customer.phone,
            address: {
              line1: customer.address, city: customer.city, state: customer.state,
              postal_code: customer.postalCode, country: customer.country === 'OTHER' ? 'US' : customer.country,
            },
          },
        },
      },
    })

    if (error) { toast.error(error.message ?? 'Payment failed'); setPaying(false) }
    else { onSuccess(orderData.orderNumber) }
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button type="submit" disabled={paying || !stripe}
        className="w-full bg-gray-900 text-white font-semibold py-4 text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50 rounded-lg">
        {paying ? <Loader2 size={16} className="animate-spin" /> : <Lock size={14} />}
        {paying ? 'Processing payment...' : `Pay ${format(total)} now`}
      </button>
      <div className="flex items-center justify-center gap-4 text-gray-400 text-xs">
        <span className="flex items-center gap-1"><Shield size={11} /> SSL Secured</span>
        <span className="flex items-center gap-1"><Lock size={11} /> Stripe Encrypted</span>
      </div>
    </form>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, clearCart } = useCartStore()
  const total = cartTotal(items)
  const { format, currency } = useCurrency()

  const [customer, setCustomer] = useState<CustomerForm>(emptyForm)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [step, setStep] = useState<'cart' | 'info' | 'payment'>('cart')
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
    } catch { toast.error('Failed to initialize payment. Please try again.') }
    finally { setLoadingIntent(false) }
  }

  const handleSuccess = (orderNumber: string) => {
    clearCart()
    router.push(`/order-confirmation?order=${orderNumber}`)
  }

  if (items.length === 0 && step === 'cart') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <ShoppingBag size={48} className="text-gray-200" />
        <p className="text-gray-400 text-sm">Your cart is empty</p>
        <Link href="/products" className="bg-gray-900 text-white px-6 py-3 text-sm hover:bg-gray-700 transition-colors rounded-lg">
          Start shopping
        </Link>
      </div>
    )
  }

  const countryName = COUNTRIES.find(c => c.code === customer.country)?.name ?? customer.country

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-xl tracking-widest text-gray-900">MARCACLUB</Link>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button onClick={() => setStep('cart')} className={step === 'cart' ? 'text-gray-900 font-semibold' : 'hover:text-gray-600'}>Cart</button>
            <ChevronRight size={12} />
            <button onClick={() => step === 'payment' && setStep('info')} className={step === 'info' ? 'text-gray-900 font-semibold' : step === 'payment' ? 'hover:text-gray-600' : 'text-gray-300'}>Information</button>
            <ChevronRight size={12} />
            <span className={step === 'payment' ? 'text-gray-900 font-semibold' : 'text-gray-300'}>Payment</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — steps */}
          <div className="lg:col-span-3">

            {/* STEP 1: Cart review */}
            {step === 'cart' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-gray-900">Your Cart ({items.length} {items.length === 1 ? 'item' : 'items'})</h2>
                  <Link href="/products" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><ArrowLeft size={12} /> Continue shopping</Link>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.size}`} className="py-4 flex gap-4">
                      {item.image && (
                        <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">Size: {item.size}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Minus size={10} /></button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Plus size={10} /></button>
                          <button onClick={() => removeItem(item.productId, item.size)} className="ml-2 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{format(item.price * item.quantity)}</p>
                        {item.quantity > 1 && <p className="text-xs text-gray-400">{format(item.price)} each</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep('info')}
                  className="w-full mt-6 bg-gray-900 text-white py-4 font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                  Proceed to checkout <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* STEP 2: Information */}
            {step === 'info' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-6">Shipping Information</h2>
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name *</label>
                      <input value={customer.name} onChange={set('name')} required placeholder="John Doe"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
                      <input value={customer.email} onChange={set('email')} type="email" required placeholder="john@example.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone *</label>
                    <input value={customer.phone} onChange={set('phone')} type="tel" required placeholder="+1 (555) 000-0000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Street address *</label>
                    <input value={customer.address} onChange={set('address')} required placeholder="123 Main St, Apt 4B"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">City *</label>
                      <input value={customer.city} onChange={set('city')} required placeholder="New York"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">State / Province</label>
                      <input value={customer.state} onChange={set('state')} placeholder="NY"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Postal code *</label>
                      <input value={customer.postalCode} onChange={set('postalCode')} required placeholder="10001"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Country *</label>
                    <select value={customer.country} onChange={set('country')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white">
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={loadingIntent}
                    className="w-full bg-gray-900 text-white py-4 font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
                    {loadingIntent ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loadingIntent ? 'Preparing...' : 'Continue to payment'}
                    {!loadingIntent && <ChevronRight size={16} />}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: Payment */}
            {step === 'payment' && clientSecret && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {/* Shipping summary */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Shipping to</p>
                    <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-500">{customer.address}, {customer.city}{customer.state ? `, ${customer.state}` : ''} {customer.postalCode} · {countryName}</p>
                  </div>
                  <button onClick={() => setStep('info')} className="text-xs text-gray-400 hover:text-gray-600 underline">Change</button>
                </div>
                <h2 className="font-semibold text-gray-900 mb-5">Payment</h2>
                <Elements stripe={stripePromise} options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: { colorPrimary: '#111827', borderRadius: '8px', fontFamily: 'inherit' },
                  },
                }}>
                  <PaymentStep
                    clientSecret={clientSecret}
                    customer={customer}
                    items={items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity }))}
                    total={total}
                    onSuccess={handleSuccess}
                  />
                </Elements>
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { icon: Truck, label: 'Free Shipping', sub: '7–12 business days' },
                { icon: Shield, label: 'Secure Payment', sub: 'SSL & Stripe encrypted' },
                { icon: RotateCcw, label: 'Easy Returns', sub: '30-day return policy' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <Icon size={20} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-xs font-semibold text-gray-700">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
              <h2 className="font-semibold text-gray-900 mb-5">Order Summary</h2>
              <div className="space-y-3 max-h-72 overflow-y-auto mb-5">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3 items-center">
                    {item.image && (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{item.quantity}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">Size: {item.size}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{format(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>{format(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span><span className="text-green-600 font-medium">Free</span>
                </div>
                {currency !== 'USD' && (
                  <p className="text-[10px] text-gray-400">* Displayed in {currency}. Charged in USD at checkout.</p>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span><span>{format(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

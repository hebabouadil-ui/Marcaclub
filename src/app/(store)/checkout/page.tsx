'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, cartTotal } from '@/lib/store/cartStore'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useCustomer } from '@/lib/context/CustomerContext'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Loader2, Trash2, Plus, Minus, ShoppingBag,
  Lock, ChevronRight, Shield, RotateCcw, Truck, Mail, Eye, EyeOff, User,
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Tax component: a named tax line with its own rate
interface TaxComponent { label: string; rate: number }

// Canada: province-level breakdown (GST/HST/PST/TVQ)
const CANADA_PROVINCE_TAX: Record<string, TaxComponent[]> = {
  AB: [{ label: 'GST 5%',  rate: 0.05 }],
  BC: [{ label: 'GST 5%',  rate: 0.05 }, { label: 'PST 7%',  rate: 0.07 }],
  MB: [{ label: 'GST 5%',  rate: 0.05 }, { label: 'PST 7%',  rate: 0.07 }],
  NB: [{ label: 'HST 15%', rate: 0.15 }],
  NL: [{ label: 'HST 15%', rate: 0.15 }],
  NS: [{ label: 'HST 15%', rate: 0.15 }],
  NT: [{ label: 'GST 5%',  rate: 0.05 }],
  NU: [{ label: 'GST 5%',  rate: 0.05 }],
  ON: [{ label: 'HST 13%', rate: 0.13 }],
  PE: [{ label: 'HST 15%', rate: 0.15 }],
  QC: [{ label: 'TPS 5%',  rate: 0.05 }, { label: 'TVQ 9.975%', rate: 0.09975 }],
  SK: [{ label: 'GST 5%',  rate: 0.05 }, { label: 'PST 6%',  rate: 0.06 }],
  YT: [{ label: 'GST 5%',  rate: 0.05 }],
}

// US: state-level sales tax (state base rate)
const US_STATE_TAX: Record<string, TaxComponent[]> = {
  AL: [{ label: 'Sales Tax 4%',     rate: 0.04 }],
  AK: [{ label: 'No Sales Tax',     rate: 0 }],
  AZ: [{ label: 'Sales Tax 5.6%',   rate: 0.056 }],
  AR: [{ label: 'Sales Tax 6.5%',   rate: 0.065 }],
  CA: [{ label: 'Sales Tax 7.25%',  rate: 0.0725 }],
  CO: [{ label: 'Sales Tax 2.9%',   rate: 0.029 }],
  CT: [{ label: 'Sales Tax 6.35%',  rate: 0.0635 }],
  DE: [{ label: 'No Sales Tax',     rate: 0 }],
  FL: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  GA: [{ label: 'Sales Tax 4%',     rate: 0.04 }],
  HI: [{ label: 'GET 4%',           rate: 0.04 }],
  ID: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  IL: [{ label: 'Sales Tax 6.25%',  rate: 0.0625 }],
  IN: [{ label: 'Sales Tax 7%',     rate: 0.07 }],
  IA: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  KS: [{ label: 'Sales Tax 6.5%',   rate: 0.065 }],
  KY: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  LA: [{ label: 'Sales Tax 4.45%',  rate: 0.0445 }],
  ME: [{ label: 'Sales Tax 5.5%',   rate: 0.055 }],
  MD: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  MA: [{ label: 'Sales Tax 6.25%',  rate: 0.0625 }],
  MI: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  MN: [{ label: 'Sales Tax 6.875%', rate: 0.06875 }],
  MS: [{ label: 'Sales Tax 7%',     rate: 0.07 }],
  MO: [{ label: 'Sales Tax 4.225%', rate: 0.04225 }],
  MT: [{ label: 'No Sales Tax',     rate: 0 }],
  NE: [{ label: 'Sales Tax 5.5%',   rate: 0.055 }],
  NV: [{ label: 'Sales Tax 6.85%',  rate: 0.0685 }],
  NH: [{ label: 'No Sales Tax',     rate: 0 }],
  NJ: [{ label: 'Sales Tax 6.625%', rate: 0.06625 }],
  NM: [{ label: 'Sales Tax 5%',     rate: 0.05 }],
  NY: [{ label: 'Sales Tax 4%',     rate: 0.04 }],
  NC: [{ label: 'Sales Tax 4.75%',  rate: 0.0475 }],
  ND: [{ label: 'Sales Tax 5%',     rate: 0.05 }],
  OH: [{ label: 'Sales Tax 5.75%',  rate: 0.0575 }],
  OK: [{ label: 'Sales Tax 4.5%',   rate: 0.045 }],
  OR: [{ label: 'No Sales Tax',     rate: 0 }],
  PA: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  RI: [{ label: 'Sales Tax 7%',     rate: 0.07 }],
  SC: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  SD: [{ label: 'Sales Tax 4.5%',   rate: 0.045 }],
  TN: [{ label: 'Sales Tax 7%',     rate: 0.07 }],
  TX: [{ label: 'Sales Tax 6.25%',  rate: 0.0625 }],
  UT: [{ label: 'Sales Tax 4.85%',  rate: 0.0485 }],
  VT: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  VA: [{ label: 'Sales Tax 4.3%',   rate: 0.043 }],
  WA: [{ label: 'Sales Tax 6.5%',   rate: 0.065 }],
  WV: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
  WI: [{ label: 'Sales Tax 5%',     rate: 0.05 }],
  WY: [{ label: 'Sales Tax 4%',     rate: 0.04 }],
  DC: [{ label: 'Sales Tax 6%',     rate: 0.06 }],
}

// Rest of world: single VAT/GST rate (non-North America)
const WORLD_TAX: Record<string, { rate: number; label: string }> = {
  GB: { rate: 0.20,  label: 'VAT 20%' },
  AU: { rate: 0.10,  label: 'GST 10%' },
  FR: { rate: 0.20,  label: 'TVA 20%' },
  DE: { rate: 0.19,  label: 'MwSt 19%' },
  ES: { rate: 0.21,  label: 'IVA 21%' },
  IT: { rate: 0.22,  label: 'IVA 22%' },
  NL: { rate: 0.21,  label: 'BTW 21%' },
  BE: { rate: 0.21,  label: 'TVA 21%' },
  CH: { rate: 0.077, label: 'MWST 7.7%' },
  AT: { rate: 0.20,  label: 'MwSt 20%' },
  SE: { rate: 0.25,  label: 'Moms 25%' },
  NO: { rate: 0.25,  label: 'MVA 25%' },
  DK: { rate: 0.25,  label: 'Moms 25%' },
  PT: { rate: 0.23,  label: 'IVA 23%' },
  IE: { rate: 0.23,  label: 'VAT 23%' },
  NZ: { rate: 0.15,  label: 'GST 15%' },
  JP: { rate: 0.10,  label: 'Consumption Tax 10%' },
  SG: { rate: 0.09,  label: 'GST 9%' },
  AE: { rate: 0.05,  label: 'VAT 5%' },
  SA: { rate: 0.15,  label: 'VAT 15%' },
  MA: { rate: 0.20,  label: 'TVA 20%' },
  BR: { rate: 0.17,  label: 'ICMS 17%' },
  MX: { rate: 0.16,  label: 'IVA 16%' },
  IN: { rate: 0.18,  label: 'GST 18%' },
}

// Resolve tax components from country + state/province
function resolveTaxComponents(country: string, stateCode: string): TaxComponent[] {
  const code = stateCode.trim().toUpperCase()
  if (country === 'CA') return CANADA_PROVINCE_TAX[code] ?? [{ label: 'GST 5%', rate: 0.05 }]
  if (country === 'US') return US_STATE_TAX[code] ?? []
  const world = WORLD_TAX[country]
  if (world) return [{ label: world.label, rate: world.rate }]
  return []
}

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

// Google icon SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

// Inline auth step for checkout
function AuthStep({
  onGuest,
  onSuccess,
  returnTo,
}: {
  onGuest: () => void
  onSuccess: () => void
  returnTo: string
}) {
  const [mode, setMode] = useState<'choose' | 'signin' | 'register'>('choose')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const { refresh } = useCustomer()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signin') {
        const res = await fetch('/api/customer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error ?? 'Login failed'); return }
        await refresh()
        toast.success(`Welcome back, ${data.name}!`)
        onSuccess()
      } else {
        if (!form.name) { toast.error('Please enter your name'); return }
        if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
        const res = await fetch('/api/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error ?? 'Registration failed'); return }
        await refresh()
        toast.success('Account created! Welcome to Marcaclub.')
        onSuccess()
      }
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="text-center mb-6">
        <h2 className="font-semibold text-gray-900 text-lg mb-1">How would you like to continue?</h2>
        <p className="text-gray-400 text-sm">Create an account to track your order, save your info, and checkout faster next time.</p>
      </div>

      {mode === 'choose' && (
        <div className="space-y-3">
          {/* Social buttons */}
          <a
            href={`/api/customer/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </a>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-3 w-fit mx-auto">or</div>
          </div>

          {/* Email options */}
          <button
            onClick={() => setMode('signin')}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Mail size={16} /> Sign in with Email
          </button>
          <button
            onClick={() => setMode('register')}
            className="w-full flex items-center justify-center gap-2 bg-brand-gold text-brand-black rounded-lg px-4 py-3 text-sm font-semibold hover:bg-yellow-400 transition-colors"
          >
            <User size={16} /> Create a Free Account
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
          </div>

          {/* Guest */}
          <button
            onClick={onGuest}
            className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors py-2 flex items-center justify-center gap-1"
          >
            Continue as Guest <ChevronRight size={14} />
          </button>
        </div>
      )}

      {(mode === 'signin' || mode === 'register') && (
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-2">
            <ArrowLeft size={13} /> Back
          </button>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
              <input value={form.name} onChange={set('name')} required placeholder="John Doe"
                className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input value={form.email} onChange={set('email')} type="email" required placeholder="your@email.com"
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password {mode === 'register' && <span className="text-gray-400">(min. 8 characters)</span>}</label>
            <div className="relative">
              <input value={form.password} onChange={set('password')} type={showPass ? 'text' : 'password'} required placeholder="••••••••"
                className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In & Continue' : 'Create Account & Continue'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-2">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button type="button" onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')} className="text-brand-gold font-medium">
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
          </div>
          <button type="button" onClick={onGuest} className="w-full text-gray-400 text-xs hover:text-gray-600 transition-colors py-1">
            Skip — continue as guest
          </button>
        </form>
      )}
    </div>
  )
}

function PaymentStep({ clientSecret, customer, items, total, taxAmount, currency, symbol, onSuccess }: {
  clientSecret: string
  customer: CustomerForm
  items: { productId: string; size: string; quantity: number }[]
  total: number
  taxAmount: number
  currency: string
  symbol: string
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
      body: JSON.stringify({ customer, items, stripeClientSecret: clientSecret, taxAmount, currency, currencySymbol: symbol }),
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
        {paying ? 'Processing payment...' : `Pay ${symbol}${total.toFixed(2)} now`}
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
  const subtotal = cartTotal(items)
  const { format, currency, symbol, geo } = useCurrency()
  const { customer, loading: authLoading } = useCustomer()
  const [shippingForm, setShippingForm] = useState<CustomerForm>(emptyForm)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [step, setStep] = useState<'cart' | 'auth' | 'info' | 'payment'>('cart')
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [authReturnFromOAuth, setAuthReturnFromOAuth] = useState(false)
  const [taxComponents, setTaxComponents] = useState<TaxComponent[]>([])
  const [shippingFeeCAD, setShippingFeeCAD] = useState<number>(14.99) // default until settings load

  const taxAmount = Math.round(
    taxComponents.reduce((sum, c) => sum + subtotal * c.rate, 0) * 100
  ) / 100
  // All amounts in CAD; format() converts to display currency
  const total = subtotal + shippingFeeCAD + taxAmount

  // Load shipping fee from settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (typeof data?.shippingFeeCAD === 'number') setShippingFeeCAD(data.shippingFeeCAD) })
      .catch(() => {})
  }, [])

  // Detect return from OAuth redirect (?auth=done)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'done') {
      setAuthReturnFromOAuth(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('auth')
      window.history.replaceState({}, '', url)
    }
  }, [])

  // After OAuth return, advance to info once customer loads
  useEffect(() => {
    if (authReturnFromOAuth && !authLoading && customer) {
      setShippingForm(prev => ({
        ...prev,
        name: prev.name || customer.name,
        email: prev.email || customer.email,
      }))
      setStep('info')
      setAuthReturnFromOAuth(false)
    }
  }, [authReturnFromOAuth, authLoading, customer])

  // Prefill from geo location and set initial tax
  useEffect(() => {
    if (geo) {
      const countryCode = COUNTRIES.find(c => c.code === geo.countryCode) ? geo.countryCode : 'US'
      const stateCode = geo.region || ''
      setShippingForm(prev => ({ ...prev, country: countryCode, state: prev.state || stateCode }))
      setTaxComponents(resolveTaxComponents(countryCode, stateCode))
    }
  }, [geo])

  // When customer logs in during auth step, advance to info
  const handleAuthSuccess = useCallback(() => {
    if (customer) {
      setShippingForm(prev => ({
        ...prev,
        name: prev.name || customer.name,
        email: prev.email || customer.email,
      }))
    }
    setStep('info')
  }, [customer])

  const set = useCallback((key: keyof CustomerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value
    setShippingForm((prev) => {
      const next = { ...prev, [key]: value }
      const country = key === 'country' ? value : prev.country
      const state  = key === 'state'   ? value : prev.state
      setTaxComponents(resolveTaxComponents(country, state))
      return next
    })
  }, [])

  const handleProceedFromCart = () => {
    // If already logged in, skip auth step
    if (!authLoading && customer) {
      setShippingForm(prev => ({
        ...prev,
        name: prev.name || customer.name,
        email: prev.email || customer.email,
      }))
      setStep('info')
    } else {
      setStep('auth')
    }
  }

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shippingForm.name || !shippingForm.email || !shippingForm.phone || !shippingForm.address || !shippingForm.city || !shippingForm.postalCode) {
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
          currency: currency.toLowerCase(),
          taxRate: taxComponents.reduce((s, c) => s + c.rate, 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClientSecret(data.clientSecret)
      // Update with server-confirmed CAD shipping fee (in case settings changed)
      if (typeof data.shippingFeeCAD === 'number') setShippingFeeCAD(data.shippingFeeCAD)
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

  const countryName = COUNTRIES.find(c => c.code === shippingForm.country)?.name ?? shippingForm.country
  const returnToUrl = `/checkout?auth=done`

  // Breadcrumb labels
  const stepLabels = { cart: 'Cart', auth: 'Account', info: 'Information', payment: 'Payment' }
  const stepOrder = ['cart', 'auth', 'info', 'payment'] as const

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-xl tracking-widest text-gray-900">MARCACLUB</Link>
          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap justify-end">
            {stepOrder.filter(s => s !== 'auth' || (!authLoading && !customer)).map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className={step === s ? 'text-gray-900 font-semibold' : 'text-gray-400'}>{stepLabels[s]}</span>
                {i < arr.length - 1 && <ChevronRight size={12} />}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
          <div className="lg:col-span-3">

            {/* STEP: Cart */}
            {step === 'cart' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
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
                <button onClick={handleProceedFromCart}
                  className="w-full mt-6 bg-gray-900 text-white py-4 font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                  Proceed to Checkout <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* STEP: Auth / Account choice */}
            {step === 'auth' && (
              <AuthStep
                onGuest={() => setStep('info')}
                onSuccess={handleAuthSuccess}
                returnTo={returnToUrl}
              />
            )}

            {/* STEP: Information */}
            {step === 'info' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="font-semibold text-gray-900">Shipping Information</h2>
                  {customer && (
                    <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                      Signed in as {customer.name.split(' ')[0]}
                    </span>
                  )}
                </div>
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name *</label>
                      <input value={shippingForm.name} onChange={set('name')} required placeholder="John Doe"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
                      <input value={shippingForm.email} onChange={set('email')} type="email" required placeholder="john@example.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone *</label>
                    <input value={shippingForm.phone} onChange={set('phone')} type="tel" required placeholder="+1 (555) 000-0000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Street address *</label>
                    <input value={shippingForm.address} onChange={set('address')} required placeholder="123 Main St, Apt 4B"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">City *</label>
                      <input value={shippingForm.city} onChange={set('city')} required placeholder="Montreal"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">State / Province</label>
                      <input value={shippingForm.state} onChange={set('state')} placeholder="QC"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Postal code *</label>
                      <input value={shippingForm.postalCode} onChange={set('postalCode')} required placeholder="H3A 1A1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Country *</label>
                    <select value={shippingForm.country} onChange={set('country')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white">
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  {/* Live tax preview — shows per-component breakdown */}
                  {taxComponents.length > 0 && taxAmount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1.5">
                      {taxComponents.filter(c => c.rate > 0).map((c) => (
                        <div key={c.label} className="flex justify-between text-sm">
                          <span className="text-amber-800 font-medium">{c.label}</span>
                          <span className="font-bold text-amber-900">{format(Math.round(subtotal * c.rate * 100) / 100)}</span>
                        </div>
                      ))}
                      {taxComponents.filter(c => c.rate > 0).length > 1 && (
                        <div className="flex justify-between text-xs text-amber-700 border-t border-amber-200 pt-1.5 mt-1">
                          <span>Total tax</span>
                          <span className="font-bold">{format(taxAmount)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button type="submit" disabled={loadingIntent}
                    className="w-full bg-gray-900 text-white py-4 font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
                    {loadingIntent ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loadingIntent ? 'Preparing...' : `Continue to payment · ${format(total)}`}
                    {!loadingIntent && <ChevronRight size={16} />}
                  </button>
                </form>
              </div>
            )}

            {/* STEP: Payment */}
            {step === 'payment' && clientSecret && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Shipping to</p>
                    <p className="text-sm font-medium text-gray-900">{shippingForm.name}</p>
                    <p className="text-xs text-gray-500">{shippingForm.address}, {shippingForm.city}{shippingForm.state ? `, ${shippingForm.state}` : ''} {shippingForm.postalCode} · {countryName}</p>
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
                    customer={shippingForm}
                    items={items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity }))}
                    total={total}
                    taxAmount={taxAmount}
                    currency={currency}
                    symbol={symbol}
                    onSuccess={handleSuccess}
                  />
                </Elements>
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { icon: Truck, label: 'Worldwide Shipping', sub: '7–12 business days' },
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

          {/* Order summary sidebar */}
          <div className="hidden lg:block lg:col-span-2">
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
                  <span>Subtotal</span><span>{format(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>{format(shippingFeeCAD)}</span>
                </div>
                {taxComponents.length > 0 && taxAmount > 0
                  ? taxComponents.filter(c => c.rate > 0).map((c) => (
                      <div key={c.label} className="flex justify-between text-sm text-gray-600">
                        <span>{c.label}</span>
                        <span>{format(Math.round(subtotal * c.rate * 100) / 100)}</span>
                      </div>
                    ))
                  : (shippingForm.country === 'US' || shippingForm.country === 'CA') && !shippingForm.state
                  ? <div className="flex justify-between text-sm text-gray-400">
                      <span>Tax</span><span className="text-xs">Enter state/province</span>
                    </div>
                  : null
                }
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

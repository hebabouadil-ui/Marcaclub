'use client'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, cartTotal } from '@/lib/store/cartStore'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { SHIPPING_BY_COUNTRY_USD, SHIPPING_DEFAULT_USD } from '@/lib/utils/shippingFee'
import { useCustomer } from '@/lib/context/CustomerContext'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Loader2, ShoppingBag,
  Lock, ChevronRight, ChevronDown, Shield, RotateCcw, Mail, Eye, EyeOff, User, Tag, X as XIcon, Wallet,
} from 'lucide-react'
import GoogleButton from '@/components/store/GoogleButton'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Tax component: a named tax line with its own rate
interface TaxComponent { label: string; rate: number }

// Phone country codes (dial code + country name)
const PHONE_CODES = [
  { dial: '+1',   flag: '🇨🇦', name: 'Canada' },
  { dial: '+1',   flag: '🇺🇸', name: 'United States' },
  { dial: '+212', flag: '🇲🇦', name: 'Morocco' },
  { dial: '+213', flag: '🇩🇿', name: 'Algeria' },
  { dial: '+216', flag: '🇹🇳', name: 'Tunisia' },
  { dial: '+33',  flag: '🇫🇷', name: 'France' },
  { dial: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { dial: '+49',  flag: '🇩🇪', name: 'Germany' },
  { dial: '+34',  flag: '🇪🇸', name: 'Spain' },
  { dial: '+39',  flag: '🇮🇹', name: 'Italy' },
  { dial: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { dial: '+32',  flag: '🇧🇪', name: 'Belgium' },
  { dial: '+41',  flag: '🇨🇭', name: 'Switzerland' },
  { dial: '+43',  flag: '🇦🇹', name: 'Austria' },
  { dial: '+46',  flag: '🇸🇪', name: 'Sweden' },
  { dial: '+47',  flag: '🇳🇴', name: 'Norway' },
  { dial: '+45',  flag: '🇩🇰', name: 'Denmark' },
  { dial: '+351', flag: '🇵🇹', name: 'Portugal' },
  { dial: '+353', flag: '🇮🇪', name: 'Ireland' },
  { dial: '+61',  flag: '🇦🇺', name: 'Australia' },
  { dial: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { dial: '+81',  flag: '🇯🇵', name: 'Japan' },
  { dial: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { dial: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { dial: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { dial: '+91',  flag: '🇮🇳', name: 'India' },
]

// Map country code → default phone dial code
const COUNTRY_PHONE_CODE: Record<string, string> = {
  CA: '+1', US: '+1', MA: '+212', DZ: '+213', TN: '+216',
  FR: '+33', GB: '+44', DE: '+49', ES: '+34', IT: '+39',
  NL: '+31', BE: '+32', CH: '+41', AT: '+43', SE: '+46',
  NO: '+47', DK: '+45', PT: '+351', IE: '+353', AU: '+61',
  NZ: '+64', JP: '+81', SG: '+65', AE: '+971', SA: '+966',
  BR: '+55', MX: '+52', IN: '+91',
}

// Canada provinces with full tax labels
const CA_PROVINCES = [
  { code: 'AB', name: 'Alberta',                   taxLabel: 'GST 5%' },
  { code: 'BC', name: 'British Columbia',           taxLabel: 'GST 5% + PST 7% = 12%' },
  { code: 'MB', name: 'Manitoba',                   taxLabel: 'GST 5% + PST 7% = 12%' },
  { code: 'NB', name: 'New Brunswick',              taxLabel: 'HST 15%' },
  { code: 'NL', name: 'Newfoundland & Labrador',    taxLabel: 'HST 15%' },
  { code: 'NS', name: 'Nova Scotia',                taxLabel: 'HST 15%' },
  { code: 'NT', name: 'Northwest Territories',      taxLabel: 'GST 5%' },
  { code: 'NU', name: 'Nunavut',                    taxLabel: 'GST 5%' },
  { code: 'ON', name: 'Ontario',                    taxLabel: 'HST 13%' },
  { code: 'PE', name: 'Prince Edward Island',       taxLabel: 'HST 15%' },
  { code: 'QC', name: 'Quebec',                     taxLabel: 'TPS 5% + TVQ 9.975% = 14.975%' },
  { code: 'SK', name: 'Saskatchewan',               taxLabel: 'GST 5% + PST 6% = 11%' },
  { code: 'YT', name: 'Yukon',                      taxLabel: 'GST 5%' },
]

// US states with base sales tax rate
const US_STATES = [
  { code: 'AL', name: 'Alabama',              taxLabel: '4%' },
  { code: 'AK', name: 'Alaska',               taxLabel: 'No sales tax' },
  { code: 'AZ', name: 'Arizona',              taxLabel: '5.6%' },
  { code: 'AR', name: 'Arkansas',             taxLabel: '6.5%' },
  { code: 'CA', name: 'California',           taxLabel: '7.25%' },
  { code: 'CO', name: 'Colorado',             taxLabel: '2.9%' },
  { code: 'CT', name: 'Connecticut',          taxLabel: '6.35%' },
  { code: 'DE', name: 'Delaware',             taxLabel: 'No sales tax' },
  { code: 'FL', name: 'Florida',              taxLabel: '6%' },
  { code: 'GA', name: 'Georgia',              taxLabel: '4%' },
  { code: 'HI', name: 'Hawaii',               taxLabel: '4%' },
  { code: 'ID', name: 'Idaho',                taxLabel: '6%' },
  { code: 'IL', name: 'Illinois',             taxLabel: '6.25%' },
  { code: 'IN', name: 'Indiana',              taxLabel: '7%' },
  { code: 'IA', name: 'Iowa',                 taxLabel: '6%' },
  { code: 'KS', name: 'Kansas',               taxLabel: '6.5%' },
  { code: 'KY', name: 'Kentucky',             taxLabel: '6%' },
  { code: 'LA', name: 'Louisiana',            taxLabel: '4.45%' },
  { code: 'ME', name: 'Maine',                taxLabel: '5.5%' },
  { code: 'MD', name: 'Maryland',             taxLabel: '6%' },
  { code: 'MA', name: 'Massachusetts',        taxLabel: '6.25%' },
  { code: 'MI', name: 'Michigan',             taxLabel: '6%' },
  { code: 'MN', name: 'Minnesota',            taxLabel: '6.875%' },
  { code: 'MS', name: 'Mississippi',          taxLabel: '7%' },
  { code: 'MO', name: 'Missouri',             taxLabel: '4.225%' },
  { code: 'MT', name: 'Montana',              taxLabel: 'No sales tax' },
  { code: 'NE', name: 'Nebraska',             taxLabel: '5.5%' },
  { code: 'NV', name: 'Nevada',               taxLabel: '6.85%' },
  { code: 'NH', name: 'New Hampshire',        taxLabel: 'No sales tax' },
  { code: 'NJ', name: 'New Jersey',           taxLabel: '6.625%' },
  { code: 'NM', name: 'New Mexico',           taxLabel: '5%' },
  { code: 'NY', name: 'New York',             taxLabel: '4%' },
  { code: 'NC', name: 'North Carolina',       taxLabel: '4.75%' },
  { code: 'ND', name: 'North Dakota',         taxLabel: '5%' },
  { code: 'OH', name: 'Ohio',                 taxLabel: '5.75%' },
  { code: 'OK', name: 'Oklahoma',             taxLabel: '4.5%' },
  { code: 'OR', name: 'Oregon',               taxLabel: 'No sales tax' },
  { code: 'PA', name: 'Pennsylvania',         taxLabel: '6%' },
  { code: 'RI', name: 'Rhode Island',         taxLabel: '7%' },
  { code: 'SC', name: 'South Carolina',       taxLabel: '6%' },
  { code: 'SD', name: 'South Dakota',         taxLabel: '4.5%' },
  { code: 'TN', name: 'Tennessee',            taxLabel: '7%' },
  { code: 'TX', name: 'Texas',                taxLabel: '6.25%' },
  { code: 'UT', name: 'Utah',                 taxLabel: '4.85%' },
  { code: 'VT', name: 'Vermont',              taxLabel: '6%' },
  { code: 'VA', name: 'Virginia',             taxLabel: '4.3%' },
  { code: 'WA', name: 'Washington',           taxLabel: '6.5%' },
  { code: 'WV', name: 'West Virginia',        taxLabel: '6%' },
  { code: 'WI', name: 'Wisconsin',            taxLabel: '5%' },
  { code: 'WY', name: 'Wyoming',              taxLabel: '4%' },
  { code: 'DC', name: 'Washington D.C.',      taxLabel: '6%' },
]

// Canada: province-level breakdown (GST/HST/PST/TVQ)
const CANADA_PROVINCE_TAX: Record<string, TaxComponent[]> = {
  AB: [{ label: 'GST (Federal) 5%',             rate: 0.05 }],
  BC: [{ label: 'GST (Federal) 5%',             rate: 0.05 }, { label: 'PST (Provincial) 7%',     rate: 0.07 }],
  MB: [{ label: 'GST (Federal) 5%',             rate: 0.05 }, { label: 'PST (Provincial) 7%',     rate: 0.07 }],
  NB: [{ label: 'HST (Federal + Provincial) 15%', rate: 0.15 }],
  NL: [{ label: 'HST (Federal + Provincial) 15%', rate: 0.15 }],
  NS: [{ label: 'HST (Federal + Provincial) 15%', rate: 0.15 }],
  NT: [{ label: 'GST (Federal) 5%',             rate: 0.05 }],
  NU: [{ label: 'GST (Federal) 5%',             rate: 0.05 }],
  ON: [{ label: 'HST (Federal + Provincial) 13%', rate: 0.13 }],
  PE: [{ label: 'HST (Federal + Provincial) 15%', rate: 0.15 }],
  QC: [{ label: 'TPS (Federal) 5%',             rate: 0.05 }, { label: 'TVQ (Provincial) 9.975%', rate: 0.09975 }],
  SK: [{ label: 'GST (Federal) 5%',             rate: 0.05 }, { label: 'PST (Provincial) 6%',     rate: 0.06 }],
  YT: [{ label: 'GST (Federal) 5%',             rate: 0.05 }],
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
  name: string; email: string; phoneCode: string; phone: string; address: string
  city: string; state: string; postalCode: string; country: string
}
const emptyForm: CustomerForm = {
  name: '', email: '', phoneCode: '+1', phone: '', address: '', city: '', state: '', postalCode: '', country: 'US',
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
        const res = await fetch('/api/auth/customer/login', {
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
        const refCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null
        const res = await fetch('/api/auth/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password, referredBy: refCode ?? undefined }),
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
          <GoogleButton
            returnTo={returnTo}
            label="Continue with Google"
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          />
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

function PaymentStep({ clientSecret, customer, items, total, taxAmount, shippingFee, currency, symbol, couponCode, discountAmount, storeCreditUsed, onSuccess }: {
  clientSecret: string
  customer: CustomerForm
  items: { productId: string; size: string; quantity: number }[]
  total: number
  taxAmount: number
  shippingFee: number
  currency: string
  symbol: string
  couponCode?: string | null
  discountAmount?: number
  storeCreditUsed?: number
  onSuccess: (orderNumber: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)

    const { error: submitError } = await elements.submit()
    if (submitError) { toast.error(submitError.message ?? 'Payment error'); setPaying(false); return }

    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, items, stripeClientSecret: clientSecret, taxAmount, shippingFee, currency, currencySymbol: symbol, couponCode, discountAmount, storeCreditUsed }),
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
  const { items, clearCart } = useCartStore()
  const subtotal = cartTotal(items)
  const { format, currency, symbol, rate, geo, usdToCAD } = useCurrency()
  const { customer, loading: authLoading } = useCustomer()
  const [shippingForm, setShippingForm] = useState<CustomerForm>(emptyForm)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [step, setStep] = useState<'auth' | 'info' | 'payment'>('auth')
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [authReturnFromOAuth, setAuthReturnFromOAuth] = useState(false)
  const [taxComponents, setTaxComponents] = useState<TaxComponent[]>([])
  const [confirmedPhone, setConfirmedPhone] = useState('')
  const [confirmedShippingFeeCAD, setConfirmedShippingFeeCAD] = useState<number | null>(null)
  const [confirmedShippingFee, setConfirmedShippingFee] = useState<number | null>(null)
  const [confirmedSnapshot, setConfirmedSnapshot] = useState<{ subtotal: number; shipping: number; tax: number; total: number; discount: number; storeCreditApplied: number } | null>(null)
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false)

  // Coupon
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: 'percent'|'fixed'; value: number; discountCAD: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  // Store credit
  const [useStoreCredit, setUseStoreCredit] = useState(false)
  const [customerStoreCredit, setCustomerStoreCredit] = useState(0)

  // Per-country shipping fee in CAD — fetches real CJ rates when country changes
  const [shippingFeeCAD, setShippingFeeCAD] = useState<number>(() => {
    const usd = SHIPPING_BY_COUNTRY_USD['CA'] ?? SHIPPING_DEFAULT_USD
    return Math.round(usd * 1.38 * 100) / 100
  })
  const [shippingFeeLoading, setShippingFeeLoading] = useState(false)

  useEffect(() => {
    if (items.length === 0) return
    const country = shippingForm.country || 'CA'
    setShippingFeeLoading(true)
    fetch('/api/shipping-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        country,
      }),
    })
      .then(r => r.json())
      .then(d => { if (typeof d.shippingFeeCAD === 'number') setShippingFeeCAD(d.shippingFeeCAD) })
      .catch(() => {
        const usd = SHIPPING_BY_COUNTRY_USD[country] ?? SHIPPING_DEFAULT_USD
        setShippingFeeCAD(Math.round(usd * usdToCAD * 100) / 100)
      })
      .finally(() => setShippingFeeLoading(false))
  }, [shippingForm.country, items, usdToCAD])

  const taxAmount = Math.round(
    taxComponents.reduce((sum, c) => sum + subtotal * c.rate, 0) * 100
  ) / 100
  // Use server-confirmed shipping once available (live FX), fallback to estimated
  const effectiveShippingCAD = confirmedShippingFeeCAD ?? shippingFeeCAD
  // Coupon discount and store credit (all in CAD)
  const couponDiscountCAD = appliedCoupon?.discountCAD ?? 0
  const storeCreditAppliedCAD = useStoreCredit
    ? Math.min(customerStoreCredit, Math.max(0, subtotal + effectiveShippingCAD + taxAmount - couponDiscountCAD))
    : 0
  // All amounts in CAD; format() converts to display currency
  const total = Math.max(0, subtotal + effectiveShippingCAD + taxAmount - couponDiscountCAD - storeCreditAppliedCAD)

  // Fetch customer store credit when logged in
  useEffect(() => {
    if (!customer) { setCustomerStoreCredit(0); return }
    fetch('/api/auth/customer/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (typeof d.storeCredit === 'number') setCustomerStoreCredit(d.storeCredit) })
      .catch(() => {})
  }, [customer])

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
      const dialCode = COUNTRY_PHONE_CODE[countryCode] ?? '+1'
      setShippingForm(prev => ({ ...prev, country: countryCode, state: prev.state || stateCode, phoneCode: prev.phoneCode === '+1' ? dialCode : prev.phoneCode }))
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
      // Auto-update phone code when country changes
      if (key === 'country') {
        next.phoneCode = COUNTRY_PHONE_CODE[value] ?? prev.phoneCode
        // Reset state/province when country changes
        next.state = ''
      }
      const country = key === 'country' ? value : prev.country
      const state  = key === 'state'   ? value : prev.state
      setTaxComponents(resolveTaxComponents(country, state))
      return next
    })
  }, [])

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim(),
          subtotalCAD: subtotal,
          customerEmail: shippingForm.email || customer?.email,
        }),
      })
      const data = await res.json()
      if (!data.valid) { setCouponError(data.error ?? 'Code invalide'); return }
      setAppliedCoupon({ code: data.code, type: data.type, value: data.value, discountCAD: data.discountCAD })
      setCouponInput('')
      toast.success(`Code applied! You save ${format(data.discountCAD)}`)
    } catch { setCouponError('Erreur serveur') }
    finally { setCouponLoading(false) }
  }

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shippingForm.name || !shippingForm.email || !shippingForm.phone || !shippingForm.address || !shippingForm.city || !shippingForm.postalCode) {
      toast.error('Please fill in all required fields')
      return
    }
    // Combine phone code + number for submission
    const fullPhone = `${shippingForm.phoneCode} ${shippingForm.phone.replace(/^\+\d[\d\s-]*\s*/, '').trim()}`
    setConfirmedPhone(fullPhone)
    setLoadingIntent(true)
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
          currency: currency.toLowerCase(),
          country: shippingForm.country,
          taxRate: taxComponents.reduce((s, c) => s + c.rate, 0),
          couponCode: appliedCoupon?.code ?? null,
          storeCreditCAD: storeCreditAppliedCAD,
          customerEmail: shippingForm.email || customer?.email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClientSecret(data.clientSecret)
      // Store server-confirmed shipping fee (uses live FX rate)
      if (typeof data.shippingFeeCAD === 'number') setConfirmedShippingFeeCAD(data.shippingFeeCAD)
      if (typeof data.shippingFee === 'number') setConfirmedShippingFee(data.shippingFee)
      // Lock the displayed total to the server's snapshot — prevents FX rate drift after render
      if (typeof data.amount === 'number') {
        const lockedTotal = data.amount / 100
        const lockedShipping = typeof data.shippingFee === 'number' ? data.shippingFee : 0
        const lockedTax = typeof data.taxAmount === 'number' ? data.taxAmount : 0
        const lockedDiscount = typeof data.discountAmount === 'number' ? data.discountAmount : 0
        const lockedCredit = typeof data.storeCreditApplied === 'number' ? data.storeCreditApplied : 0
        const lockedSubtotal = typeof data.subtotal === 'number' ? data.subtotal : lockedTotal - lockedShipping - lockedTax + lockedDiscount + lockedCredit
        setConfirmedSnapshot({ subtotal: lockedSubtotal, shipping: lockedShipping, tax: lockedTax, total: lockedTotal, discount: lockedDiscount, storeCreditApplied: lockedCredit })
      }
      setStep('payment')
    } catch { toast.error('Failed to initialize payment. Please try again.') }
    finally { setLoadingIntent(false) }
  }

  const handleSuccess = (orderNumber: string) => {
    clearCart()
    router.push(`/order-confirmation?order=${orderNumber}`)
  }

  if (items.length === 0 && step !== 'payment') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <ShoppingBag size={48} className="text-gray-200" />
        <p className="text-gray-400 text-sm">Your cart is empty</p>
        <Link href="/" className="bg-gray-900 text-white px-6 py-3 text-sm hover:bg-gray-700 transition-colors rounded-lg">
          Start shopping
        </Link>
      </div>
    )
  }

  const countryName = COUNTRIES.find(c => c.code === shippingForm.country)?.name ?? shippingForm.country
  const returnToUrl = `/checkout?auth=done`

  // Breadcrumb labels — 'cart' navigates back to /cart page
  const stepLabels = { cart: 'Panier', auth: 'Account', info: 'Information', payment: 'Payment' }
  const allSteps = ['cart', 'auth', 'info', 'payment'] as const
  const stepOrder = allSteps.filter(s => s !== 'auth' || (!authLoading && !customer))
  // Steps that are before the current step (can navigate back)
  const currentIdx = allSteps.indexOf(step as typeof allSteps[number])
  const canGoBack = (s: string) => allSteps.indexOf(s as typeof allSteps[number]) < currentIdx && step !== 'payment'

  const handleBreadcrumb = (s: string) => {
    if (!canGoBack(s)) return
    if (s === 'cart') { router.push('/cart'); return }
    setStep(s as 'auth' | 'info')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-xl tracking-widest text-gray-900">MARCACLUB</Link>
          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap justify-end">
            {stepOrder.map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <button
                  onClick={() => handleBreadcrumb(s)}
                  disabled={!canGoBack(s)}
                  className={
                    step === s
                      ? 'text-gray-900 font-semibold cursor-default'
                      : canGoBack(s)
                      ? 'text-brand-gold hover:underline cursor-pointer'
                      : 'text-gray-400 cursor-default'
                  }
                >
                  {stepLabels[s]}
                </button>
                {i < arr.length - 1 && <ChevronRight size={12} />}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile order summary toggle — visible only below lg */}
      {(
        <div className="lg:hidden border-b border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => setMobileOrderOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700"
          >
            <span className="flex items-center gap-2 text-brand-gold font-semibold">
              <ShoppingBag size={15} />
              {mobileOrderOpen ? 'Hide order summary' : 'Show order summary'}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{format(total)}</span>
              <ChevronDown size={16} className={`transition-transform ${mobileOrderOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {mobileOrderOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-gray-200 pt-3">
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
                  <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{format(item.price * item.quantity)}</p>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-3 space-y-1.5 mt-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>{format(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>{shippingFeeLoading && !confirmedShippingFeeCAD
                    ? <span className="text-gray-400 text-xs animate-pulse">Calculating…</span>
                    : format(effectiveShippingCAD)}</span>
                </div>
                {taxComponents.filter(c => c.rate > 0).map(c => (
                  <div key={c.label} className="flex justify-between text-sm text-gray-600">
                    <span>{c.label}</span>
                    <span>{format(Math.round(subtotal * c.rate * 100) / 100)}</span>
                  </div>
                ))}
                {couponDiscountCAD > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1"><Tag size={11} /> {appliedCoupon?.code}</span>
                    <span>-{format(couponDiscountCAD)}</span>
                  </div>
                )}
                {storeCreditAppliedCAD > 0 && (
                  <div className="flex justify-between text-sm text-brand-gold">
                    <span>Store credit</span>
                    <span>-{format(storeCreditAppliedCAD)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span><span>{format(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
          <div className="lg:col-span-3">

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
                      <input value={shippingForm.name} onChange={set('name')} required placeholder="Jane Doe"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
                      <input value={shippingForm.email} onChange={set('email')} type="email" required placeholder="jane@example.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                  </div>

                  {/* Country first — drives phone code + province dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Country *</label>
                    <select value={shippingForm.country} onChange={set('country')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white">
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Phone with country code selector */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone *</label>
                    <div className="flex gap-2">
                      <select value={shippingForm.phoneCode} onChange={set('phoneCode')}
                        className="w-32 border border-gray-300 rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white">
                        {PHONE_CODES.map((c) => (
                          <option key={`${c.name}-${c.dial}`} value={c.dial}>
                            {c.flag} {c.dial}
                          </option>
                        ))}
                      </select>
                      <input value={shippingForm.phone} onChange={set('phone')} type="tel" required
                        placeholder={shippingForm.country === 'CA' || shippingForm.country === 'US' ? '514 555 0123' : shippingForm.country === 'MA' ? '6 12 34 56 78' : '6 12 34 56 78'}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Street address *</label>
                    <input value={shippingForm.address} onChange={set('address')} required placeholder="123 Main St, Apt 4B"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">City *</label>
                      <input value={shippingForm.city} onChange={set('city')} required
                        placeholder={shippingForm.country === 'CA' ? 'Montreal' : shippingForm.country === 'US' ? 'New York' : 'City'}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                    <div>
                      {/* Province dropdown for Canada, State dropdown for US, text for others */}
                      {shippingForm.country === 'CA' ? (
                        <>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Province *</label>
                          <select value={shippingForm.state} onChange={set('state')} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white">
                            <option value="">Select province</option>
                            {CA_PROVINCES.map(p => (
                              <option key={p.code} value={p.code}>{p.name} — {p.taxLabel}</option>
                            ))}
                          </select>
                        </>
                      ) : shippingForm.country === 'US' ? (
                        <>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">State *</label>
                          <select value={shippingForm.state} onChange={set('state')} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white">
                            <option value="">Select state</option>
                            {US_STATES.map(s => (
                              <option key={s.code} value={s.code}>{s.name} — {s.taxLabel}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Region / Province</label>
                          <input value={shippingForm.state} onChange={set('state')} placeholder="Region"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                        </>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Postal code *</label>
                      <input value={shippingForm.postalCode} onChange={set('postalCode')} required
                        placeholder={shippingForm.country === 'CA' ? 'H3A 1A1' : shippingForm.country === 'US' ? '10001' : shippingForm.country === 'MA' ? '20000' : 'Postal code'}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    </div>
                  </div>

                  {/* Live tax preview — shows per-component breakdown */}
                  {taxComponents.length > 0 && taxAmount > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-1.5">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Tax Breakdown</p>
                      {taxComponents.filter(c => c.rate > 0).map((c) => (
                        <div key={c.label} className="flex justify-between text-sm">
                          <span className="text-blue-800">{c.label}</span>
                          <span className="font-semibold text-blue-900">{format(Math.round(subtotal * c.rate * 100) / 100)}</span>
                        </div>
                      ))}
                      {taxComponents.filter(c => c.rate > 0).length > 1 && (
                        <div className="flex justify-between text-xs text-blue-700 border-t border-blue-200 pt-1.5 mt-1">
                          <span>Total tax</span>
                          <span className="font-bold">{format(taxAmount)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Coupon code input */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between px-4 py-3 bg-green-50">
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-green-600" />
                          <span className="text-sm font-semibold text-green-700">{appliedCoupon.code}</span>
                          <span className="text-xs text-green-600">
                            -{appliedCoupon.type === 'percent' ? `${appliedCoupon.value}%` : format(appliedCoupon.discountCAD)}
                          </span>
                        </div>
                        <button type="button" onClick={() => setAppliedCoupon(null)}
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex">
                        <div className="flex items-center pl-3 text-gray-400"><Tag size={14} /></div>
                        <input
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value); setCouponError('') }}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                          placeholder="Discount code"
                          className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                        />
                        <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()}
                          className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border-l border-gray-200 transition-colors disabled:opacity-40">
                          {couponLoading ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="text-xs text-red-500 px-4 pb-2">{couponError}</p>}
                  </div>

                  {/* Store credit toggle */}
                  {customer && customerStoreCredit > 0 && (
                    <label className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-brand-gold" />
                        <span className="text-sm text-gray-700">
                          Use store credit <span className="text-brand-gold font-semibold">({format(customerStoreCredit)} available)</span>
                        </span>
                      </div>
                      <input type="checkbox" checked={useStoreCredit} onChange={e => setUseStoreCredit(e.target.checked)} className="accent-brand-gold w-4 h-4" />
                    </label>
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
                {/* Confirmed order breakdown — uses server snapshot to prevent FX rate drift */}
                <div className="bg-gray-50 rounded-lg px-4 py-3 mb-5 space-y-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Order Summary</p>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{confirmedSnapshot ? `${symbol}${confirmedSnapshot.subtotal.toFixed(2)}` : format(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span>{confirmedSnapshot ? `${symbol}${confirmedSnapshot.shipping.toFixed(2)}` : format(effectiveShippingCAD)}</span>
                  </div>
                  {confirmedSnapshot
                    ? confirmedSnapshot.tax > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Tax</span><span>{symbol}{confirmedSnapshot.tax.toFixed(2)}</span>
                        </div>
                      )
                    : taxComponents.filter(c => c.rate > 0).map(c => (
                        <div key={c.label} className="flex justify-between text-sm text-gray-600">
                          <span>{c.label}</span>
                          <span>{format(Math.round(subtotal * c.rate * 100) / 100)}</span>
                        </div>
                      ))
                  }
                  {(confirmedSnapshot?.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1"><Tag size={11} /> Discount</span>
                      <span>-{symbol}{confirmedSnapshot!.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {(confirmedSnapshot?.storeCreditApplied ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-brand-gold">
                      <span className="flex items-center gap-1"><Wallet size={11} /> Store credit</span>
                      <span>-{symbol}{confirmedSnapshot!.storeCreditApplied.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total to pay</span>
                    <span className="text-lg">{confirmedSnapshot ? `${symbol}${confirmedSnapshot.total.toFixed(2)}` : format(total)}</span>
                  </div>
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
                    customer={{ ...shippingForm, phone: confirmedPhone || `${shippingForm.phoneCode} ${shippingForm.phone}` }}
                    items={items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity }))}
                    total={confirmedSnapshot?.total ?? total}
                    taxAmount={confirmedSnapshot?.tax ?? taxAmount}
                    shippingFee={confirmedSnapshot?.shipping ?? confirmedShippingFee ?? Math.round(effectiveShippingCAD * rate * 100) / 100}
                    currency={currency}
                    symbol={symbol}
                    couponCode={confirmedSnapshot ? (appliedCoupon?.code ?? null) : null}
                    discountAmount={confirmedSnapshot?.discount}
                    storeCreditUsed={confirmedSnapshot?.storeCreditApplied}
                    onSuccess={handleSuccess}
                  />
                </Elements>
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
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
                  <span>{shippingFeeLoading && !confirmedShippingFeeCAD ? <span className="text-gray-400 text-xs">Calculating…</span> : format(effectiveShippingCAD)}</span>
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
                {couponDiscountCAD > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1"><Tag size={11} /> {appliedCoupon?.code}</span>
                    <span>-{format(couponDiscountCAD)}</span>
                  </div>
                )}
                {storeCreditAppliedCAD > 0 && (
                  <div className="flex justify-between text-sm text-brand-gold">
                    <span className="flex items-center gap-1"><Wallet size={11} /> Store credit</span>
                    <span>-{format(storeCreditAppliedCAD)}</span>
                  </div>
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

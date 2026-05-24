'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, User, Mail, Lock, Phone, Globe, Eye, EyeOff } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'
import toast from 'react-hot-toast'

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

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'France', 'Germany',
  'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Sweden', 'Norway',
  'Denmark', 'Portugal', 'Ireland', 'New Zealand', 'Japan', 'Singapore',
  'UAE', 'Saudi Arabia', 'Morocco', 'Brazil', 'Mexico', 'India', 'Other',
]

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', country: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { refresh } = useCustomer()
  const router = useRouter()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Registration failed'); return }
      await refresh()
      toast.success('Account created! Welcome to Marcaclub.')
      router.push('/account/orders')
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  const btnCls = "w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
  const inputCls = "w-full bg-white border border-gray-300 text-gray-900 text-sm pl-9 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-400 rounded-lg"
  const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-900 tracking-widest uppercase mb-2">Create Account</h1>
          <p className="text-gray-500 text-sm">Track orders, save preferences, faster checkout</p>
        </div>
        <div className="bg-white border border-gray-200 p-8 shadow-sm rounded-xl">
          {/* Social sign-up */}
          <div className="space-y-3 mb-6">
            <a href="/api/customer/auth/google?returnTo=/account/orders" className={btnCls}>
              <GoogleIcon /> Sign up with Google
            </a>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-3 w-fit mx-auto">or sign up with email</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'FULL NAME', type: 'text', icon: User, placeholder: 'John Doe' },
              { key: 'email', label: 'EMAIL', type: 'email', icon: Mail, placeholder: 'your@email.com' },
              { key: 'phone', label: 'PHONE (optional)', type: 'tel', icon: Phone, placeholder: '+1 555 000 0000' },
            ].map(({ key, label, type, icon: Icon, placeholder }) => (
              <div key={key}>
                <label className="block text-gray-500 text-[10px] tracking-widest mb-2">{label}</label>
                <div className="relative">
                  <Icon size={14} className={iconCls} />
                  <input value={form[key as keyof typeof form]} onChange={set(key)} type={type}
                    required={key !== 'phone'}
                    className={inputCls}
                    placeholder={placeholder} />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-gray-500 text-[10px] tracking-widest mb-2">PASSWORD</label>
              <div className="relative">
                <Lock size={14} className={iconCls} />
                <input value={form.password} onChange={set('password')} type={showPass ? 'text' : 'password'} required
                  className={`${inputCls} pr-10`} placeholder="Minimum 8 characters" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-[10px] tracking-widest mb-2">COUNTRY (optional)</label>
              <div className="relative">
                <Globe size={14} className={iconCls} />
                <select value={form.country} onChange={set('country')}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm pl-9 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 appearance-none rounded-lg">
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-gold text-brand-black font-bold py-3.5 text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50 mt-2 rounded-lg">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/account/login" className="text-brand-gold hover:text-yellow-600 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

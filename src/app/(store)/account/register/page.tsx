'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, User, Mail, Lock, Phone, Globe } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'
import toast from 'react-hot-toast'

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'France', 'Germany',
  'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Sweden', 'Norway',
  'Denmark', 'Portugal', 'Ireland', 'New Zealand', 'Japan', 'Singapore',
  'UAE', 'Saudi Arabia', 'Morocco', 'Brazil', 'Mexico', 'India', 'Other',
]

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', country: '' })
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

  const inputClass = "w-full bg-white border border-gray-300 text-gray-900 text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-brand-gold placeholder:text-gray-400 rounded-none"
  const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-900 tracking-widest uppercase mb-2">Create Account</h1>
          <p className="text-gray-500 text-sm">Track orders, save preferences, faster checkout</p>
        </div>
        <div className="bg-white border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'FULL NAME', type: 'text', icon: User, placeholder: 'John Doe' },
              { key: 'email', label: 'EMAIL', type: 'email', icon: Mail, placeholder: 'your@email.com' },
              { key: 'password', label: 'PASSWORD', type: 'password', icon: Lock, placeholder: 'Minimum 8 characters' },
              { key: 'phone', label: 'PHONE (optional)', type: 'tel', icon: Phone, placeholder: '+1 555 000 0000' },
            ].map(({ key, label, type, icon: Icon, placeholder }) => (
              <div key={key}>
                <label className="block text-gray-500 text-[10px] tracking-widest mb-2">{label}</label>
                <div className="relative">
                  <Icon size={14} className={iconClass} />
                  <input value={form[key as keyof typeof form]} onChange={set(key)} type={type}
                    required={key !== 'phone'}
                    className={inputClass}
                    placeholder={placeholder} />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-gray-500 text-[10px] tracking-widest mb-2">COUNTRY (optional)</label>
              <div className="relative">
                <Globe size={14} className={iconClass} />
                <select value={form.country} onChange={set('country')}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-brand-gold appearance-none rounded-none">
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-gold text-brand-black font-bold py-3.5 text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50 mt-2">
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

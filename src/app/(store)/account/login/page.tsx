'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { refresh } = useCustomer()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Login failed'); return }
      await refresh()
      toast.success(`Welcome back, ${data.name}!`)
      router.push('/account/orders')
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-900 tracking-widest uppercase mb-2">Sign In</h1>
          <p className="text-gray-500 text-sm">Access your orders and account</p>
        </div>
        <div className="bg-white border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-500 text-[10px] tracking-widest mb-2">EMAIL</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-brand-gold placeholder:text-gray-400 rounded-none"
                  placeholder="your@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-[10px] tracking-widest mb-2">PASSWORD</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-brand-gold placeholder:text-gray-400 rounded-none"
                  placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-gold text-brand-black font-bold py-3.5 text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            No account?{' '}
            <Link href="/account/register" className="text-brand-gold hover:text-yellow-600 font-medium transition-colors">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

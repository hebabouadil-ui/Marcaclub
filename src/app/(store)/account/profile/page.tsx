'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { Loader2, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { customer, loading: authLoading, logout } = useCustomer()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !customer) router.push('/account/login')
  }, [customer, authLoading, router])

  const handleLogout = async () => {
    setLoading(true)
    await logout()
    router.push('/')
    toast.success('Signed out')
  }

  if (authLoading || !customer) {
    return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-white tracking-widest uppercase mb-8">My Profile</h1>
      <div className="bg-white/3 border border-white/8 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
            <span className="text-brand-gold text-xl font-bold">{customer.name[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="text-white font-semibold">{customer.name}</p>
            <p className="text-white/40 text-sm">{customer.email}</p>
          </div>
        </div>
        <div className="space-y-3 border-t border-white/5 pt-5">
          <button onClick={() => router.push('/account/orders')}
            className="w-full text-left flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/5 text-white/70 hover:text-white text-sm transition-colors">
            <span>My Orders</span>
            <User size={14} />
          </button>
          <button onClick={handleLogout} disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-400/30 py-3 text-sm transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

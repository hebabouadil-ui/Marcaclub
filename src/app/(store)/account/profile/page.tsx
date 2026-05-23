'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { Loader2, ChevronRight } from 'lucide-react'
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
    return (
      <div className="min-h-[50vh] bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-gray-900 tracking-widest uppercase mb-8">My Profile</h1>
        <div className="bg-white border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-gold text-xl font-bold">{customer.name[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{customer.name}</p>
              <p className="text-gray-400 text-sm">{customer.email}</p>
            </div>
          </div>
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <button onClick={() => router.push('/account/orders')}
              className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-gray-900 text-sm transition-colors border border-gray-200">
              <span>My Orders</span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            <button onClick={handleLogout} disabled={loading}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 py-3 text-sm transition-colors disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

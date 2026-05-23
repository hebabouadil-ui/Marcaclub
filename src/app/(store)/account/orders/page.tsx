'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomer } from '@/lib/context/CustomerContext'
import { Package, Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

interface OrderItem { name: string; price: number; quantity: number; size: string; image?: string }
interface Order {
  _id: string; orderNumber: string; total: number; currency: string
  status: string; createdAt: string; items: OrderItem[]
  stripePaymentStatus?: string; cjTrackingNumber?: string
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-amber-400" />,
  confirmed: <CheckCircle2 size={14} className="text-blue-400" />,
  shipped: <Truck size={14} className="text-purple-400" />,
  delivered: <CheckCircle2 size={14} className="text-green-400" />,
  cancelled: <XCircle size={14} className="text-red-400" />,
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Processing', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  shipped: 'text-purple-400 bg-purple-400/10',
  delivered: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
}

export default function MyOrdersPage() {
  const { customer, loading: authLoading } = useCustomer()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !customer) { router.push('/account/login'); return }
    if (customer) {
      fetch('/api/customer/orders')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setOrders(data) })
        .finally(() => setLoading(false))
    }
  }, [customer, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white tracking-widest uppercase">My Orders</h1>
        <p className="text-white/40 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/40 text-sm mb-6">No orders yet</p>
          <Link href="/products" className="bg-brand-gold text-brand-black px-6 py-3 text-sm font-bold tracking-widest uppercase hover:bg-yellow-400 transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white/3 border border-white/8">
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <span className="font-mono font-bold text-white text-sm">#{order.orderNumber}</span>
                    <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? 'text-white/40 bg-white/5'}`}>
                      {STATUS_ICON[order.status]} {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  {order.cjTrackingNumber && (
                    <p className="text-xs text-purple-300 mt-1 font-mono">📦 Tracking: {order.cjTrackingNumber}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-white">${order.total.toFixed(2)}</p>
                  <p className="text-white/30 text-[10px]">USD</p>
                </div>
                <button onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                  className="text-white/30 hover:text-white transition-colors flex-shrink-0">
                  {expanded === order._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {expanded === order._id && (
                <div className="border-t border-white/5 p-5 space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      {item.image && (
                        <div className="w-12 h-12 relative bg-white/5 flex-shrink-0">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                        <p className="text-white/40 text-xs">Size: {item.size} · Qty: {item.quantity}</p>
                      </div>
                      <p className="text-white text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="border-t border-white/5 pt-3 flex justify-between text-sm">
                    <span className="text-white/40">Total Paid</span>
                    <span className="font-bold text-white">${order.total.toFixed(2)} USD</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

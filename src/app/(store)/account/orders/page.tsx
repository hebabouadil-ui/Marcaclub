'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomer } from '@/lib/context/CustomerContext'
import { Package, Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface OrderItem { name: string; price: number; quantity: number; size: string; image?: string }
interface Order {
  _id: string; orderNumber: string; total: number; currency: string
  status: string; createdAt: string; items: OrderItem[]
  stripePaymentStatus?: string; cjTrackingNumber?: string
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={13} className="text-amber-500" />,
  confirmed: <CheckCircle2 size={13} className="text-blue-500" />,
  shipped: <Truck size={13} className="text-purple-500" />,
  delivered: <CheckCircle2 size={13} className="text-green-500" />,
  cancelled: <XCircle size={13} className="text-red-500" />,
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Processing', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  confirmed: 'text-blue-600 bg-blue-50 border-blue-200',
  shipped: 'text-purple-600 bg-purple-50 border-purple-200',
  delivered: 'text-green-600 bg-green-50 border-green-200',
  cancelled: 'text-red-600 bg-red-50 border-red-200',
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
      <div className="min-h-[50vh] bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-900 tracking-widest uppercase">My Orders</h1>
          <p className="text-gray-400 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-gray-200 text-center py-16 shadow-sm">
            <Package size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm mb-6">No orders yet</p>
            <Link href="/products" className="bg-brand-gold text-brand-black px-6 py-3 text-sm font-bold tracking-widest uppercase hover:bg-yellow-400 transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order._id} className="bg-white border border-gray-200 shadow-sm">
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <span className="font-mono font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                      <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 border font-medium ${STATUS_COLOR[order.status] ?? 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                        {STATUS_ICON[order.status]} {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    {(order.cjTrackingNumber || order.status === 'shipped' || order.status === 'confirmed') && (
                      <Link href={`/track/${order.orderNumber}`} className="text-xs text-purple-600 font-medium underline underline-offset-2 hover:text-purple-800 mt-1 inline-block">
                        Track Order →
                      </Link>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">${order.total.toFixed(2)}</p>
                    <p className="text-gray-400 text-[10px]">USD</p>
                  </div>
                  <button onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                    className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
                    {expanded === order._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {expanded === order._id && (
                  <div className="border-t border-gray-100 p-5 space-y-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        {item.image && (
                          <div className="w-12 h-12 relative bg-gray-100 flex-shrink-0">
                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-medium truncate">{item.name}</p>
                          <p className="text-gray-400 text-xs">Size: {item.size} · Qty: {item.quantity}</p>
                        </div>
                        <p className="text-gray-900 text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                      <span className="text-gray-500">Total Paid</span>
                      <span className="font-bold text-gray-900">${order.total.toFixed(2)} USD</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

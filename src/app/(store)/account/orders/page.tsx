'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomer } from '@/lib/context/CustomerContext'
import { Package, Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Star, Copy, ExternalLink, Loader2 } from 'lucide-react'

interface OrderItem { name: string; price: number; quantity: number; size: string; image?: string }
interface Order {
  _id: string; orderNumber: string; total: number; currency: string
  status: string; createdAt: string; items: OrderItem[]
  stripePaymentStatus?: string; cjTrackingNumber?: string
}
interface TrackingData {
  orderNumber: string; status: string; cjTrackingNumber: string | null
  trackingUrl: string | null; estimatedDays: string; cjStatus: string | null
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

const TRACK_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', sublabel: 'We received your order', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', sublabel: 'Being prepared for shipment', icon: Package },
  { key: 'shipped', label: 'Shipped', sublabel: 'On its way to you', icon: Truck },
  { key: 'delivered', label: 'Delivered', sublabel: 'Enjoy your purchase!', icon: Star },
]

function getStepIndex(status: string) {
  if (status === 'delivered') return 3
  if (status === 'shipped') return 2
  if (status === 'confirmed') return 1
  return 0
}

function TrackingPanel({ orderNumber }: { orderNumber: string }) {
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/by-number/${orderNumber}/tracking`)
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [orderNumber])

  useEffect(() => { fetchTracking() }, [fetchTracking])

  useEffect(() => {
    if (!data || data.status === 'delivered') return
    const id = setInterval(fetchTracking, 60_000)
    return () => clearInterval(id)
  }, [data, fetchTracking])

  const handleCopy = () => {
    if (!data?.cjTrackingNumber) return
    navigator.clipboard.writeText(data.cjTrackingNumber).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 size={20} className="animate-spin text-gray-300" />
    </div>
  )

  if (!data) return (
    <p className="text-xs text-gray-400 py-4 text-center">Tracking info not available yet.</p>
  )

  const stepIndex = getStepIndex(data.status)

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Shipment Status</p>
        <div className="space-y-0">
          {TRACK_STEPS.map((step, i) => {
            const Icon = step.icon
            const isCompleted = i < stepIndex
            const isActive = i === stepIndex
            const isFuture = i > stepIndex
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0
                    ${isCompleted ? 'bg-gray-900 border-gray-900' : ''}
                    ${isActive ? 'bg-amber-400 border-amber-400' : ''}
                    ${isFuture ? 'bg-white border-gray-200' : ''}
                  `}>
                    <Icon className={`w-3 h-3 ${isCompleted ? 'text-white' : isActive ? 'text-gray-900' : 'text-gray-300'}`} />
                  </div>
                  {i < TRACK_STEPS.length - 1 && (
                    <div className={`w-px h-6 my-0.5 ${i < stepIndex ? 'bg-gray-900' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pt-1 pb-1">
                  <p className={`text-xs font-semibold ${isActive ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-300'}`}>{step.label}</p>
                  <p className={`text-[11px] ${isActive ? 'text-gray-500' : isFuture ? 'text-gray-200' : 'text-gray-400'}`}>{step.sublabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-gray-400">Estimated delivery: {data.estimatedDays} from order date</p>

      {/* Tracking number */}
      {data.cjTrackingNumber && (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">Tracking Number</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 font-mono font-bold text-gray-900 text-sm tracking-wider truncate">{data.cjTrackingNumber}</p>
            <button onClick={handleCopy} className="text-gray-400 hover:text-gray-700 flex-shrink-0" title="Copy">
              <Copy size={13} />
            </button>
          </div>
          {copied && <p className="text-[10px] text-green-600 mt-1">Copied!</p>}
        </div>
      )}

      {/* Carrier link */}
      {data.trackingUrl && (
        <a href={data.trackingUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full bg-amber-400 text-gray-900 font-bold text-xs py-2.5 rounded-lg hover:bg-amber-300 transition-colors">
          <ExternalLink size={12} /> Track on Carrier Website
        </a>
      )}

      <Link href={`/track/${orderNumber}`}
        className="block text-center text-[11px] text-gray-400 hover:text-gray-600 underline underline-offset-2">
        Open full tracking page →
      </Link>
    </div>
  )
}

export default function MyOrdersPage() {
  const { customer, loading: authLoading } = useCustomer()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tracking, setTracking] = useState<string | null>(null)

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

  const canTrack = (order: Order) =>
    order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' || !!order.cjTrackingNumber

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
                {/* Order header row */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <span className="font-mono font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                      <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 border font-medium ${STATUS_COLOR[order.status] ?? 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                        {STATUS_ICON[order.status]} {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    {canTrack(order) && (
                      <button
                        onClick={() => setTracking(tracking === order.orderNumber ? null : order.orderNumber)}
                        className="text-xs text-purple-600 font-medium underline underline-offset-2 hover:text-purple-800 mt-1 inline-block"
                      >
                        {tracking === order.orderNumber ? 'Hide tracking ↑' : 'Track Order →'}
                      </button>
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

                {/* Inline tracking panel */}
                {tracking === order.orderNumber && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    <TrackingPanel orderNumber={order.orderNumber} />
                  </div>
                )}

                {/* Order items */}
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

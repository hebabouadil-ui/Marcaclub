'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, Suspense } from 'react'
import { CheckCircle2, Package, Truck, Mail, ArrowRight, Download, Loader2 } from 'lucide-react'

interface OrderItem {
  name: string
  price: number
  quantity: number
  size: string
  image?: string
}

interface Order {
  orderNumber: string
  total: number
  currency: string
  status: string
  createdAt: string
  customer: {
    name: string
    email?: string
    address: string
    city: string
    state?: string
    country: string
    postalCode?: string
  }
  items: OrderItem[]
  stripePaymentStatus?: string
}

function ConfirmationContent() {
  const params = useSearchParams()
  const orderNumber = params.get('order')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderNumber) { setLoading(false); return }
    fetch(`/api/orders/by-number/${orderNumber}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setOrder(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [orderNumber])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    )
  }

  const date = order ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const paid = order?.stripePaymentStatus === 'paid' || order?.status === 'confirmed' || order?.status === 'shipped' || order?.status === 'delivered'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="text-gray-500 mt-1">Thank you for your purchase. Your order is being processed.</p>
        </div>

        {/* Receipt card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

          {/* Receipt header */}
          <div className="bg-gray-900 text-white px-6 py-5 flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-lg tracking-widest">MARCACLUB</p>
              <p className="text-gray-400 text-xs mt-0.5">Order Receipt</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Order number</p>
              <p className="font-mono font-bold text-lg text-white">#{orderNumber ?? '—'}</p>
            </div>
          </div>

          {/* Order info row */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Date', value: date },
              { label: 'Payment', value: paid ? '✓ Paid' : 'Pending', color: paid ? 'text-green-600' : 'text-amber-500' },
              { label: 'Delivery', value: '7–12 days' },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-5 py-4 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className={`font-semibold text-sm ${color ?? 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Items Ordered</p>
            <div className="space-y-4">
              {order?.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  {item.image && (
                    <div className="w-14 h-14 relative rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">Size: {item.size} · Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              )) ?? (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package size={20} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">Order details loading...</p>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 px-6 py-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${order ? order.total.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-200">
              <span>Total Paid</span>
              <span>${order ? order.total.toFixed(2) : '—'} USD</span>
            </div>
          </div>

          {/* Shipping address */}
          {order?.customer && (
            <div className="border-t border-gray-100 px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Ship To</p>
                <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{order.customer.address}</p>
                <p className="text-xs text-gray-500">{order.customer.city}{order.customer.state ? `, ${order.customer.state}` : ''} {order.customer.postalCode}</p>
                <p className="text-xs text-gray-500">{order.customer.country}</p>
              </div>
              {order.customer.email && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Confirmation Sent To</p>
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <Mail size={12} className="text-gray-400" />
                    {order.customer.email}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* What's next */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">What Happens Next</p>
            <div className="space-y-3">
              {[
                { icon: CheckCircle2, color: 'text-green-500 bg-green-50', label: 'Order confirmed', sub: 'Your payment was successful' },
                { icon: Package, color: 'text-blue-500 bg-blue-50', label: 'Processing', sub: 'We\'re preparing your order for shipment' },
                { icon: Truck, color: 'text-purple-500 bg-purple-50', label: 'Shipping', sub: 'Delivery in 7–12 business days' },
              ].map(({ icon: Icon, color, label, sub }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link href="/products" className="flex-1 bg-gray-900 text-white py-3.5 px-6 rounded-xl font-semibold text-sm text-center hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
            Continue Shopping <ArrowRight size={16} />
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 border border-gray-200 text-gray-600 py-3.5 px-6 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} /> Save Receipt
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Questions? Contact us at support@marca-club.com
        </p>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}

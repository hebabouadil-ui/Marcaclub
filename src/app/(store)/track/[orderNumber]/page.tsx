'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Truck, Package, Star, Copy, ExternalLink, Loader2 } from 'lucide-react'

interface TrackingData {
  orderNumber: string
  status: string
  cjTrackingNumber: string | null
  trackingUrl: string | null
  estimatedDays: string
  cjStatus: string | null
}

const STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', sublabel: 'We received your order', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', sublabel: 'Being prepared for shipment', icon: Package },
  { key: 'shipped', label: 'Shipped', sublabel: 'On its way to you', icon: Truck },
  { key: 'delivered', label: 'Delivered', sublabel: 'Enjoy your purchase!', icon: Star },
]

function getStepIndex(status: string): number {
  if (status === 'delivered') return 3
  if (status === 'shipped') return 2
  if (status === 'confirmed') return 1
  return 0
}

export default function TrackOrderPage() {
  const params = useParams()
  const orderNumber = params.orderNumber as string

  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/by-number/${orderNumber}/tracking`)
      if (!res.ok) { setError(true); setLoading(false); return }
      const json = await res.json()
      setData(json)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [orderNumber])

  useEffect(() => {
    fetchTracking()
  }, [fetchTracking])

  // Auto-refresh every 60s if not yet delivered
  useEffect(() => {
    if (!data) return
    if (data.status === 'delivered') return
    const id = setInterval(fetchTracking, 60_000)
    return () => clearInterval(id)
  }, [data, fetchTracking])

  const handleCopy = () => {
    if (!data?.cjTrackingNumber) return
    navigator.clipboard.writeText(data.cjTrackingNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="bg-white rounded-xl shadow-sm p-10 max-w-md w-full">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Order not found</h2>
          <p className="text-gray-500 text-sm mb-6">Check your order number and try again.</p>
          <Link href="/products" className="text-sm font-semibold text-yellow-600 hover:text-yellow-700 underline underline-offset-2">
            Continue Shopping →
          </Link>
        </div>
      </div>
    )
  }

  const stepIndex = getStepIndex(data.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#111827] py-6 px-4 text-center">
        <h1 className="text-[#f59e0b] text-2xl font-black tracking-[6px] uppercase">MARCACLUB</h1>
        <p className="text-gray-400 text-[10px] tracking-[3px] uppercase mt-1">Order Tracking</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        {/* Order number */}
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Order Number</p>
          <p className="text-2xl font-black font-mono text-gray-900">#{data.orderNumber}</p>
          <p className="text-xs text-gray-400 mt-2">Estimated delivery: {data.estimatedDays} from order date</p>
        </div>

        {/* Status timeline */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Shipment Status</p>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isCompleted = i < stepIndex
              const isActive = i === stepIndex
              const isFuture = i > stepIndex

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isCompleted ? 'bg-[#111827] border-[#111827]' : ''}
                      ${isActive ? 'bg-[#f59e0b] border-[#f59e0b]' : ''}
                      ${isFuture ? 'bg-white border-gray-200' : ''}
                    `}>
                      <Icon className={`w-4 h-4 ${isCompleted || isActive ? 'text-white' : 'text-gray-300'} ${isActive ? 'text-[#111827]' : ''}`} />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 mb-1 ${i < stepIndex ? 'bg-[#111827]' : 'bg-gray-100'}`} />
                    )}
                  </div>
                  <div className="pb-2 pt-1.5">
                    <p className={`text-sm font-bold ${isActive ? 'text-[#111827]' : isCompleted ? 'text-gray-700' : 'text-gray-300'}`}>
                      {step.label}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-gray-500' : isFuture ? 'text-gray-300' : 'text-gray-400'}`}>
                      {step.sublabel}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tracking number */}
        {data.cjTrackingNumber && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tracking Number</p>
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
              <p className="flex-1 font-mono font-bold text-gray-900 text-lg tracking-wider">{data.cjTrackingNumber}</p>
              <button onClick={handleCopy} className="text-gray-400 hover:text-gray-700 transition-colors" title="Copy tracking number">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && <p className="text-xs text-green-600 mt-1.5">Copied to clipboard!</p>}
            <p className="text-xs text-gray-400 mt-2">Live tracking updates are available on your order page</p>
          </div>
        )}

        {/* Track on carrier */}
        {data.trackingUrl && (
          <a
            href={data.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#f59e0b] text-[#111827] font-bold text-sm py-4 rounded-xl hover:bg-yellow-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Track on Carrier Website
          </a>
        )}

        {/* Continue shopping */}
        <div className="text-center">
          <Link href="/products" className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
            Continue Shopping →
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { Gift, X, Copy, Check } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'

export default function ReferralBanner() {
  const { customer } = useCustomer()
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [storeCredit, setStoreCredit] = useState(0)

  useEffect(() => {
    if (!customer) return
    const key = `mc-referral-banner-dismissed-${customer.email}`
    if (localStorage.getItem(key)) { setDismissed(true); return }

    fetch('/api/auth/customer/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.referralCode) setReferralCode(d.referralCode)
        if (typeof d.storeCredit === 'number') setStoreCredit(d.storeCredit)
      })
      .catch(() => {})
  }, [customer])

  const handleDismiss = () => {
    if (customer) localStorage.setItem(`mc-referral-banner-dismissed-${customer.email}`, '1')
    setDismissed(true)
  }

  const referralUrl = referralCode ? `${typeof window !== 'undefined' ? window.location.origin : 'https://marca-club.com'}/register?ref=${referralCode}` : ''

  const handleCopy = async () => {
    if (!referralUrl) return
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!customer || !referralCode || dismissed) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-brand-black border border-brand-gold/30 shadow-2xl shadow-black/40">
      <button onClick={handleDismiss} className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors">
        <X size={14} />
      </button>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Gift size={16} className="text-brand-gold flex-shrink-0" />
          <p className="text-white font-semibold text-sm">Invite a friend — you both get CA$10</p>
        </div>
        <p className="text-white/50 text-xs mb-4 leading-relaxed">
          Share your code. When your friend makes their first order, you both receive CA$10 store credit.
        </p>
        {storeCredit > 0 && (
          <div className="bg-brand-gold/10 border border-brand-gold/20 px-3 py-2 mb-3 text-xs text-brand-gold">
            Your balance: <strong>CA${storeCredit.toFixed(2)}</strong> store credit
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-xs font-mono text-white/60 truncate">
            {referralUrl}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-brand-gold text-brand-black px-3 py-2 text-xs font-bold hover:bg-yellow-400 transition-colors flex-shrink-0"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

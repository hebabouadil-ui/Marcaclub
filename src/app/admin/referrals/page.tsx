'use client'
import { useState, useEffect } from 'react'
import { Users, Gift, CheckCircle, Clock } from 'lucide-react'

interface Referral {
  _id: string
  referrerId: { _id: string; name: string; email: string } | null
  referrerCode: string
  referredEmail: string
  referredId: { _id: string; name: string; email: string } | null
  status: 'pending' | 'registered' | 'completed'
  referrerRewarded: boolean
  referredRewarded: boolean
  createdAt: string
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/referrals', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReferrals(data) })
      .finally(() => setLoading(false))
  }, [])

  const statusColors = {
    pending: 'text-yellow-500 bg-yellow-500/10',
    registered: 'text-blue-400 bg-blue-400/10',
    completed: 'text-green-400 bg-green-400/10',
  }

  const completed = referrals.filter(r => r.status === 'completed').length
  const registered = referrals.filter(r => r.status === 'registered').length
  const totalRewards = completed * 20

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white tracking-wide">Referral Program</h1>
        <p className="text-white/40 text-sm mt-1">Each successful referral gives both parties CA$10 store credit</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Referrals', value: referrals.length, icon: Users },
          { label: 'Registered Friends', value: registered, icon: Clock },
          { label: 'Completed (Rewarded)', value: completed, icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white/5 border border-white/10 p-4">
            <Icon size={18} className="text-brand-gold mb-2" />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {totalRewards > 0 && (
        <div className="bg-brand-gold/5 border border-brand-gold/20 px-4 py-3 mb-6 flex items-center gap-2">
          <Gift size={14} className="text-brand-gold flex-shrink-0" />
          <p className="text-sm text-white/70">Total store credit issued: <strong className="text-brand-gold">CA${totalRewards}</strong></p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Users size={36} className="mx-auto mb-3" />
          <p>No referrals yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Referrer</th>
                <th className="text-left py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Friend (Referred)</th>
                <th className="text-left py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Status</th>
                <th className="text-left py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Rewards</th>
                <th className="text-left py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(ref => (
                <tr key={ref._id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-3 pr-4">
                    {ref.referrerId ? (
                      <>
                        <p className="text-white font-medium">{ref.referrerId.name}</p>
                        <p className="text-white/40 text-xs">{ref.referrerId.email}</p>
                        <p className="text-brand-gold text-xs font-mono mt-0.5">{ref.referrerCode}</p>
                      </>
                    ) : <span className="text-white/30 text-xs">Unknown</span>}
                  </td>
                  <td className="py-3 pr-4">
                    {ref.referredId ? (
                      <>
                        <p className="text-white font-medium">{ref.referredId.name}</p>
                        <p className="text-white/40 text-xs">{ref.referredId.email}</p>
                      </>
                    ) : (
                      <p className="text-white/40 text-xs">{ref.referredEmail}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-sm ${statusColors[ref.status]}`}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="space-y-0.5">
                      <p className="text-xs text-white/50">
                        Referrer: {ref.referrerRewarded ? <span className="text-green-400">+CA$10 ✓</span> : <span className="text-white/30">pending</span>}
                      </p>
                      <p className="text-xs text-white/50">
                        Friend: {ref.referredRewarded ? <span className="text-green-400">+CA$10 ✓</span> : <span className="text-white/30">pending</span>}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-white/40">{new Date(ref.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

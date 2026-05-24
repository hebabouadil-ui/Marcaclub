'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Radio, Loader2 } from 'lucide-react'

export default function AdminLivePage() {
  const [liveStatus, setLiveStatus] = useState(false)
  const [liveUrl, setLiveUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/live', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setLiveStatus(d.liveStatus)
        setLiveUrl(d.liveUrl || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (status: boolean) => {
    setSaving(true)
    const res = await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ liveStatus: status, liveUrl }),
    })
    setSaving(false)
    if (res.ok) {
      setLiveStatus(status)
      toast.success(status ? '🔴 Live enabled!' : '⚫ Live disabled')
    } else {
      toast.error('Error')
    }
  }

  if (loading) return <div className="p-8 text-white/40">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-xl">
      <h1 className="text-white text-2xl font-semibold mb-8">Live Session</h1>

      {/* Status card */}
      <div className="bg-white/5 border border-white/5 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white font-medium">Live Status</p>
            <p className="text-white/40 text-sm mt-0.5">
              Controls the LIVE banner on the storefront
            </p>
          </div>
          <div
            className={`w-16 h-8 rounded-full cursor-pointer transition-colors relative ${
              liveStatus ? 'bg-red-600' : 'bg-white/10'
            }`}
            onClick={() => !saving && handleSave(!liveStatus)}
          >
            <motion.div
              animate={{ x: liveStatus ? 32 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow"
            />
          </div>
        </div>

        {/* Status indicator */}
        <div
          className={`flex items-center gap-3 p-4 rounded ${
            liveStatus ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'
          }`}
        >
          <div className={`w-3 h-3 rounded-full ${liveStatus ? 'bg-red-500 live-dot' : 'bg-white/20'}`} />
          <div>
            <p className={`text-sm font-semibold ${liveStatus ? 'text-red-400' : 'text-white/40'}`}>
              {liveStatus ? 'LIVE ACTIVE' : 'LIVE OFFLINE'}
            </p>
            <p className="text-xs text-white/30 mt-0.5">
              {liveStatus
                ? 'Red banner is showing on the storefront'
                : 'No banner on the storefront'}
            </p>
          </div>
        </div>
      </div>

      {/* Live URL */}
      <div className="bg-white/5 border border-white/5 p-6 mb-6">
        <label className="block text-white/40 text-xs uppercase tracking-widest mb-3">
          Live URL (optional)
        </label>
        <input
          type="url"
          placeholder="https://instagram.com/live/..."
          value={liveUrl}
          onChange={(e) => setLiveUrl(e.target.value)}
          className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
        />
        <p className="text-white/30 text-xs mt-2">
          Direct link to your Instagram or TikTok live.
        </p>
        <button
          onClick={() => handleSave(liveStatus)}
          disabled={saving}
          className="mt-4 flex items-center gap-2 bg-white/10 text-white/70 hover:bg-white/20 px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save URL
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSave(true)}
          disabled={saving || liveStatus}
          className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 text-sm font-semibold tracking-widest uppercase hover:bg-red-700 transition-colors disabled:opacity-40"
        >
          <Radio size={14} />
          Enable Live
        </button>
        <button
          onClick={() => handleSave(false)}
          disabled={saving || !liveStatus}
          className="flex-1 bg-white/10 text-white/60 py-3 text-sm font-semibold tracking-widest uppercase hover:bg-white/20 transition-colors disabled:opacity-40"
        >
          Disable
        </button>
      </div>
    </div>
  )
}

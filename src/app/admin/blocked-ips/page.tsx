'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Shield, Trash2, Plus, Search } from 'lucide-react'

interface BlockedIP {
  _id: string
  ip: string
  reason?: string
  orderNumbers?: string[]
  createdAt: string
}

export default function BlockedIPsPage() {
  const [list, setList] = useState<BlockedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newIP, setNewIP] = useState('')
  const [newReason, setNewReason] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch('/api/blocked-ips', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setList(d) })
      .finally(() => setLoading(false))
  }, [])

  const addIP = async () => {
    if (!newIP.trim()) return
    setAdding(true)
    const res = await fetch('/api/blocked-ips', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: newIP.trim(), reason: newReason.trim() }),
    })
    if (res.ok) {
      const entry = await res.json()
      setList((prev) => [entry, ...prev.filter((e) => e.ip !== entry.ip)])
      setNewIP('')
      setNewReason('')
      toast.success('IP bloquée')
    } else {
      toast.error('Erreur')
    }
    setAdding(false)
  }

  const removeIP = async (ip: string) => {
    const res = await fetch('/api/blocked-ips', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    if (res.ok) {
      setList((prev) => prev.filter((e) => e.ip !== ip))
      toast.success('IP débloquée')
    } else {
      toast.error('Erreur')
    }
  }

  const filtered = list.filter(
    (e) => !search || e.ip.includes(search) || e.reason?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield size={20} className="text-purple-400" />
        <div>
          <h1 className="text-white text-2xl font-semibold">IPs bloquées</h1>
          <p className="text-white/40 text-sm mt-0.5">{list.length} adresse{list.length !== 1 ? 's' : ''} bloquée{list.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Add manually */}
      <div className="bg-white/5 border border-white/5 p-5 mb-6">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Bloquer manuellement</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Adresse IP (ex: 105.67.12.44)"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addIP()}
            className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400"
          />
          <input
            type="text"
            placeholder="Raison (optionnel)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addIP()}
            className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400"
          />
          <button
            onClick={addIP}
            disabled={adding || !newIP.trim()}
            className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 text-purple-400 px-5 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors border border-purple-500/30"
          >
            <Plus size={12} />
            Bloquer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Rechercher une IP ou raison..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder-white/30 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-white/30 text-center py-12">
          {list.length === 0 ? 'Aucune IP bloquée' : 'Aucun résultat'}
        </p>
      ) : (
        <div className="border border-white/5 divide-y divide-white/5">
          {filtered.map((entry) => (
            <div key={entry._id} className="flex items-start justify-between px-5 py-4 gap-4 bg-white/5 hover:bg-white/[0.07] transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-purple-400 font-mono text-sm font-semibold">{entry.ip}</span>
                  {entry.orderNumbers && entry.orderNumbers.length > 0 && (
                    <span className="text-white/30 text-xs">{entry.orderNumbers.join(', ')}</span>
                  )}
                  <span className="text-white/20 text-[10px]">
                    {new Date(entry.createdAt).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {entry.reason && (
                  <p className="text-white/40 text-xs mt-1 italic">{entry.reason}</p>
                )}
              </div>
              <button
                onClick={() => removeIP(entry.ip)}
                className="flex-shrink-0 text-white/20 hover:text-red-400 transition-colors p-1"
                title="Débloquer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Percent, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

interface Coupon {
  _id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  active: boolean
  expiresAt?: string
  usageLimit?: number
  usageCount: number
  minOrderAmount?: number
  onePerCustomer: boolean
  createdAt: string
}

const EMPTY_FORM = {
  code: '',
  type: 'percent' as 'percent' | 'fixed',
  value: '',
  expiresAt: '',
  usageLimit: '',
  minOrderAmount: '',
  onePerCustomer: false,
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/coupons', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCoupons(data) })
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.value) { toast.error('Code and value are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          type: form.type,
          value: Number(form.value),
          expiresAt: form.expiresAt || undefined,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
          onePerCustomer: form.onePerCustomer,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success('Coupon created')
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } finally { setSaving(false) }
  }

  const toggleActive = async (coupon: Coupon) => {
    await fetch(`/api/admin/coupons/${coupon._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ active: !coupon.active }),
    })
    setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, active: !c.active } : c))
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE', credentials: 'include' })
    setCoupons(prev => prev.filter(c => c._id !== id))
    toast.success('Deleted')
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50'

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Discount Codes</h1>
          <p className="text-white/40 text-sm mt-1">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-brand-gold text-brand-black px-4 py-2 text-sm font-semibold hover:bg-yellow-400 transition-colors"
        >
          <Plus size={15} /> New Coupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 p-6 mb-8 space-y-4">
          <h2 className="text-white font-semibold mb-2">Create Coupon</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Code *</label>
              <input
                value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="SAVE10" required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'percent' | 'fixed' }))}
                className={`${inputCls} bg-[#1a1a1a]`}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (CAD)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
                {form.type === 'percent' ? 'Discount %' : 'Discount CA$'} *
              </label>
              <input type="number" min="0.01" step="0.01"
                value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                placeholder={form.type === 'percent' ? '10' : '10.00'} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Expires (optional)</label>
              <input type="datetime-local"
                value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className={`${inputCls} bg-[#1a1a1a]`} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Usage Limit (optional)</label>
              <input type="number" min="1"
                value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))}
                placeholder="Unlimited" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Min Order CA$ (optional)</label>
              <input type="number" min="0" step="0.01"
                value={form.minOrderAmount} onChange={e => setForm(p => ({ ...p, minOrderAmount: e.target.value }))}
                placeholder="No minimum" className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input type="checkbox" checked={form.onePerCustomer} onChange={e => setForm(p => ({ ...p, onePerCustomer: e.target.checked }))}
              className="accent-brand-gold" />
            One per customer
          </label>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-brand-gold text-brand-black px-5 py-2 text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2 text-sm text-white/40 hover:text-white border border-white/10 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Tag size={36} className="mx-auto mb-3" />
          <p>No coupons yet. Create your first discount code.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map(coupon => (
            <div key={coupon._id} className={`flex items-center gap-4 border px-4 py-3 transition-colors ${coupon.active ? 'border-white/10 bg-white/3' : 'border-white/5 bg-white/1 opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-brand-gold text-sm tracking-widest">{coupon.code}</span>
                  <span className="flex items-center gap-1 text-xs text-white/60 bg-white/5 px-2 py-0.5">
                    {coupon.type === 'percent' ? <Percent size={10} /> : <DollarSign size={10} />}
                    {coupon.type === 'percent' ? `${coupon.value}% off` : `CA$${coupon.value} off`}
                  </span>
                  <span className="text-xs text-white/30">{coupon.usageCount} used{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</span>
                  {coupon.minOrderAmount && <span className="text-xs text-white/30">Min CA${coupon.minOrderAmount}</span>}
                  {coupon.onePerCustomer && <span className="text-xs text-white/30">1/customer</span>}
                  {coupon.expiresAt && <span className="text-xs text-white/30">Expires {new Date(coupon.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(coupon)} className="text-white/40 hover:text-brand-gold transition-colors" title={coupon.active ? 'Deactivate' : 'Activate'}>
                  {coupon.active ? <ToggleRight size={20} className="text-brand-gold" /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => deleteCoupon(coupon._id)} className="text-white/30 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

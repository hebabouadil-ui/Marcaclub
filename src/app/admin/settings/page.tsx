'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

interface SettingsForm {
  heroTitle: string
  heroTitleEn: string
  heroSubtitle: string
  heroSubtitleEn: string
  announcementBar: string
  announcementActive: boolean
  instagramUrl: string
  tiktokUrl: string
  facebookUrl: string
  whatsappNumber: string
  emailNote: string
  contactEmail: string
  contactPhone: string
  shippingFeeCAD: string
}

const DEFAULT: SettingsForm = {
  heroTitle: 'Votre Beauté, Notre Priorité',
  heroTitleEn: 'Your Beauty, Our Priority',
  heroSubtitle: 'Soins premium sélectionnés pour vous — livrés partout dans le monde',
  heroSubtitleEn: 'Premium skincare & beauty — curated and delivered worldwide',
  announcementBar: 'Free worldwide shipping • New arrivals every week • Secure checkout',
  announcementActive: true,
  instagramUrl: 'https://instagram.com/marcaclub',
  tiktokUrl: 'https://tiktok.com/@marcaclub',
  facebookUrl: '',
  whatsappNumber: '+212695504949',
  emailNote: 'Our team will process your order shortly. For any questions, contact us on WhatsApp.',
  contactEmail: '',
  contactPhone: '',
  shippingFeeCAD: '14.99',
}

const inputClass = 'w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold'

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) setForm({ ...DEFAULT, ...data, shippingFeeCAD: String(data.shippingFeeCAD ?? 14.99) })
      })
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...form, shippingFeeCAD: parseFloat(form.shippingFeeCAD) || 14.99 }),
    })
    setSaving(false)
    if (res.ok) toast.success('Settings saved')
    else toast.error('Failed to save settings')
  }

  if (loading) return <div className="p-8 text-white/40">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <h1 className="text-white text-2xl font-semibold mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Homepage</h2>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Hero Title (FR)</label>
            <input className={inputClass} value={form.heroTitle} onChange={set('heroTitle')} />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Hero Title (EN)</label>
            <input className={inputClass} value={form.heroTitleEn} onChange={set('heroTitleEn')} />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Subtitle (FR)</label>
            <input className={inputClass} value={form.heroSubtitle} onChange={set('heroSubtitle')} />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Subtitle (EN)</label>
            <input className={inputClass} value={form.heroSubtitleEn} onChange={set('heroSubtitleEn')} />
          </div>
        </div>

        {/* Announcement */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Announcement Bar</h2>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Text</label>
            <input className={inputClass} value={form.announcementBar} onChange={set('announcementBar')} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.announcementActive}
              onChange={(e) => setForm((f) => ({ ...f, announcementActive: e.target.checked }))}
              className="accent-brand-gold"
            />
            <span className="text-white/60 text-sm">Show announcement bar</span>
          </label>
        </div>

        {/* Social */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Social Media & Contact</h2>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Instagram URL</label>
            <input className={inputClass} value={form.instagramUrl} onChange={set('instagramUrl')} />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">TikTok URL</label>
            <input className={inputClass} value={form.tiktokUrl} onChange={set('tiktokUrl')} />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Facebook URL</label>
            <input className={inputClass} value={form.facebookUrl} onChange={set('facebookUrl')} placeholder="https://facebook.com/marcaclub" />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">WhatsApp Number</label>
            <input className={inputClass} value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="+212XXXXXXXXX" />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Contact Phone</label>
            <input className={inputClass} value={form.contactPhone} onChange={set('contactPhone')} placeholder="+212XXXXXXXXX" />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Contact Email</label>
            <input className={inputClass} value={form.contactEmail} onChange={set('contactEmail')} placeholder="contact@marcaclub.com" />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Shipping Fee (CAD)</label>
            <input className={inputClass} type="number" min="0" step="0.01" value={form.shippingFeeCAD} onChange={set('shippingFeeCAD')} placeholder="14.99" />
            <p className="text-white/30 text-xs mt-1">Applied to every order. Converted to customer currency at checkout.</p>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Order Confirmation Email</h2>
          <p className="text-white/30 text-xs">This message appears in the confirmation email sent to the customer after ordering.</p>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Customer Message</label>
            <textarea
              rows={3}
              className={inputClass + ' resize-none'}
              value={form.emailNote}
              onChange={set('emailNote')}
            />
          </div>
          <div className="bg-brand-gold/10 border border-brand-gold/20 p-3">
            <p className="text-brand-gold text-xs">Preview: 📞 {form.emailNote}</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-gold text-brand-black px-8 py-3 text-sm font-semibold tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving...' : 'Save'}
        </button>

        {/* Danger zone */}
        <div className="border border-red-500/20 bg-red-500/5 p-5 space-y-3 mt-4">
          <h2 className="text-red-400 text-xs uppercase tracking-widest">Danger Zone</h2>
          <p className="text-white/30 text-xs">Permanently delete all orders from the database. Use this to clean up test data before going live.</p>
          <WipeOrdersButton />
        </div>
      </div>
    </div>
  )
}

function WipeOrdersButton() {
  const [wiping, setWiping] = useState(false)
  const handleWipe = async () => {
    if (!window.confirm('Delete ALL orders permanently? This cannot be undone.')) return
    if (!window.confirm('Are you sure? Every order will be gone forever.')) return
    setWiping(true)
    try {
      const res = await fetch('/api/admin/wipe-orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'DELETE_ALL_ORDERS' }),
      })
      const data = await res.json()
      if (res.ok) toast.success(`Deleted ${data.deleted} orders. Dashboard is clean.`)
      else toast.error(data.error ?? 'Failed')
    } catch { toast.error('Request failed') }
    finally { setWiping(false) }
  }
  return (
    <button
      onClick={handleWipe}
      disabled={wiping}
      className="flex items-center gap-2 border border-red-500/40 text-red-400 px-6 py-2.5 text-xs font-semibold tracking-widest uppercase hover:bg-red-500/10 transition-colors disabled:opacity-50"
    >
      {wiping && <Loader2 size={12} className="animate-spin" />}
      {wiping ? 'Deleting...' : 'Delete All Orders'}
    </button>
  )
}

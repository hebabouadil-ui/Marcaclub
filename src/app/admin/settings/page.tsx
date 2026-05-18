'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

interface SettingsForm {
  heroTitle: string
  heroSubtitle: string
  announcementBar: string
  announcementActive: boolean
  instagramUrl: string
  tiktokUrl: string
  whatsappNumber: string
  emailNote: string
}

const DEFAULT: SettingsForm = {
  heroTitle: 'La Mode Exclusive',
  heroSubtitle: 'Collections importées directement de Primark Espagne',
  announcementBar: 'Livraison 24-48h • Paiement à la livraison • Nouveautés chaque semaine',
  announcementActive: true,
  instagramUrl: 'https://instagram.com/marcaclub',
  tiktokUrl: 'https://tiktok.com/@marcaclub',
  whatsappNumber: '+212695504949',
  emailNote: 'Notre équipe vous appellera pour confirmer votre commande. Pour toute question, contactez-nous sur WhatsApp au +212695504949.',
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
        if (data && Object.keys(data).length > 0) setForm({ ...DEFAULT, ...data })
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
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) toast.success('Paramètres sauvegardés')
    else toast.error('Erreur lors de la sauvegarde')
  }

  if (loading) return <div className="p-8 text-white/40">Chargement...</div>

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <h1 className="text-white text-2xl font-semibold mb-8">Paramètres</h1>

      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Page d&apos;accueil</h2>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Titre principal</label>
            <input className={inputClass} value={form.heroTitle} onChange={set('heroTitle')} />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Sous-titre</label>
            <input className={inputClass} value={form.heroSubtitle} onChange={set('heroSubtitle')} />
          </div>
        </div>

        {/* Announcement */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Barre d&apos;annonce</h2>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Texte</label>
            <input className={inputClass} value={form.announcementBar} onChange={set('announcementBar')} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.announcementActive}
              onChange={(e) => setForm((f) => ({ ...f, announcementActive: e.target.checked }))}
              className="accent-brand-gold"
            />
            <span className="text-white/60 text-sm">Afficher la barre d&apos;annonce</span>
          </label>
        </div>

        {/* Social */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Réseaux sociaux & Contact</h2>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">URL Instagram</label>
            <input className={inputClass} value={form.instagramUrl} onChange={set('instagramUrl')} />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">URL TikTok</label>
            <input className={inputClass} value={form.tiktokUrl} onChange={set('tiktokUrl')} />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Numéro WhatsApp</label>
            <input className={inputClass} value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="+212XXXXXXXXX" />
          </div>
        </div>

        {/* Email */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Email de confirmation</h2>
          <p className="text-white/30 text-xs">Ce message apparaît dans l&apos;email envoyé au client après sa commande.</p>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Message client</label>
            <textarea
              rows={3}
              className={inputClass + ' resize-none'}
              value={form.emailNote}
              onChange={set('emailNote')}
            />
          </div>
          <div className="bg-brand-gold/10 border border-brand-gold/20 p-3">
            <p className="text-brand-gold text-xs">Aperçu : 📞 {form.emailNote}</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-gold text-brand-black px-8 py-3 text-sm font-semibold tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

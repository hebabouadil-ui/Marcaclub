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
}

const DEFAULT: SettingsForm = {
  heroTitle: 'La Mode Exclusive',
  heroSubtitle: 'Collections importées directement de Primark Espagne',
  announcementBar: 'Livraison 24-48h • Paiement à la livraison • Nouveautés chaque semaine',
  announcementActive: true,
  instagramUrl: 'https://instagram.com/marcaclub',
  tiktokUrl: 'https://tiktok.com/@marcaclub',
  whatsappNumber: '+213000000000',
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) setForm({ ...DEFAULT, ...data })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) toast.success('Paramètres sauvegardés')
    else toast.error('Erreur')
  }

  const Field = ({ id, label, type = 'text' }: { id: keyof SettingsForm; label: string; type?: string }) => (
    <div>
      <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">{label}</label>
      <input
        type={type}
        value={String(form[id])}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
      />
    </div>
  )

  if (loading) return <div className="p-8 text-white/40">Chargement...</div>

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <h1 className="text-white text-2xl font-semibold mb-8">Paramètres</h1>

      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Page d&apos;accueil</h2>
          <Field id="heroTitle" label="Titre principal" />
          <Field id="heroSubtitle" label="Sous-titre" />
        </div>

        {/* Announcement */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Barre d&apos;annonce</h2>
          <Field id="announcementBar" label="Texte de l'annonce" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.announcementActive}
              onChange={(e) => setForm({ ...form, announcementActive: e.target.checked })}
              className="accent-brand-gold"
            />
            <span className="text-white/60 text-sm">Afficher la barre d&apos;annonce</span>
          </label>
        </div>

        {/* Social */}
        <div className="bg-white/5 border border-white/5 p-5 space-y-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Réseaux sociaux</h2>
          <Field id="instagramUrl" label="URL Instagram" />
          <Field id="tiktokUrl" label="URL TikTok" />
          <Field id="whatsappNumber" label="Numéro WhatsApp" />
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

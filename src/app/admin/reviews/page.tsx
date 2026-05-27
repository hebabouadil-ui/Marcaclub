'use client'
import { useEffect, useRef, useState } from 'react'
import { Star, Trash2, Plus, Upload, X } from 'lucide-react'

interface Product { _id: string; name: string }
interface Review {
  _id: string
  productId: string
  author: string
  location?: string
  rating: number
  title?: string
  body: string
  photo?: string
  productPhoto?: string
  verified: boolean
  date: string
}

const EMPTY = {
  productId: '', author: '', location: '', rating: 5,
  title: '', body: '', photo: '', productPhoto: '', verified: true, date: '',
}

function Stars({ n, set }: { n: number; set?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          fill={i <= n ? '#f59e0b' : 'none'}
          stroke={i <= n ? '#f59e0b' : '#6b7280'}
          className={set ? 'cursor-pointer' : ''}
          onClick={() => set?.(i)}
        />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingProduct, setUploadingProduct] = useState(false)
  const [filterProduct, setFilterProduct] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const productFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/products?all=true').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : d.products ?? []))
    fetch('/api/admin/reviews').then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : []))
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function uploadPhoto(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) setForm(p => ({ ...p, photo: data.url }))
    else alert(data.message || 'Upload failed')
  }

  async function uploadProductPhoto(file: File) {
    setUploadingProduct(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingProduct(false)
    if (data.url) setForm(p => ({ ...p, productPhoto: data.url }))
    else alert(data.message || 'Upload failed')
  }

  async function save() {
    if (!form.productId || !form.author || !form.body) return alert('Remplis les champs requis')
    setSaving(true)
    const res = await fetch('/api/admin/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rating: Number(form.rating) }),
    })
    const data = await res.json()
    if (data._id) {
      setReviews(p => [data, ...p])
      setForm({ ...EMPTY })
    } else alert(data.error || 'Erreur')
    setSaving(false)
  }

  async function del(id: string) {
    if (!confirm('Supprimer cet avis ?')) return
    await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    setReviews(p => p.filter(r => r._id !== id))
  }

  const productName = (id: string) => products.find(p => p._id === id)?.name ?? id
  const filtered = filterProduct ? reviews.filter(r => r.productId === filterProduct) : reviews

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold tracking-widest uppercase">Avis clients</h1>
        <span className="text-white/40 text-xs">{reviews.length} avis au total</span>
      </div>

      {/* Add review form */}
      <div className="bg-white/3 border border-white/10 p-6 space-y-4">
        <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4 flex items-center gap-2"><Plus size={12} /> Ajouter un avis</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/40 text-[10px] tracking-widest mb-1">PRODUIT *</label>
            <select value={form.productId} onChange={set('productId')}
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-brand-gold/50">
              <option value="">— Choisir un produit —</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] tracking-widest mb-1">NOTE *</label>
            <div className="flex items-center gap-3 mt-1">
              <Stars n={Number(form.rating)} set={(v) => setForm(p => ({ ...p, rating: v }))} />
              <span className="text-white/50 text-sm">{form.rating}/5</span>
            </div>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] tracking-widest mb-1">NOM DU CLIENT *</label>
            <input value={form.author} onChange={set('author')} placeholder="Sophie M."
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-brand-gold/50 placeholder-white/20" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] tracking-widest mb-1">PAYS / VILLE</label>
            <input value={form.location} onChange={set('location')} placeholder="France 🇫🇷"
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-brand-gold/50 placeholder-white/20" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] tracking-widest mb-1">TITRE</label>
            <input value={form.title} onChange={set('title')} placeholder="Super produit !"
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-brand-gold/50 placeholder-white/20" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] tracking-widest mb-1">DATE</label>
            <input type="date" value={form.date} onChange={set('date')}
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div>
          <label className="block text-white/40 text-[10px] tracking-widest mb-1">AVIS *</label>
          <textarea value={form.body} onChange={set('body')} rows={3}
            placeholder="Ce produit m'a vraiment surprise, la texture est parfaite et les résultats sont visibles dès la première semaine..."
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-brand-gold/50 placeholder-white/20 resize-none" />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-white/40 text-[10px] tracking-widest mb-2">PHOTO CLIENT (optionnel)</label>
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
            <button onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 text-xs px-3 py-2 transition-colors">
              <Upload size={12} />
              {uploading ? 'Upload...' : 'Choisir une photo'}
            </button>
            {form.photo && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.photo} alt="" className="w-12 h-12 object-cover rounded" />
                <button onClick={() => setForm(p => ({ ...p, photo: '' }))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  <X size={10} />
                </button>
              </div>
            )}
            {form.photo && <span className="text-xs text-white/40 truncate max-w-xs">{form.photo}</span>}
          </div>
        </div>

        {/* Product photo upload */}
        <div>
          <label className="block text-white/40 text-[10px] tracking-widest mb-2">PHOTO PRODUIT (optionnel)</label>
          <div className="flex items-center gap-3">
            <input ref={productFileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProductPhoto(f) }} />
            <button onClick={() => productFileRef.current?.click()}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 text-xs px-3 py-2 transition-colors">
              <Upload size={12} />
              {uploadingProduct ? 'Upload...' : 'Choisir une photo produit'}
            </button>
            {form.productPhoto && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.productPhoto} alt="" className="w-12 h-12 object-cover rounded" />
                <button onClick={() => setForm(p => ({ ...p, productPhoto: '' }))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  <X size={10} />
                </button>
              </div>
            )}
            {form.productPhoto && <span className="text-xs text-white/40 truncate max-w-xs">{form.productPhoto}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
            <input type="checkbox" checked={form.verified} onChange={(e) => setForm(p => ({ ...p, verified: e.target.checked }))}
              className="w-4 h-4 accent-brand-gold" />
            Achat vérifié
          </label>
          <button onClick={save} disabled={saving}
            className="ml-auto bg-brand-gold text-brand-black text-xs font-bold tracking-widest uppercase px-6 py-2.5 hover:bg-brand-gold/80 disabled:opacity-50 transition-colors">
            {saving ? 'Enregistrement...' : 'Publier l\'avis'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
          className="bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-brand-gold/50">
          <option value="">Tous les produits</option>
          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <span className="text-white/30 text-xs">{filtered.length} avis</span>
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-white/30 text-sm text-center py-8">Aucun avis pour le moment</p>
        )}
        {filtered.map((r) => (
          <div key={r._id} className="bg-white/3 border border-white/8 p-4 flex gap-4">
            {r.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photo} alt="" className="w-14 h-14 object-cover rounded flex-shrink-0" />
            )}
            {r.productPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.productPhoto} alt="produit" className="w-14 h-14 object-cover rounded flex-shrink-0 border border-white/10" title="Photo produit" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-white font-semibold text-sm">{r.author}</span>
                  {r.location && <span className="text-white/40 text-xs ml-2">{r.location}</span>}
                  {r.verified && <span className="text-green-400 text-[10px] ml-2 bg-green-400/10 px-1.5 py-0.5 rounded">✓ Vérifié</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Stars n={r.rating} />
                  <button onClick={() => del(r._id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/30 mb-1">{productName(r.productId)} · {new Date(r.date).toLocaleDateString('fr-FR')}</p>
              {r.title && <p className="text-white/80 text-sm font-medium mb-1">{r.title}</p>}
              <p className="text-white/60 text-sm leading-relaxed">{r.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, Loader2, Upload, Star, Crown, RefreshCw } from 'lucide-react'

interface SizeStock { size: string; stock: number }

interface Product {
  _id: string
  name: string
  price: number
  originalPrice?: number
  category: string
  stock: number
  images: string[]
  sizes: SizeStock[]
  featured: boolean
  active: boolean
  description: string
  descriptionEn?: string
  videoUrl?: string
}

type ProductForm = Omit<Product, '_id' | 'stock'>

const EMPTY: ProductForm = {
  name: '', price: 0, originalPrice: undefined, category: 'soins-visage',
  images: [], sizes: [], featured: false, active: true, description: '', descriptionEn: '', videoUrl: '',
}
const CATEGORIES = ['soins-visage', 'soins-corps', 'soins-cheveux', 'maquillage', 'autres']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', 'Unique']

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [migrating, setMigrating] = useState(false)

  const runMigration = async () => {
    if (!confirm('Convertir les prix MAD → CAD pour tous les produits ? (opération unique)')) return
    setMigrating(true)
    try {
      const res = await fetch('/api/admin/migrate-prices', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (res.ok) { toast.success(`Migration terminée : ${data.migrated}/${data.total} produits convertis`); load() }
      else toast.error(data.error || 'Erreur migration')
    } catch { toast.error('Erreur réseau') }
    finally { setMigrating(false) }
  }

  const load = () => {
    setLoading(true)
    fetch('/api/products', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProducts(data) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (p: Product) => {
    setEditing(p)
    const normalizedSizes = p.sizes.map((s) =>
      typeof s === 'string' ? { size: s as string, stock: 0 } : s
    )
    setForm({ name: p.name, price: p.price, originalPrice: p.originalPrice, category: p.category,
      images: p.images, sizes: normalizedSizes, featured: p.featured, active: p.active,
      description: p.description, descriptionEn: (p as { descriptionEn?: string }).descriptionEn ?? '',
      videoUrl: (p as { videoUrl?: string }).videoUrl ?? '' })
    setModal(true)
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files) return
    setUploading(true)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (res.ok && data.url) {
          urls.push(data.url)
        } else {
          const msg = typeof data.message === 'string' ? data.message : JSON.stringify(data.message || data)
          toast.error(`Erreur upload: ${msg}`, { duration: 8000 })
        }
      } catch (err) {
        toast.error(`Erreur réseau: ${String(err)}`)
      }
    }
    setForm((f) => ({ ...f, images: [...f.images, ...urls] }))
    setUploading(false)
    if (urls.length > 0) toast.success(`${urls.length} image(s) uploadée(s)`)
  }

  const toggleSize = (s: string) =>
    setForm((f) => {
      const exists = f.sizes.find((x) => x.size === s)
      return {
        ...f,
        sizes: exists ? f.sizes.filter((x) => x.size !== s) : [...f.sizes, { size: s, stock: 0 }],
      }
    })

  const setSizeStock = (s: string, stock: number) =>
    setForm((f) => ({ ...f, sizes: f.sizes.map((x) => x.size === s ? { ...x, stock } : x) }))

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Nom et prix requis'); return }
    setSaving(true)
    const url = editing ? `/api/products/${editing._id}` : '/api/products'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(editing ? 'Produit mis à jour' : 'Produit créé')
      setModal(false)
      load()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.message || 'Erreur lors de la sauvegarde', { duration: 8000 })
    }
  }

  const toggleFeatured = async (p: Product) => {
    const res = await fetch(`/api/products/${p._id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, featured: !p.featured }),
    })
    if (res.ok) {
      toast.success(p.featured ? 'Retiré des pièces du moment' : 'Ajouté aux pièces du moment')
      load()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { toast.success('Produit supprimé'); load() }
    else toast.error('Erreur')
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-semibold">Produits</h1>
        <div className="flex gap-2">
          <button
            onClick={runMigration}
            disabled={migrating}
            title="Convertir les anciens prix MAD en CAD"
            className="flex items-center gap-2 bg-white/10 text-white/60 px-3 py-2 text-xs font-semibold tracking-widest uppercase hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={migrating ? 'animate-spin' : ''} />
            Fix MAD→CAD
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-brand-gold text-brand-black px-4 py-2 text-sm font-semibold tracking-widest uppercase hover:bg-white transition-colors"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton aspect-[3/4] rounded" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-lg mb-2">Aucun produit</p>
          <button onClick={openCreate} className="text-brand-gold underline text-sm">
            Ajouter votre premier produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p._id} className="bg-white/5 border border-white/5 group">
              <div className="relative aspect-[3/4] bg-white/5 overflow-hidden">
                {p.images?.[0] ? (
                  <Image
                    src={p.images[0]} alt={p.name} fill
                    className="object-cover"
                    sizes="200px"
                    unoptimized={!p.images[0].includes('cloudinary.com')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                    No image
                  </div>
                )}
                {/* Featured badge */}
                <button
                  onClick={() => toggleFeatured(p)}
                  title={p.featured ? 'Remove from featured' : 'Add to featured'}
                  className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${p.featured ? 'bg-brand-gold text-brand-black' : 'bg-black/50 text-white/40 hover:text-brand-gold'}`}
                >
                  <Star size={12} fill={p.featured ? 'currentColor' : 'none'} />
                </button>
                {!p.active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs tracking-widest uppercase">Inactive</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-white text-sm font-medium truncate">{p.name}</p>
                <p className="text-brand-gold text-sm">{p.price.toLocaleString('en-US', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</p>
                <p className="text-white/40 text-xs">Stock: {p.sizes?.reduce((s, i) => s + i.stock, 0) ?? 0}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs py-1.5 transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p._id)}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-8 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1A1A] w-full max-w-2xl border border-white/10"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-white font-semibold">
                  {editing ? 'Modifier produit' : 'Nouveau produit'}
                </h2>
                <button onClick={() => setModal(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Nom *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
                  />
                </div>

                {/* Price + Original */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Prix * (CAD)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Prix barré (CAD)</label>
                    <input
                      type="number"
                      value={form.originalPrice || ''}
                      onChange={(e) => setForm({ ...form, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Description (FR)</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold resize-none"
                  />
                </div>
                <div>
                  <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Description (EN)</label>
                  <textarea
                    rows={3}
                    value={form.descriptionEn ?? ''}
                    onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold resize-none"
                  />
                </div>

                {/* Video URL */}
                <div>
                  <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Vidéo (TikTok / YouTube / MP4)</label>
                  <input
                    value={(form as { videoUrl?: string }).videoUrl ?? ''}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value } as ProductForm)}
                    placeholder="https://www.tiktok.com/@user/video/123 ou YouTube"
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold placeholder-white/20"
                  />
                </div>

                {/* Sizes + per-size stock */}
                <div>
                  <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">
                    Tailles & stock par taille
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map((s) => {
                      const entry = form.sizes.find((x) => x.size === s)
                      return (
                        <div key={s} className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleSize(s)}
                            className={`px-3 py-1.5 text-xs transition-colors min-w-[40px] ${
                              entry
                                ? 'bg-brand-gold text-brand-black font-semibold'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                            }`}
                          >
                            {s}
                          </button>
                          {entry && (
                            <input
                              type="number"
                              min="0"
                              value={entry.stock}
                              onChange={(e) => setSizeStock(s, Math.max(0, Number(e.target.value)))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 bg-white/10 border border-white/20 text-white text-center text-xs px-1 py-1 focus:outline-none focus:border-brand-gold"
                              placeholder="Qté"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {form.sizes.length > 0 && (
                    <p className="text-white/30 text-xs mt-2">
                      Stock total: {form.sizes.reduce((s, i) => s + i.stock, 0)} pièces
                    </p>
                  )}
                </div>

                {/* Images */}
                <div>
                  <label className="block text-white/40 text-xs uppercase tracking-widest mb-1">Images</label>
                  <p className="text-white/25 text-[11px] mb-2">Click any image to set it as the main photo (shown first on the product page)</p>
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-dashed border-white/20 px-4 py-3 hover:border-brand-gold transition-colors w-fit">
                    {uploading ? <Loader2 size={14} className="animate-spin text-brand-gold" /> : <Upload size={14} className="text-brand-gold" />}
                    <span className="text-white/50 text-sm">{uploading ? 'Upload...' : 'Choisir des images'}</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                  </label>
                  {form.images.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {form.images.map((img, i) => (
                        <div key={i} className={`relative w-20 h-20 cursor-pointer group border-2 transition-all ${i === 0 ? 'border-brand-gold' : 'border-transparent hover:border-white/40'}`}
                          onClick={() => {
                            if (i === 0) return
                            setForm((f) => {
                              const imgs = [...f.images]
                              imgs.splice(i, 1)
                              return { ...f, images: [img, ...imgs] }
                            })
                          }}
                          title={i === 0 ? 'Main photo' : 'Click to set as main photo'}
                        >
                          <Image src={img} alt="" fill className="object-cover pointer-events-none" sizes="80px"
                            unoptimized={!img.includes('cloudinary.com')} />
                          {i === 0 && (
                            <div className="absolute top-0.5 left-0.5 bg-brand-gold text-brand-black rounded-full p-0.5">
                              <Crown size={9} />
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) })) }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Flags */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="accent-brand-gold"
                    />
                    <span className="text-white/60 text-sm">Featured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="accent-brand-gold"
                    />
                    <span className="text-white/60 text-sm">Actif</span>
                  </label>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-white/10">
                <button
                  onClick={() => setModal(false)}
                  className="flex-1 bg-white/5 text-white/60 py-2.5 text-sm hover:bg-white/10 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-gold text-brand-black py-2.5 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import { Wand2, Save, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Product {
  _id: string
  name: string
  images: string[]
  description: string
  descriptionEn?: string
}

function ProductRow({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const [desc, setDesc] = useState(product.description || '')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState('')

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: product.name }),
      })
      const data = await res.json()
      if (data.description) {
        setDesc(data.description)
        setOpen(true)
      } else {
        setError(data.error || 'Erreur génération')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setGenerating(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/update-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product._id, description: desc }),
      })
      const data = await res.json()
      if (data.ok) {
        setSavedAt(new Date().toLocaleTimeString('fr-FR'))
      } else {
        setError(data.error || 'Erreur sauvegarde')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const img = product.images?.[0] || null

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 p-4 bg-white">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 bg-gray-100 rounded overflow-hidden">
          {img ? (
            <Image src={img} alt={product.name} width={56} height={56} className="object-cover w-full h-full" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">IMG</div>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
          {savedAt && <p className="text-[10px] text-green-600 mt-0.5">✓ Sauvegardé à {savedAt}</p>}
          {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-2 rounded font-medium transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            {generating ? 'Génération…' : 'Générer FR'}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <label className="block text-[10px] tracking-widest uppercase text-gray-400 mb-2">Description FR</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={10}
            className="w-full border border-gray-200 rounded p-3 text-sm font-mono resize-y focus:outline-none focus:border-amber-400 bg-white"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={save}
              disabled={saving || !desc.trim()}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs px-4 py-2.5 rounded font-medium transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DescriptionsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products?limit=200')
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.products ?? [])
      setProducts(list)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Descriptions produits</h1>
        <p className="text-sm text-gray-500">Générez et sauvegardez des descriptions professionnelles en français via IA.</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
        />
        <p className="text-[11px] text-gray-400 mt-1">{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-20 text-gray-400">Aucun produit trouvé.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(p => <ProductRow key={p._id} product={p} />)}
        </div>
      )}
    </div>
  )
}

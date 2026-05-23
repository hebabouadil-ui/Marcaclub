'use client'
import { useState } from 'react'
import { Search, Download, Eye, Check, Loader2, ExternalLink, Tag, Package } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface CJVariant {
  vid: string
  variantNameEn: string
  variantPrice: number
  variantStock: number
  variantImage?: string
}

interface CJProduct {
  pid: string
  productNameEn: string
  productImage: string
  sellingPrice: number
  categoryName: string
  variants?: CJVariant[]
}

interface ImportForm {
  name: string
  description: string
  price: string
  category: string
  selectedVariants: string[]
}

export default function CJImportPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CJProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [preview, setPreview] = useState<CJProduct | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [form, setForm] = useState<ImportForm>({ name: '', description: '', price: '', category: 'clothing', selectedVariants: [] })
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<Set<string>>(new Set())

  const search = async (p = 1) => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cj/products?q=${encodeURIComponent(query)}&page=${p}`, { credentials: 'include' })
      const data = await res.json()
      if (data.result && Array.isArray(data.data?.list)) {
        setResults(data.data.list)
        setTotal(data.data.total ?? 0)
        setPage(p)
      } else {
        toast.error('No results or CJ API error')
      }
    } catch {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const openPreview = async (product: CJProduct) => {
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res = await fetch(`/api/cj/products?pid=${product.pid}`, { credentials: 'include' })
      const data = await res.json()
      const detail = data.data ?? product
      setPreview(detail)
      setForm({
        name: detail.productNameEn ?? product.productNameEn,
        description: '',
        price: detail.sellingPrice ? String(Math.ceil(detail.sellingPrice * 2.5)) : '',
        category: 'clothing',
        selectedVariants: (detail.variants ?? []).map((v: CJVariant) => v.vid),
      })
    } catch {
      setPreview(product)
    } finally {
      setPreviewLoading(false)
    }
  }

  const toggleVariant = (vid: string) => {
    setForm((prev) => ({
      ...prev,
      selectedVariants: prev.selectedVariants.includes(vid)
        ? prev.selectedVariants.filter((v) => v !== vid)
        : [...prev.selectedVariants, vid],
    }))
  }

  const handleImport = async () => {
    if (!preview) return
    if (!form.name || !form.price || !form.category) {
      toast.error('Fill in name, price and category')
      return
    }
    setImporting(true)
    try {
      const res = await fetch('/api/cj/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pid: preview.pid,
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          selectedVariants: form.selectedVariants,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Product imported as draft — edit and publish from Products page')
        setImported((prev) => { const next = new Set(prev); next.add(preview.pid); return next })
        setPreview(null)
      } else {
        toast.error(data.error ?? 'Import failed')
      }
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-white font-display font-bold text-xl tracking-widest uppercase mb-1">CJ Dropshipping</h1>
        <p className="text-white/30 text-sm">Search, curate and import products. Edit name, price and description before publishing.</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search(1)}
            placeholder="Search CJ catalog (e.g. streetwear, hoodies, sneakers...)"
            className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-brand-gold/50"
          />
        </div>
        <button
          onClick={() => search(1)}
          disabled={loading}
          className="bg-brand-gold text-brand-black px-6 py-3 text-sm font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* Info bar */}
      {total > 0 && (
        <p className="text-white/30 text-xs mb-4 tracking-wider">{total.toLocaleString()} products found · showing page {page}</p>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {results.map((product) => (
          <div key={product.pid} className="bg-white/3 border border-white/8 group relative overflow-hidden">
            <div className="aspect-square relative bg-white/5">
              {product.productImage && (
                <Image src={product.productImage} alt={product.productNameEn} fill className="object-cover" unoptimized />
              )}
              {imported.has(product.pid) && (
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <Check size={24} className="text-green-400" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-white text-xs font-medium line-clamp-2 mb-1">{product.productNameEn}</p>
              <p className="text-white/40 text-[10px] mb-2">{product.categoryName}</p>
              <div className="flex items-center justify-between">
                <span className="text-brand-gold text-xs font-bold">${product.sellingPrice?.toFixed(2)}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openPreview(product)}
                    className="text-white/40 hover:text-white transition-colors"
                    title="Preview & Import"
                  >
                    {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {results.length === 20 && (
        <div className="flex gap-3 justify-center mb-8">
          {page > 1 && (
            <button onClick={() => search(page - 1)} className="text-white/40 hover:text-white text-sm px-4 py-2 bg-white/5 border border-white/10">
              Previous
            </button>
          )}
          <button onClick={() => search(page + 1)} className="text-white/40 hover:text-white text-sm px-4 py-2 bg-white/5 border border-white/10">
            Next
          </button>
        </div>
      )}

      {/* Preview / Import panel */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-[#141414] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                {preview.productImage && (
                  <div className="w-24 h-24 relative flex-shrink-0 bg-white/5">
                    <Image src={preview.productImage} alt={preview.productNameEn} fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white/40 text-[10px] tracking-widest mb-1">CJ PRODUCT · {preview.pid}</p>
                  <p className="text-white text-sm font-medium mb-1">{preview.productNameEn}</p>
                  <p className="text-white/40 text-xs">CJ cost: <span className="text-brand-gold">${preview.sellingPrice?.toFixed(2)}</span></p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">YOUR PRODUCT NAME *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50" />
                </div>

                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">DESCRIPTION (optional)</label>
                  <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">YOUR SELLING PRICE (USD) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                      <input value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                        type="number" step="0.01" min="0"
                        className="w-full bg-white/5 border border-white/10 text-white text-sm pl-7 pr-4 py-2.5 focus:outline-none focus:border-brand-gold/50" />
                    </div>
                    {form.price && preview.sellingPrice && (
                      <p className="text-green-400 text-[10px] mt-1">
                        Margin: ${(Number(form.price) - preview.sellingPrice).toFixed(2)} ({Math.round(((Number(form.price) - preview.sellingPrice) / Number(form.price)) * 100)}%)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">CATEGORY *</label>
                    <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50">
                      <option value="clothing" className="bg-[#141414]">Clothing</option>
                      <option value="accessories" className="bg-[#141414]">Accessories</option>
                      <option value="shoes" className="bg-[#141414]">Shoes</option>
                      <option value="bags" className="bg-[#141414]">Bags</option>
                      <option value="jewelry" className="bg-[#141414]">Jewelry</option>
                      <option value="other" className="bg-[#141414]">Other</option>
                    </select>
                  </div>
                </div>

                {/* Variants / sizes */}
                {((preview as unknown as { variants?: CJVariant[] }).variants?.length ?? 0) > 0 && (
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-2">SELECT VARIANTS TO IMPORT</label>
                    <div className="flex flex-wrap gap-2">
                      {((preview as unknown as { variants?: CJVariant[] }).variants ?? []).map((v) => (
                        <button
                          key={v.vid}
                          onClick={() => toggleVariant(v.vid)}
                          className={`text-xs px-3 py-1.5 border transition-colors ${
                            form.selectedVariants.includes(v.vid)
                              ? 'border-brand-gold text-brand-gold bg-brand-gold/10'
                              : 'border-white/10 text-white/40 hover:border-white/30'
                          }`}
                        >
                          {v.variantNameEn} {v.variantStock > 0 ? `(${v.variantStock})` : '(out of stock)'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setPreview(null)} className="flex-1 border border-white/10 text-white/40 py-3 text-sm hover:border-white/30 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 bg-brand-gold text-brand-black py-3 text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50"
                  >
                    {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {importing ? 'Importing...' : 'Import as Draft'}
                  </button>
                </div>

                <p className="text-white/20 text-[10px] text-center">
                  Imported as draft · go to Products to edit images, publish and set as featured
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

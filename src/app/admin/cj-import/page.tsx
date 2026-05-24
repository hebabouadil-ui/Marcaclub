'use client'
import { useState, useCallback } from 'react'
import { Search, Download, Eye, Check, Loader2, RefreshCw, ChevronDown, ChevronUp, Truck } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface CJVariant {
  vid: string
  variantNameEn: string
  variantPrice: number
  variantStock: number
  variantWeight: number
  variantImage?: string
}

interface CJProduct {
  pid: string
  productNameEn: string
  productImage: string
  sellingPrice: number
  categoryName: string
  productWeight?: number
  variants?: CJVariant[]
  productImageSet?: Array<{ imageUrl: string }>
}

interface ShippingOption {
  logisticName: string
  logisticNameEn: string
  shipmentType: string
  logisticPrice: number
  agingMin: number
  agingMax: number
  currency: string
}

interface ImportForm {
  name: string
  description: string
  price: string
  category: string
  selectedVariants: string[]
  cjLogisticName: string
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'MA', name: 'Morocco' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'UAE' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'JP', name: 'Japan' },
]

export default function CJImportPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CJProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [preview, setPreview] = useState<CJProduct | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [form, setForm] = useState<ImportForm>({
    name: '', description: '', price: '', category: 'clothing',
    selectedVariants: [], cjLogisticName: '',
  })
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<Set<string>>(new Set())

  // Shipping state
  const [shippingCountry, setShippingCountry] = useState('US')
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingLoaded, setShippingLoaded] = useState(false)
  const [showShipping, setShowShipping] = useState(false)

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
        toast.error(data.message || data.error || `CJ error: ${JSON.stringify(data).slice(0, 100)}`, { duration: 8000 })
      }
    } catch {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const fetchShipping = useCallback(async (product: CJProduct, country: string) => {
    setShippingLoading(true)
    setShippingLoaded(false)
    setShippingOptions([])
    try {
      const weight = product.productWeight ?? (product.variants?.[0]?.variantWeight ?? 200)
      const res = await fetch(
        `/api/cj/shipping?endCountryCode=${country}&weight=${weight}&quantity=1`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (data.result && Array.isArray(data.data)) {
        setShippingOptions(data.data)
        setShippingLoaded(true)
        setShowShipping(true)
      } else {
        toast.error(data.message || data.error || 'Could not load shipping options')
      }
    } catch {
      toast.error('Shipping fetch failed')
    } finally {
      setShippingLoading(false)
    }
  }, [])

  const openPreview = async (product: CJProduct) => {
    setPreviewLoading(true)
    setPreview(null)
    setShippingOptions([])
    setShippingLoaded(false)
    setShowShipping(false)
    try {
      const res = await fetch(`/api/cj/products?pid=${product.pid}`, { credentials: 'include' })
      const data = await res.json()
      const detail: CJProduct = data.data ?? product
      setPreview(detail)
      const variantPrice = detail.variants?.[0]?.variantPrice ?? detail.sellingPrice ?? 0
      setForm({
        name: detail.productNameEn ?? product.productNameEn,
        description: '',
        price: variantPrice ? String(Math.ceil(variantPrice * 3)) : '',
        category: 'clothing',
        selectedVariants: (detail.variants ?? []).map((v) => v.vid),
        cjLogisticName: '',
      })
      // Auto-fetch shipping for default country
      fetchShipping(detail, shippingCountry)
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
          cjLogisticName: form.cjLogisticName || undefined,
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

  // CJ cost: lowest variant price or sellingPrice
  const cjCost = preview
    ? (preview.variants?.reduce((min, v) => v.variantPrice > 0 && v.variantPrice < min ? v.variantPrice : min,
        preview.variants?.[0]?.variantPrice ?? preview.sellingPrice ?? 0) ?? preview.sellingPrice ?? 0)
    : 0

  const selectedShipping = shippingOptions.find((o) => o.logisticName === form.cjLogisticName)
  const totalCjCost = cjCost + (selectedShipping?.logisticPrice ?? 0)
  const margin = form.price ? Number(form.price) - totalCjCost : null

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-white font-display font-bold text-xl tracking-widest uppercase mb-1">CJ Dropshipping</h1>
        <p className="text-white/30 text-sm">Search, preview shipping costs, and import products to your store.</p>
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

      {total > 0 && (
        <p className="text-white/30 text-xs mb-4 tracking-wider">{total.toLocaleString()} products found · page {page}</p>
      )}

      {/* Results */}
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
            <div className="p-6 space-y-5">

              {/* Product header */}
              <div className="flex items-start gap-4">
                {preview.productImage && (
                  <div className="w-20 h-20 relative flex-shrink-0 bg-white/5">
                    <Image src={preview.productImage} alt={preview.productNameEn} fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/30 text-[10px] tracking-widest mb-0.5">CJ · {preview.pid}</p>
                  <p className="text-white text-sm font-medium leading-tight mb-2">{preview.productNameEn}</p>
                  <div className="flex flex-wrap gap-3 text-[11px]">
                    <span className="text-white/50">CJ price: <span className="text-brand-gold font-bold">${cjCost.toFixed(2)}</span></span>
                    {preview.productWeight && (
                      <span className="text-white/40">Weight: {preview.productWeight}g</span>
                    )}
                    {preview.variants && (
                      <span className="text-white/40">{preview.variants.length} variants</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping section */}
              <div className="border border-white/10 rounded-sm overflow-hidden">
                <button
                  onClick={() => setShowShipping(!showShipping)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Truck size={14} />
                    Shipping Options
                    {form.cjLogisticName && (
                      <span className="text-brand-gold text-[10px] ml-1">· {form.cjLogisticName}</span>
                    )}
                  </span>
                  {showShipping ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showShipping && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Country selector */}
                    <div className="flex items-center gap-3">
                      <select
                        value={shippingCountry}
                        onChange={(e) => setShippingCountry(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 text-white text-xs px-3 py-2 focus:outline-none focus:border-brand-gold/50"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code} className="bg-[#141414]">{c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => preview && fetchShipping(preview, shippingCountry)}
                        disabled={shippingLoading}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs px-3 py-2 transition-colors disabled:opacity-50"
                      >
                        {shippingLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {shippingLoading ? 'Loading...' : 'Fetch'}
                      </button>
                    </div>

                    {/* Shipping options list */}
                    {shippingLoaded && shippingOptions.length === 0 && (
                      <p className="text-white/30 text-xs">No shipping options available for this country.</p>
                    )}
                    {shippingOptions.map((opt) => (
                      <button
                        key={opt.logisticName}
                        onClick={() => setForm((p) => ({ ...p, cjLogisticName: p.cjLogisticName === opt.logisticName ? '' : opt.logisticName }))}
                        className={`w-full text-left px-3 py-2.5 border text-xs transition-colors ${
                          form.cjLogisticName === opt.logisticName
                            ? 'border-brand-gold bg-brand-gold/10 text-white'
                            : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold">{opt.logisticNameEn || opt.logisticName}</span>
                            <span className="text-white/40 ml-2">{opt.shipmentType}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-brand-gold">${opt.logisticPrice.toFixed(2)}</span>
                            <span className="text-white/40 ml-1">{opt.currency}</span>
                          </div>
                        </div>
                        <p className="text-white/40 mt-0.5">
                          Delivery: {opt.agingMin}–{opt.agingMax} days
                        </p>
                      </button>
                    ))}

                    {!shippingLoaded && !shippingLoading && (
                      <p className="text-white/30 text-xs">Select a country and click Fetch to see shipping options.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Cost summary */}
              {(cjCost > 0 || selectedShipping) && (
                <div className="bg-white/3 border border-white/8 px-4 py-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-white/50">
                    <span>CJ product cost</span>
                    <span>${cjCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Shipping ({selectedShipping ? (selectedShipping.logisticNameEn || selectedShipping.logisticName) : 'not selected'})</span>
                    <span>{selectedShipping ? `$${selectedShipping.logisticPrice.toFixed(2)}` : '—'}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1.5 text-white font-semibold">
                    <span>Total CJ cost</span>
                    <span>${totalCjCost.toFixed(2)}</span>
                  </div>
                  {margin !== null && (
                    <div className={`flex justify-between font-bold ${margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      <span>Your margin</span>
                      <span>${margin.toFixed(2)} ({form.price ? Math.round((margin / Number(form.price)) * 100) : 0}%)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Form fields */}
              <div>
                <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">YOUR PRODUCT NAME *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50" />
              </div>

              <div>
                <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">DESCRIPTION (optional)</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">SELLING PRICE (USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                    <input value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      type="number" step="0.01" min="0"
                      className="w-full bg-white/5 border border-white/10 text-white text-sm pl-7 pr-4 py-2.5 focus:outline-none focus:border-brand-gold/50" />
                  </div>
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

              {/* Variants */}
              {(preview.variants?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white/40 text-[10px] tracking-widest">VARIANTS TO IMPORT</label>
                    <div className="flex gap-2">
                      <button onClick={() => setForm((p) => ({ ...p, selectedVariants: (preview.variants ?? []).map((v) => v.vid) }))}
                        className="text-[10px] text-white/30 hover:text-white transition-colors">All</button>
                      <button onClick={() => setForm((p) => ({ ...p, selectedVariants: [] }))}
                        className="text-[10px] text-white/30 hover:text-white transition-colors">None</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(preview.variants ?? []).map((v) => (
                      <button
                        key={v.vid}
                        onClick={() => toggleVariant(v.vid)}
                        className={`text-xs px-3 py-1.5 border transition-colors ${
                          form.selectedVariants.includes(v.vid)
                            ? 'border-brand-gold text-brand-gold bg-brand-gold/10'
                            : 'border-white/10 text-white/40 hover:border-white/30'
                        }`}
                      >
                        {v.variantNameEn}
                        {v.variantPrice > 0 && <span className="text-white/30 ml-1">${v.variantPrice.toFixed(2)}</span>}
                        {v.variantStock === 0 && <span className="text-red-400/60 ml-1">OOS</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setPreview(null)}
                  className="flex-1 border border-white/10 text-white/40 py-3 text-sm hover:border-white/30 transition-colors">
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
                Imported as draft · go to Products to add images, publish and set as featured
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

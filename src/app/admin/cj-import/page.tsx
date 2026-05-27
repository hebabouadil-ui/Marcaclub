'use client'
import { useState, useCallback, useEffect } from 'react'
import { Search, Download, Check, Loader2, RefreshCw, ChevronDown, ChevronUp, Truck, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

// Fallback rate — overwritten immediately by live /api/rates fetch
let _liveUsdToCAD = 1.38

function cadUSD(usd: number, decimals = 2) {
  return (usd * _liveUsdToCAD).toLocaleString('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function cadFmt(cad: number, decimals = 0) {
  return cad.toLocaleString('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

interface CJVariant {
  vid: string
  variantSku?: string
  variantNameEn: string
  variantPrice: number
  variantStock: number
  variantWeight: number
  variantImage?: string
  variantKey?: string
}

interface CJProduct {
  pid: string
  productNameEn: string
  productImage: string
  sellingPrice: number
  categoryName: string
  productWeight?: number
  productUnit?: string
  description?: string
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

// CJ API returns fields under different names depending on endpoint version.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeVariant(v: any): CJVariant {
  return {
    vid: v.vid ?? v.variantId ?? v.id ?? '',
    variantSku: v.variantSku ?? v.sku ?? '',
    variantNameEn: (() => {
      const full = v.variantNameEn || v.variantName || ''
      const short = v.variantKey || v.variantProperty || v.propertyValueEn || v.propertyValue || ''
      // Prefer the short key when the full name is the entire product title repeated
      if (!full || full.length > 40) return short || full
      return full || short
    })(),
    variantPrice: v.variantSellPrice ?? v.variantPrice ?? v.sellPrice ?? v.price ?? v.costPrice ?? 0,
    variantStock: v.variantStock ?? v.variantInventory ?? v.inventory ?? v.stock ?? v.inventoryCount ?? v.availableInventory ?? 100,
    variantWeight: v.variantWeight ?? v.weight ?? v.productWeight ?? 0,
    variantImage: v.variantImage ?? v.variantPicture ?? v.image ?? v.imageUrl ?? undefined,
    variantKey: v.variantKey ?? undefined,
  }
}

// Parse productImage which CJ sometimes returns as a JSON-encoded string array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseImageField(val: any): string {
  if (!val) return ''
  if (typeof val === 'string' && val.startsWith('[')) {
    try { const arr = JSON.parse(val); return Array.isArray(arr) ? arr[0] ?? '' : val } catch { return val }
  }
  return typeof val === 'string' ? val : ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseImageSetField(val: any): Array<{ imageUrl: string }> {
  // Handle JSON-encoded string array
  if (typeof val === 'string' && val.startsWith('[')) {
    try { val = JSON.parse(val) } catch { return [] }
  }
  if (!Array.isArray(val)) return []
  return val.map((item: unknown) =>
    typeof item === 'string' ? { imageUrl: item } : (item as { imageUrl: string })
  ).filter((item) => item.imageUrl)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProduct(raw: any): CJProduct {
  const variantSource =
    (Array.isArray(raw.variants) && raw.variants.length > 0) ? raw.variants :
    (Array.isArray(raw.variantList) && raw.variantList.length > 0) ? raw.variantList :
    (Array.isArray(raw.productVariants) && raw.productVariants.length > 0) ? raw.productVariants :
    (Array.isArray(raw.skuList) && raw.skuList.length > 0) ? raw.skuList : []
  const variants = variantSource.map(normalizeVariant)

  // Derive cost from variants first, then fall back to API cost fields
  const variantPrices = variants.map((v: CJVariant) => v.variantPrice).filter((p: number) => p > 0)
  const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0
  const sellingPrice = minVariantPrice || (raw.productCostPrice ?? raw.sellingPrice ?? raw.costPrice ?? raw.productSellingPrice ?? 0)

  return {
    pid: raw.pid ?? raw.productId ?? '',
    productNameEn: raw.productNameEn ?? raw.productName ?? '',
    productImage: parseImageField(raw.productImage ?? raw.mainImage ?? raw.productMainImage),
    sellingPrice,
    categoryName: raw.categoryName ?? '',
    productWeight: raw.productWeight ?? raw.weight ?? undefined,
    description: raw.description ?? raw.productDescription ?? undefined,
    variants,
    productImageSet: parseImageSetField(raw.productImageSet ?? raw.imageList ?? raw.productImages),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeShipping(opt: any): ShippingOption {
  let agingMin = opt.agingMin ?? opt.ageMin ?? 0
  let agingMax = opt.agingMax ?? opt.ageMax ?? 0
  if (!agingMin || !agingMax) {
    // CJ v2 uses "logisticAge" like "7-20", fallback to other string fields
    const agingStr = opt.logisticAging ?? opt.logisticAge ?? opt.aging ?? opt.deliveryTime ?? opt.shippingTime ?? ''
    if (agingStr) {
      const parts = String(agingStr).split('-')
      agingMin = parseInt(parts[0]) || 0
      agingMax = parseInt(parts[1] ?? parts[0]) || 0
    }
  }
  return {
    logisticName: opt.logisticName ?? '',
    logisticNameEn: opt.logisticNameEn ?? opt.logisticName ?? '',
    shipmentType: opt.shipmentType ?? opt.type ?? '',
    logisticPrice: opt.logisticPrice ?? opt.price ?? opt.freightCost ?? 0,
    agingMin,
    agingMax,
    currency: opt.currency ?? 'USD',
  }
}

// Sell price (excl shipping) = cost / (1 - margin%), returned in CAD
// e.g. cost $22, margin 60% → sell = $22 / 0.4 * 1.38 = CA$75.90 → CA$76
function sellPriceCAD(costUSD: number, marginPct: number): number {
  const margin = Math.min(Math.max(marginPct, 1), 95) / 100
  return Math.ceil((costUSD / (1 - margin)) * _liveUsdToCAD)
}
// Alias used in old code paths — now same as sellPriceCAD
const sellPriceBase = sellPriceCAD
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

interface ImportForm {
  name: string
  description: string
  videoUrl: string
  price: string
  category: string
  selectedVariants: string[]
  cjLogisticName: string
  marginPct: string        // target margin % (e.g. "60" = 60%)
  variantPrices: Record<string, string>     // sell price in CAD (base only, no shipping)
  baseVariantPrices: Record<string, string> // same — stored separately for storefront
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
  const [searchMode, setSearchMode] = useState<'name' | 'sku'>('name')
  const [results, setResults] = useState<CJProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [preview, setPreview] = useState<CJProduct | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [form, setForm] = useState<ImportForm>({
    name: '', description: '', videoUrl: '', price: '', category: 'soins-visage',
    selectedVariants: [], cjLogisticName: '', marginPct: '60', variantPrices: {}, baseVariantPrices: {},
  })
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<Set<string>>(new Set())

  // Single country state: used for both shipping fetch and "Price on website" preview.
  // Change this country + click Fetch to see the exact price customers in that country will pay.
  const [usdToCAD, setUsdToCAD] = useState(1.38)

  useEffect(() => {
    fetch('/api/rates').then(r => r.json()).then(d => {
      const rate = d.rates?.USD
      if (rate && rate > 0) { _liveUsdToCAD = 1 / rate; setUsdToCAD(1 / rate) }
    }).catch(() => {})
  }, [])

  const [shippingCountry, setShippingCountry] = useState('CA')
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingLoaded, setShippingLoaded] = useState(false)
  const [showShipping, setShowShipping] = useState(false)
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none')
  const [cardPrices, setCardPrices] = useState<Record<string, number>>({})

  // Fetch detail prices in batches of 3 to balance speed vs rate limits
  const fetchCardPrices = useCallback(async (products: CJProduct[]) => {
    setCardPrices({})
    const BATCH = 3
    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH)
      await Promise.all(batch.map(async (p) => {
        try {
          const res = await fetch(`/api/cj/products?pid=${p.pid}`, { credentials: 'include' })
          const data = await res.json()
          if (data.result && data.data) {
            const detail = normalizeProduct(data.data)
            const price = detail.sellingPrice > 0 ? detail.sellingPrice : 0
            // Also try getting price directly from variants
            const variantMin = (data.data.variants ?? data.data.variantList ?? [])
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((v: any) => v.variantSellPrice ?? v.variantPrice ?? v.sellPrice ?? v.costPrice ?? 0)
              .filter((n: number) => n > 0)
            const finalPrice = variantMin.length > 0 ? Math.min(...variantMin) : price
            if (finalPrice > 0) setCardPrices((prev) => ({ ...prev, [p.pid]: finalPrice }))
          }
        } catch {}
      }))
      if (i + BATCH < products.length) await new Promise((r) => setTimeout(r, 400))
    }
  }, [])

  const search = async (p = 1) => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const param = searchMode === 'sku' ? 'sku' : 'q'
      const res = await fetch(`/api/cj/products?${param}=${encodeURIComponent(query)}&page=${p}`, { credentials: 'include' })
      const data = await res.json()
      if (data.result && Array.isArray(data.data?.list)) {
        const normalized = data.data.list.map(normalizeProduct)
        setResults(normalized)
        setTotal(data.data.total ?? 0)
        setPage(p)
        fetchCardPrices(normalized)
      } else {
        toast.error(data.message || data.error || `CJ error: ${JSON.stringify(data).slice(0, 120)}`, { duration: 8000 })
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
      const firstVariant = product.variants?.[0]
      // productWeight can be a range string like "130-390" — parse it to a number
      const parseWeight = (w: string | number | undefined): number => {
        if (!w) return firstVariant?.variantWeight ?? 200
        if (typeof w === 'number' && !isNaN(w)) return w
        const s = String(w)
        if (s.includes('-')) {
          const parts = s.split('-').map(Number).filter((n) => !isNaN(n))
          return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 200
        }
        return Number(s) || 200
      }
      const weight = parseWeight(product.productWeight)
      const vidParam = firstVariant?.vid ? `&vid=${encodeURIComponent(firstVariant.vid)}` : ''
      const res = await fetch(
        `/api/cj/shipping?endCountryCode=${country}&weight=${weight}&quantity=1${vidParam}`,
        { credentials: 'include' }
      )
      const data = await res.json()
      // Log raw to console so we can inspect actual field names
      console.log('CJ shipping raw options:', JSON.stringify(data?.data?.[0]))
      if (data.result && Array.isArray(data.data)) {
        const options = data.data.map(normalizeShipping)
        setShippingOptions(options)
        setShippingLoaded(true)
        setShowShipping(true)

        // Auto-select best-value option (cheap + reasonable speed)
        if (options.length > 0) {
          const maxPrice = Math.max(...options.map((o: ShippingOption) => o.logisticPrice), 1)
          const maxDays = Math.max(...options.map((o: ShippingOption) => o.agingMax || o.agingMin || 30), 1)
          const fastest = options.slice().map((o: ShippingOption) => ({
            ...o,
            score: (o.logisticPrice / maxPrice) * 0.7 + ((o.agingMax || o.agingMin || 30) / maxDays) * 0.3,
          })).sort((a: { score: number }, b: { score: number }) => a.score - b.score)[0]
          const newShipUSD = fastest.logisticPrice ?? 0
          setForm((prev) => {
            const margin = parseFloat(prev.marginPct || '60')
            const newVP: Record<string, string> = { ...prev.variantPrices }
            const newBaseVP: Record<string, string> = {}
            // Sell price is based on cost only (shipping excluded) — recalc only if not manually edited
            for (const v of product.variants ?? []) {
              const autoSell = String(sellPriceBase(v.variantPrice, margin))
              newBaseVP[v.vid] = autoSell
              const wasAuto = !prev.variantPrices[v.vid] || prev.variantPrices[v.vid] === autoSell
              if (wasAuto) newVP[v.vid] = autoSell
            }
            const prices = prev.selectedVariants.map((vid) => Number(newVP[vid] || 0)).filter((n) => n > 0)
            const minP = prices.length > 0 ? String(Math.min(...prices)) : prev.price
            return { ...prev, cjLogisticName: fastest.logisticName, variantPrices: newVP, baseVariantPrices: newBaseVP, price: minP }
          })
        }
      } else {
        toast.error(data.message || data.error || `Shipping error: ${JSON.stringify(data).slice(0, 100)}`)
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
    setActiveImg(0)
    try {
      const res = await fetch(`/api/cj/products?pid=${product.pid}`, { credentials: 'include' })
      const data = await res.json()
      const detail: CJProduct = normalizeProduct(data.data ?? product)
      setPreview(detail)
      const margin = parseFloat(form.marginPct || '60')

      // Sell price = cost / (1 - margin%) — shipping NOT included, added per country on store
      const vPrices: Record<string, string> = {}
      for (const v of detail.variants ?? []) {
        vPrices[v.vid] = String(sellPriceBase(v.variantPrice, margin))
      }
      const minPrice = Object.values(vPrices).length > 0
        ? String(Math.min(...Object.values(vPrices).map(Number)))
        : ''
      setForm((prev) => ({
        name: detail.productNameEn ?? product.productNameEn,
        description: detail.description ? stripHtml(detail.description) : '',
        videoUrl: prev.videoUrl || '',
        price: minPrice,
        category: prev.category || 'soins-visage',
        selectedVariants: (detail.variants ?? []).map((v) => v.vid),
        cjLogisticName: '',
        marginPct: prev.marginPct || '60',
        variantPrices: vPrices,
        // baseVariantPrices = same as variantPrices (sell price excl. shipping)
        baseVariantPrices: { ...vPrices },
      }))
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
          descriptionHtml: preview.description || undefined,
          videoUrl: form.videoUrl || undefined,
          price: Number(form.price),
          category: form.category,
          selectedVariants: form.selectedVariants,
          cjLogisticName: form.cjLogisticName || undefined,
          variantPrices: form.variantPrices,
          baseVariantPrices: form.baseVariantPrices,
          shippingBakedUSD: shippingUSD,
          shippingRefCountry: shippingUSD > 0 ? shippingCountry : undefined,
          productWeight: preview.productWeight ?? 200,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Product published to your store!')
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

  // All images gallery
  const allImages = preview ? [
    preview.productImage,
    ...(preview.productImageSet?.map((img) => img.imageUrl) ?? []),
    // fallback: grab unique variant images
    ...(preview.variants?.map((v) => v.variantImage).filter(Boolean) ?? []),
  ].filter((url): url is string => !!url && url.startsWith('http'))
    .filter((url, i, arr) => arr.indexOf(url) === i) // dedupe
  : []

  const cjCost = (() => {
    if (!preview) return 0
    const variants = preview.variants ?? []
    if (variants.length === 0) return preview.sellingPrice ?? 0
    const prices = variants.map((v) => v.variantPrice ?? 0).filter((p) => p > 0)
    return prices.length > 0 ? Math.min(...prices) : (preview.sellingPrice ?? 0)
  })()

  const selectedShipping = shippingOptions.find((o) => o.logisticName === form.cjLogisticName)
  const shippingUSD = selectedShipping?.logisticPrice ?? 0

  const selectedVariantObjs = (preview?.variants ?? []).filter((v) => form.selectedVariants.includes(v.vid))
  const totalStock = selectedVariantObjs.reduce((s, v) => s + (v.variantStock ?? 0), 0)

  const selectedCjCosts = selectedVariantObjs.map((v) => v.variantPrice)
  const minCjCost = selectedCjCosts.length > 0 ? Math.min(...selectedCjCosts) : cjCost
  const maxCjCost = selectedCjCosts.length > 0 ? Math.max(...selectedCjCosts) : cjCost
  const avgMarginCAD = selectedVariantObjs.length > 0
    ? selectedVariantObjs.reduce((sum, v) => {
        const sellCAD = Number(form.variantPrices[v.vid] || 0)
        const costCAD = (v.variantPrice ?? 0) * usdToCAD
        return sum + (sellCAD - costCAD)
      }, 0) / selectedVariantObjs.length
    : null

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-white font-display font-bold text-xl tracking-widest uppercase mb-1">CJ Dropshipping</h1>
        <p className="text-white/30 text-sm">Search products, review all details, and publish directly to your store.</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="flex border border-white/10 text-xs">
          <button onClick={() => setSearchMode('name')}
            className={`px-3 py-2 transition-colors ${searchMode === 'name' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
            Name
          </button>
          <button onClick={() => setSearchMode('sku')}
            className={`px-3 py-2 transition-colors ${searchMode === 'sku' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
            SKU
          </button>
        </div>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search(1)}
            placeholder={searchMode === 'sku' ? 'Enter CJ SKU (e.g. CJFE123456)' : 'Search CJ catalog (e.g. streetwear, hoodies...)'}
            className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-brand-gold/50"
          />
        </div>
        <button onClick={() => search(1)} disabled={loading}
          className="bg-brand-gold text-brand-black px-6 py-3 text-sm font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/30 text-xs tracking-wider">{total.toLocaleString()} products · page {page}</p>
          <div className="flex gap-2">
            {(['none', 'asc', 'desc'] as const).map((s) => (
              <button key={s} onClick={() => setSortOrder(s)}
                className={`text-[10px] px-3 py-1.5 uppercase tracking-widest transition-colors ${sortOrder === s ? 'bg-brand-gold text-brand-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                {s === 'none' ? 'Default' : s === 'asc' ? '↑ Price' : '↓ Price'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {[...results]
          .sort((a, b) => {
            if (sortOrder === 'none') return 0
            const pa = cardPrices[a.pid] ?? a.sellingPrice ?? 0
            const pb = cardPrices[b.pid] ?? b.sellingPrice ?? 0
            return sortOrder === 'asc' ? pa - pb : pb - pa
          })
          .map((product) => (
          <div key={product.pid}
            className="bg-white/3 border border-white/8 cursor-pointer hover:border-white/20 transition-colors group"
            onClick={() => openPreview(product)}>
            <div className="aspect-square relative bg-white/5 overflow-hidden">
              {product.productImage && (
                <Image src={product.productImage} alt={product.productNameEn} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
              )}
              {imported.has(product.pid) && (
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <Check size={24} className="text-green-400" />
                </div>
              )}
              {previewLoading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-white text-xs font-medium line-clamp-2 mb-1">{product.productNameEn}</p>
              <p className="text-white/40 text-[10px] mb-2">{product.categoryName}</p>
              {(() => {
                const price = cardPrices[product.pid] ?? (product.sellingPrice > 0 ? product.sellingPrice : null)
                return price != null
                  ? <span className="text-xs"><span className="text-white/30">Cost </span><span className="text-brand-gold font-bold">{cadUSD(price)}</span></span>
                  : <span className="text-white/20 text-xs animate-pulse">loading…</span>
              })()}
            </div>
          </div>
        ))}
      </div>

      {results.length === 20 && (
        <div className="flex gap-3 justify-center mb-8">
          {page > 1 && (
            <button onClick={() => search(page - 1)} className="text-white/40 hover:text-white text-sm px-4 py-2 bg-white/5 border border-white/10">Previous</button>
          )}
          <button onClick={() => search(page + 1)} className="text-white/40 hover:text-white text-sm px-4 py-2 bg-white/5 border border-white/10">Next</button>
        </div>
      )}

      {/* Full preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setPreview(null)}>
          <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-4xl my-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <p className="text-white/30 text-[10px] tracking-widest">CJ DROPSHIPPING · {preview.pid}</p>
                <p className="text-white text-sm font-semibold mt-0.5">{preview.productNameEn}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-white/40 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-0">
              {/* Left: Images + Info */}
              <div className="p-6 border-r border-white/10">
                {/* Main image */}
                <div className="aspect-square relative bg-white/5 mb-3 overflow-hidden">
                  {allImages[activeImg] && (
                    <Image src={allImages[activeImg]} alt={preview.productNameEn} fill className="object-contain" unoptimized />
                  )}
                  {allImages.length > 1 && (
                    <>
                      <button onClick={() => setActiveImg((i) => (i - 1 + allImages.length) % allImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 transition-colors">
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={() => setActiveImg((i) => (i + 1) % allImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                      <p className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5">{activeImg + 1}/{allImages.length}</p>
                    </>
                  )}
                </div>

                {/* Thumbnail strip */}
                {allImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                    {allImages.map((img, i) => (
                      <button key={i} onClick={() => setActiveImg(i)}
                        className={`flex-shrink-0 w-14 h-14 relative border transition-colors ${i === activeImg ? 'border-brand-gold' : 'border-white/10 hover:border-white/30'}`}>
                        <Image src={img} alt="" fill className="object-cover" unoptimized />
                      </button>
                    ))}
                  </div>
                )}

                {/* Product specs */}
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 px-3 py-2">
                      <p className="text-white/40 text-[10px] mb-0.5">CJ COST (FROM)</p>
                      <p className="text-brand-gold font-bold text-sm">{cadUSD(cjCost)}</p>
                    </div>
                    <div className="bg-white/5 px-3 py-2">
                      <p className="text-white/40 text-[10px] mb-0.5">WEIGHT</p>
                      <p className="text-white font-semibold">{preview.productWeight ?? '—'}g</p>
                    </div>
                    <div className="bg-white/5 px-3 py-2">
                      <p className="text-white/40 text-[10px] mb-0.5">CATEGORY</p>
                      <p className="text-white">{preview.categoryName}</p>
                    </div>
                    <div className="bg-white/5 px-3 py-2">
                      <p className="text-white/40 text-[10px] mb-0.5">VARIANTS</p>
                      <p className="text-white">{preview.variants?.length ?? 0}</p>
                    </div>
                  </div>

                  {preview.description && (
                    <div className="mt-3">
                      <p className="text-white/40 text-[10px] tracking-widest mb-2">CJ DESCRIPTION</p>
                      <div
                        className="bg-white rounded p-3 overflow-y-auto text-black text-sm"
                        style={{ maxHeight: '500px' }}
                        dangerouslySetInnerHTML={{ __html: preview.description }}
                      />
                    </div>
                  )}
                </div>

                {/* All variants table */}
                {(preview.variants?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="text-white/40 text-[10px] tracking-widest mb-2">ALL VARIANTS</p>
                    <div className="border border-white/10 overflow-hidden">
                      <div className="grid grid-cols-4 text-[10px] text-white/30 px-3 py-1.5 border-b border-white/10 bg-white/3">
                        <span>Name</span><span>Price</span><span>Stock</span><span>Weight</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {preview.variants!.map((v) => (
                          <div key={v.vid} className="grid grid-cols-4 text-[11px] px-3 py-1.5 border-b border-white/5 hover:bg-white/3">
                            <span className="text-white truncate">{v.variantNameEn}</span>
                            <span className="text-brand-gold">{cadUSD(v.variantPrice ?? 0)}</span>
                            <span className={v.variantStock > 0 ? 'text-green-400' : 'text-red-400'}>{v.variantStock}</span>
                            <span className="text-white/40">{v.variantWeight}g</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Import settings */}
              <div className="p-6 space-y-4">
                <p className="text-white/50 text-xs tracking-widest uppercase font-semibold">Import Settings</p>

                {/* Shipping */}
                <div className="border border-white/10 overflow-hidden">
                  <button onClick={() => setShowShipping(!showShipping)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                    <span className="flex items-center gap-2">
                      <Truck size={14} />
                      Shipping Options
                      {form.cjLogisticName && <span className="text-brand-gold text-[10px]">· {form.cjLogisticName}</span>}
                    </span>
                    {showShipping ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showShipping && (
                    <div className="px-4 pb-4 space-y-2">
                      <div className="flex gap-2">
                        <select value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 text-white text-xs px-3 py-2 focus:outline-none">
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code} className="bg-[#0f0f0f]">{c.name}</option>
                          ))}
                        </select>
                        <button onClick={() => preview && fetchShipping(preview, shippingCountry)} disabled={shippingLoading}
                          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs px-3 py-2 transition-colors disabled:opacity-50">
                          {shippingLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          {shippingLoading ? 'Loading...' : 'Fetch'}
                        </button>
                      </div>
                      {shippingLoaded && shippingOptions.length === 0 && (
                        <p className="text-white/30 text-xs">No shipping options for this country.</p>
                      )}
                      {shippingOptions.map((opt) => (
                        <button key={opt.logisticName}
                          onClick={() => {
                            const toggling = form.cjLogisticName === opt.logisticName
                            // Selecting a shipping option doesn't change sell prices — shipping is per-country on the store
                            const margin = parseFloat(form.marginPct || '60')
                            const newVP: Record<string, string> = { ...form.variantPrices }
                            for (const v of preview?.variants ?? []) {
                              const autoSell = String(sellPriceBase(v.variantPrice, margin))
                              if (!form.variantPrices[v.vid] || form.variantPrices[v.vid] === autoSell) {
                                newVP[v.vid] = autoSell
                              }
                            }
                            const prices = form.selectedVariants.map((vid) => Number(newVP[vid] || 0)).filter((n) => n > 0)
                            const minP = prices.length > 0 ? String(Math.min(...prices)) : form.price
                            setForm((p) => ({ ...p, cjLogisticName: toggling ? '' : opt.logisticName, variantPrices: newVP, price: minP }))
                          }}
                          className={`w-full text-left px-3 py-2.5 border text-xs transition-colors ${
                            form.cjLogisticName === opt.logisticName
                              ? 'border-brand-gold bg-brand-gold/10 text-white'
                              : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                          }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{opt.logisticNameEn || opt.logisticName}</span>
                            <span className="text-brand-gold font-bold">{cadUSD(opt.logisticPrice ?? 0)}</span>
                          </div>
                          <p className="text-white/40 mt-0.5">
                            {opt.agingMin > 0 ? `${opt.agingMin}–${opt.agingMax} days` : 'Est. 7–20 days'}
                            {opt.shipmentType ? ` · ${opt.shipmentType}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cost breakdown */}
                {(() => {
                  const minSellCAD = selectedVariantObjs.length > 0
                    ? Math.min(...selectedVariantObjs.map(v => Number(form.variantPrices[v.vid] || 0)).filter(n => n > 0))
                    : 0
                  const avgSellCAD = selectedVariantObjs.length > 0
                    ? selectedVariantObjs.reduce((s, v) => s + Number(form.variantPrices[v.vid] || 0), 0) / selectedVariantObjs.length
                    : 0
                  // Profit = customer pays − total paid to CJ
                  // = (sellCAD + shippingCAD) − (productCostCAD + shippingCAD)
                  // = sellCAD − productCostCAD   (shipping cancels out)
                  const shippingCAD = shippingUSD * usdToCAD
                  const avgProfitCAD = avgMarginCAD  // shipping paid = shipping charged, they cancel
                  const websiteCAD = minSellCAD > 0 && shippingUSD > 0
                    ? minSellCAD + shippingCAD
                    : null
                  const avgMarginPct = websiteCAD && avgProfitCAD != null && websiteCAD > 0
                    ? Math.round((avgProfitCAD / websiteCAD) * 100)
                    : null
                  return (
                    <div className="bg-white/3 border border-white/8 px-4 py-3 text-xs space-y-1.5">
                      {/* Your cost */}
                      <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Your cost (from CJ)</p>
                      <div className="flex justify-between text-white/50">
                        <span>Product cost</span>
                        <span>{cadUSD(minCjCost)}{maxCjCost !== minCjCost ? `–${cadUSD(maxCjCost)}` : ''}</span>
                      </div>
                      <div className="flex justify-between text-white/50">
                        <span>CJ shipping</span>
                        <span className={shippingUSD > 0 ? 'text-white/70' : 'text-white/20'}>{shippingUSD > 0 ? cadUSD(shippingUSD) : '— fetch shipping first'}</span>
                      </div>
                      {shippingUSD > 0 && (
                        <div className="flex justify-between text-white/60 border-t border-white/8 pt-1.5">
                          <span>Total paid to CJ (min)</span>
                          <span>{cadUSD(minCjCost + shippingUSD)}</span>
                        </div>
                      )}

                      {/* Your profit */}
                      {avgProfitCAD != null && shippingUSD > 0 && (
                        <>
                          <p className="text-[9px] text-white/20 uppercase tracking-widest mt-3 mb-1">Your profit per sale</p>
                          <div className={`flex justify-between font-bold text-sm ${avgProfitCAD > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            <span>Avg profit</span>
                            <span>
                              {cadFmt(avgProfitCAD)}
                              {avgMarginPct != null && <span className="ml-1 text-[10px] opacity-70">({avgMarginPct}%)</span>}
                            </span>
                          </div>
                        </>
                      )}

                      {/* What customer sees */}
                      <div className="border-t border-white/10 pt-2 mt-2">
                        <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1.5">
                          Customer pays · {shippingCountry}
                          {!shippingUSD && <span className="text-white/30 ml-1">(fetch shipping to see)</span>}
                        </p>
                        <div className="flex justify-between text-white/50">
                          <span>Base sell price</span>
                          <span>{minSellCAD > 0 ? cadFmt(minSellCAD) : '—'}</span>
                        </div>
                        <div className="flex justify-between text-white/50">
                          <span>+ Shipping ({shippingCountry})</span>
                          <span className={shippingUSD > 0 ? '' : 'text-white/20'}>
                            {shippingUSD > 0 ? cadUSD(shippingUSD, 0) : '—'}
                          </span>
                        </div>
                        <div className={`flex justify-between font-bold mt-1 pt-1 border-t border-white/10 ${websiteCAD ? 'text-brand-gold' : 'text-white/20'}`}>
                          <span>= Price on website</span>
                          <span>
                            {websiteCAD
                              ? cadFmt(websiteCAD)
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Form */}
                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">PRODUCT NAME *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50" />
                </div>

                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">DESCRIPTION (optional)</label>
                  <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={2} placeholder="Leave empty to use CJ description"
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50 resize-none" />
                </div>

                <div>
                  <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">VIDÉO PRODUIT (TikTok / YouTube / Upload)</label>
                  <input value={form.videoUrl} onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                    placeholder="https://www.tiktok.com/@user/video/123..."
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50 placeholder-white/20 mb-2" />
                  <label className="inline-flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 text-xs px-3 py-2 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Uploader une vidéo
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        // Step 1: get signed upload params from server
                        const sigRes = await fetch('/api/cloudinary-signature', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ folder: 'marcaclub/videos', resource_type: 'video' }),
                          credentials: 'include',
                        })
                        const sig = await sigRes.json()
                        if (!sigRes.ok) { alert(sig.error || 'Signature failed'); return }

                        // Step 2: upload directly to Cloudinary (bypasses Vercel 4.5MB limit)
                        const fd = new FormData()
                        fd.append('file', file)
                        fd.append('api_key', sig.api_key)
                        fd.append('timestamp', String(sig.timestamp))
                        fd.append('signature', sig.signature)
                        fd.append('folder', sig.folder)
                        fd.append('resource_type', sig.resource_type)

                        const uploadRes = await fetch(
                          `https://api.cloudinary.com/v1_1/${sig.cloud_name}/video/upload`,
                          { method: 'POST', body: fd }
                        )
                        const data = await uploadRes.json()
                        if (data.secure_url) setForm((p) => ({ ...p, videoUrl: data.secure_url }))
                        else alert(data.error?.message || 'Upload failed')
                      } catch (err) {
                        alert('Upload error: ' + String(err))
                      }
                    }} />
                  </label>
                  {form.videoUrl && <p className="text-xs text-brand-gold mt-1 truncate">{form.videoUrl}</p>}
                </div>

                {/* Margin selector */}
                <div className="bg-white/3 border border-white/8 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-white/40 text-[10px] tracking-widest">TARGET MARGIN</label>
                    <span className="text-brand-gold font-bold text-sm">{form.marginPct}%</span>
                  </div>
                  <input
                    type="range" min="20" max="85" step="5"
                    value={form.marginPct}
                    onChange={(e) => {
                      const marginPct = e.target.value
                      const margin = parseFloat(marginPct)
                      if (preview) {
                        const newVP: Record<string, string> = {}
                        for (const v of preview.variants ?? []) {
                          newVP[v.vid] = String(sellPriceBase(v.variantPrice, margin))
                        }
                        const selectedPrices = form.selectedVariants.map((vid) => Number(newVP[vid] || 0)).filter((n) => n > 0)
                        const minP = selectedPrices.length > 0 ? String(Math.min(...selectedPrices)) : ''
                        setForm((p) => ({ ...p, marginPct, variantPrices: newVP, baseVariantPrices: { ...newVP }, price: minP }))
                      } else {
                        setForm((p) => ({ ...p, marginPct }))
                      }
                    }}
                    className="w-full accent-brand-gold"
                  />
                  <div className="flex justify-between text-[9px] text-white/20">
                    <span>20%</span><span>40%</span><span>60%</span><span>85%</span>
                  </div>
                  <p className="text-white/30 text-[10px]">
                    Shipping is added automatically per country — customers always pay the right amount
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-widest mb-1.5">CATEGORY *</label>
                    <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-gold/50">
                      <option value="soins-visage" className="bg-[#0f0f0f]">Soins Visage</option>
                      <option value="soins-corps" className="bg-[#0f0f0f]">Soins Corps</option>
                      <option value="soins-cheveux" className="bg-[#0f0f0f]">Soins Cheveux</option>
                      <option value="maquillage" className="bg-[#0f0f0f]">Maquillage</option>
                      <option value="autres" className="bg-[#0f0f0f]">Autres</option>
                    </select>
                  </div>
                </div>

                {/* Variant pricing table */}
                {(preview.variants?.length ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white/40 text-[10px] tracking-widest">
                        VARIANTS ({form.selectedVariants.length}/{preview.variants!.length} · {totalStock} units)
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          const allVids = (preview.variants ?? []).map((v) => v.vid)
                          const prices = allVids.map((vid) => Number(form.variantPrices[vid] || 0)).filter((n) => n > 0)
                          const minP = prices.length > 0 ? String(Math.min(...prices)) : form.price
                          setForm((p) => ({ ...p, selectedVariants: allVids, price: minP }))
                        }} className="text-[10px] text-white/30 hover:text-white transition-colors">All</button>
                        <button onClick={() => setForm((p) => ({ ...p, selectedVariants: [], price: '' }))}
                          className="text-[10px] text-white/30 hover:text-white transition-colors">None</button>
                        <button onClick={() => {
                          const inStockVids = (preview.variants ?? []).filter((v) => v.variantStock > 0).map((v) => v.vid)
                          const prices = inStockVids.map((vid) => Number(form.variantPrices[vid] || 0)).filter((n) => n > 0)
                          const minP = prices.length > 0 ? String(Math.min(...prices)) : form.price
                          setForm((p) => ({ ...p, selectedVariants: inStockVids, price: minP }))
                        }} className="text-[10px] text-white/30 hover:text-white transition-colors">In stock</button>
                      </div>
                    </div>
                    <div className="border border-white/10 overflow-hidden">
                      <div className="grid grid-cols-[20px_1fr_56px_80px_52px_44px] text-[9px] text-white/30 px-2 py-1.5 border-b border-white/10 bg-white/3 gap-1.5">
                        <span></span><span>Name</span><span>Cost CA$</span><span>Sell CA$ (base)</span><span>Profit</span><span>%</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {(preview.variants ?? []).map((v) => {
                          const selected = form.selectedVariants.includes(v.vid)
                          const autoCAD = String(sellPriceBase(v.variantPrice, parseFloat(form.marginPct || '60')))
                          const sellCAD = Number((form.variantPrices[v.vid] ?? autoCAD) || 0)
                          const costCAD = v.variantPrice * usdToCAD
                          const marginCAD = sellCAD - costCAD
                          const marginPct = sellCAD > 0 ? Math.round((marginCAD / sellCAD) * 100) : 0
                          const isModified = (form.variantPrices[v.vid] ?? autoCAD) !== autoCAD
                          const pctColor = marginPct < 30 ? 'text-red-400' : marginPct <= 50 ? 'text-yellow-400' : 'text-green-400'
                          return (
                            <div key={v.vid} className={`grid grid-cols-[20px_1fr_56px_80px_52px_44px] items-center px-2 py-1.5 border-b border-white/5 gap-1.5 ${selected ? '' : 'opacity-40'}`}>
                              <input type="checkbox" checked={selected} onChange={() => {
                                const newSel = selected
                                  ? form.selectedVariants.filter((id) => id !== v.vid)
                                  : [...form.selectedVariants, v.vid]
                                const prices = newSel.map((vid) => Number(form.variantPrices[vid] || 0)).filter((n) => n > 0)
                                const minP = prices.length > 0 ? String(Math.min(...prices)) : ''
                                setForm((p) => ({ ...p, selectedVariants: newSel, price: minP }))
                              }} className="accent-brand-gold w-3.5 h-3.5" />
                              <span className="text-white text-[10px] truncate">{v.variantNameEn || 'One Size'}</span>
                              <span className="text-brand-gold text-[10px]">{cadUSD(v.variantPrice, 0)}</span>
                              <input
                                type="number"
                                min="0"
                                value={sellCAD || ''}
                                onChange={(e) => {
                                  // User types in CAD directly
                                  const cadVal = String(Math.round(Number(e.target.value)))
                                  const newVP = { ...form.variantPrices, [v.vid]: cadVal }
                                  const selectedPrices = form.selectedVariants.map((vid) => Number(newVP[vid] || 0)).filter((n) => n > 0)
                                  const minP = selectedPrices.length > 0 ? String(Math.min(...selectedPrices)) : form.price
                                  setForm((p) => ({ ...p, variantPrices: newVP, price: minP }))
                                }}
                                className={`w-full bg-white/5 border text-[10px] px-1.5 py-1 focus:outline-none focus:border-brand-gold/50 ${isModified ? 'border-brand-gold/60 text-brand-gold' : 'border-white/10 text-white'}`}
                              />
                              <span className={`text-[10px] ${marginCAD >= 0 ? 'text-white/60' : 'text-red-400'}`}>{cadFmt(marginCAD)}</span>
                              <span className={`text-[10px] font-bold ${pctColor}`}>{marginPct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Import button */}
                <button onClick={handleImport} disabled={importing}
                  className="w-full bg-brand-gold text-brand-black py-3.5 text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50 mt-2">
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {importing ? 'Publishing...' : 'Publish to Store'}
                </button>

                <p className="text-white/20 text-[10px] text-center">
                  Product goes live immediately · edit images & details from the Products page
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

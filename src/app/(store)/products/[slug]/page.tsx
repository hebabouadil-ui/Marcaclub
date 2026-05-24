import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import ProductDetailClient from '@/components/store/ProductDetailClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  try {
    await connectDB()
    const product = await Product.findOne({ slug: params.slug, active: true }).lean()
    if (!product) return { title: 'Produit — Marcaclub' }
    const p = product as { name: string; description: string }
    return {
      title: `${p.name} — Marcaclub`,
      description: p.description,
    }
  } catch {
    return { title: 'Produit — Marcaclub' }
  }
}

function normalizeSizes(sizes: unknown[]): { size: string; stock: number; cjVid?: string; variantPrice?: number }[] {
  return sizes.map((s) =>
    typeof s === 'string' ? { size: s, stock: 0 } : (s as { size: string; stock: number; cjVid?: string; variantPrice?: number })
  )
}

export default async function ProductPage({ params }: Props) {
  await connectDB()
  const raw = await Product.findOne({ slug: params.slug, active: true }).lean()
  if (!raw) notFound()
  const product = JSON.parse(JSON.stringify(raw))
  product.images = Array.isArray(product.images) ? product.images.filter(Boolean) : []
  product.sizes = Array.isArray(product.sizes) ? normalizeSizes(product.sizes) : []

  // Detect customer country from Vercel headers
  const hdrs = headers()
  const detectedCountry = hdrs.get('x-vercel-ip-country') || undefined

  return <ProductDetailClient product={product} detectedCountry={detectedCountry} />
}

import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import ProductDetailClient from '@/components/store/ProductDetailClient'

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

export default async function ProductPage({ params }: Props) {
  await connectDB()
  const product = await Product.findOne({ slug: params.slug, active: true }).lean()
  if (!product) notFound()
  return <ProductDetailClient product={JSON.parse(JSON.stringify(product))} />
}

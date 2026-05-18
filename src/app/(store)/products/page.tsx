export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import ProductsClient from '@/components/store/ProductsClient'

interface Props {
  searchParams: { category?: string; q?: string; featured?: string }
}

async function getProducts(filters: Props['searchParams']) {
  try {
    await connectDB()
    const query: Record<string, unknown> = { active: true }
    if (filters.category) query.category = filters.category
    if (filters.featured) query.featured = true
    if (filters.q) query.name = { $regex: filters.q, $options: 'i' }
    return await Product.find(query).sort({ createdAt: -1 }).lean()
  } catch {
    return []
  }
}

export default async function ProductsPage({ searchParams }: Props) {
  const products = await getProducts(searchParams)
  return <ProductsClient products={JSON.parse(JSON.stringify(products))} filters={searchParams} />
}

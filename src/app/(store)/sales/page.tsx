export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import ProductsClient from '@/components/store/ProductsClient'
import SalesHeader from '@/components/store/SalesHeader'

async function getSaleProducts() {
  try {
    await connectDB()
    return await Product.find({ active: true, onSale: true }).sort({ createdAt: -1 }).lean()
  } catch {
    return []
  }
}

export default async function SalesPage() {
  const products = await getSaleProducts()
  return (
    <div>
      <SalesHeader />
      <ProductsClient products={JSON.parse(JSON.stringify(products))} filters={{}} hideHeader />
    </div>
  )
}

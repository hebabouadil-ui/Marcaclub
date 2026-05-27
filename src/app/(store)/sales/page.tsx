export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import ProductsClient from '@/components/store/ProductsClient'

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
      <div className="text-center py-12 px-4">
        <p className="text-brand-gray text-xs tracking-widest uppercase mb-2">Offres limitées</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-brand-black">Soldes</h1>
      </div>
      <ProductsClient products={JSON.parse(JSON.stringify(products))} filters={{}} />
    </div>
  )
}

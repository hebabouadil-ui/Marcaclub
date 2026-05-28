import { MetadataRoute } from 'next'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://marca-club.com'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/nouveautes`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/collections`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  try {
    await connectDB()
    const products = await Product.find({ active: true }, 'slug updatedAt').lean()
    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${base}/products/${(p as { slug?: string }).slug ?? (p as { _id: unknown })._id}`,
      lastModified: (p as { updatedAt?: Date }).updatedAt ?? new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))
    return [...staticRoutes, ...productRoutes]
  } catch {
    return staticRoutes
  }
}

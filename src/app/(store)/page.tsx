import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import Settings from '@/lib/models/Settings'
import HomeHero from '@/components/store/HomeHero'
import FeaturedProducts from '@/components/store/FeaturedProducts'
import HomeLiveSection from '@/components/store/HomeLiveSection'
import HomeCategories from '@/components/store/HomeCategories'

async function getData() {
  try {
    await connectDB()
    const [products, settings] = await Promise.all([
      Product.find({ active: true, featured: true }).sort({ createdAt: -1 }).limit(8).lean(),
      Settings.findOne().lean(),
    ])
    return { products, settings }
  } catch {
    return { products: [], settings: null }
  }
}

export default async function HomePage() {
  const { products, settings } = await getData()

  const heroTitle = (settings as { heroTitle?: string } | null)?.heroTitle ?? 'La Mode Exclusive'
  const heroSubtitle =
    (settings as { heroSubtitle?: string } | null)?.heroSubtitle ??
    "Collections importées directement de Primark Espagne"
  const liveStatus = (settings as { liveStatus?: boolean } | null)?.liveStatus ?? false

  return (
    <>
      <HomeHero title={heroTitle} subtitle={heroSubtitle} />
      <HomeCategories />
      <FeaturedProducts products={JSON.parse(JSON.stringify(products))} />
      <HomeLiveSection
        liveStatus={liveStatus}
        instagramUrl={(settings as { instagramUrl?: string } | null)?.instagramUrl ?? 'https://instagram.com/marcaclub'}
        tiktokUrl={(settings as { tiktokUrl?: string } | null)?.tiktokUrl ?? 'https://tiktok.com/@marcaclub'}
      />
    </>
  )
}

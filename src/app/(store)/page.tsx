export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import Settings from '@/lib/models/Settings'
import HomeHero from '@/components/store/HomeHero'
import FeaturedProducts from '@/components/store/FeaturedProducts'
import HomeLiveSection from '@/components/store/HomeLiveSection'
import HomeCategories from '@/components/store/HomeCategories'

const AUTO_HERO = ['Upgrade Your Ride', 'Upgrade your ride']
const AUTO_SUB = ['Accessoires auto', 'accessoires auto', 'car accessories', 'Car accessories']

async function getData() {
  try {
    await connectDB()
    const [products, settings] = await Promise.all([
      Product.find({ active: true, featured: true }).sort({ createdAt: -1 }).limit(8).lean(),
      Settings.findOne(),
    ])
    // Migrate stale auto-era hero text in DB
    if (settings) {
      let dirty = false
      if (!settings.heroTitle || AUTO_HERO.some(s => settings.heroTitle.includes(s))) {
        settings.heroTitle = 'Votre Beauté, Notre Priorité'; dirty = true
      }
      if (!settings.heroSubtitle || AUTO_SUB.some(s => settings.heroSubtitle.includes(s))) {
        settings.heroSubtitle = 'Soins & beauté premium sélectionnés — livrés partout dans le monde'; dirty = true
      }
      if (dirty) settings.save().catch(() => {})
    }
    return { products, settings: settings ? JSON.parse(JSON.stringify(settings)) : null }
  } catch {
    return { products: [], settings: null }
  }
}

export default async function HomePage() {
  const { products, settings } = await getData()

  const s = settings as { heroTitle?: string; heroTitleEn?: string; heroSubtitle?: string; heroSubtitleEn?: string } | null
  const heroTitle = s?.heroTitle ?? 'Votre Beauté, Notre Priorité'
  const heroTitleEn = s?.heroTitleEn ?? 'Your Beauty, Our Priority'
  const heroSubtitle = s?.heroSubtitle ?? 'Soins & beauté premium sélectionnés — livrés partout dans le monde'
  const heroSubtitleEn = s?.heroSubtitleEn ?? 'Premium skincare & beauty — curated and delivered worldwide'
  const liveStatus = (settings as { liveStatus?: boolean } | null)?.liveStatus ?? false

  return (
    <>
      <HomeHero title={heroTitle} subtitle={heroSubtitle} titleEn={heroTitleEn} subtitleEn={heroSubtitleEn} />
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

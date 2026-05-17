import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import AnnouncementBar from '@/components/store/AnnouncementBar'
import LiveBanner from '@/components/store/LiveBanner'
import { connectDB } from '@/lib/db'
import Settings from '@/lib/models/Settings'

async function getSettings() {
  try {
    await connectDB()
    const settings = await Settings.findOne().lean()
    return settings || {
      liveStatus: false,
      announcementActive: true,
      announcementBar: 'Livraison 24-48h • Paiement à la livraison • Nouveautés chaque semaine',
      instagramUrl: 'https://instagram.com/marcaclub',
      tiktokUrl: 'https://tiktok.com/@marcaclub',
      whatsappNumber: '+213000000000',
    }
  } catch {
    return {
      liveStatus: false,
      announcementActive: true,
      announcementBar: 'Livraison 24-48h • Paiement à la livraison • Nouveautés chaque semaine',
      instagramUrl: 'https://instagram.com/marcaclub',
      tiktokUrl: 'https://tiktok.com/@marcaclub',
      whatsappNumber: '+213000000000',
    }
  }
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar
        text={(settings as { announcementBar: string }).announcementBar}
        active={(settings as { announcementActive: boolean }).announcementActive}
      />
      <LiveBanner
        liveStatus={(settings as { liveStatus: boolean }).liveStatus}
        instagramUrl={(settings as { instagramUrl: string }).instagramUrl}
        tiktokUrl={(settings as { tiktokUrl: string }).tiktokUrl}
      />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton phone={(settings as { whatsappNumber: string }).whatsappNumber} />
    </div>
  )
}

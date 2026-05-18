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
  const s = settings as {
    liveStatus: boolean
    announcementActive: boolean
    announcementBar: string
    instagramUrl: string
    tiktokUrl: string
    whatsappNumber: string
    contactEmail: string
    contactPhone: string
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed header: announcement + live + navbar stacked together */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        <AnnouncementBar text={s.announcementBar} active={s.announcementActive} />
        <LiveBanner
          liveStatus={s.liveStatus}
          instagramUrl={s.instagramUrl}
          tiktokUrl={s.tiktokUrl}
        />
        <Navbar />
      </div>

      {/* Spacer so content isn't hidden under fixed header */}
      <div
        className="bg-brand-black"
        style={{
          height: `${
            (s.announcementActive ? 32 : 0) +
            (s.liveStatus ? 56 : 0) +
            80
          }px`,
        }}
      />

      <main className="flex-1 -mt-px">{children}</main>
      <Footer
        instagramUrl={s.instagramUrl}
        tiktokUrl={s.tiktokUrl}
        whatsappNumber={s.whatsappNumber}
        contactEmail={s.contactEmail}
        contactPhone={s.contactPhone}
      />
      <WhatsAppButton phone={s.whatsappNumber} />
    </div>
  )
}

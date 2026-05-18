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
    facebookUrl: string
    whatsappNumber: string
    contactEmail: string
    contactPhone: string
  }

  // navbar is always h-16 (64px) on mobile, h-20 (80px) on md+
  // announcement bar is 36px when active
  // live banner is 48px when active
  const spacerMobile =
    (s.announcementActive ? 36 : 0) +
    (s.liveStatus ? 48 : 0) +
    64

  const spacerDesktop =
    (s.announcementActive ? 36 : 0) +
    (s.liveStatus ? 48 : 0) +
    80

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        <AnnouncementBar text={s.announcementBar} active={s.announcementActive} />
        <LiveBanner
          liveStatus={s.liveStatus}
          instagramUrl={s.instagramUrl}
          tiktokUrl={s.tiktokUrl}
        />
        <Navbar />
      </div>

      {/* Spacer that matches the fixed header height exactly */}
      <div
        style={{
          height: `${spacerMobile}px`,
        }}
        className="md:hidden bg-brand-black"
      />
      <div
        style={{
          height: `${spacerDesktop}px`,
        }}
        className="hidden md:block bg-brand-black"
      />

      <main className="flex-1">{children}</main>
      <Footer
        instagramUrl={s.instagramUrl ?? 'https://instagram.com/marcaclub'}
        tiktokUrl={s.tiktokUrl ?? 'https://tiktok.com/@marcaclub'}
        facebookUrl={s.facebookUrl ?? ''}
        whatsappNumber={s.whatsappNumber ?? ''}
        contactEmail={s.contactEmail ?? ''}
        contactPhone={s.contactPhone ?? ''}
      />
      <WhatsAppButton phone={s.whatsappNumber ?? ''} />
    </div>
  )
}

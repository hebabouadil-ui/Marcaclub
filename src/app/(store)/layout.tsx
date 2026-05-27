import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import VisitorTracker from '@/components/store/VisitorTracker'
import { CurrencyProvider } from '@/lib/context/CurrencyContext'
import { CustomerProvider } from '@/lib/context/CustomerContext'
import { LanguageProvider } from '@/lib/i18n'
import { connectDB } from '@/lib/db'
import Settings from '@/lib/models/Settings'
import { cookies } from 'next/headers'

async function getSettings() {
  try {
    await connectDB()
    const settings = await Settings.findOne().lean()
    return settings || {
      instagramUrl: 'https://instagram.com/marcaclub',
      tiktokUrl: 'https://tiktok.com/@marcaclub',
      whatsappNumber: '+213000000000',
    }
  } catch {
    return {
      instagramUrl: 'https://instagram.com/marcaclub',
      tiktokUrl: 'https://tiktok.com/@marcaclub',
      whatsappNumber: '+213000000000',
    }
  }
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  // Read country set by middleware from Vercel geo headers — available server-side
  const initialCountry = cookies().get('mc-country-code')?.value ?? 'CA'
  const s = settings as {
    instagramUrl: string
    tiktokUrl: string
    facebookUrl: string
    whatsappNumber: string
    contactEmail: string
    contactPhone: string
  }

  return (
    <LanguageProvider>
    <CurrencyProvider initialCountry={initialCountry}>
    <CustomerProvider>
    <div className="min-h-screen flex flex-col">
      {/* Fixed navbar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Spacer matching navbar height */}
      <div className="h-16 md:h-20 bg-brand-black" />

      <VisitorTracker />
      <main className="flex-1 overflow-x-hidden">{children}</main>
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
    </CustomerProvider>
    </CurrencyProvider>
    </LanguageProvider>
  )
}

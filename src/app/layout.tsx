import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Marcaclub — Mode Exclusive d\'Espagne',
  description:
    'Marcaclub — Vêtements et accessoires exclusifs importés de Primark Espagne. Drops limités, qualité premium. Livraison 24-48h, paiement à la livraison.',
  keywords: 'marcaclub, mode femme, vêtements, Primark, Espagne, Algérie, livraison, marca club',
  metadataBase: new URL('https://marca-club.com'),
  verification: { google: 'i1_TysAAZ-m67oKRQv6n-O7XES5p5Nla6xJaIXbnius' },
  alternates: { canonical: 'https://marca-club.com' },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Marcaclub — Mode Exclusive d\'Espagne',
    description: 'Vêtements et accessoires exclusifs importés de Primark Espagne. Livraison 24-48h.',
    type: 'website',
    url: 'https://marca-club.com',
    siteName: 'Marcaclub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marcaclub — Mode Exclusive d\'Espagne',
    description: 'Vêtements et accessoires exclusifs importés de Primark Espagne.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#0A0A0A',
              color: '#FAFAFA',
              borderRadius: '2px',
              fontSize: '14px',
              fontFamily: 'var(--font-inter)',
            },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#0A0A0A' } },
          }}
        />
      </body>
    </html>
  )
}

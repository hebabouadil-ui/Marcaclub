import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0A0A',
}

export const metadata: Metadata = {
  title: 'Marcaclub — Global Store',
  description:
    'Marcaclub — Produits premium livrés dans le monde entier. Soins, accessoires et plus. Livraison internationale rapide. Paiement sécurisé par carte.',
  keywords: 'marcaclub, boutique en ligne, livraison internationale, produits premium, soins, accessoires',
  metadataBase: new URL('https://marca-club.com'),
  verification: { google: 'i1_TysAAZ-m67oKRQv6n-O7XES5p5Nla6xJaIXbnius' },
  alternates: { canonical: 'https://marca-club.com' },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Marcaclub — Global Store',
    description: 'Produits premium livrés dans le monde entier. Livraison rapide. Paiement sécurisé.',
    type: 'website',
    url: 'https://marca-club.com',
    siteName: 'Marcaclub',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Marcaclub — Global Store' }],
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marcaclub — Global Store',
    description: 'Produits premium livrés dans le monde entier. Livraison rapide.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
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

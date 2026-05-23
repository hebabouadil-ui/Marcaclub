import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Marcaclub — Global Store',
  description:
    'Marcaclub — Premium products worldwide. Clothes, accessories, vitamins and more. Fast international shipping. Pay securely with card.',
  keywords: 'marcaclub, global store, international shipping, premium products, clothes, accessories, vitamins',
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
    description: 'Premium products worldwide. Fast international shipping. Pay securely with card.',
    type: 'website',
    url: 'https://marca-club.com',
    siteName: 'Marcaclub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marcaclub — Global Store',
    description: 'Premium products worldwide. Fast international shipping.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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

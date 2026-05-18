import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Marcaclub — Mode Exclusive d\'Espagne',
  description:
    'Marcaclub — Vêtements et accessoires exclusifs importés de Primark Espagne. Drops limités, qualité premium.',
  keywords: 'marcaclub, mode, vêtements, Primark, Espagne, maroc, livraison',
  openGraph: {
    title: 'Marcaclub',
    description: 'Mode exclusive importée d\'Espagne',
    type: 'website',
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

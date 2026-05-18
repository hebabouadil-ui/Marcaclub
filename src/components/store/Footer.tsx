import Link from 'next/link'
import InstagramIcon from '@/components/ui/InstagramIcon'

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.53V6.75a4.85 4.85 0 0 1-1.02-.06z" />
    </svg>
  )
}

interface FooterProps {
  instagramUrl?: string
  tiktokUrl?: string
  contactEmail?: string
  contactPhone?: string
  whatsappNumber?: string
}

export default function Footer({ instagramUrl, tiktokUrl, contactEmail, contactPhone, whatsappNumber }: FooterProps) {
  const ig = instagramUrl || 'https://instagram.com/marcaclub'
  const tt = tiktokUrl || 'https://tiktok.com/@marcaclub'

  return (
    <footer className="bg-brand-black text-brand-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <h3 className="text-brand-gold font-display font-bold text-xl tracking-widest uppercase">MARCACLUB</h3>
              <p className="text-[9px] tracking-[0.3em] uppercase text-brand-white/30 mt-0.5">Mode Exclusive</p>
            </div>
            <p className="text-sm leading-relaxed text-brand-white/50 max-w-xs">
              Pyjamas & lingerie femme importés directement de Primark Espagne. Collections exclusives, qualité premium.
            </p>
            <div className="flex gap-3 mt-5">
              <a href={ig} target="_blank" rel="noopener noreferrer" className="p-2 border border-white/10 hover:border-brand-gold hover:text-brand-gold transition-colors">
                <InstagramIcon size={16} />
              </a>
              <a href={tt} target="_blank" rel="noopener noreferrer" className="p-2 border border-white/10 hover:border-brand-gold hover:text-brand-gold transition-colors">
                <TikTokIcon />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-brand-white/40 mb-4">Boutique</h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: '/products', label: 'Toute la collection' },
                { href: '/products?featured=true', label: 'Nouveautés' },
                { href: '/products?category=pyjamas', label: 'Pyjamas' },
                { href: '/products?category=robes-de-nuit', label: 'Robes de nuit' },
                { href: '/products?category=lingerie', label: 'Lingerie' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-brand-gold transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-brand-white/40 mb-4">Informations</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/#live" className="hover:text-brand-gold transition-colors">Live Sessions</Link></li>
              <li><Link href="/cart" className="hover:text-brand-gold transition-colors">Mon Panier</Link></li>
              <li className="text-brand-white/40 text-xs leading-relaxed pt-1">
                Paiement à la livraison<br />Livraison 24-48h
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-brand-white/40 mb-4">Nous contacter</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={ig} target="_blank" rel="noopener noreferrer" className="hover:text-brand-gold transition-colors">
                  Instagram @marcaclub
                </a>
              </li>
              {whatsappNumber && (
                <li>
                  <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-brand-gold transition-colors">
                    WhatsApp {whatsappNumber}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li>
                  <a href={`tel:${contactPhone}`} className="hover:text-brand-gold transition-colors">
                    📞 {contactPhone}
                  </a>
                </li>
              )}
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className="hover:text-brand-gold transition-colors">
                    ✉️ {contactEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-white/30">
          <p>© {new Date().getFullYear()} Marcaclub. Tous droits réservés.</p>
          <p>Pyjamas & lingerie femme importés d&apos;Espagne — Livraison dans tout le Maroc</p>
        </div>
      </div>
    </footer>
  )
}

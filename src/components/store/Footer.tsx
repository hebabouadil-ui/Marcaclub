'use client'
import Link from 'next/link'
import InstagramIcon from '@/components/ui/InstagramIcon'
import { useLanguage } from '@/lib/i18n'

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.53V6.75a4.85 4.85 0 0 1-1.02-.06z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

interface FooterProps {
  instagramUrl?: string
  tiktokUrl?: string
  facebookUrl?: string
  contactEmail?: string
  contactPhone?: string
  whatsappNumber?: string
}

export default function Footer({ instagramUrl, tiktokUrl, facebookUrl, contactEmail, contactPhone, whatsappNumber }: FooterProps) {
  const { tr, lang } = useLanguage()
  const ig = instagramUrl || 'https://instagram.com/marcaclub'
  const tt = tiktokUrl || 'https://tiktok.com/@marcaclub'
  const fb = facebookUrl || ''

  return (
    <footer className="bg-brand-black text-brand-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <h3 className="text-brand-gold font-display font-bold text-xl tracking-widest uppercase">MARCACLUB</h3>
              <p className="text-[9px] tracking-[0.3em] uppercase text-brand-white/30 mt-0.5">{tr.footer.tagline}</p>
            </div>
            <p className="text-sm leading-relaxed text-brand-white/50 max-w-xs">{tr.footer.description}</p>
            <div className="flex gap-3 mt-5">
              <a href={ig} target="_blank" rel="noopener noreferrer" className="p-2 border border-white/10 hover:border-brand-gold hover:text-brand-gold transition-colors" title="Instagram">
                <InstagramIcon size={16} />
              </a>
              <a href={tt} target="_blank" rel="noopener noreferrer" className="p-2 border border-white/10 hover:border-brand-gold hover:text-brand-gold transition-colors" title="TikTok">
                <TikTokIcon />
              </a>
              {fb && (
                <a href={fb} target="_blank" rel="noopener noreferrer" className="p-2 border border-white/10 hover:border-brand-gold hover:text-brand-gold transition-colors" title="Facebook">
                  <FacebookIcon />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-brand-white/40 mb-4">{tr.footer.shop}</h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: '/products', label: tr.footer.collection },
                { href: '/products?featured=true', label: tr.footer.newArrivals },
                { href: '/products?category=soins-visage', label: lang === 'fr' ? 'Soins Visage' : 'Face Care' },
                { href: '/products?category=soins-corps', label: lang === 'fr' ? 'Soins Corps' : 'Body Care' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-brand-gold transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-brand-white/40 mb-4">{tr.footer.info}</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/#community" className="hover:text-brand-gold transition-colors">{tr.footer.liveSessions}</Link></li>
              <li><Link href="/cart" className="hover:text-brand-gold transition-colors">{tr.footer.myCart}</Link></li>
              <li><Link href="/faq" className="hover:text-brand-gold transition-colors">FAQ</Link></li>
              <li><Link href="/track" className="hover:text-brand-gold transition-colors">{lang === 'fr' ? 'Suivi de commande' : 'Track Order'}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-brand-white/40 mb-4">{tr.footer.contact}</h4>
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

        {/* Payment trust */}
        <div className="border-t border-white/5 py-5 flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="text-white/30 text-[10px] tracking-wider uppercase">🔒 {lang === 'fr' ? 'Paiement 100% sécurisé' : '100% Secure Payment'}</span>
          <div className="flex items-center gap-3">
            {/* Visa */}
            <svg viewBox="0 0 48 16" className="h-5 opacity-40" fill="white" aria-label="Visa">
              <text x="0" y="13" fontFamily="Arial" fontSize="14" fontWeight="bold" letterSpacing="1">VISA</text>
            </svg>
            {/* Mastercard */}
            <svg viewBox="0 0 38 24" className="h-5 opacity-40" aria-label="Mastercard">
              <circle cx="13" cy="12" r="11" fill="#EB001B" opacity="0.9"/>
              <circle cx="25" cy="12" r="11" fill="#F79E1B" opacity="0.9"/>
              <path d="M19 5.3a11 11 0 0 1 0 13.4A11 11 0 0 1 19 5.3z" fill="#FF5F00"/>
            </svg>
            {/* PayPal text */}
            <svg viewBox="0 0 60 20" className="h-5 opacity-40" fill="white" aria-label="PayPal">
              <text x="0" y="14" fontFamily="Arial" fontSize="12" fontWeight="bold">PayPal</text>
            </svg>
          </div>
        </div>

        <div className="border-t border-white/5 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-white/30">
          <p>© {new Date().getFullYear()} Marcaclub. {tr.footer.rights}</p>
          <p>{tr.footer.worldwide}</p>
        </div>
      </div>
    </footer>
  )
}

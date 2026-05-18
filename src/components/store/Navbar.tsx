'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/lib/store/cartStore'
import InstagramIcon from '@/components/ui/InstagramIcon'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const items = useCartStore((s) => s.items)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const links = [
    { href: '/products', label: 'Collection' },
    { href: '/#featured', label: 'Nouveautés' },
    { href: '/#live', label: 'Live' },
  ]

  return (
    <>
      <nav
        className={`transition-all duration-300 ${
          scrolled ? 'bg-brand-black/95 backdrop-blur-md shadow-lg' : 'bg-brand-black'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex flex-col leading-none">
              <span className="text-brand-gold font-display font-bold text-xl md:text-2xl tracking-widest uppercase">
                MARCACLUB
              </span>
              <span className="text-brand-white/40 text-[8px] tracking-[0.3em] uppercase">
                Mode Exclusive
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-brand-white/80 hover:text-brand-gold text-sm tracking-widest uppercase transition-colors duration-200"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com/marcaclub"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex text-brand-white/60 hover:text-brand-gold transition-colors"
              >
                <InstagramIcon size={18} />
              </a>

              <Link href="/cart" className="relative">
                <ShoppingBag size={20} className="text-brand-white hover:text-brand-gold transition-colors" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0, y: -4 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="absolute -top-2 -right-2 bg-brand-gold text-brand-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden text-brand-white hover:text-brand-gold transition-colors p-1"
                aria-label="Menu"
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu — rendered as full-screen overlay, outside the fixed header flow */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-brand-black flex flex-col pt-24 px-8 md:hidden"
          >
            <div className="flex flex-col gap-8">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-brand-white/80 hover:text-brand-gold text-lg tracking-widest uppercase transition-colors border-b border-white/10 pb-4"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="https://instagram.com/marcaclub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand-white/60 hover:text-brand-gold text-lg tracking-widest uppercase transition-colors"
              >
                <InstagramIcon size={18} />
                Instagram
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

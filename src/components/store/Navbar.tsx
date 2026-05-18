'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/lib/store/cartStore'
import InstagramIcon from '@/components/ui/InstagramIcon'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const count = useCartStore((s) => s.count)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '/products', label: 'Collection' },
    { href: '/#featured', label: 'Nouveautés' },
    { href: '/#live', label: 'Live' },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-brand-black/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
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
                {count() > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-brand-gold text-brand-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                  >
                    {count()}
                  </motion.span>
                )}
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden text-brand-white hover:text-brand-gold transition-colors"
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-50 bg-brand-black border-t border-white/5"
          >
            <div className="flex flex-col py-6 px-6 gap-6">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-brand-white/80 hover:text-brand-gold text-sm tracking-widest uppercase transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="https://instagram.com/marcaclub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand-white/60 hover:text-brand-gold text-sm tracking-widest uppercase transition-colors"
              >
                <InstagramIcon size={16} />
                Instagram
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

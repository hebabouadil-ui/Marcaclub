'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingBag, Menu, X, User, ChevronDown, LogOut, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/lib/store/cartStore'
import { useCurrency, CURRENCIES } from '@/lib/context/CurrencyContext'
import { useCustomer } from '@/lib/context/CustomerContext'

function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]

  return (
    <div ref={ref} className="relative hidden md:block">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-brand-white/50 hover:text-brand-gold text-[10px] tracking-widest transition-colors">
        {current.code} <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 bg-brand-black border border-white/10 z-50 w-44 max-h-64 overflow-y-auto shadow-xl">
          {CURRENCIES.map(c => (
            <button key={c.code} onClick={() => { setCurrency(c.code); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between transition-colors ${c.code === currency ? 'text-brand-gold bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <span>{c.code}</span>
              <span className="text-white/30 text-[10px]">{c.symbol} {c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const { customer, logout, loading } = useCustomer()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) return null

  if (!customer) {
    return (
      <Link href="/account/login" className="hidden md:flex items-center gap-1.5 text-brand-white/50 hover:text-brand-gold transition-colors">
        <User size={16} />
        <span className="text-[10px] tracking-widest">SIGN IN</span>
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative hidden md:block">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-brand-white/70 hover:text-brand-gold transition-colors">
        <div className="w-7 h-7 rounded-full bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center">
          <span className="text-brand-gold text-[11px] font-bold">{customer.name[0].toUpperCase()}</span>
        </div>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 bg-brand-black border border-white/10 z-50 w-48 shadow-xl">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-white text-xs font-medium truncate">{customer.name}</p>
            <p className="text-white/30 text-[10px] truncate">{customer.email}</p>
          </div>
          {[
            { href: '/account/orders', icon: Package, label: 'My Orders' },
            { href: '/account/profile', icon: User, label: 'Profile' },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors">
              <Icon size={13} /> {label}
            </Link>
          ))}
          <button onClick={async () => { setOpen(false); await logout(); router.refresh() }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-red-400/70 hover:text-red-400 hover:bg-white/5 transition-colors border-t border-white/5">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const items = useCartStore((s) => s.items)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const { customer, logout } = useCustomer()
  const { currency, setCurrency } = useCurrency()
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const links = [
    { href: '/products', label: 'Shop' },
    { href: '/#featured', label: 'New Arrivals' },
    { href: '/#live', label: 'Live' },
  ]

  return (
    <>
      <nav className={`transition-all duration-300 border-b ${scrolled ? 'bg-brand-black/95 backdrop-blur-md border-white/10' : 'bg-brand-black border-white/5'}`}>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex flex-col leading-none flex-shrink-0">
              <span className="text-brand-gold font-display font-bold text-xl tracking-widest uppercase">MARCACLUB</span>
              <span className="text-brand-white/30 text-[8px] tracking-[0.3em] uppercase">Global Store</span>
            </Link>

            {/* Center nav */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-10">
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-brand-white/60 hover:text-brand-gold text-[11px] tracking-[0.25em] uppercase transition-colors duration-200">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Right icons */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <CurrencySwitcher />
              <AccountMenu />
              <Link href="/cart" className="relative">
                <ShoppingBag size={20} className="text-brand-white hover:text-brand-gold transition-colors" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span key={cartCount} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="absolute -top-2 -right-2 bg-brand-gold text-brand-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
              <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-brand-white hover:text-brand-gold transition-colors p-1">
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-brand-black flex flex-col pt-24 px-8 md:hidden overflow-y-auto">
            <div className="flex flex-col gap-6">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                  className="text-brand-white/80 hover:text-brand-gold text-lg tracking-widest uppercase transition-colors border-b border-white/10 pb-4">
                  {l.label}
                </Link>
              ))}
              {customer ? (
                <>
                  <Link href="/account/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-white/60 text-lg tracking-widest uppercase pb-4 border-b border-white/10"><Package size={18} /> My Orders</Link>
                  <Link href="/account/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-white/60 text-lg tracking-widest uppercase pb-4 border-b border-white/10"><User size={18} /> Profile</Link>
                  <button onClick={async () => { setMenuOpen(false); await logout(); router.refresh() }} className="flex items-center gap-2 text-red-400/70 text-lg tracking-widest uppercase pb-4"><LogOut size={18} /> Sign Out</button>
                </>
              ) : (
                <Link href="/account/login" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-white/60 text-lg tracking-widest uppercase pb-4 border-b border-white/10"><User size={18} /> Sign In</Link>
              )}
              {/* Mobile currency selector */}
              <div>
                <p className="text-white/30 text-[10px] tracking-widest uppercase mb-3">Currency</p>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.slice(0, 9).map(c => (
                    <button key={c.code} onClick={() => setCurrency(c.code)}
                      className={`py-2 text-xs border transition-colors ${c.code === currency ? 'border-brand-gold text-brand-gold' : 'border-white/10 text-white/40'}`}>
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

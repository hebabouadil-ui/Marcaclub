'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { SessionProvider } from 'next-auth/react'
import {
  LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Radio, Menu, X, BarChart2, Users, Download,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/cj-import', label: 'CJ Import', icon: Download },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, badgeKey: 'orders' },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/reports', label: 'Reports', icon: BarChart2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/live', label: 'Live', icon: Radio },
]

interface Badges { orders: number }

function useBadges(): Badges {
  const [badges, setBadges] = useState<Badges>({ orders: 0 })
  const { data: session } = useSession()

  useEffect(() => {
    if (!session) return
    const fetch_ = () => {
      fetch('/api/admin/counts', { credentials: 'include' })
        .then((r) => r.json())
        .then((data: { pendingUntouched: number }) => {
          if (typeof data?.pendingUntouched !== 'number') return
          setBadges({ orders: data.pendingUntouched })
        })
        .catch(() => {})
    }
    fetch_()
    const interval = setInterval(() => { if (!document.hidden) fetch_() }, 30_000)
    return () => clearInterval(interval)
  }, [session])

  return badges
}

function NavLink({ item, active, badges, onClick }: {
  item: typeof navItems[0]
  active: boolean
  badges: Badges
  onClick?: () => void
}) {
  const Icon = item.icon
  const count = item.badgeKey ? badges[item.badgeKey as keyof Badges] : 0

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
        active
          ? 'text-brand-gold bg-white/5 border-r-2 border-brand-gold'
          : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
      {count > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center bg-amber-500 text-black">
          {count}
        </span>
      )}
    </Link>
  )
}

function AdminNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const badges = useBadges()

  if (pathname === '/admin/login') return null

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-brand-black min-h-screen fixed left-0 top-0 border-r border-white/5">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-brand-gold font-display font-bold text-lg tracking-widest uppercase">
            MARCACLUB
          </h1>
          <p className="text-white/30 text-[9px] tracking-[0.2em] mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
              badges={badges}
            />
          ))}
        </nav>
        <div className="p-6 border-t border-white/5">
          <p className="text-white/30 text-xs mb-3">{session?.user?.email}</p>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex items-center gap-2 text-white/40 hover:text-red-400 text-sm transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-brand-black border-b border-white/5 px-4 h-14 flex items-center justify-between">
        <h1 className="text-brand-gold font-display font-bold text-base tracking-widest uppercase">
          MARCACLUB
        </h1>
        <div className="flex items-center gap-3">
          {badges.orders > 0 && (
            <span className="text-[10px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-full">{badges.orders}</span>
          )}
          <button onClick={() => setOpen(!open)} className="text-white">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-brand-black pt-14">
          <nav className="py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname.startsWith(item.href)
              const count = item.badgeKey ? badges[item.badgeKey as keyof Badges] : 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-6 py-4 text-sm transition-colors ${
                    active ? 'text-brand-gold' : 'text-white/50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-black">{count}</span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="px-6 pt-4 border-t border-white/10">
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="flex items-center gap-2 text-red-400 text-sm"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#0F0F0F]">
        <AdminNav />
        <div className="md:ml-56 pt-14 md:pt-0">{children}</div>
      </div>
    </SessionProvider>
  )
}

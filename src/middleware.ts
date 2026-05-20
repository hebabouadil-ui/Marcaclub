import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const isAdminSubdomain =
    hostname === 'admin.marca-club.com' ||
    hostname.startsWith('admin.marca-club.com:')

  const { pathname } = req.nextUrl

  if (isAdminSubdomain) {
    // Rewrite /  → /admin/dashboard, /login → /admin/login, etc.
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/admin/dashboard', req.url))
    }
    // Already has /admin prefix — pass through
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
      return NextResponse.next()
    }
    // Anything else on the admin subdomain → rewrite to /admin/<path>
    return NextResponse.rewrite(new URL(`/admin${pathname}`, req.url))
  }

  // On the main domain, block direct /admin access (redirect to admin subdomain)
  if (pathname.startsWith('/admin')) {
    const target = new URL(req.url)
    target.hostname = 'admin.marca-club.com'
    return NextResponse.redirect(target)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt).*)',
  ],
}

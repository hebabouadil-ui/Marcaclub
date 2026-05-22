import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const isAdminSubdomain =
    hostname === 'admin.marca-club.com' ||
    hostname.startsWith('admin.marca-club.com:')

  const { pathname } = req.nextUrl

  if (isAdminSubdomain) {
    // Always pass API routes and Next internals through unchanged
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      return NextResponse.next()
    }
    // Root → admin dashboard
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/admin/dashboard', req.url))
    }
    // Already prefixed with /admin — pass through
    if (pathname.startsWith('/admin')) {
      return NextResponse.next()
    }
    // Any other path → rewrite under /admin
    return NextResponse.rewrite(new URL(`/admin${pathname}`, req.url))
  }

  // On the main domain, redirect /admin/* to the subdomain
  if (pathname.startsWith('/admin')) {
    const target = new URL(req.url)
    target.hostname = 'admin.marca-club.com'
    return NextResponse.redirect(target, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt).*)',
  ],
}

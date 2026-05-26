import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const isAdminSubdomain =
    hostname === 'admin.marca-club.com' ||
    hostname.startsWith('admin.marca-club.com:')

  // Stamp the visitor's country on every response so client code can read it
  // without an async API round-trip. Vercel injects x-vercel-ip-country on
  // all requests (edge network) — this is the most reliable source.
  const country = req.headers.get('x-vercel-ip-country') || 'CA'

  const { pathname } = req.nextUrl

  const withCountry = (r: NextResponse) => {
    r.cookies.set('mc-country-code', country, { path: '/', maxAge: 3600, sameSite: 'lax' })
    return r
  }

  if (isAdminSubdomain) {
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) return NextResponse.next()
    if (pathname === '/') return withCountry(NextResponse.rewrite(new URL('/admin/dashboard', req.url)))
    if (pathname.startsWith('/admin')) return NextResponse.next()
    return withCountry(NextResponse.rewrite(new URL(`/admin${pathname}`, req.url)))
  }

  // On the main domain, redirect /admin/* to the subdomain
  if (pathname.startsWith('/admin')) {
    const target = new URL(req.url)
    target.hostname = 'admin.marca-club.com'
    return NextResponse.redirect(target, 308)
  }

  const res = NextResponse.next()
  // Set country cookie on every request so it's always current
  res.cookies.set('mc-country-code', country, { path: '/', maxAge: 3600, sameSite: 'lax' })
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt).*)',
  ],
}

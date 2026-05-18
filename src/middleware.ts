export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/admin/dashboard', '/admin/products', '/admin/orders', '/admin/settings', '/admin/live'],
}

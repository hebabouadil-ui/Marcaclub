import AdminLayoutClient from '@/components/admin/AdminLayoutClient'

export const metadata = { title: 'Admin — Marcaclub' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}

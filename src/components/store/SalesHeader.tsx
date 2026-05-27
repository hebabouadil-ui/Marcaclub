'use client'
import { useLanguage } from '@/lib/i18n'

export default function SalesHeader() {
  const { tr } = useLanguage()
  return (
    <div className="text-center py-12 px-4">
      <p className="text-brand-gray text-xs tracking-widest uppercase mb-2">{tr.salesPage.subtitle}</p>
      <h1 className="text-3xl md:text-4xl font-semibold text-brand-black">{tr.salesPage.title}</h1>
    </div>
  )
}

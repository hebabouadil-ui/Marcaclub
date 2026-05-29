'use client'
import { useState, useEffect } from 'react'

const NA = new Set(['CA', 'US', 'MX'])
const EU = new Set(['FR', 'BE', 'CH', 'ES', 'IT', 'DE', 'NL', 'PT', 'GB', 'AT', 'IE', 'LU', 'SE', 'NO', 'DK', 'FI'])
const AF = new Set(['MA', 'DZ', 'TN', 'CI', 'SN', 'CM', 'ML', 'BJ', 'EG', 'LY', 'GH', 'NG'])

export function getDeliveryMessage(countryCode: string, lang: 'fr' | 'en' = 'fr'): string {
  if (NA.has(countryCode)) {
    return lang === 'en' ? 'Delivery 7–12 business days 🚀' : 'Livraison 7–12 jours ouvrables 🚀'
  }
  if (EU.has(countryCode)) {
    return lang === 'en' ? 'Express delivery to Europe ✈️' : 'Livraison express vers l\'Europe ✈️'
  }
  if (AF.has(countryCode)) {
    return lang === 'en' ? 'International shipping · Tracked 📦' : 'Livraison internationale · Suivi inclus 📦'
  }
  return lang === 'en' ? 'Worldwide shipping available 🌍' : 'Livraison mondiale disponible 🌍'
}

export function useDeliveryMessage(): { message: string; countryCode: string; ready: boolean } {
  const [countryCode, setCountryCode] = useState('')
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'fr' | 'en' | null
    if (savedLang) setLang(savedLang)

    const cached = sessionStorage.getItem('mc-country')
    if (cached) { setCountryCode(cached); setReady(true); return }

    fetch('/api/geo')
      .then(r => r.json())
      .then(d => {
        const cc: string = d.countryCode || ''
        if (cc) sessionStorage.setItem('mc-country', cc)
        setCountryCode(cc)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  return {
    message: countryCode ? getDeliveryMessage(countryCode, lang) : '',
    countryCode,
    ready,
  }
}

'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface GeoInfo { country: string; countryCode: string; city?: string; region?: string; regionCode?: string }

interface CurrencyCtx {
  currency: string
  symbol: string
  rate: number
  format: (usd: number) => string
  setCurrency: (code: string) => void
  geo: GeoInfo | null
  available: { code: string; name: string; symbol: string }[]
}

export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'NZD', name: 'NZ Dollar', symbol: 'NZ$' },
]

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', AT: 'EUR', IE: 'EUR',
  CH: 'CHF', JP: 'JPY', SG: 'SGD', AE: 'AED', SA: 'SAR', MA: 'MAD', BR: 'BRL', MX: 'MXN', IN: 'INR',
}

const DEFAULT: CurrencyCtx = {
  currency: 'USD', symbol: '$', rate: 1,
  format: (n) => `$${n.toFixed(2)}`,
  setCurrency: () => {},
  geo: null,
  available: CURRENCIES,
}

const Ctx = createContext<CurrencyCtx>(DEFAULT)

function makeFormat(symbol: string, currency: string, rate: number) {
  return (usd: number) => {
    const v = usd * rate
    if (currency === 'JPY') return `${symbol}${Math.round(v).toLocaleString()}`
    return `${symbol}${v.toFixed(2)}`
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('USD')
  const [rate, setRate] = useState(1)
  const [geo, setGeo] = useState<GeoInfo | null>(null)
  const [rates, setRates] = useState<Record<string, number>>({})

  const applyRate = useCallback((code: string, ratesMap: Record<string, number>) => {
    const r = ratesMap[code] ?? 1
    setRate(r)
    setCurrencyState(code)
    localStorage.setItem('mc-currency', code)
  }, [])

  const setCurrency = useCallback((code: string) => {
    applyRate(code, rates)
  }, [applyRate, rates])

  useEffect(() => {
    const init = async () => {
      // Fetch exchange rates
      let ratesMap: Record<string, number> = {}
      try {
        const r = await fetch('https://open.er-api.com/v6/latest/USD')
        const d = await r.json()
        ratesMap = d.rates ?? {}
        setRates(ratesMap)
      } catch {}

      // Detect location
      let detectedCode = 'USD'
      try {
        const g = await fetch('https://ipapi.co/json/')
        const gd = await g.json()
        setGeo({ country: gd.country_name, countryCode: gd.country_code, city: gd.city, region: gd.region, regionCode: gd.region_code })
        detectedCode = COUNTRY_CURRENCY[gd.country_code as string] ?? 'USD'
      } catch {}

      // Manual override wins
      const saved = localStorage.getItem('mc-currency')
      const finalCode = saved ?? detectedCode
      applyRate(finalCode, ratesMap)
    }
    init()
  }, [applyRate])

  const info = CURRENCIES.find(c => c.code === currency) ?? { symbol: '$', code: 'USD', name: 'US Dollar' }

  return (
    <Ctx.Provider value={{
      currency,
      symbol: info.symbol,
      rate,
      format: makeFormat(info.symbol, currency, rate),
      setCurrency,
      geo,
      available: CURRENCIES,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCurrency = () => useContext(Ctx)

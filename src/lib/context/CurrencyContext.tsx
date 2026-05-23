'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface GeoInfo { countryCode: string; region?: string; city?: string }

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
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF ' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR ' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD ' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'NZD', name: 'NZ Dollar', symbol: 'NZ$' },
]

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR',
  PT: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  CH: 'CHF', JP: 'JPY', SG: 'SGD', AE: 'AED', SA: 'SAR',
  MA: 'MAD', BR: 'BRL', MX: 'MXN', IN: 'INR',
}

// Fallback rates if the server endpoint fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, CAD: 1.36, EUR: 0.92, GBP: 0.79, AUD: 1.53, CHF: 0.90,
  JPY: 149.5, AED: 3.67, SAR: 3.75, MAD: 10.05, BRL: 4.97,
  MXN: 17.2, INR: 83.1, SGD: 1.34, NZD: 1.63,
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
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)

  const applyCode = useCallback((code: string, ratesMap: Record<string, number>) => {
    const r = ratesMap[code] ?? FALLBACK_RATES[code] ?? 1
    setRate(r)
    setCurrencyState(code)
    localStorage.setItem('mc-currency', code)
  }, [])

  const setCurrency = useCallback((code: string) => {
    applyCode(code, rates)
  }, [applyCode, rates])

  useEffect(() => {
    const init = async () => {
      // Fetch exchange rates from our server endpoint (has fallback built in)
      let ratesMap = FALLBACK_RATES
      try {
        const r = await fetch('/api/rates')
        if (r.ok) {
          const d = await r.json()
          if (d.rates) { ratesMap = d.rates; setRates(d.rates) }
        }
      } catch {}

      // Geo-detect via Vercel headers (server-side, no external API)
      let detectedCode = 'USD'
      try {
        const g = await fetch('/api/geo')
        if (g.ok) {
          const gd: GeoInfo = await g.json()
          if (gd.countryCode) {
            setGeo(gd)
            detectedCode = COUNTRY_CURRENCY[gd.countryCode] ?? 'USD'
          }
        }
      } catch {}

      // Manual override wins; otherwise use geo-detected currency
      const saved = localStorage.getItem('mc-currency')
      applyCode(saved ?? detectedCode, ratesMap)
    }
    init()
  }, [applyCode])

  const info = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]

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

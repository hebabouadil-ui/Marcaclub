'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface GeoInfo { countryCode: string; region?: string; city?: string }

interface CurrencyCtx {
  currency: string
  symbol: string
  rate: number
  format: (mad: number) => string
  formatUSD: (usd: number) => string  // for CJ shipping prices (which are in USD)
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

// Rates relative to MAD (1 MAD = X units of currency)
// MAD is the base — all prices in DB are stored in MAD
const FALLBACK_RATES: Record<string, number> = {
  MAD: 1,
  USD: 0.0995,  // 1 MAD ≈ $0.0995
  CAD: 0.135,
  EUR: 0.0916,
  GBP: 0.0786,
  AUD: 0.152,
  CHF: 0.0895,
  JPY: 14.87,
  AED: 0.365,
  SAR: 0.373,
  BRL: 0.494,
  MXN: 1.71,
  INR: 8.27,
  SGD: 0.133,
  NZD: 0.162,
}

const DEFAULT: CurrencyCtx = {
  currency: 'MAD', symbol: 'MAD ', rate: 1,
  format: (n) => `MAD ${n.toFixed(2)}`,
  formatUSD: (n) => `MAD ${(n / 0.0995).toFixed(2)}`,
  setCurrency: () => {},
  geo: null,
  available: CURRENCIES,
}

const Ctx = createContext<CurrencyCtx>(DEFAULT)

// Prices are stored in MAD. Rate converts MAD → display currency.
function makeFormat(symbol: string, currency: string, rate: number) {
  return (mad: number) => {
    const v = mad * rate
    if (currency === 'JPY') return `${symbol}${Math.round(v).toLocaleString()}`
    if (currency === 'MAD') return `${Math.round(v).toLocaleString()} MAD`
    return `${symbol}${v.toFixed(2)}`
  }
}

function makeFormatUSD(symbol: string, currency: string, rate: number, usdRate: number) {
  return (usd: number) => {
    const mad = usd / usdRate
    const v = mad * rate
    if (currency === 'JPY') return `${symbol}${Math.round(v).toLocaleString()}`
    if (currency === 'MAD') return `${Math.round(v).toLocaleString()} MAD`
    return `${symbol}${v.toFixed(2)}`
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('MAD')
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
      let detectedCode = 'MAD'
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

  const usdRate = rates['USD'] ?? FALLBACK_RATES['USD']

  return (
    <Ctx.Provider value={{
      currency,
      symbol: info.symbol,
      rate,
      format: makeFormat(info.symbol, currency, rate),
      formatUSD: makeFormatUSD(info.symbol, currency, rate, usdRate),
      setCurrency,
      geo,
      available: CURRENCIES,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCurrency = () => useContext(Ctx)

'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface GeoInfo { countryCode: string; region?: string; city?: string }

interface CurrencyCtx {
  currency: string
  symbol: string
  rate: number
  format: (cad: number) => string
  formatUSD: (usd: number) => string
  setCurrency: (code: string) => void
  geo: GeoInfo | null
  available: { code: string; name: string; symbol: string }[]
  usdToCAD: number
}

export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF ' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR ' },
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
  MA: 'EUR', DZ: 'EUR', TN: 'EUR',  // North Africa → EUR (MAD/DZD not in Stripe)
  BR: 'BRL', MX: 'MXN', IN: 'INR',
}

const FALLBACK_RATES: Record<string, number> = {
  CAD: 1, USD: 0.73, EUR: 0.68, GBP: 0.58, AUD: 1.10,
  CHF: 0.66, JPY: 108, AED: 2.68, SAR: 2.74, BRL: 3.65,
  MXN: 12.6, INR: 61.0, SGD: 0.98, NZD: 1.20,
}

// Read the country cookie set by middleware (synchronous, no API call needed)
function readCountryCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)mc-country-code=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const DEFAULT: CurrencyCtx = {
  currency: 'CAD', symbol: 'CA$', rate: 1,
  format: (n) => `CA$${n.toFixed(2)}`,
  formatUSD: (n) => `CA$${(n / 0.73).toFixed(2)}`,
  setCurrency: () => {},
  geo: null,
  available: CURRENCIES,
  usdToCAD: 1 / 0.73,
}

const Ctx = createContext<CurrencyCtx>(DEFAULT)

function makeFormat(symbol: string, currency: string, rate: number) {
  return (cad: number) => {
    const v = cad * rate
    if (currency === 'JPY') return `${symbol}${Math.round(v).toLocaleString()}`
    return `${symbol}${v.toFixed(2)}`
  }
}

function makeFormatUSD(symbol: string, currency: string, rate: number, usdToCAD: number) {
  return (usd: number) => makeFormat(symbol, currency, rate)(usd * usdToCAD)
}

export function CurrencyProvider({ children, initialCountry }: { children: React.ReactNode; initialCountry?: string }) {
  // Prefer server-passed initialCountry (no flash), fallback to client cookie read
  const cookieCountry = initialCountry || readCountryCookie() || 'CA'
  const initialCurrency = COUNTRY_CURRENCY[cookieCountry] ?? 'CAD'

  const [currency, setCurrencyState] = useState(initialCurrency)
  const [rate, setRate] = useState(FALLBACK_RATES[initialCurrency] ?? 1)
  const [geo, setGeo] = useState<GeoInfo | null>({ countryCode: cookieCountry })
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)

  const applyCode = useCallback((code: string, ratesMap: Record<string, number>) => {
    const r = ratesMap[code] ?? FALLBACK_RATES[code] ?? 1
    setRate(r)
    setCurrencyState(code)
  }, [])

  // User manually picking a currency — works for current session only
  const setCurrency = useCallback((code: string) => {
    applyCode(code, rates)
  }, [applyCode, rates])

  useEffect(() => {
    const init = async () => {
      // 1. Fetch live exchange rates
      let ratesMap = FALLBACK_RATES
      try {
        const r = await fetch('/api/rates')
        if (r.ok) {
          const d = await r.json()
          if (d.rates) { ratesMap = d.rates; setRates(d.rates) }
        }
      } catch {}

      // 2. Country is already set correctly from initialCountry server prop
      const country = initialCountry || readCountryCookie() || 'CA'
      const detectedCurrency = COUNTRY_CURRENCY[country] ?? 'CAD'
      setGeo({ countryCode: country })

      // 3. Always use geo-detected currency — ignore any saved localStorage value
      // (localStorage overrides caused CAD to stick for non-Canadian visitors)
      applyCode(detectedCurrency, ratesMap)
      // Shipping is NEVER computed here. It comes only from /api/shipping-estimate
      // (→ computeShippingUSD snapshot), the single source of truth.
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyCode, initialCountry])

  const info = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]
  const usdToCAD = 1 / (rates['USD'] ?? 0.73)

  return (
    <Ctx.Provider value={{
      currency,
      symbol: info.symbol,
      rate,
      format: makeFormat(info.symbol, currency, rate),
      formatUSD: makeFormatUSD(info.symbol, currency, rate, usdToCAD),
      setCurrency,
      geo,
      available: CURRENCIES,
      usdToCAD,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCurrency = () => useContext(Ctx)

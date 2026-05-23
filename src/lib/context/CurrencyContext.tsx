'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface CurrencyCtx {
  currency: string
  symbol: string
  rate: number
  format: (usd: number) => string
}

const DEFAULT: CurrencyCtx = {
  currency: 'USD', symbol: '$', rate: 1,
  format: (n) => `$${n.toFixed(2)}`,
}

const CURRENCY_MAP: Record<string, { currency: string; symbol: string }> = {
  US: { currency: 'USD', symbol: '$' },
  CA: { currency: 'CAD', symbol: 'CA$' },
  GB: { currency: 'GBP', symbol: '£' },
  AU: { currency: 'AUD', symbol: 'A$' },
  NZ: { currency: 'NZD', symbol: 'NZ$' },
  FR: { currency: 'EUR', symbol: '€' },
  DE: { currency: 'EUR', symbol: '€' },
  ES: { currency: 'EUR', symbol: '€' },
  IT: { currency: 'EUR', symbol: '€' },
  NL: { currency: 'EUR', symbol: '€' },
  BE: { currency: 'EUR', symbol: '€' },
  PT: { currency: 'EUR', symbol: '€' },
  AT: { currency: 'EUR', symbol: '€' },
  IE: { currency: 'EUR', symbol: '€' },
  CH: { currency: 'CHF', symbol: 'CHF' },
  SE: { currency: 'SEK', symbol: 'kr' },
  NO: { currency: 'NOK', symbol: 'kr' },
  DK: { currency: 'DKK', symbol: 'kr' },
  JP: { currency: 'JPY', symbol: '¥' },
  KR: { currency: 'KRW', symbol: '₩' },
  CN: { currency: 'CNY', symbol: '¥' },
  SG: { currency: 'SGD', symbol: 'S$' },
  HK: { currency: 'HKD', symbol: 'HK$' },
  AE: { currency: 'AED', symbol: 'AED' },
  SA: { currency: 'SAR', symbol: 'SAR' },
  MA: { currency: 'MAD', symbol: 'MAD' },
  BR: { currency: 'BRL', symbol: 'R$' },
  MX: { currency: 'MXN', symbol: 'MX$' },
  IN: { currency: 'INR', symbol: '₹' },
}

const Ctx = createContext<CurrencyCtx>(DEFAULT)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<CurrencyCtx>(DEFAULT)

  const detect = useCallback(async () => {
    try {
      // Detect country from IP
      const geoRes = await fetch('https://ipapi.co/json/')
      const geo = await geoRes.json()
      const countryCode = geo.country_code as string
      const mapped = CURRENCY_MAP[countryCode]
      if (!mapped || mapped.currency === 'USD') return

      // Fetch exchange rate
      const rateRes = await fetch(`https://open.er-api.com/v6/latest/USD`)
      const rateData = await rateRes.json()
      const rate = rateData.rates?.[mapped.currency]
      if (!rate) return

      const { currency, symbol } = mapped
      setCtx({
        currency,
        symbol,
        rate,
        format: (usd: number) => {
          const converted = usd * rate
          if (currency === 'JPY' || currency === 'KRW') {
            return `${symbol}${Math.round(converted).toLocaleString()}`
          }
          return `${symbol}${converted.toFixed(2)}`
        },
      })
    } catch {
      // Silent fail — keep USD
    }
  }, [])

  useEffect(() => { detect() }, [detect])

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}

export const useCurrency = () => useContext(Ctx)

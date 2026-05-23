'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface Customer { name: string; email: string }
interface CustomerCtx {
  customer: Customer | null
  loading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<CustomerCtx>({ customer: null, loading: true, logout: async () => {}, refresh: async () => {} })

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/me')
      if (res.ok) setCustomer(await res.json())
      else setCustomer(null)
    } catch { setCustomer(null) }
    finally { setLoading(false) }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/customer/me', { method: 'DELETE' })
    setCustomer(null)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return <Ctx.Provider value={{ customer, loading, logout, refresh }}>{children}</Ctx.Provider>
}

export const useCustomer = () => useContext(Ctx)

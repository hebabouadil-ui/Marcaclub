'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface Customer { _id: string; name: string; email: string }
interface CustomerCtx {
  customer: Customer | null
  setCustomer: (c: Customer | null) => void
  loading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<CustomerCtx>({
  customer: null,
  setCustomer: () => {},
  loading: true,
  logout: async () => {},
  refresh: async () => {},
})

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/customer/me')
      if (res.ok) setCustomer(await res.json())
      else setCustomer(null)
    } catch { setCustomer(null) }
    finally { setLoading(false) }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/customer/logout', { method: 'POST' })
    setCustomer(null)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <Ctx.Provider value={{ customer, setCustomer, loading, logout, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCustomer = () => useContext(Ctx)

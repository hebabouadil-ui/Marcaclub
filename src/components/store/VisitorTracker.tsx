'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

function getSessionId() {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('mc_sid')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('mc_sid', id)
  }
  return id
}

export default function VisitorTracker() {
  const pathname = usePathname()
  const sessionId = useRef('')

  useEffect(() => {
    sessionId.current = getSessionId()
  }, [])

  useEffect(() => {
    if (!sessionId.current) return
    const ping = () => {
      fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, page: pathname }),
      }).catch(() => {})
    }
    ping()
    const interval = setInterval(ping, 30_000)
    return () => clearInterval(interval)
  }, [pathname])

  return null
}

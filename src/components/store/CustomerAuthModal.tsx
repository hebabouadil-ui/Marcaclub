'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'

interface Props {
  onSuccess?: () => void
  onClose: () => void
}

export default function CustomerAuthModal({ onSuccess, onClose }: Props) {
  const { setCustomer } = useCustomer()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const url = tab === 'login' ? '/api/auth/customer/login' : '/api/auth/customer/register'
      const body = tab === 'login' ? { email, password } : { email, password, name }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setCustomer(data)
      onSuccess?.()
      onClose()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex gap-4">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`text-xs tracking-widest uppercase font-semibold transition-colors ${tab === 'login' ? 'text-brand-black border-b-2 border-brand-black pb-0.5' : 'text-brand-gray hover:text-brand-black'}`}
            >
              Se connecter
            </button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`text-xs tracking-widest uppercase font-semibold transition-colors ${tab === 'register' ? 'text-brand-black border-b-2 border-brand-black pb-0.5' : 'text-brand-gray hover:text-brand-black'}`}
            >
              Créer un compte
            </button>
          </div>
          <button onClick={onClose} className="text-brand-gray hover:text-brand-black transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-brand-gray mb-1">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Sophie M."
                className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-black transition-colors"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] tracking-widest uppercase text-brand-gray mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@exemple.com"
              className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-black transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-widest uppercase text-brand-gray mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-black transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-black text-white text-xs tracking-widest uppercase font-bold py-3 hover:bg-brand-gold hover:text-brand-black disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}

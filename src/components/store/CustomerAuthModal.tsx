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
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'forgot') {
        const res = await fetch('/api/auth/customer/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (res.ok) setForgotSent(true)
        else { const d = await res.json(); setError(d.error || 'Erreur') }
        return
      }
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

  const switchTab = (t: typeof tab) => { setTab(t); setError(''); setForgotSent(false) }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex gap-4">
            {tab !== 'forgot' ? (
              <>
                <button
                  onClick={() => switchTab('login')}
                  className={`text-xs tracking-widest uppercase font-semibold transition-colors ${tab === 'login' ? 'text-brand-black border-b-2 border-brand-black pb-0.5' : 'text-brand-gray hover:text-brand-black'}`}
                >
                  Se connecter
                </button>
                <button
                  onClick={() => switchTab('register')}
                  className={`text-xs tracking-widest uppercase font-semibold transition-colors ${tab === 'register' ? 'text-brand-black border-b-2 border-brand-black pb-0.5' : 'text-brand-gray hover:text-brand-black'}`}
                >
                  Créer un compte
                </button>
              </>
            ) : (
              <span className="text-xs tracking-widest uppercase font-semibold text-brand-black">Mot de passe oublié</span>
            )}
          </div>
          <button onClick={onClose} className="text-brand-gray hover:text-brand-black transition-colors">
            <X size={18} />
          </button>
        </div>

        {tab === 'forgot' && forgotSent ? (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="text-4xl">📧</div>
            <p className="text-brand-black font-semibold text-sm">Email envoyé !</p>
            <p className="text-brand-gray text-xs leading-relaxed">
              Si un compte existe pour <strong>{email}</strong>, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.<br />Vérifiez aussi vos spams.
            </p>
            <button
              onClick={() => switchTab('login')}
              className="text-xs text-brand-gray underline hover:text-brand-black transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            {tab === 'forgot' && (
              <p className="text-brand-gray text-xs leading-relaxed">
                Entrez votre adresse email. Vous recevrez un lien pour créer un nouveau mot de passe.
              </p>
            )}
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
            {tab !== 'forgot' && (
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
            )}

            {tab === 'login' && (
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-[11px] text-brand-gray hover:text-brand-black underline transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-black text-white text-xs tracking-widest uppercase font-bold py-3 hover:bg-brand-gold hover:text-brand-black disabled:opacity-50 transition-colors"
            >
              {loading
                ? '…'
                : tab === 'login'
                  ? 'Se connecter'
                  : tab === 'register'
                    ? 'Créer mon compte'
                    : 'Envoyer le lien'}
            </button>

            {tab === 'forgot' && (
              <p className="text-center text-xs text-brand-gray">
                <button type="button" onClick={() => switchTab('login')} className="underline hover:text-brand-black transition-colors">
                  Retour à la connexion
                </button>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

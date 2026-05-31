'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void
          prompt: () => void
        }
      }
    }
  }
}

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
  const [googleLoading, setGoogleLoading] = useState(false)

  // Load Google Identity Services script once
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return
    if (document.getElementById('google-gsi-script')) return
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    document.body.appendChild(script)
  }, [])

  async function handleGoogleCredential(credential: string) {
    setGoogleLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/customer/google-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur Google'); return }
      setCustomer(data)
      onSuccess?.()
      onClose()
    } catch {
      setError('Erreur réseau')
    } finally {
      setGoogleLoading(false)
    }
  }

  function handleGoogleClick() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || !window.google) { setError('Google non configuré'); return }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handleGoogleCredential(response.credential),
    })
    window.google.accounts.id.prompt()
  }

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

            {/* Google sign-in — shown at the top on login and register tabs */}
            {tab !== 'forgot' && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 border border-gray-200 py-2.5 text-sm font-medium text-brand-black hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? '…' : 'Continuer avec Google'}
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-[10px] text-brand-gray tracking-widest uppercase">ou</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
              </>
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

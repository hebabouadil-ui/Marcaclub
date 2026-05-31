'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'
import toast from 'react-hot-toast'

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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { refresh } = useCustomer()
  const router = useRouter()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return
    if (document.getElementById('google-gsi-script')) return
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const handleGoogleClick = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || !window.google) { toast.error('Google non disponible'); return }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setGoogleLoading(true)
        try {
          const res = await fetch('/api/auth/customer/google-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
          })
          const data = await res.json()
          if (!res.ok) { toast.error(data.error || 'Erreur Google'); return }
          await refresh()
          toast.success(`Bienvenue, ${data.name} !`)
          router.push('/account/orders')
        } catch { toast.error('Erreur réseau') }
        finally { setGoogleLoading(false) }
      },
    })
    window.google.accounts.id.prompt()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUnverified(false)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.status === 403) { setUnverified(true); return }
      if (!res.ok) { toast.error(data.error ?? 'Identifiants incorrects'); return }
      await refresh()
      toast.success(`Bienvenue, ${data.name} !`)
      router.push('/account/orders')
    } catch { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  const handleResend = async () => {
    setResendLoading(true)
    try {
      await fetch('/api/auth/customer/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResendSent(true)
    } catch { toast.error('Erreur réseau') }
    finally { setResendLoading(false) }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-brand-gold text-xs tracking-[0.4em] uppercase font-semibold">Marcaclub</Link>
          <h1 className="font-display text-3xl font-bold text-gray-900 tracking-widest uppercase mt-3 mb-2">Connexion</h1>
          <p className="text-gray-500 text-sm">Accédez à vos commandes et à votre compte</p>
        </div>
        <div className="bg-white border border-gray-200 p-8 shadow-sm rounded-xl">
          {unverified && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold mb-1">Compte non activé</p>
              <p className="text-amber-700 text-xs mb-2">Vérifiez votre boîte mail et cliquez sur le lien d&apos;activation.</p>
              {resendSent ? (
                <p className="text-green-700 text-xs font-medium">Email renvoyé ! Vérifiez vos spams si besoin.</p>
              ) : (
                <button type="button" onClick={handleResend} disabled={resendLoading}
                  className="text-xs text-amber-900 underline hover:text-amber-700 disabled:opacity-50">
                  {resendLoading ? 'Envoi…' : 'Renvoyer le lien d\'activation'}
                </button>
              )}
            </div>
          )}
          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Connexion…' : 'Continuer avec Google'}
              </button>
              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-[10px] text-gray-400 tracking-widest uppercase">ou</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-500 text-[10px] tracking-widest mb-2">EMAIL</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent rounded-lg placeholder:text-gray-400"
                placeholder="vous@exemple.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-500 text-[10px] tracking-widest">MOT DE PASSE</label>
                <Link href="/forgot-password" className="text-[11px] text-gray-400 hover:text-brand-black underline transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? 'text' : 'password'} required
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent rounded-lg placeholder:text-gray-400"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-black text-white font-bold py-3.5 text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-brand-gold hover:text-brand-black transition-colors disabled:opacity-50 rounded-lg">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            Pas encore de compte ?{' '}
            <Link href="/account/register" className="text-brand-gold hover:text-yellow-600 font-medium transition-colors">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  )
}


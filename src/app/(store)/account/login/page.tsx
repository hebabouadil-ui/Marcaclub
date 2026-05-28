'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'
import toast from 'react-hot-toast'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const { refresh } = useCustomer()
  const router = useRouter()

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
      router.refresh()
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

          {/* Google Sign In */}
          <a href="/api/customer/auth/google?returnTo=/account/orders"
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4">
            <GoogleIcon />
            Continuer avec Google
          </a>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-3 w-fit mx-auto">ou</div>
          </div>

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

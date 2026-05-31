'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'
import toast from 'react-hot-toast'
import GoogleButton from '@/components/store/GoogleButton'

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

          {/* Google — same redirect flow as checkout + register */}
          <div className="mb-6">
            <GoogleButton returnTo="/account/orders" label="Continuer avec Google" />
            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-[10px] text-gray-400 tracking-widest uppercase">ou</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
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

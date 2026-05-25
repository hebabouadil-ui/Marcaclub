'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const SAVED_EMAIL_KEY = 'mc-admin-email'

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [saveEmail, setSaveEmail] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY)
    if (saved) { setForm((f) => ({ ...f, email: saved })); setSaveEmail(true) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (saveEmail) {
      localStorage.setItem(SAVED_EMAIL_KEY, form.email)
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY)
    }

    const res = await signIn('credentials', {
      email: form.email,
      password: form.password,
      rememberMe: String(rememberMe),
      redirect: false,
    })
    setLoading(false)
    if (res?.ok) {
      window.location.href = '/admin/dashboard'
    } else {
      toast.error('Email ou mot de passe incorrect')
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <h1 className="text-brand-gold font-display font-bold text-3xl tracking-widest uppercase">
            MARCACLUB
          </h1>
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mt-1">
            Admin Panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3.5 text-sm focus:outline-none focus:border-brand-gold transition-colors"
            />
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3.5 text-sm focus:outline-none focus:border-brand-gold transition-colors pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={saveEmail}
                onChange={(e) => setSaveEmail(e.target.checked)}
                className="w-4 h-4 accent-brand-gold"
              />
              <span className="text-white/50 text-sm group-hover:text-white/70 transition-colors">Save my email</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-brand-gold"
              />
              <span className="text-white/50 text-sm group-hover:text-white/70 transition-colors">
                Keep me logged in today <span className="text-white/30 text-xs">(24h)</span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-gold text-brand-black py-3.5 text-sm tracking-[0.2em] uppercase font-semibold hover:bg-white transition-colors disabled:opacity-50 mt-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {!rememberMe && (
            <p className="text-white/20 text-[10px] text-center">Session expires after 1 hour</p>
          )}
        </form>
      </motion.div>
    </div>
  )
}

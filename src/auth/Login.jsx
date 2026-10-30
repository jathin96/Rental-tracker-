import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Truck, LogIn } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/80 p-8 shadow-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-950 text-safety-400">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">GateFlow</p>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-800">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="you@company.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-800">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-full bg-ink-950 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500 text-center">
          Use the credentials created for Security / Devaraj / Sharath
        </p>
      </div>
    </div>
  )
}

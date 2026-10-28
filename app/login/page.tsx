'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl text-brown-500 font-bold">White Stallion Ranch</h1>
          <p className="text-sm text-brown-300 mt-1">Event Planner</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brown-600 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-brown-900 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300 focus:border-transparent"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brown-600 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-brown-900 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300 focus:border-transparent"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brown-500 hover:bg-brown-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-brown-200">
          Contact your administrator for access.
        </p>
      </div>
    </div>
  )
}

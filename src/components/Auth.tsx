import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup' | 'forgot'

const inputClass = 'w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-600 transition-shadow'
const buttonClass = 'w-full py-2.5 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40'
const linkClass = 'text-violet-600 dark:text-violet-400 hover:underline font-medium'

const titles: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Reset password',
}

const buttonLabels: Record<Mode, [idle: string, busy: string]> = {
  signin: ['Sign in', 'Signing in…'],
  signup: ['Create account', 'Creating account…'],
  forgot: ['Email me a reset link', 'Sending…'],
}

function friendlyError(message: string): string {
  if (message === 'Invalid login credentials') return "That email and password don't match. Try again or tap Forgot password?"
  if (message === 'User already registered') return "There's already an account with this email. Sign in instead."
  if (/rate limit/i.test(message)) return 'Too many emails sent. Wait an hour and try again.'
  return message
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <svg viewBox="0 0 48 46" width="28" height="28" fill="none">
            <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
          </svg>
          <span className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">dootoo</span>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const needsPassword = mode !== 'forgot'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || (needsPassword && !password)) return
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setError(friendlyError(error.message))
        setLoading(false)
      }
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) {
        setError(friendlyError(error.message))
        setLoading(false)
      } else if (!data.session) {
        // Only when email confirmation is on; otherwise the new account is signed straight in
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
        setPassword('')
        setLoading(false)
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
      setLoading(false)
      if (error) setError(friendlyError(error.message))
      else setSuccess('Check your email for a link to set a new password.')
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setSuccess('')
    setPassword('')
  }

  const [idleLabel, busyLabel] = buttonLabels[mode]

  return (
    <Shell>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{titles[mode]}</h1>
          {mode === 'forgot' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">We'll email you a link to choose a new password.</p>
          )}
        </div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          autoFocus
          className={inputClass}
        />
        {needsPassword && (
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Password (min 6 characters)' : 'Password'}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className={inputClass}
          />
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-green-600 dark:text-green-400">{success}</p>}
        <button
          type="submit"
          disabled={loading || !email.trim() || (needsPassword && !password)}
          className={buttonClass}
        >
          {loading ? busyLabel : idleLabel}
        </button>
      </form>

      <div className="mt-5 space-y-2 text-center text-sm text-gray-500 dark:text-gray-400">
        {mode === 'signin' && (
          <>
            <p>
              <button type="button" onClick={() => switchMode('forgot')} className={linkClass}>Forgot password?</button>
            </p>
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('signup')} className={linkClass}>Sign up</button>
            </p>
          </>
        )}
        {mode === 'signup' && (
          <p>
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode('signin')} className={linkClass}>Sign in</button>
          </p>
        )}
        {mode === 'forgot' && (
          <p>
            <button type="button" onClick={() => switchMode('signin')} className={linkClass}>Back to sign in</button>
          </p>
        )}
      </div>
    </Shell>
  )
}

export function SetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onDone()
    }
  }

  return (
    <Shell>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Set a new password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">You'll use this to sign in from now on.</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="New password (min 6 characters)"
          autoComplete="new-password"
          autoFocus
          className={inputClass}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={loading || !password} className={buttonClass}>
          {loading ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </Shell>
  )
}

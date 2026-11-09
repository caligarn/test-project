import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAvatars } from '../lib/storage'
import { Gamepad2, RefreshCw } from 'lucide-react'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const INPUT_CLASS = 'w-full px-4 py-3 bg-white border-navy text-sm text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight transition-colors font-medium'
const INPUT_STYLE = { borderWidth: '3px', borderStyle: 'solid', borderColor: '#1A1A2E' }

export default function Login() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('🤖')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { user, loading, login, signup, logout } = useAuth()
  const isSignup = mode === 'signup'

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    const name = username.trim()

    if (!name || !password) {
      setError('Please fill in both fields.')
      return
    }
    if (isSignup) {
      if (!USERNAME_RE.test(name)) {
        setError('Username must be 3-20 letters, numbers, or underscores.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
    }

    setBusy(true)
    const result = isSignup ? await signup(name, password, avatar) : await login(name, password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
    } else {
      navigate('/')
    }
  }

  if (loading) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <RefreshCw className="w-8 h-8 text-navy/30 mx-auto animate-spin" />
      </div>
    )
  }

  if (user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center">
        <p className="text-5xl mb-3">{user.avatar}</p>
        <h1 className="text-xl font-black text-navy mb-2 uppercase">Signed in as {user.username}</h1>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <Link to="/profile" className="btn-brutalist bg-primary text-white no-underline">Your profile</Link>
          <button onClick={logout} className="btn-brutalist bg-white text-navy">Log out</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary flex items-center justify-center mx-auto mb-4 border-3" style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}>
          <Gamepad2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-black text-navy mb-1 uppercase">
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="text-navy/50 text-sm font-medium">
          {isSignup
            ? 'Free. Your scores go on the shared leaderboards.'
            : 'Sign in to put your scores on the leaderboards'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {isSignup && (
          <div>
            <p className="block text-xs font-black text-navy mb-2 uppercase">Choose Avatar</p>
            <div className="flex flex-wrap gap-2">
              {getAvatars().map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  aria-label={`Avatar ${a}`}
                  aria-pressed={avatar === a}
                  className={`w-10 h-10 flex items-center justify-center text-lg transition-all border-2 ${
                    avatar === a
                      ? 'bg-highlight border-navy scale-110'
                      : 'bg-white border-navy/20 hover:border-navy/50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="login-username" className="block text-xs font-black text-navy mb-1.5 uppercase">
            Username
          </label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
          {isSignup && (
            <p className="text-navy/40 text-[11px] font-medium mt-1">3-20 letters, numbers, or underscores.</p>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="block text-xs font-black text-navy mb-1.5 uppercase">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
          {isSignup && (
            <p className="text-navy/40 text-[11px] font-medium mt-1">At least 6 characters.</p>
          )}
        </div>

        {error && (
          <p className="text-danger text-xs font-black" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full btn-brutalist bg-primary text-white justify-center disabled:opacity-60"
        >
          {busy ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-navy/50 text-xs mt-6 font-medium">
        {isSignup ? 'Already have an account? ' : 'Don\'t have an account? '}
        <button
          type="button"
          onClick={() => switchMode(isSignup ? 'login' : 'signup')}
          className="text-primary font-bold hover:underline"
        >
          {isSignup ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  )
}

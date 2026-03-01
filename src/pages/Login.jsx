import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAvatars } from '../lib/storage'
import { Gamepad2 } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('🤖')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, signup } = useAuth()

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    if (mode === 'login') {
      const result = login(username.trim(), password)
      if (result.error) {
        setError(result.error)
      } else {
        navigate('/')
      }
    } else {
      const result = signup(username.trim(), password, avatar)
      if (result.error) {
        setError(result.error)
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
          <Gamepad2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-400 text-sm">
          {mode === 'login'
            ? 'Sign in to track your scores'
            : 'Join the AI Arcade community'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Choose Avatar
            </label>
            <div className="flex flex-wrap gap-2">
              {getAvatars().map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    avatar === a
                      ? 'bg-primary/30 border-2 border-primary scale-110'
                      : 'bg-surface-light border border-white/5 hover:border-white/20'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="w-full px-4 py-3 rounded-xl bg-surface-light border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-3 rounded-xl bg-surface-light border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {error && (
          <p className="text-danger text-xs font-medium">{error}</p>
        )}

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors"
        >
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-gray-500 text-xs mt-6">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button
              onClick={() => { setMode('signup'); setError('') }}
              className="text-primary hover:underline"
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              onClick={() => { setMode('login'); setError('') }}
              className="text-primary hover:underline"
            >
              Sign In
            </button>
          </>
        )}
      </p>
    </div>
  )
}

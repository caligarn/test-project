import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
        <div className="w-14 h-14 bg-primary flex items-center justify-center mx-auto mb-4 border-3" style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}>
          <Gamepad2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-black text-navy mb-1 uppercase">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-navy/50 text-sm font-medium">
          {mode === 'login'
            ? 'Sign in to track your scores'
            : 'Join the Gen Arcade community'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-black text-navy mb-2 uppercase">
              Choose Avatar
            </label>
            <div className="flex flex-wrap gap-2">
              {getAvatars().map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
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
          <label className="block text-xs font-black text-navy mb-1.5 uppercase">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="w-full px-4 py-3 bg-white border-navy text-sm text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight transition-colors font-medium"
            style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: '#1A1A2E' }}
          />
        </div>

        <div>
          <label className="block text-xs font-black text-navy mb-1.5 uppercase">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-3 bg-white border-navy text-sm text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight transition-colors font-medium"
            style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: '#1A1A2E' }}
          />
        </div>

        {error && (
          <p className="text-danger text-xs font-black">{error}</p>
        )}

        <button
          type="submit"
          className="w-full btn-brutalist bg-primary text-white justify-center"
        >
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-navy/50 text-xs mt-6 font-medium">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button
              onClick={() => { setMode('signup'); setError('') }}
              className="text-primary font-bold hover:underline"
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              onClick={() => { setMode('login'); setError('') }}
              className="text-primary font-bold hover:underline"
            >
              Sign In
            </button>
          </>
        )}
      </p>
    </div>
  )
}

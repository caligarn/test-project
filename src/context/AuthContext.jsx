import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, getSessionToken, setSessionToken } from '../lib/api'
import { getLegacyUser, removeLegacyUser } from '../lib/storage'
import { creditsChanged } from '../lib/play'
import { useMachine } from '../hooks/useMachine'
import { sessionMachine } from '../machines/session.js'

const AuthContext = createContext(null)

function errorMessage(err) {
  return err?.message || 'Something went wrong. Try again.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // see src/machines/session.js; a saved token starts in "checking"
  const session = useMachine(sessionMachine, { initial: getSessionToken() ? 'checking' : 'guest' })
  const sendSession = session.send
  const loading = session.state === 'checking'

  // For tests and agents: <html data-session="guest | checking | signed-in">
  useEffect(() => {
    document.documentElement.dataset.session = session.state
  }, [session.state])

  const refreshUser = useCallback(async () => {
    if (!getSessionToken()) {
      setUser(null)
      return null
    }
    try {
      const { user: u } = await api('/auth/me')
      setUser(u)
      sendSession('SIGNED_IN')
      return u
    } catch (err) {
      if (err.status === 401) {
        setSessionToken(null)
        setUser(null)
      }
      // Same as before: on a network error the page acts as a guest, and the
      // saved login is kept for the next visit.
      sendSession('SIGNED_OUT')
      return null
    }
  }, [sendSession])

  // On load: check a saved login with the server (guests skip this).
  useEffect(() => {
    if (!getSessionToken()) return
    let active = true
    api('/auth/me').then(
      ({ user: u }) => {
        if (!active) return
        setUser(u)
        sendSession('SIGNED_IN')
      },
      (err) => {
        if (!active) return
        if (err.status === 401) setSessionToken(null)
        sendSession('SIGNED_OUT')
      }
    )
    return () => {
      active = false
    }
  }, [sendSession])

  function finish({ token, user: u }) {
    setSessionToken(token)
    setUser(u)
    sendSession('SIGNED_IN')
    creditsChanged()
    return { success: true, user: u }
  }

  async function login(username, password) {
    try {
      return finish(await api('/auth/login', { method: 'POST', body: { username, password } }))
    } catch (err) {
      // One-time move of an old browser-only account to the server.
      const legacy = err.code === 'bad_login' ? getLegacyUser(username) : null
      if (legacy && legacy.password === password) {
        try {
          const result = finish(await api('/auth/signup', { method: 'POST', body: { username, password, avatar: legacy.avatar } }))
          removeLegacyUser(username)
          return result
        } catch {
          // fall through to the original error
        }
      }
      return { error: errorMessage(err) }
    }
  }

  async function signup(username, password, avatar) {
    try {
      return finish(await api('/auth/signup', { method: 'POST', body: { username, password, avatar } }))
    } catch (err) {
      return { error: errorMessage(err) }
    }
  }

  function logout() {
    setSessionToken(null)
    setUser(null)
    sendSession('SIGNED_OUT')
    creditsChanged()
  }

  async function updateAvatar(avatar) {
    try {
      const { user: u } = await api('/auth/me', { method: 'PATCH', body: { avatar } })
      setUser(u)
      return { success: true }
    } catch (err) {
      return { error: errorMessage(err) }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, status: session.state, login, signup, logout, refreshUser, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

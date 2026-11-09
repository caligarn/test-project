import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, getSessionToken, setSessionToken } from '../lib/api'
import { getLegacyUser, removeLegacyUser } from '../lib/storage'
import { creditsChanged } from '../lib/play'

const AuthContext = createContext(null)

function errorMessage(err) {
  return err?.message || 'Something went wrong. Try again.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getSessionToken()))

  const refreshUser = useCallback(async () => {
    if (!getSessionToken()) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const { user: u } = await api('/auth/me')
      setUser(u)
      return u
    } catch (err) {
      if (err.status === 401) {
        setSessionToken(null)
        setUser(null)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  function finish({ token, user: u }) {
    setSessionToken(token)
    setUser(u)
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
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

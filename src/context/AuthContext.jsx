import { useState } from 'react'
import {
  getCurrentUser,
  loginUser,
  createUser,
  logoutUser,
  isSubscribed,
} from '../lib/storage'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  // localStorage is synchronous, so seed from it on the very first render.
  // Hydrating in an effect instead meant every consumer saw a signed-out user
  // on mount, which is how game state ended up saved under "guest".
  const [user, setUser] = useState(() => getCurrentUser())
  const [subscribed, setSubscribed] = useState(() => Boolean(isSubscribed()))

  function login(username, password) {
    const result = loginUser(username, password)
    if (result.success) {
      setUser(result.user)
      setSubscribed(Boolean(isSubscribed()))
    }
    return result
  }

  function signup(username, password, avatar) {
    const result = createUser(username, password, avatar)
    if (result.success) {
      loginUser(username, password)
      setUser(result.user)
    }
    return result
  }

  function logout() {
    logoutUser()
    setUser(null)
  }

  function refreshUser() {
    const u = getCurrentUser()
    if (u) setUser(u)
  }

  return (
    <AuthContext.Provider
      value={{ user, subscribed, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

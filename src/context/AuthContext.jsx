import { createContext, useContext, useState, useEffect } from 'react'
import {
  getCurrentUser,
  loginUser,
  createUser,
  logoutUser,
  isSubscribed,
  getUsers,
  updateUser,
} from '../lib/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    const u = getCurrentUser()
    if (u) setUser(u)
    setSubscribed(isSubscribed())
  }, [])

  function login(username, password) {
    const result = loginUser(username, password)
    if (result.success) {
      setUser(result.user)
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

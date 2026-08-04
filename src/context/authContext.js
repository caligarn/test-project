import { createContext, useContext } from 'react'

// Kept out of AuthContext.jsx so that file exports only the provider component
// — mixing component and non-component exports breaks Fast Refresh.
export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
